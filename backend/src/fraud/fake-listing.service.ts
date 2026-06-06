import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Interface định nghĩa cấu trúc dữ liệu kết quả phân tích tin đăng ảo
export interface FakeListingResult {
  score: number; // Điểm số đáng ngờ (từ 0 đến 100), điểm càng cao thì càng nghi ngờ là tin đăng ảo
  isSuspicious: boolean; // Đánh dấu tin đăng có đáng ngờ hay không (khi score >= 60)
  action: 'approve' | 'flag' | 'reject'; // Hành động xử lý: duyệt (approve), gắn cờ kiểm tra (flag), từ chối/ẩn (reject)
  reasons: string[]; // Danh sách lý do chi tiết tại sao tin đăng bị nghi ngờ
  details: Record<string, number>; // Điểm số chi tiết phạt được tính từ từng quy tắc (rule)
  duplicateRooms?: { id: string; title: string }[]; // Danh sách phòng bị trùng ảnh
}

@Injectable()
export class FakeListingService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // Hàm chính để phân tích một phòng trọ cụ thể dựa trên ID
  async analyzeRoom(roomId: string): Promise<FakeListingResult> {
    // Truy vấn thông tin chi tiết phòng trọ từ database, bao gồm thông tin chủ trọ, hình ảnh, tiện ích và đánh giá
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        owner: true,
        images: true,
        amenities: { include: { amenity: true } },
        reviews: true,
      },
    });

    // Nếu không tìm thấy phòng trọ tương ứng trong DB, trả về kết quả rỗng (mặc định là an toàn)
    if (!room) return this.cleanResult();

    const details: Record<string, number> = {}; // Đối tượng lưu chi tiết điểm phạt của từng tiêu chí
    const reasons: string[] = []; // Danh sách các lý do vi phạm được tích lũy
    let score = 0; // Tổng điểm phạt tích lũy

    // ── Rule 1: Đánh giá dựa trên độ tuổi tài khoản của chủ trọ tại thời điểm đăng tin (0–25 điểm) ──
    // Tính toán số ngày từ lúc chủ trọ tạo tài khoản đến thời điểm đăng tin phòng này (86400000 ms = 1 ngày)
    const accountAgeDays =
      (new Date(room.createdAt).getTime() -
        new Date(room.owner.createdAt).getTime()) /
      86400000;
    if (accountAgeDays < 1) {
      details.newAccount = 25; // Nếu tài khoản mới tạo dưới 24 giờ: phạt tối đa 25 điểm
      reasons.push('Tài khoản chủ trọ tạo trong vòng 24 giờ');
    } else if (accountAgeDays < 7) {
      details.newAccount = 15; // Nếu tài khoản mới tạo dưới 7 ngày: phạt 15 điểm
      reasons.push('Tài khoản chủ trọ tạo trong vòng 7 ngày');
    } else {
      details.newAccount = 0; // Tài khoản tạo trên 7 ngày: không phạt điểm
    }
    score += details.newAccount; // Cộng điểm phạt của Rule 1 vào tổng điểm

    // ── Rule 2: Giá cả bất thường (quá rẻ hoặc quá đắt) so với khu vực (0–25 điểm) ──
    // Gọi hàm phụ để kiểm tra sự chênh lệch giá so với trung bình khu vực xung quanh
    const priceAnomaly = await this.checkPriceAnomaly(room);
    details.priceAnomaly = priceAnomaly.score; // Gán điểm phạt từ kết quả kiểm tra giá
    if (priceAnomaly.score > 0) reasons.push(priceAnomaly.reason); // Nếu có lỗi giá, thêm lý do tương ứng vào danh sách
    score += priceAnomaly.score; // Cộng điểm phạt của Rule 2 vào tổng điểm

    // ── Rule 3: Thiếu thông tin hoặc hình ảnh xác thực quan trọng (0–20 điểm) ──
    let missingScore = 0; // Biến tạm tính tổng điểm phạt thiếu thông tin
    if (!room.description || room.description.length < 50) {
      missingScore += 10; // Phạt 10 điểm nếu thiếu mô tả hoặc mô tả quá sơ sài
      reasons.push('Mô tả quá ngắn hoặc không có');
    }
    // Kiểm tra số lượng ảnh đăng tải của phòng trọ
    if (room.images.length === 0) {
      missingScore += 15; // Không đăng ảnh nào: phạt nặng 15 điểm
      reasons.push('Không có ảnh đính kèm');
    } else if (room.images.length === 1) {
      missingScore += 15; // Chỉ đăng đúng 1 ảnh: phạt 15 điểm (dễ là tin đăng ảo lấy bừa 1 ảnh trên mạng)
      reasons.push('Chỉ có 1 ảnh đính kèm (nghi ngờ tin đăng ảo)');
    } else if (room.images.length === 2) {
      missingScore += 8; // Chỉ đăng đúng 2 ảnh: phạt 8 điểm (quá ít thông tin trực quan cho khách thuê)
      reasons.push('Chỉ có 2 ảnh đính kèm (ít thông tin xác thực)');
    }
    // Kiểm tra xem tin đăng có tọa độ địa điểm (lat/lng) trên bản đồ hay không
    if (!room.lat || !room.lng) {
      missingScore += 5; // Không định vị trên bản đồ: phạt 5 điểm
      reasons.push('Không có tọa độ địa chỉ');
    }
    details.missingInfo = missingScore; // Lưu tổng điểm phạt thiếu thông tin của Rule 3
    score += missingScore; // Cộng điểm phạt của Rule 3 vào tổng điểm

    // ── Rule 4: Tiêu đề chứa các từ khóa giật gân, spam quảng cáo (0–15 điểm) ──
    const spamKeywords = [
      'siêu rẻ',
      'free',
      'miễn phí',
      'cực rẻ',
      'không tưởng',
      'giảm sốc',
    ];
    // Kiểm tra xem tiêu đề (chuyển về chữ thường) có chứa bất kỳ từ khóa spam nào ở trên hay không
    const hasSpam = spamKeywords.some((k) =>
      room.title.toLowerCase().includes(k),
    );
    if (hasSpam) {
      details.spamTitle = 15; // Nếu chứa từ khóa clickbait: phạt 15 điểm
      reasons.push('Tiêu đề chứa từ khóa clickbait');
    } else {
      details.spamTitle = 0; // Tiêu đề bình thường: không phạt
    }
    score += details.spamTitle; // Cộng điểm phạt của Rule 4 vào tổng điểm

    // ── Rule 5: Chủ trọ đăng số lượng tin đăng nhiều bất thường trong thời gian ngắn (0–15 điểm) ──
    // Đếm số phòng trọ mà chủ này đã tạo trong vòng 7 ngày trước thời điểm đăng tin phòng này (7 * 86400000 ms)
    const ownerRoomCount = await this.prisma.room.count({
      where: {
        ownerId: room.ownerId,
        createdAt: {
          gte: new Date(new Date(room.createdAt).getTime() - 7 * 86400000),
          lte: new Date(room.createdAt),
        },
      },
    });
    if (ownerRoomCount > 10) {
      details.bulkPosting = 15; // Đăng trên 10 tin trong 1 tuần: phạt tối đa 15 điểm (biểu hiện của spam)
      reasons.push(`Đăng ${ownerRoomCount} phòng trong 7 ngày (bất thường)`);
    } else if (ownerRoomCount > 5) {
      details.bulkPosting = 8; // Đăng trên 5 tin trong 1 tuần: phạt 8 điểm
      reasons.push(`Đăng ${ownerRoomCount} phòng trong 7 ngày`);
    } else {
      details.bulkPosting = 0; // Đăng dưới hoặc bằng 5 tin: không phạt điểm
    }
    score += details.bulkPosting; // Cộng điểm phạt của Rule 5 vào tổng điểm

    // ── Rule 6: Ảnh trùng lặp với phòng khác trong hệ thống (0–20 điểm) ──
    // Lọc lấy danh sách các mã băm ảnh (image hashes) hợp lệ từ các ảnh của phòng hiện tại
    const imageHashes = room.images
      .map((img) => img.hash)
      .filter((h): h is string => !!h);

    let duplicateScore = 0; // Khởi tạo điểm phạt trùng ảnh
    let duplicateRooms: { id: string; title: string }[] = [];
    if (imageHashes.length > 0) {
      // Tìm kiếm xem các mã băm ảnh này có xuất hiện ở các phòng trọ khác trong DB hay không
      const duplicateImages = await this.prisma.roomImage.findMany({
        where: {
          hash: { in: imageHashes }, // Mã băm trùng với danh sách của phòng hiện tại
          roomId: { not: room.id }, // Không thuộc về phòng trọ đang phân tích này
          room: {
            createdAt: { lt: room.createdAt }, // Chỉ phạt phòng tạo sau nếu trùng ảnh với phòng đầu
          },
        },
        select: {
          hash: true,
          roomId: true,
          room: {
            select: { title: true, ownerId: true },
          },
        },
      });

      if (duplicateImages.length > 0) {
        // Gom danh sách các phòng trọ khác bị trùng ảnh (sử dụng Set để loại bỏ ID phòng bị trùng lặp)
        const uniqueRooms = new Set(duplicateImages.map((d) => d.roomId));
        const duplicateCount = duplicateImages.length; // Số lượng ảnh bị trùng

        duplicateRooms = Array.from(
          new Map(
            duplicateImages.map((img) => [
              img.roomId,
              { id: img.roomId, title: img.room.title },
            ]),
          ).values(),
        );

        // Kiểm tra xem có trùng ảnh của chủ phòng khác không
        const hasDifferentOwnerDuplicate = duplicateImages.some(
          (img) => img.room?.ownerId !== room.ownerId,
        );

        if (hasDifferentOwnerDuplicate) {
          duplicateScore = 60; // Phạt nặng 60 điểm nếu trùng ảnh từ phòng của chủ trọ khác (đảm bảo bị gắn cờ nghi ngờ)
          reasons.push(
            `Phát hiện trùng lặp ${duplicateCount} ảnh từ phòng của chủ trọ khác (nghi ngờ giả mạo tin đăng)`,
          );
        } else if (duplicateCount >= 3) {
          duplicateScore = 20; // Trùng từ 3 ảnh trở lên của chính mình: phạt tối đa 20 điểm
          reasons.push(
            `${duplicateCount} ảnh trùng lặp với ${uniqueRooms.size} tin đăng khác của bạn`,
          );
        } else {
          duplicateScore = 15; // Trùng ít hơn 3 ảnh của chính mình: phạt 15 điểm
          reasons.push(
            `${duplicateCount} ảnh trùng lặp với ${uniqueRooms.size} tin đăng khác của bạn`,
          );
        }
      }
    }
    details.duplicateImages = duplicateScore; // Lưu điểm phạt trùng ảnh của Rule 6
    score += duplicateScore; // Cộng điểm phạt của Rule 6 vào tổng điểm

    // Đảm bảo tổng điểm phạt tối đa không bao giờ vượt quá 100 điểm
    score = Math.min(100, score);

    // Xác định trạng thái phòng trọ mong muốn dựa trên điểm phạt:
    let expectedStatus =
      score >= 80 ? 'HIDDEN' : score >= 60 ? 'PENDING' : 'AVAILABLE';

    // Nếu phòng đang ở trạng thái RENTED, và dự kiến là AVAILABLE, giữ nguyên RENTED
    if (room.status === 'RENTED' && expectedStatus === 'AVAILABLE') {
      expectedStatus = 'RENTED';
    }

    // Nếu trạng thái hiện tại trên DB khác với trạng thái dự kiến, cập nhật ngay
    if (room.status !== expectedStatus) {
      await this.prisma.room.update({
        where: { id: roomId },
        data: { status: expectedStatus as any },
      });

      const targetType =
        expectedStatus === 'HIDDEN'
          ? 'ROOM_HIDDEN_FRAUD'
          : expectedStatus === 'PENDING'
            ? 'ROOM_PENDING_FRAUD'
            : 'ROOM_APPROVED_FRAUD';

      // Kiểm tra thông báo gần đây nhất của phòng để tránh lặp lại khi F5
      const latestNotification = await this.prisma.notification.findFirst({
        where: {
          userId: room.ownerId,
          link: `/rooms/${room.id}`,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!latestNotification || latestNotification.type !== targetType) {
        // Gửi thông báo tương ứng với trạng thái mới
        if (expectedStatus === 'HIDDEN') {
          await this.notificationsService.create({
            userId: room.ownerId,
            type: 'ROOM_HIDDEN_FRAUD',
            title: 'Tin đăng đã bị ẩn do vi phạm',
            content: `Tin đăng "${room.title}" đã bị ẩn tự động vì điểm nghi ngờ quá cao (${score}/100).`,
            link: `/rooms/${room.id}`,
          });
        } else if (expectedStatus === 'PENDING') {
          await this.notificationsService.create({
            userId: room.ownerId,
            type: 'ROOM_PENDING_FRAUD',
            title: 'Tin đăng chờ kiểm duyệt',
            content: `Tin đăng "${room.title}" có dấu hiệu vi phạm (${score}/100) và đang chờ admin kiểm duyệt. Bạn hãy chỉnh sửa lại tin để hệ thống tự động kiểm tra lại.`,
            link: `/rooms/${room.id}`,
          });
        } else if (expectedStatus === 'AVAILABLE') {
          await this.notificationsService.create({
            userId: room.ownerId,
            type: 'ROOM_APPROVED_FRAUD',
            title: 'Tin đăng đã hoạt động',
            content: `Tin đăng "${room.title}" đã được duyệt hoạt động bình thường trên hệ thống.`,
            link: `/rooms/${room.id}`,
          });
        }
      }
    }

    // Trả về kết quả phân tích đầy đủ cho phía gọi API sử dụng
    return {
      score,
      isSuspicious: score >= 60, // Đánh dấu là đáng ngờ nếu điểm số đạt từ 60 trở lên
      // Phân loại hành động: từ chối (reject) nếu điểm >= 80, gắn cờ kiểm tra (flag) nếu >= 60, duyệt luôn (approve) nếu dưới 60
      action: score >= 80 ? 'reject' : score >= 60 ? 'flag' : 'approve',
      reasons,
      details,
      duplicateRooms,
    };
  }

  // Hàm phụ kiểm tra giá bất thường so với giá trung bình thị trường cùng quận/huyện VÀ cùng loại phòng
  private async checkPriceAnomaly(
    room: any,
  ): Promise<{ score: number; reason: string }> {
    // Trích xuất quận/huyện từ chuỗi địa chỉ đầy đủ của phòng trọ
    const district = this.extractDistrict(room.address);
    if (!district) return { score: 0, reason: '' }; // Không tìm thấy quận/huyện: bỏ qua, không tính điểm phạt

    // Tìm kiếm các phòng trọ tương tự trong cùng quận/huyện VÀ cùng loại phòng để so sánh giá cả
    // Việc lọc theo loại phòng (type) giúp tránh so sánh chéo giữa ký túc xá với căn hộ cao cấp,
    // vì mỗi loại phòng có mức giá trung bình rất khác nhau
    const similar = await this.prisma.room.findMany({
      where: {
        id: { not: room.id }, // Không so sánh với chính phòng hiện tại
        address: { contains: district, mode: 'insensitive' }, // Cùng quận/huyện (so sánh không phân biệt chữ hoa/thường)
        type: room.type, // Chỉ so sánh với các phòng cùng loại (ký túc xá so với ký túc xá, căn hộ so với căn hộ...)
        // Diện tích phòng trọ tương tự nằm trong khoảng từ 70% đến 130% so với phòng đang xét
        area: room.area
          ? { gte: room.area * 0.7, lte: room.area * 1.3 }
          : undefined,
        status: { not: 'HIDDEN' }, // Chỉ lấy các phòng đang hiển thị bình thường
      },
      select: { price: true },
      take: 20, // Chỉ lấy tối đa 20 phòng tương tự làm mẫu đối chứng
    });

    // Nếu không tìm được tối thiểu 3 phòng tương tự (cùng loại, cùng quận) để đối chiếu thì không đủ cơ sở dữ liệu -> bỏ qua
    if (similar.length < 3) return { score: 0, reason: '' };

    // Chuyển đổi giá của danh sách phòng tương tự sang kiểu số và tính giá trung bình
    const prices = similar.map((r) => Number(r.price));
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const roomPrice = Number(room.price);
    // Tính tỷ lệ chênh lệch giá giữa phòng hiện tại với trung bình khu vực (cùng loại phòng)
    const diff = (roomPrice - avgPrice) / avgPrice;

    // Nếu giá phòng hiện tại quá rẻ (thấp hơn giá trung bình khu vực trên 50%)
    if (diff < -0.5) {
      return {
        score: 25, // Phạt tối đa 25 điểm (nghi vấn chiêu trò đăng giá cực rẻ để câu tương tác)
        reason: `Giá thấp hơn thị trường ${Math.round(Math.abs(diff) * 100)}% (quá bất thường)`,
      };
    }
    // Nếu giá phòng hiện tại quá đắt (cao hơn giá trung bình khu vực trên 100% - tức đắt gấp đôi trở lên)
    if (diff > 1.0) {
      return {
        score: 10, // Phạt 10 điểm (nghi vấn tin ảo, tuy nhiên ít nghiêm trọng hơn tin siêu rẻ)
        reason: `Giá cao hơn thị trường ${Math.round(diff * 100)}%`,
      };
    }
    // Nếu giá chênh lệch nằm trong ngưỡng bình thường: không phạt điểm
    return { score: 0, reason: '' };
  }

  // Hàm phụ trích xuất tên Quận/Huyện từ chuỗi địa chỉ sử dụng biểu thức chính quy (Regex)
  private extractDistrict(address: string): string {
    const match = address.match(
      /Quận\s+\d+|Quận\s+[A-Za-zÀ-ỹ]+|Bình Thạnh|Gò Vấp|Tân Bình|Phú Nhuận/i,
    );
    return match ? match[0] : ''; // Trả về cụm từ khớp đầu tiên tìm được (ví dụ "Quận 10", "Bình Thạnh") hoặc chuỗi rỗng
  }

  // Hàm phụ trả về đối tượng kết quả mặc định khi dữ liệu phòng không hợp lệ
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
