import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';

// Seasonal Index thị trường phòng trọ VN
// Tính từ thực tế: tháng 8-9 nhập học = cao nhất, tháng 2 Tết = thấp nhất
const SEASONAL_INDEX: Record<number, number> = {
  1: 0.85, // Sau Tết — ít người thuê
  2: 0.8, // Tết — thấp nhất năm
  3: 0.9, // Phục hồi dần
  4: 0.95, // Bình thường
  5: 1.0, // Trung bình
  6: 1.05, // SV tốt nghiệp chuyển trọ
  7: 1.1, // Cao
  8: 1.25, // CAO NHẤT — mùa nhập học
  9: 1.2, // Nhập học chính thức
  10: 1.05, // Giảm dần
  11: 1.0, // Bình thường
  12: 0.9, // Chuẩn bị Tết
};

const MONTH_VI = [
  '',
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

@Injectable()
export class SeasonalService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async predict(district?: string) {
    // Lấy giá trung bình từ DB
    const rooms = await this.prisma.room.findMany({
      where: {
        status: { not: 'HIDDEN' },
        ...(district && {
          address: { contains: district, mode: 'insensitive' },
        }),
      },
      select: { price: true },
    });

    const avgPrice =
      rooms.length > 0
        ? rooms.reduce((s, r) => s + Number(r.price), 0) / rooms.length
        : 3_500_000; // fallback

    const currentMonth = new Date().getMonth() + 1;

    // Tính dự đoán 12 tháng
    const predictions = Object.entries(SEASONAL_INDEX).map(([m, index]) => {
      const month = parseInt(m);
      const predictedPrice = Math.round(avgPrice * index);

      const demandLevel =
        index >= 1.2
          ? 'very_high'
          : index >= 1.05
            ? 'high'
            : index >= 0.95
              ? 'medium'
              : 'low';

      return {
        month,
        monthName: MONTH_VI[month],
        isCurrentMonth: month === currentMonth,
        seasonalIndex: index,
        predictedPrice,
        demandLevel,
        tag: this.getTag(month),
        advice: this.getAdvice(demandLevel),
      };
    });

    // Tháng tốt nhất / xấu nhất để thuê
    const sorted = [...predictions].sort(
      (a, b) => a.seasonalIndex - b.seasonalIndex,
    );
    const bestMonth = sorted[0];
    const worstMonth = sorted[sorted.length - 1];

    // Tiết kiệm được bao nhiêu nếu chờ đến tháng tốt nhất
    const currentIndex = SEASONAL_INDEX[currentMonth];
    const saving = Math.round(
      avgPrice * (currentIndex - bestMonth.seasonalIndex),
    );

    const currentAdvice = this.getCurrentAdvice(
      currentMonth,
      bestMonth.month,
      saving,
    );

    // AI generated advice
    const aiAdvice = await this.getAiAdvice(
      currentMonth,
      bestMonth,
      worstMonth,
      avgPrice,
      saving,
      currentAdvice,
    );

    return {
      avgPrice: Math.round(avgPrice),
      currentMonth,
      totalRooms: rooms.length,
      predictions,
      bestMonth,
      worstMonth,
      currentAdvice,
      aiAdvice,
    };
  }

  private async getAiAdvice(
    currentMonth: number,
    best: { monthName: string; seasonalIndex: number },
    worst: { monthName: string; seasonalIndex: number },
    avgPrice: number,
    saving: number,
    currentAdvice: string,
  ) {
    const prompt = `
      Bạn là một chuyên gia tư vấn bất động sản tại Việt Nam.
      Nhiệm vụ của bạn là kết hợp khuyến nghị phân tích dựa trên thuật toán thị trường dưới đây với nhận xét chuyên môn của bạn thành MỘT lời khuyên/khuyến nghị duy nhất, thống nhất và trôi chảy (khoảng 2-3 câu).
      
      Khuyến nghị của thuật toán: "${currentAdvice}"
      
      Dữ liệu thị trường bổ sung:
      - Tháng hiện tại: ${MONTH_VI[currentMonth]}
      - Tháng thuê phòng tốt nhất (giá thấp nhất): ${best.monthName} (Tiết kiệm khoảng ${new Intl.NumberFormat('vi-VN').format(saving)}đ/tháng so với hiện tại)
      - Tháng cao điểm cạnh tranh (khó thuê, giá cao): ${worst.monthName}
      - Giá thuê trung bình hiện tại: ${new Intl.NumberFormat('vi-VN').format(Math.round(avgPrice))}đ/tháng
      
      Yêu cầu:
      - Viết liền mạch thành MỘT đoạn văn ngắn gọn, không phân chia thành các mục hay gạch đầu dòng khác nhau.
      - Phải tích hợp tự nhiên số liệu tiết kiệm hoặc đề xuất thời gian từ khuyến nghị của thuật toán vào lời khuyên, đồng thời đưa ra lý do giải thích thực tế (ví dụ: nhu cầu thấp dịp Tết tháng 2 giúp dễ đàm phán giá, hay cạnh tranh khốc liệt mùa tựu trường tháng 8-9).
      - Ngôn ngữ: Tiếng Việt, thân thiện, chuyên nghiệp, tự nhiên.
      - Trả lời trực tiếp vào lời khuyên, không có các từ dẫn nhập thừa thãi.
    `;

    return this.aiService.generateText(prompt);
  }

  private getTag(month: number): string {
    if (month === 8 || month === 9) return '🎓 Mùa nhập học';
    if (month === 2) return '🧧 Tết Nguyên Đán';
    if (month === 1) return '🎉 Sau Tết';
    if (month === 6 || month === 7) return '📦 SV chuyển trọ';
    return '';
  }

  private getAdvice(demand: string): string {
    const map: Record<string, string> = {
      very_high:
        'Rất khó tìm phòng, giá cao nhất năm. Nên tìm trước 1–2 tháng.',
      high: 'Nhu cầu cao, nên đặt sớm và chuẩn bị ngân sách cao hơn.',
      medium: 'Thời điểm bình thường, có nhiều lựa chọn với giá hợp lý.',
      low: '✅ Thời điểm lý tưởng — nhiều phòng trống, dễ thương lượng giá.',
    };
    return map[demand] || '';
  }

  private getCurrentAdvice(
    current: number,
    best: number,
    saving: number,
  ): string {
    if (current === best) {
      return '🎉 Đây là thời điểm tốt nhất trong năm để thuê phòng!';
    }
    const fmt = new Intl.NumberFormat('vi-VN').format(Math.abs(saving));
    if (saving > 0) {
      return `💡 Nếu không gấp, chờ đến ${MONTH_VI[best]} có thể tiết kiệm ~${fmt}đ/tháng.`;
    }
    return `📍 Hiện tại là thời điểm thuận lợi, giá thấp hơn mùa cao điểm ~${fmt}đ/tháng.`;
  }
}
