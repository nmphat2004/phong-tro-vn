import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FakeReviewResult {
  score: number;
  isSuspicious: boolean;
  action: 'approve' | 'flag' | 'reject';
  reasons: string[];
  details: Record<string, number>;
}

@Injectable()
export class FakeReviewService {
  constructor(private prisma: PrismaService) {}

  async analyze(
    reviewerId: string,
    roomId: string,
    rating: number,
    comment: string,
    createdAt?: Date,
    ipAddress?: string,
  ): Promise<FakeReviewResult> {
    const referenceTime = createdAt
      ? new Date(createdAt).getTime()
      : Date.now();

    const [reviewer, room, reviewHistory, sameIpReviews] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: reviewerId } }),
      this.prisma.room.findUnique({ where: { id: roomId } }),
      this.prisma.review.findMany({
        where: { reviewerId },
        orderBy: { createdAt: 'desc' },
      }),
      ipAddress
        ? this.prisma.review.findMany({
            where: {
              ipAddress,
              createdAt: {
                gte: new Date(referenceTime - 86400000), // 24 giờ qua
                lte: new Date(referenceTime),
              },
            },
            select: { reviewerId: true },
          })
        : Promise.resolve([]),
    ]);

    if (!reviewer || !room) return this.cleanResult();

    const details: Record<string, number> = {};
    const reasons: string[] = [];
    let score = 0;

    // ── Rule 1: Tài khoản quá mới (0–30đ) ──────────────────────
    const ageDays =
      (referenceTime - new Date(reviewer.createdAt).getTime()) / 86400000;
    if (ageDays < 1) {
      details.accountAge = 30;
      reasons.push('Tài khoản tạo trong 24 giờ');
    } else if (ageDays < 7) {
      details.accountAge = 15;
      reasons.push('Tài khoản tạo trong 7 ngày');
    } else {
      details.accountAge = 0;
    }
    score += details.accountAge;

    // ── Rule 2: Review ngay sau khi đăng ký (0–25đ) ─────────────
    const hoursSinceReg =
      (referenceTime - new Date(reviewer.createdAt).getTime()) / 3600000;
    if (hoursSinceReg < 1) {
      details.reviewTooSoon = 25;
      reasons.push('Review ngay sau khi tạo tài khoản (< 1 giờ)');
    } else if (hoursSinceReg < 6) {
      details.reviewTooSoon = 10;
      reasons.push('Review trong vòng 6 giờ đầu sau đăng ký');
    } else {
      details.reviewTooSoon = 0;
    }
    score += details.reviewTooSoon;

    // ── Rule 3: Tốc độ review bất thường (0–20đ) ─────────────────
    const last24h = reviewHistory.filter((r) => {
      const diff = referenceTime - new Date(r.createdAt).getTime();
      return diff >= 0 && diff < 86400000;
    }).length;
    if (last24h >= 5) {
      details.reviewSpeed = 20;
      reasons.push(`${last24h} review trong 24 giờ (bất thường)`);
    } else if (last24h >= 3) {
      details.reviewSpeed = 10;
      reasons.push(`${last24h} review trong 24 giờ`);
    } else {
      details.reviewSpeed = 0;
    }
    score += details.reviewSpeed;

    // ── Rule 4: Toàn 5 sao (0–15đ) ───────────────────────────────
    if (reviewHistory.length >= 3) {
      const allFive =
        reviewHistory.every((r) => r.rating === 5) && rating === 5;
      if (allFive) {
        details.allFiveStar = 15;
        reasons.push('Tất cả review đều 5 sao (bất thường)');
      } else {
        details.allFiveStar = 0;
      }
      score += details.allFiveStar;
    }

    // ── Rule 5: Comment quá ngắn / trống (0–15đ) ─────────────────
    if (!comment || comment.trim().length === 0) {
      details.shortComment = 10;
      reasons.push('Không có nội dung nhận xét');
    } else if (comment.trim().length < 15) {
      details.shortComment = 15;
      reasons.push('Nhận xét quá ngắn (dưới 15 ký tự)');
    } else {
      details.shortComment = 0;
    }
    score += details.shortComment;

    // ── Rule 6: Từ khóa spam (0–15đ) ─────────────────────────────
    const spamKeywords = [
      'tuyệt vời lắm',
      'hoàn hảo',
      'perfect',
      '10/10',
      'xuất sắc',
      'không chê vào đâu',
    ];
    const hasSpam =
      rating === 5 &&
      spamKeywords.some((k) => comment?.toLowerCase().includes(k));
    if (hasSpam) {
      details.spamKeyword = 15;
      reasons.push('Nội dung chứa từ khóa đánh giá ảo');
    } else {
      details.spamKeyword = 0;
    }
    score += details.spamKeyword;

    // ── Rule 7: Chủ trọ tự đánh giá (0–50đ) ─────────────────────
    if (room.ownerId === reviewerId) {
      details.selfReview = 50;
      reasons.push('Chủ trọ tự đánh giá phòng của mình');
    } else {
      details.selfReview = 0;
    }
    score += details.selfReview;

    // ── Rule 8: Nhiều tài khoản đánh giá từ cùng 1 IP (0-35đ) ─────────────────
    if (ipAddress && sameIpReviews.length > 0) {
      const uniqueReviewers = new Set(
        sameIpReviews
          .map((r) => r.reviewerId)
          .filter((id) => id !== reviewerId),
      );

      if (uniqueReviewers.size >= 3) {
        details.ipSharing = 35;
        reasons.push(
          `Phát hiện ${uniqueReviewers.size} tài khoản khác đánh giá từ cùng địa chỉ IP trong 24 giờ`,
        );
      } else if (uniqueReviewers.size >= 2) {
        details.ipSharing = 15;
        reasons.push(
          `Phát hiện ${uniqueReviewers.size} tài khoản khác đánh giá từ cùng địa chỉ IP trong 24 giờ`,
        );
      } else {
        details.ipSharing = 0;
      }
      score += details.ipSharing;
    }

    score = Math.min(100, score);

    return {
      score,
      isSuspicious: score >= 60,
      action: score >= 80 ? 'reject' : score >= 60 ? 'flag' : 'approve',
      reasons,
      details,
    };
  }

  private cleanResult(): FakeReviewResult {
    return {
      score: 0,
      isSuspicious: false,
      action: 'approve',
      reasons: [],
      details: {},
    };
  }
}
