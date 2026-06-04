import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FakeReviewService } from 'src/fraud/fake-review.service';
import { AiService } from '../analytics/ai.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private fakeReviewService: FakeReviewService,
    private aiService: AiService,
    private notificationsService: NotificationsService,
  ) {}

  async findByRoom(roomId: string, page: number = 1, limit: number = 10) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { roomId, isVerified: true },
        include: {
          reviewer: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { roomId, isVerified: true } }),
    ]);

    const avgScores = await this.prisma.review.aggregate({
      where: { roomId, isVerified: true },
      _avg: {
        rating: true,
        cleanRating: true,
        securityRating: true,
        locationRating: true,
        landlordRating: true,
      },
    });

    return {
      data: reviews,
      avgScores: avgScores._avg,
      meta: {
        total,
        page,
        limit,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  // Kiểm tra user có đủ điều kiện đánh giá phòng không
  // Điều kiện: user phải đã nhắn tin với chủ phòng về phòng đó (có Conversation)
  async checkReviewEligibility(
    roomId: string,
    userId: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    // Chủ phòng không được đánh giá phòng mình
    if (room.ownerId === userId) {
      return {
        eligible: false,
        reason: 'Bạn không thể đánh giá phòng của chính mình',
      };
    }

    // Kiểm tra đã đánh giá chưa
    const existing = await this.prisma.review.findFirst({
      where: { roomId, reviewerId: userId },
    });
    if (existing) {
      return {
        eligible: false,
        reason: 'Bạn đã đánh giá phòng này rồi',
      };
    }

    // Kiểm tra có conversation (đã nhắn tin) với chủ phòng về phòng này không
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        roomId,
        renterId: userId,
      },
    });

    if (!conversation) {
      return {
        eligible: false,
        reason:
          'Bạn cần liên hệ với chủ phòng trước khi có thể đánh giá. Hãy nhắn tin để trao đổi về phòng.',
      };
    }

    return { eligible: true };
  }

  async create(
    roomId: string,
    reviewerId: string,
    dto: CreateReviewDto,
    ipAddress?: string,
  ) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    if (room.ownerId === reviewerId) {
      throw new ForbiddenException('Cannot review your own room');
    }

    const existing = await this.prisma.review.findFirst({
      where: { roomId, reviewerId },
    });

    if (existing)
      throw new BadRequestException('You have already reviewed this room');

    // Kiểm tra conversation (đã nhắn tin với chủ phòng)
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        roomId,
        renterId: reviewerId,
      },
    });

    if (!conversation) {
      throw new ForbiddenException(
        'Bạn cần liên hệ với chủ phòng trước khi có thể đánh giá. Hãy nhắn tin để trao đổi về phòng.',
      );
    }

    const fraudResult = await this.fakeReviewService.analyze(
      reviewerId,
      roomId,
      dto.rating,
      dto.comment || '',
      undefined,
      ipAddress,
    );

    if (fraudResult.action === 'reject') {
      if (ipAddress) {
        // Tìm các review hoạt động cùng IP trong 24 giờ qua
        const reviewsToInvalidate = await this.prisma.review.findMany({
          where: {
            ipAddress,
            isVerified: true,
            createdAt: {
              gte: new Date(Date.now() - 86400000),
            },
          },
          select: { roomId: true },
        });

        if (reviewsToInvalidate.length > 0) {
          // Reset isVerified thành false
          await this.prisma.review.updateMany({
            where: {
              ipAddress,
              createdAt: {
                gte: new Date(Date.now() - 86400000),
              },
            },
            data: { isVerified: false },
          });

          // Cập nhật lại điểm đánh giá cho các phòng bị ảnh hưởng
          const uniqueRoomIds = Array.from(
            new Set(reviewsToInvalidate.map((r) => r.roomId)),
          );
          await Promise.all(
            uniqueRoomIds.map((rId) => this.updateRoomRating(rId)),
          );
        }
      }

      throw new BadRequestException(
        'Đánh giá bị từ chối vì có dấu hiệu không hợp lệ',
      );
    }

    // Gửi thông báo cảnh báo cho người dùng khi review bị gắn cờ nghi ngờ (chờ kiểm duyệt)
    if (fraudResult.action === 'flag') {
      await this.notificationsService.create({
        userId: reviewerId,
        type: 'REVIEW_FLAGGED_FRAUD',
        title: 'Đánh giá đang chờ kiểm duyệt',
        content: `Đánh giá của bạn trên phòng "${room.title}" đang được kiểm duyệt và sẽ hiển thị sau khi được xác nhận.`,
        link: `/rooms/${roomId}`,
      });
    }

    const review = await this.prisma.review.create({
      data: {
        roomId,
        reviewerId,
        rating: dto.rating,
        cleanRating: dto.cleanRating,
        securityRating: dto.securityRating,
        landlordRating: dto.landlordRating,
        locationRating: dto.locationRating,
        comment: dto.comment,
        isVerified: fraudResult.action === 'approve',
        rentalVerified: true, // Đã qua kiểm tra conversation
        ipAddress,
      },
      include: {
        reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    await this.updateRoomRating(roomId);

    // Gửi thông báo cho chủ phòng khi có đánh giá mới được xác nhận (chỉ khi review được approve)
    if (fraudResult.action === 'approve' && room.ownerId !== reviewerId) {
      await this.notificationsService.create({
        userId: room.ownerId,
        type: 'NEW_REVIEW',
        title: 'Đánh giá mới',
        content: `Phòng "${room.title}" vừa nhận được một đánh giá mới ${dto.rating} sao.`,
        link: `/rooms/${roomId}`,
      });
    }

    if (dto.comment)
      this.analyzeSentiment(review.id, dto.comment).catch(console.error);

    return {
      ...review,
      fraudScore: fraudResult.score,
      isFlagged: fraudResult.action === 'flag',
    };
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateReviewDto,
    ipAddress?: string,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    if (review.reviewerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa đánh giá này');
    }

    const fraudResult = await this.fakeReviewService.analyze(
      userId,
      review.roomId,
      dto.rating ?? review.rating,
      dto.comment ?? review.comment ?? '',
      review.createdAt,
      ipAddress || review.ipAddress || undefined,
    );

    if (fraudResult.action === 'reject') {
      const targetIp = ipAddress || review.ipAddress;
      if (targetIp) {
        const reviewsToInvalidate = await this.prisma.review.findMany({
          where: {
            ipAddress: targetIp,
            isVerified: true,
            createdAt: {
              gte: new Date(Date.now() - 86400000),
            },
          },
          select: { roomId: true },
        });

        if (reviewsToInvalidate.length > 0) {
          await this.prisma.review.updateMany({
            where: {
              ipAddress: targetIp,
              createdAt: {
                gte: new Date(Date.now() - 86400000),
              },
            },
            data: { isVerified: false },
          });

          const uniqueRoomIds = Array.from(
            new Set(reviewsToInvalidate.map((r) => r.roomId)),
          );
          await Promise.all(
            uniqueRoomIds.map((rId) => this.updateRoomRating(rId)),
          );
        }
      }

      throw new BadRequestException(
        'Chỉnh sửa bị từ chối vì có dấu hiệu không hợp lệ',
      );
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        ...dto,
        isVerified: fraudResult.action === 'approve',
        ...(ipAddress && { ipAddress }),
      },
      include: {
        reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    await this.updateRoomRating(review.roomId);

    if (dto.comment) {
      this.analyzeSentiment(review.id, dto.comment).catch(console.error);
    }

    return updated;
  }

  async remove(id: string, userId: string, role: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    if (role !== 'ADMIN' && review.reviewerId !== userId)
      throw new ForbiddenException('Cannot delete this review');

    await this.prisma.review.delete({ where: { id } });

    await this.updateRoomRating(review.roomId);

    return { message: 'Review deleted successfully' };
  }

  private async updateRoomRating(roomId: string) {
    const result = await this.prisma.review.aggregate({
      where: { roomId, isVerified: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.room.update({
      where: { id: roomId },
      data: {
        avgRating: result._avg.rating ?? 0,
        reviewCount: result._count.id,
      },
    });
  }

  private async analyzeSentiment(reviewId: string, comment: string) {
    try {
      const prompt = `Phân tích cảm xúc của đánh giá phòng trọ sau và trả về 1 trong 3 từ: "positive", "negative", "neutral". Chỉ trả về 1 từ duy nhất, không giải thích.      
Đánh giá: "${comment}"`;

      const result = await this.aiService.generateText(prompt);
      const sentiment = result.trim().toLowerCase();

      if (['positive', 'negative', 'neutral'].includes(sentiment)) {
        await this.prisma.review.update({
          where: { id: reviewId },
          data: { sentiment },
        });
      }
    } catch (error) {
      console.log('Sentinent analysis failed:', error);
    }
  }
}
