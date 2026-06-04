import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Định nghĩa Interface đại diện cho kết quả phân tích mức độ nghi ngờ của một đánh giá (review)
export interface FakeReviewResult {
  score: number; // Điểm số nghi ngờ đánh giá ảo (từ 0 đến 100). Điểm càng cao thì độ nghi ngờ càng lớn.
  isSuspicious: boolean; // Trạng thái đánh giá đáng ngờ hay không (true nếu score >= 60)
  action: 'approve' | 'flag' | 'reject'; // Hành động đề xuất: duyệt (approve), gắn cờ nghi ngờ (flag), hoặc từ chối/ẩn (reject)
  reasons: string[]; // Danh sách các lý do (chuỗi văn bản) giải thích tại sao đánh giá bị phạt điểm
  details: Record<string, number>; // Điểm số phạt chi tiết cho từng quy tắc (rule) phân tích
}

@Injectable()
export class FakeReviewService {
  // Inject PrismaService để thực hiện các truy vấn dữ liệu từ cơ sở dữ liệu (Database)
  constructor(private prisma: PrismaService) {}

  // Hàm chính dùng để phân tích mức độ trung thực của một đánh giá
  async analyze(
    reviewerId: string, // ID của người viết đánh giá
    roomId: string, // ID của phòng trọ được đánh giá
    rating: number, // Số sao đánh giá (từ 1 đến 5 sao)
    comment: string, // Nội dung văn bản của đánh giá
    createdAt?: Date, // Thời gian tạo đánh giá (tùy chọn, dùng để giả lập hoặc kiểm tra)
    ipAddress?: string, // Địa chỉ IP của người gửi đánh giá (tùy chọn, dùng để phát hiện spam cùng mạng)
  ): Promise<FakeReviewResult> {
    // Xác định mốc thời gian tham chiếu để tính toán. Nếu truyền createdAt thì dùng nó, ngược lại lấy thời gian hiện tại.
    const referenceTime = createdAt
      ? new Date(createdAt).getTime()
      : Date.now();

    // Thực hiện truy vấn đồng thời (Promise.all) các thông tin cần thiết từ database để tối ưu hiệu năng
    const [reviewer, room, reviewHistory, sameIpReviews] = await Promise.all([
      // 1. Tìm kiếm thông tin người đánh giá (để lấy ngày tạo tài khoản)
      this.prisma.user.findUnique({ where: { id: reviewerId } }),
      // 2. Tìm kiếm thông tin phòng trọ (để lấy ID của chủ trọ, phục vụ kiểm tra tự review)
      this.prisma.room.findUnique({ where: { id: roomId } }),
      // 3. Lấy lịch sử tất cả các đánh giá mà tài khoản này đã từng viết, sắp xếp giảm dần theo thời gian tạo
      this.prisma.review.findMany({
        where: { reviewerId },
        orderBy: { createdAt: 'desc' },
      }),
      // 4. Nếu có địa chỉ IP, tìm các đánh giá được gửi từ cùng IP này trong vòng 24 giờ trước thời điểm tham chiếu
      ipAddress
        ? this.prisma.review.findMany({
            where: {
              ipAddress,
              createdAt: {
                gte: new Date(referenceTime - 86400000), // Lớn hơn hoặc bằng (gte) thời điểm tham chiếu trừ 24 giờ (86,400,000 ms)
                lte: new Date(referenceTime), // Nhỏ hơn hoặc bằng (lte) thời điểm tham chiếu
              },
            },
            select: { reviewerId: true }, // Chỉ cần lấy trường reviewerId để đối chiếu danh sách các tài khoản khác nhau
          })
        : Promise.resolve([]), // Nếu không cung cấp IP, trả về mảng rỗng qua Promise.resolve
    ]);

    // Nếu không tìm thấy thông tin người dùng hoặc thông tin phòng trọ trong hệ thống, trả về kết quả mặc định an toàn
    if (!reviewer || !room) return this.cleanResult();

    const details: Record<string, number> = {}; // Đối tượng lưu điểm số phạt của từng quy tắc
    const reasons: string[] = []; // Mảng chứa mô tả lý do vi phạm chi tiết
    let score = 0; // Khởi tạo tổng điểm phạt tích lũy ban đầu bằng 0

    // ── Rule 1: Tài khoản quá mới (0–30 điểm) ──────────────────────
    // Tính toán số ngày tuổi của tài khoản người đánh giá kể từ khi tạo cho đến mốc thời gian tham chiếu
    const ageDays =
      (referenceTime - new Date(reviewer.createdAt).getTime()) / 86400000; // Chia cho 86,400,000 ms để đổi sang đơn vị ngày
    if (ageDays < 1) {
      details.accountAge = 30; // Tài khoản tạo chưa đầy 24 giờ: phạt tối đa 30 điểm
      reasons.push('Tài khoản tạo trong 24 giờ'); // Ghi nhận lý do
    } else if (ageDays < 7) {
      details.accountAge = 15; // Tài khoản tạo chưa đầy 7 ngày: phạt 15 điểm
      reasons.push('Tài khoản tạo trong 7 ngày'); // Ghi nhận lý do
    } else {
      details.accountAge = 0; // Tài khoản trên 7 ngày: không phạt điểm
    }
    score += details.accountAge; // Cộng dồn điểm phạt của Rule 1 vào tổng điểm

    // ── Rule 2: Đăng đánh giá quá sớm sau khi đăng ký tài khoản (0–25 điểm) ─────────────
    // Tính số giờ chênh lệch từ lúc tạo tài khoản đến lúc viết đánh giá này
    const hoursSinceReg =
      (referenceTime - new Date(reviewer.createdAt).getTime()) / 3600000; // Chia cho 3,600,000 ms để đổi sang đơn vị giờ
    if (hoursSinceReg < 1) {
      details.reviewTooSoon = 25; // Viết đánh giá trong vòng 1 giờ đầu tiên: phạt nặng 25 điểm (nghi vấn spammer/bot)
      reasons.push('Review ngay sau khi tạo tài khoản (< 1 giờ)'); // Ghi nhận lý do
    } else if (hoursSinceReg < 6) {
      details.reviewTooSoon = 10; // Viết đánh giá trong vòng 6 giờ đầu tiên: phạt 10 điểm
      reasons.push('Review trong vòng 6 giờ đầu sau đăng ký'); // Ghi nhận lý do
    } else {
      details.reviewTooSoon = 0; // Sau 6 giờ: không phạt điểm
    }
    score += details.reviewTooSoon; // Cộng dồn điểm phạt của Rule 2 vào tổng điểm

    // ── Rule 3: Tốc độ/Tần suất đánh giá bất thường (0–20 điểm) ─────────────────
    // Lọc ra các đánh giá trong lịch sử của người dùng này được tạo ra trong vòng 24 giờ trước thời điểm tham chiếu
    const last24h = reviewHistory.filter((r) => {
      const diff = referenceTime - new Date(r.createdAt).getTime(); // Tính khoảng cách thời gian giữa 2 đánh giá
      return diff >= 0 && diff < 86400000; // Trả về true nếu nằm trong khoảng từ 0 đến 24 giờ (86,400,000 ms)
    }).length; // Đếm tổng số đánh giá thỏa mãn điều kiện trên
    if (last24h >= 5) {
      details.reviewSpeed = 20; // Có từ 5 đánh giá trở lên trong 24 giờ: phạt tối đa 20 điểm (hành vi spam rõ rệt)
      reasons.push(`${last24h} review trong 24 giờ (bất thường)`); // Ghi nhận lý do kèm số lượng
    } else if (last24h >= 3) {
      details.reviewSpeed = 10; // Có từ 3 đến 4 đánh giá trong 24 giờ: phạt 10 điểm
      reasons.push(`${last24h} review trong 24 giờ`); // Ghi nhận lý do kèm số lượng
    } else {
      details.reviewSpeed = 0; // Dưới 3 đánh giá trong ngày: bình thường, không phạt điểm
    }
    score += details.reviewSpeed; // Cộng dồn điểm phạt của Rule 3 vào tổng điểm

    // ── Rule 4: Xu hướng toàn đánh giá 5 sao (0–15 điểm) ───────────────────────────────
    // Chỉ kiểm tra khi tài khoản đã thực hiện tối thiểu 3 đánh giá trong lịch sử
    if (reviewHistory.length >= 3) {
      // Kiểm tra xem tất cả các đánh giá cũ có đạt 5 sao hay không, đồng thời đánh giá hiện tại cũng phải là 5 sao
      const allFive =
        reviewHistory.every((r) => r.rating === 5) && rating === 5;
      if (allFive) {
        details.allFiveStar = 15; // Đúng là toàn bộ đánh giá đạt 5 sao: phạt 15 điểm (nghi vấn seeding ảo hàng loạt)
        reasons.push('Tất cả review đều 5 sao (bất thường)'); // Ghi nhận lý do
      } else {
        details.allFiveStar = 0; // Có sự đan xen điểm số khác: không phạt điểm
      }
      score += details.allFiveStar; // Cộng dồn điểm phạt của Rule 4 vào tổng điểm
    }

    // ── Rule 5: Nội dung đánh giá quá ngắn hoặc để trống (0–15 điểm) ─────────────────
    if (!comment || comment.trim().length === 0) {
      details.shortComment = 10; // Đánh giá hoàn toàn trống hoặc chỉ chứa khoảng trắng: phạt 10 điểm
      reasons.push('Không có nội dung nhận xét'); // Ghi nhận lý do
    } else if (comment.trim().length < 15) {
      details.shortComment = 15; // Đánh giá có nội dung nhưng quá ngắn (dưới 15 ký tự): phạt tối đa 15 điểm (đánh giá hời hợt, vô nghĩa)
      reasons.push('Nhận xét quá ngắn (dưới 15 ký tự)'); // Ghi nhận lý do
    } else {
      details.shortComment = 0; // Nội dung đủ dài: không phạt điểm
    }
    score += details.shortComment; // Cộng dồn điểm phạt của Rule 5 vào tổng điểm

    // ── Rule 6: Nội dung chứa các từ khóa spam quảng cáo/seeding (0–15 điểm) ─────────────────
    // Danh sách từ khóa rập khuôn, cường điệu hóa hay được dùng khi seeding đánh giá ảo
    const spamKeywords = [
      'tuyệt vời lắm',
      'hoàn hảo',
      'perfect',
      '10/10',
      'xuất sắc',
      'không chê vào đâu',
    ];
    // Kiểm tra xem đánh giá này có đạt 5 sao đồng thời nội dung có chứa bất kỳ từ khóa spam nào ở trên hay không
    const hasSpam =
      rating === 5 &&
      spamKeywords.some((k) => comment?.toLowerCase().includes(k)); // Chuyển chữ thường để so khớp chính xác
    if (hasSpam) {
      details.spamKeyword = 15; // Phát hiện chứa từ khóa ảo ở đánh giá 5 sao: phạt 15 điểm
      reasons.push('Nội dung chứa từ khóa đánh giá ảo'); // Ghi nhận lý do
    } else {
      details.spamKeyword = 0; // Không chứa từ khóa spam: không phạt điểm
    }
    score += details.spamKeyword; // Cộng dồn điểm phạt của Rule 6 vào tổng điểm

    // ── Rule 7: Chủ phòng trọ tự đánh giá phòng của mình (0–50 điểm) ─────────────────────
    // So sánh ID người sở hữu phòng trọ với ID của tài khoản đang viết đánh giá
    if (room.ownerId === reviewerId) {
      details.selfReview = 50; // Trùng khớp hoàn toàn (chủ trọ tự nâng bi phòng mình): phạt cực nặng 50 điểm
      reasons.push('Chủ trọ tự đánh giá phòng của mình'); // Ghi nhận lý do
    } else {
      details.selfReview = 0; // Người dùng khác đánh giá: không phạt điểm
    }
    score += details.selfReview; // Cộng dồn điểm phạt của Rule 7 vào tổng điểm

    // ── Rule 8: Nhiều tài khoản khác nhau đánh giá từ cùng một địa chỉ IP (0-35 điểm) ─────────────────
    // Chỉ kích hoạt quy tắc này nếu có thông tin địa chỉ IP của lượt gửi và có các đánh giá khác cùng IP trong 24 giờ
    if (ipAddress && sameIpReviews.length > 0) {
      // Gom nhóm và đếm số lượng tài khoản KHÁC BIỆT (ngoại trừ tài khoản của chính người này) từng gửi đánh giá từ IP này
      const uniqueReviewers = new Set(
        sameIpReviews
          .map((r) => r.reviewerId) // Trích xuất danh sách ID người viết đánh giá từ cùng IP
          .filter((id) => id !== reviewerId), // Lọc bỏ ID của tài khoản hiện tại đang được phân tích
      );

      if (uniqueReviewers.size >= 3) {
        details.ipSharing = 35; // Có từ 3 tài khoản khác trở lên dùng chung IP đánh giá: phạt tối đa 35 điểm (seeding hàng loạt)
        reasons.push(
          `Phát hiện ${uniqueReviewers.size} tài khoản khác đánh giá từ cùng địa chỉ IP trong 24 giờ`, // Ghi nhận lý do kèm số lượng tài khoản trùng IP
        );
      } else if (uniqueReviewers.size >= 2) {
        details.ipSharing = 15; // Có đúng 2 tài khoản khác dùng chung IP đánh giá: phạt 15 điểm
        reasons.push(
          `Phát hiện ${uniqueReviewers.size} tài khoản khác đánh giá từ cùng địa chỉ IP trong 24 giờ`, // Ghi nhận lý do
        );
      } else {
        details.ipSharing = 0; // Dưới 2 tài khoản hoặc không trùng: không phạt điểm
      }
      score += details.ipSharing; // Cộng dồn điểm phạt của Rule 8 vào tổng điểm
    }

    // Giới hạn điểm phạt tối đa là 100 điểm, ngay cả khi tổng điểm cộng dồn vượt quá 100
    score = Math.min(100, score);

    // Trả về đối tượng kết quả phân tích đầy đủ
    return {
      score, // Tổng điểm phạt (0 đến 100)
      isSuspicious: score >= 60, // Đánh dấu là đáng ngờ nếu điểm phạt đạt từ 60 trở lên
      // Xác định hành động dựa trên điểm phạt:
      // - Điểm >= 80: Từ chối/Ẩn ngay (reject)
      // - Điểm từ 60 đến dưới 80: Gắn cờ chờ kiểm tra (flag)
      // - Điểm dưới 60: Duyệt bình thường (approve)
      action: score >= 80 ? 'reject' : score >= 60 ? 'flag' : 'approve',
      reasons, // Danh sách các nguyên nhân chi tiết dẫn đến điểm phạt này
      details, // Chi tiết điểm phạt của từng quy tắc
    };
  }

  // Hàm phụ tạo ra cấu trúc kết quả mặc định (sạch/an toàn) khi xảy ra lỗi dữ liệu đầu vào hoặc không tìm thấy bản ghi
  private cleanResult(): FakeReviewResult {
    return {
      score: 0, // Điểm phạt mặc định là 0
      isSuspicious: false, // Không đáng ngờ
      action: 'approve', // Hành động mặc định là phê duyệt
      reasons: [], // Mảng lý do rỗng
      details: {}, // Chi tiết điểm phạt rỗng
    };
  }
}
