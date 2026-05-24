import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FakeListingResult {
  score: number; // 0–100, cao = nghi ngờ
  isSuspicious: boolean; // score >= 60
  action: 'approve' | 'flag' | 'reject';
  reasons: string[];
  details: Record<string, number>; // điểm từng rule
}

@Injectable()
export class FakeListingService {
  constructor(private prisma: PrismaService) {}

  async analyzeRoom(roomId: string): Promise<FakeListingResult> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: true,
        images: true,
        amenities: { include: { amenity: true } },
        reviews: true,
      },
    });

    if (!room) return this.cleanResult();

    const details: Record<string, number> = {};
    const reasons: string[] = [];
    let score = 0;

    // ── Rule 1: Chủ trọ mới tạo tài khoản (0–25đ) ──────────────
    const accountAgeDays =
      (Date.now() - new Date(room.owner.createdAt).getTime()) / 86400000;
    if (accountAgeDays < 1) {
      details.newAccount = 25;
      reasons.push('Tài khoản chủ trọ tạo trong vòng 24 giờ');
    } else if (accountAgeDays < 7) {
      details.newAccount = 15;
      reasons.push('Tài khoản chủ trọ tạo trong vòng 7 ngày');
    } else {
      details.newAccount = 0;
    }
    score += details.newAccount;

    // ── Rule 2: Giá bất thường so với khu vực (0–25đ) ──────────
    const priceAnomaly = await this.checkPriceAnomaly(room);
    details.priceAnomaly = priceAnomaly.score;
    if (priceAnomaly.score > 0) reasons.push(priceAnomaly.reason);
    score += priceAnomaly.score;

    // ── Rule 3: Thiếu thông tin quan trọng (0–20đ) ──────────────
    let missingScore = 0;
    if (!room.description || room.description.length < 50) {
      missingScore += 10;
      reasons.push('Mô tả quá ngắn hoặc không có');
    }
    if (room.images.length === 0) {
      missingScore += 15;
      reasons.push('Không có ảnh đính kèm');
    } else if (room.images.length === 1) {
      missingScore += 15;
      reasons.push('Chỉ có 1 ảnh đính kèm (nghi ngờ tin đăng ảo)');
    } else if (room.images.length === 2) {
      missingScore += 8;
      reasons.push('Chỉ có 2 ảnh đính kèm (ít thông tin xác thực)');
    }
    if (!room.lat || !room.lng) {
      missingScore += 5;
      reasons.push('Không có tọa độ địa chỉ');
    }
    details.missingInfo = missingScore;
    score += missingScore;

    // ── Rule 4: Tiêu đề có từ khóa spam (0–15đ) ────────────────
    const spamKeywords = [
      'siêu rẻ',
      'free',
      'miễn phí',
      'cực rẻ',
      'không tưởng',
      'giảm sốc',
    ];
    const hasSpam = spamKeywords.some((k) =>
      room.title.toLowerCase().includes(k),
    );
    if (hasSpam) {
      details.spamTitle = 15;
      reasons.push('Tiêu đề chứa từ khóa clickbait');
    } else {
      details.spamTitle = 0;
    }
    score += details.spamTitle;

    // ── Rule 5: Chủ trọ đăng nhiều phòng bất thường (0–15đ) ────
    const ownerRoomCount = await this.prisma.room.count({
      where: {
        ownerId: room.ownerId,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) }, // trong 7 ngày
      },
    });
    if (ownerRoomCount > 10) {
      details.bulkPosting = 15;
      reasons.push(`Đăng ${ownerRoomCount} phòng trong 7 ngày (bất thường)`);
    } else if (ownerRoomCount > 5) {
      details.bulkPosting = 8;
      reasons.push(`Đăng ${ownerRoomCount} phòng trong 7 ngày`);
    } else {
      details.bulkPosting = 0;
    }
    score += details.bulkPosting;

    score = Math.min(100, score);

    // Cập nhật DB nếu cần flag
    if (score >= 60) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: score >= 80 ? 'HIDDEN' : 'AVAILABLE' },
      });
    }

    return {
      score,
      isSuspicious: score >= 60,
      action: score >= 80 ? 'reject' : score >= 60 ? 'flag' : 'approve',
      reasons,
      details,
    };
  }

  // Kiểm tra giá có bất thường so với phòng cùng khu vực không
  private async checkPriceAnomaly(
    room: any,
  ): Promise<{ score: number; reason: string }> {
    const district = this.extractDistrict(room.address);
    if (!district) return { score: 0, reason: '' };

    const similar = await this.prisma.room.findMany({
      where: {
        id: { not: room.id },
        address: { contains: district, mode: 'insensitive' },
        area: room.area
          ? { gte: room.area * 0.7, lte: room.area * 1.3 }
          : undefined,
        status: { not: 'HIDDEN' },
      },
      select: { price: true },
      take: 20,
    });

    if (similar.length < 3) return { score: 0, reason: '' };

    const prices = similar.map((r) => Number(r.price));
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const roomPrice = Number(room.price);
    const diff = (roomPrice - avgPrice) / avgPrice;

    if (diff < -0.5) {
      return {
        score: 25,
        reason: `Giá thấp hơn thị trường ${Math.round(Math.abs(diff) * 100)}% (quá bất thường)`,
      };
    }
    if (diff > 1.0) {
      return {
        score: 10,
        reason: `Giá cao hơn thị trường ${Math.round(diff * 100)}%`,
      };
    }
    return { score: 0, reason: '' };
  }

  private extractDistrict(address: string): string {
    const match = address.match(
      /Quận\s+\d+|Quận\s+[A-Za-zÀ-ỹ]+|Bình Thạnh|Gò Vấp|Tân Bình|Phú Nhuận/i,
    );
    return match ? match[0] : '';
  }

  private cleanResult(): FakeListingResult {
    return {
      score: 0,
      isSuspicious: false,
      action: 'approve',
      reasons: [],
      details: {},
    };
  }
}
