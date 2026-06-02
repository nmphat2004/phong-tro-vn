import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FakeListingService } from '../fraud/fake-listing.service';
import { FakeReviewService } from '../fraud/fake-review.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private fakeListingService: FakeListingService,
    private fakeReviewService: FakeReviewService,
  ) {}

  async getStats() {
    const [
      totalUsers,
      totalRooms,
      totalReviews,
      pendingReports,
      flaggedReviews,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isDeleted: false } }),
      this.prisma.room.count(),
      this.prisma.review.count(),
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.review.count({ where: { isVerified: false } }),
    ]);
    return {
      totalUsers,
      totalRooms,
      totalReviews,
      pendingReports,
      flaggedReviews,
    };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        isDeleted: true,
        isVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleUserBan(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Không thể khóa/mở khóa tài khoản Admin');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isDeleted: !user.isDeleted },
    });
  }

  async toggleUserVerification(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { isVerified: !user.isVerified },
    });
  }

  async getRooms(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { fullName: true, email: true } },
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
      this.prisma.room.count(),
    ]);

    // Auto-analyze fraud for each room
    const roomsWithFraud = await Promise.all(
      rooms.map(async (room) => {
        try {
          const fraudResult = await this.fakeListingService.analyzeRoom(
            room.id,
          );
          return { ...room, fraudResult };
        } catch {
          return { ...room, fraudResult: null };
        }
      }),
    );

    return {
      data: roomsWithFraud,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async changeRoomStatus(id: string, status: 'AVAILABLE' | 'HIDDEN') {
    return this.prisma.room.update({
      where: { id },
      data: { status },
    });
  }

  async removeRoom(id: string) {
    return this.prisma.room.delete({ where: { id } });
  }

  async analyzeRoomFraud(roomId: string) {
    return this.fakeListingService.analyzeRoom(roomId);
  }

  async getReviews(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, title: true } },
        },
      }),
      this.prisma.review.count(),
    ]);

    // Auto-analyze fraud for each review
    const reviewsWithFraud = await Promise.all(
      reviews.map(async (review) => {
        try {
          const fraudResult = await this.fakeReviewService.analyze(
            review.reviewerId,
            review.roomId,
            review.rating,
            review.comment || '',
            review.createdAt,
            review.ipAddress || undefined,
          );
          return { ...review, fraudResult };
        } catch {
          return { ...review, fraudResult: null };
        }
      }),
    );

    return {
      data: reviewsWithFraud,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async analyzeReviewFraud(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.fakeReviewService.analyze(
      review.reviewerId,
      review.roomId,
      review.rating,
      review.comment || '',
      review.createdAt,
      review.ipAddress || undefined,
    );
  }

  async changeReviewStatus(id: string, isVerified: boolean) {
    const review = await this.prisma.review.update({
      where: { id },
      data: { isVerified },
    });
    await this.updateRoomRating(review.roomId);
    return review;
  }

  async removeReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

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

  // --- Reports Management ---
  async getReports(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          room: { select: { id: true, title: true } },
          reporter: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.report.count(),
    ]);

    return {
      data: reports,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateReportStatus(id: string, status: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');

    return this.prisma.report.update({
      where: { id },
      data: { status },
    });
  }
}
