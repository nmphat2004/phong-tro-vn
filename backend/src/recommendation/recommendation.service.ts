import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Trọng số cho từng nhóm feature trong cosine similarity
const WEIGHT_PRICE = 3;
const WEIGHT_AREA = 2;
const WEIGHT_AMENITY = 1;

interface UserProfile {
  avgPrice: number; // giá trung bình cho tất cả phòng đã thích cũng như đánh giá của user
  avgArea: number; // diện tích trung bình cho tất cả phòng đã thích cũng như đánh giá của user
  amenityFreq: Record<string, number>; // tần suất xuất hiện của các tiện ích
  amenitySet: string[]; // mảng chứ tên các tiện ích
  totalLiked: number; // tổng số phòng mà user đã thích và đánh giá cao
}

@Injectable()
export class RecommendationService {
  constructor(private prisma: PrismaService) {}

  async getRecommendations(userId: string, limit = 8) {
    // Lấy phòng user đã quan tâm
    const likedRooms = await this.getLikedRooms(userId);

    if (likedRooms.length === 0) {
      // Cold start — chưa có lịch sử → trả phòng nổi bật
      return this.getPopularRooms(limit);
    }

    // Xây dựng user profile
    const profile = this.buildUserProfile(likedRooms);

    // Lấy phòng candidate (chưa xem, còn trống, không phải phòng của chính user)
    const candidates = await this.prisma.room.findMany({
      where: {
        status: 'AVAILABLE',
        id: { notIn: likedRooms.map((r) => r.id) },
        ownerId: { not: userId },
      },
      orderBy: [{ avgRating: 'desc' }, { createdAt: 'desc' }],
      include: {
        images: true,
        amenities: { include: { amenity: true } },
        owner: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      take: 100,
    });

    // Tính Cosine Similarity cho từng candidate
    const scored = candidates
      .map((room) => ({
        room,
        score: this.cosineSimilarity(room, profile),
        reason: this.buildReason(room, profile),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      type: 'personalized',
      basedOn: `${likedRooms.length} phòng bạn đã quan tâm`,
      rooms: scored.map((s) => ({
        ...s.room,
        matchScore: Math.round(s.score * 100),
        matchReason: s.reason,
      })),
    };
  }

  // Lấy phòng user đã lưu + review tốt (≥ 4 sao)
  private async getLikedRooms(userId: string) {
    const [saved, reviewed] = await Promise.all([
      this.prisma.savedRoom.findMany({
        where: { userId },
        include: {
          room: { include: { amenities: { include: { amenity: true } } } },
        },
        take: 30,
      }),
      this.prisma.review.findMany({
        where: { reviewerId: userId, rating: { gte: 4 }, isVerified: true },
        include: {
          room: { include: { amenities: { include: { amenity: true } } } },
        },
        take: 20,
      }),
    ]);

    const all = [...saved.map((s) => s.room), ...reviewed.map((r) => r.room)]; // gộp phòng đã thích và phòng đánh giá cao thành 1 mảng

    // Loại trùng
    return all.filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i); // lọc ra các phòng trùng nhau chỉ lấy phòng có index đầu tiên và loại các phòng còn lại
  }

  // Xây dựng vector đặc trưng của người dùng
  private buildUserProfile(rooms: any[]): UserProfile {
    const prices = rooms.map((r) => Number(r.price)).filter(Boolean); // trả về 1 mảng chứa giá của các phòng và loại bỏ các giá trị ko hợp lệ
    const areas = rooms.map((r) => r.area).filter(Boolean);

    // Tần suất amenity trong phòng đã thích
    const amenityFreq: Record<string, number> = {};
    rooms.forEach((room) => {
      room.amenities?.forEach(({ amenity }: any) => {
        amenityFreq[amenity.name] = (amenityFreq[amenity.name] || 0) + 1;
        // duyệt qua tất cả các phòng trọ và tiện ích của phòng nếu có tiện ích sẽ cộng dồn
      });
    });

    return {
      avgPrice: prices.reduce((a, b) => a + b, 0) / (prices.length || 1), // tính toán giá trung bình của tất cả phòng
      avgArea: areas.reduce((a, b) => a + b, 0) / (areas.length || 1),
      amenityFreq,
      amenitySet: Object.keys(amenityFreq),
      totalLiked: rooms.length,
    };
  }

  // Weighted Cosine Similarity: cos(A,B) = A·B / (|A| × |B|)
  // Trọng số giúp price/area không bị amenities dominate
  private cosineSimilarity(room: any, profile: UserProfile): number {
    const roomAmenities = room.amenities?.map((a: any) => a.amenity.name) || [];

    // Tính max price/area từ profile để normalize tốt hơn
    const priceNorm = Math.max(profile.avgPrice, 1); // tránh trường hợp giá trung bình = 0
    const areaNorm = Math.max(profile.avgArea, 1);

    // Vector A — user profile (chuẩn hóa về [0, 1])
    const vectorA = [
      profile.avgPrice / priceNorm, // = 1.0 (anchor)
      profile.avgArea / areaNorm, // = 1.0 (anchor)
      ...profile.amenitySet.map(
        (a) => (profile.amenityFreq[a] || 0) / profile.totalLiked, // số lần tiện ích xuất hiện so với số phòng đã thích
      ),
    ];

    // Vector B — room features
    const vectorB = [
      Number(room.price) / priceNorm,
      (room.area || 20) / areaNorm,
      ...profile.amenitySet.map((a) => (roomAmenities.includes(a) ? 1 : 0)),
    ];

    // Trọng số cho từng chiều: price, area, rồi amenities
    const weights = [
      WEIGHT_PRICE,
      WEIGHT_AREA,
      ...profile.amenitySet.map(() => WEIGHT_AMENITY),
    ];

    // Tính weighted dot product và norm
    let dot = 0,
      normA = 0,
      normB = 0;
    const len = Math.min(vectorA.length, vectorB.length); // lấy vector có độ dài thấp nhất tránh trường hợp lỗi

    for (let i = 0; i < len; i++) {
      const w = weights[i] || 1;
      dot += w * vectorA[i] * vectorB[i]; // tính tích vô hướng của 2 vector bằng tổng các tích các vector nhân với trọng số
      normA += w * vectorA[i] ** 2; // tổng các bình phương của các phần tử vector A nhân với trọng số
      normB += w * vectorB[i] ** 2;
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB); // độ dài vector = căn bậc 2 tổng bình phương => tính mẫu số = tích độ dài 2 vector
    return denom > 0 ? Math.max(0, dot / denom) : 0; // tính cosin
  }

  // Giải thích lý do gợi ý
  private buildReason(room: any, profile: UserProfile): string {
    const reasons: string[] = [];
    const price = Number(room.price);
    const roomAmenities = room.amenities?.map((a: any) => a.amenity.name) || [];

    // Giá phù hợp (trong khoảng ±20%)
    if (profile.avgPrice > 0) {
      const diff = Math.abs(price - profile.avgPrice) / profile.avgPrice;
      if (diff < 0.2) reasons.push('giá phù hợp ngân sách');
    }

    // Amenity trùng với sở thích
    const matched = profile.amenitySet.filter(
      (a) =>
        roomAmenities.includes(a) &&
        profile.amenityFreq[a] / profile.totalLiked >= 0.5,
    );
    if (matched.length > 0) {
      reasons.push(`có ${matched.slice(0, 2).join(', ')}`);
    }

    // Rating tốt
    if (room.avgRating >= 4.0) reasons.push('đánh giá cao');

    return reasons.length > 0
      ? `Phù hợp vì: ${reasons.join(', ')}`
      : 'Phù hợp với sở thích của bạn';
  }

  // Phòng nổi bật (fallback khi chưa có lịch sử)
  async getPopularRooms(limit: number) {
    const rooms = await this.prisma.room.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: [{ avgRating: 'desc' }, { viewCount: 'desc' }],
      take: limit,
      include: {
        images: true,
        amenities: { include: { amenity: true } },
        owner: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    return {
      type: 'popular',
      basedOn: 'Phòng được quan tâm nhiều nhất',
      rooms: rooms.map((r) => ({
        ...r,
        matchScore: null,
        matchReason: 'Phòng nổi bật trên nền tảng',
      })),
    };
  }
}
