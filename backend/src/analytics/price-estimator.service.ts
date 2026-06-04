import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';

// Interface định nghĩa các hệ số hồi quy tuyến tính (Linear Regression Coefficients)
export interface Coefficients {
  intercept: number; // Hệ số chặn (giá trị cơ sở cơ bản khi các yếu tố khác bằng 0)
  area: number; // Hệ số giá trị theo diện tích (1m² tăng thêm bao nhiêu tiền)
  amenity: number; // Hệ số giá trị theo tiện nghi (1 tiện ích tăng thêm bao nhiêu tiền)
  floor: number; // Hệ số giá trị theo tầng (ở tầng cao/thấp ảnh hưởng bao nhiêu tiền)
}

// Interface định nghĩa cấu trúc kết quả ước tính giá phòng trọ
export interface PriceEstimate {
  estimatedPrice: number; // Giá trị ước tính trung bình
  minPrice: number; // Giá thấp nhất đề xuất (bằng 85% giá ước tính)
  maxPrice: number; // Giá cao nhất đề xuất (bằng 115% giá ước tính)
  currentPriceStatus: 'low' | 'fair' | 'high' | 'very_high'; // Đánh giá mức giá hiện tại (thấp, hợp lý, cao, rất cao)
  percentageDiff: number; // Phần trăm chênh lệch giữa giá hiện tại và giá ước tính
  suggestion: string; // Lời khuyên/Gợi ý hành động cho chủ nhà
  similarRoomsCount: number; // Số lượng mẫu phòng trọ tương tự thu thập được trong khu vực
  coefficients: Coefficients; // Các hệ số hồi quy đã sử dụng để tính toán (để hiển thị báo cáo chi tiết)
  method: 'ols' | 'ai' | 'hybrid'; // Phương pháp định giá: OLS (Hồi quy tuyến tính), AI (Gemini), hoặc Hybrid (kết hợp cả hai)
  aiInsight?: string; // Nhận xét, phân tích chuyên sâu được sinh từ AI
}

@Injectable()
export class PriceEstimatorService {
  // Bộ nhớ đệm (Cache) để lưu trữ kết quả phân tích giá từ AI nhằm tránh gọi trùng lặp API Gemini nhiều lần gây tốn tài nguyên
  private aiEstimateCache = new Map<
    string,
    { adjustedPrice: number | null; insight: string }
  >();

  constructor(
    private prisma: PrismaService, // Inject Prisma để truy vấn dữ liệu phòng trọ từ database
    private aiService: AiService, // Inject AI Service để gọi mô hình ngôn ngữ Gemini phân tích thêm
  ) {}

  // Hàm chính để ước tính giá phòng trọ
  async estimate(
    area: number, // Diện tích phòng trọ cần ước tính (m²)
    amenityCount: number, // Số lượng tiện ích của phòng trọ
    floor: number, // Tầng đặt phòng trọ
    address: string, // Địa chỉ của phòng trọ
    currentPrice?: number, // Giá hiện tại của phòng trọ (nếu có, để so sánh)
    type?: string, // Loại hình phòng trọ (room, house, apartment...)
    amenities?: string, // Danh sách tiện ích cụ thể dưới dạng chuỗi văn bản
    description?: string, // Mô tả chi tiết của phòng trọ
    electricityCost?: number, // Chi phí tiền điện
    waterCost?: number, // Chi phí tiền nước
    deposit?: number, // Tiền đặt cọc
  ): Promise<PriceEstimate> {
    // 1. Lấy danh sách dữ liệu các phòng trọ tương tự cùng quận và cùng loại hình từ Database làm tập mẫu (Training Data)
    const rawData = await this.getTrainingData(address, type);

    // 2. Loại bỏ các dữ liệu dị biệt (Outliers) có giá quá cao hoặc quá thấp bằng thuật toán IQR (Interquartile Range) để dữ liệu huấn luyện sạch hơn
    const trainingData = this.removeOutliers(rawData);

    let coefficients: Coefficients; // Biến lưu trữ hệ số hồi quy tuyến tính
    let estimated: number; // Biến lưu trữ mức giá ước tính ban đầu
    let method: PriceEstimate['method'] = 'ols'; // Mặc định dùng phương pháp OLS

    // 3. Nếu số lượng phòng trọ mẫu tìm được trong khu vực >= 5: Đủ điều kiện chạy thuật toán hồi quy tuyến tính OLS đa biến
    if (trainingData.length >= 5) {
      // Huấn luyện mô hình hồi quy tuyến tính dựa trên tập dữ liệu mẫu để tìm ra bộ hệ số tối ưu
      coefficients = this.trainOLS(trainingData);
      // Áp dụng bộ hệ số vừa tìm được để dự đoán giá dựa trên diện tích, số tiện nghi và tầng của phòng trọ hiện tại
      estimated = this.predict(coefficients, area, amenityCount, floor);
    } else {
      // 4. Nếu thiếu dữ liệu mẫu (< 5): Áp dụng bộ hệ số định giá mặc định dựa trên đặc trưng thị trường Việt Nam
      const defaultCoefficients: Record<string, Coefficients> = {
        room: {
          // Phòng trọ thường
          intercept: 500_000,
          area: 80_000,
          amenity: 150_000,
          floor: 30_000,
        },
        shared: {
          // Ký túc xá / Ở ghép
          intercept: 300_000,
          area: 40_000,
          amenity: 100_000,
          floor: 15_000,
        },
        house: {
          // Nhà nguyên căn
          intercept: 3_000_000,
          area: 120_000,
          amenity: 300_000,
          floor: 100_000,
        },
        apartment: {
          // Căn hộ chung cư
          intercept: 2_500_000,
          area: 110_000,
          amenity: 250_000,
          floor: 50_000,
        },
        mini: {
          // Căn hộ mini
          intercept: 1_500_000,
          area: 100_000,
          amenity: 200_000,
          floor: 40_000,
        },
        service: {
          // Căn hộ dịch vụ cao cấp
          intercept: 2_000_000,
          area: 120_000,
          amenity: 250_000,
          floor: 40_000,
        },
      };

      // Chọn bộ hệ số tương ứng với loại phòng, nếu không khớp thì lấy loại 'room' làm mặc định
      coefficients = type
        ? defaultCoefficients[type] || defaultCoefficients.room
        : defaultCoefficients.room;
      // Dự đoán giá bằng bộ hệ số mặc định
      estimated = this.predict(coefficients, area, amenityCount, floor);
      method = 'ai'; // Sẽ ưu tiên gọi AI để điều chỉnh lại giá cho chính xác vì OLS không có đủ dữ liệu mẫu
    }

    // Giới hạn giá trị ước tính tối thiểu là 500.000đ và tối đa là 50.000.000đ để tránh các kết quả phi thực tế
    estimated = Math.max(500_000, Math.min(50_000_000, estimated));

    // ── Lớp nâng cao AI (AI Enhancement): Xác thực và điều chỉnh giá trị ước tính ──────────────
    let aiInsight: string | undefined; // Biến lưu trữ phân tích nhận xét của AI
    try {
      // Gửi toàn bộ dữ liệu chi tiết của phòng trọ và kết quả ước lượng từ thuật toán đến AI Gemini để thẩm định
      const aiResult = await this.aiEnhancedEstimate(
        area,
        amenityCount,
        floor,
        address,
        estimated,
        trainingData.length,
        currentPrice,
        type,
        amenities,
        description,
        electricityCost,
        waterCost,
        deposit,
      );

      if (aiResult) {
        // Nếu AI đề xuất một mức giá điều chỉnh khác biệt trên 20% so với giá ước tính của thuật toán
        if (
          aiResult.adjustedPrice &&
          Math.abs(aiResult.adjustedPrice - estimated) / estimated > 0.2
        ) {
          if (trainingData.length >= 5) {
            // Trường hợp đủ dữ liệu mẫu OLS: Lấy giá trung bình cộng của cả OLS và AI (Phương pháp kết hợp Hybrid)
            estimated = Math.round((estimated + aiResult.adjustedPrice) / 2);
            method = 'hybrid';
          } else {
            // Trường hợp thiếu dữ liệu mẫu: Ưu tiên tin tưởng hoàn toàn vào giá đề xuất của AI
            estimated = aiResult.adjustedPrice;
            method = 'ai';
          }
        } else if (aiResult.adjustedPrice && trainingData.length < 5) {
          // Ít dữ liệu mẫu: Ưu tiên sử dụng giá của AI điều chỉnh
          estimated = aiResult.adjustedPrice;
          method = 'ai';
        }

        // Lưu nhận xét phân tích từ AI
        aiInsight = aiResult.insight;
      }
    } catch (err) {
      console.error('AI price enhancement failed:', err);
      // Gặp lỗi gọi AI: Giữ nguyên kết quả ước tính thuần từ OLS hoặc hệ số mặc định
    }

    // Tiếp tục áp dụng giới hạn biên một lần nữa sau khi đã điều chỉnh qua AI
    estimated = Math.max(500_000, Math.min(50_000_000, estimated));

    // Tính toán khoảng giá đề xuất hợp lý (Min = 85% và Max = 115% giá trị ước tính trung bình)
    const minPrice = Math.round(estimated * 0.85);
    const maxPrice = Math.round(estimated * 1.15);

    // 5. Đánh giá trạng thái mức giá hiện tại (so sánh giá thực tế chủ nhà muốn đặt với giá ước tính của hệ thống)
    let currentPriceStatus: PriceEstimate['currentPriceStatus'] = 'fair';
    let percentageDiff = 0;

    if (currentPrice && currentPrice > 0) {
      // Tính % chênh lệch giữa giá hiện tại và giá ước tính
      percentageDiff = Math.round(
        ((currentPrice - estimated) / estimated) * 100,
      );
      // Phân loại trạng thái mức giá:
      // - Chênh lệch dưới -15%: Giá thấp hơn thị trường (low)
      // - Chênh lệch từ -15% đến 15%: Mức giá hợp lý (fair)
      // - Chênh lệch từ 16% đến 30%: Mức giá cao hơn thị trường (high)
      // - Chênh lệch trên 30%: Giá quá cao so với thị trường (very_high)
      currentPriceStatus =
        percentageDiff < -15
          ? 'low'
          : percentageDiff <= 15
            ? 'fair'
            : percentageDiff <= 30
              ? 'high'
              : 'very_high';
    }

    // Trả về cấu trúc kết quả ước tính giá hoàn chỉnh
    return {
      estimatedPrice: Math.round(estimated),
      minPrice,
      maxPrice,
      currentPriceStatus,
      percentageDiff,
      suggestion: this.getSuggestion(
        currentPriceStatus,
        Math.abs(percentageDiff),
      ),
      similarRoomsCount: trainingData.length,
      coefficients,
      method,
      aiInsight,
    };
  }

  // ── AI Enhancement Layer ───────────────────────────────────────
  // Phương thức gửi dữ liệu phòng trọ đến Gemini AI để tinh chỉnh giá ước tính
  private async aiEnhancedEstimate(
    area: number,
    amenityCount: number,
    floor: number,
    address: string,
    olsEstimate: number,
    sampleSize: number,
    currentPrice?: number,
    type?: string,
    amenities?: string,
    description?: string,
    electricityCost?: number,
    waterCost?: number,
    deposit?: number,
  ): Promise<{ adjustedPrice: number | null; insight: string } | null> {
    // Trích xuất quận/huyện từ địa chỉ để thu hẹp phạm vi địa lý
    const district =
      this.extractDistrict(address).trim().toLowerCase() ||
      address.trim().toLowerCase();

    // Tạo khóa lưu trữ Cache dựa trên các tham số cấu thành phòng trọ
    const cacheKey = `${type || 'room'}_${area}_${amenityCount}_${floor}_${district}_${amenities || ''}`;

    // Nếu đã có sẵn kết quả tương tự trong cache, lập tức trả về để tiết kiệm thời gian và chi phí API
    if (this.aiEstimateCache.has(cacheKey)) {
      return this.aiEstimateCache.get(cacheKey) || null;
    }

    // Ánh xạ mã loại hình phòng trọ sang tiếng Việt dễ đọc
    const typeNames: Record<string, string> = {
      room: 'Phòng trọ',
      house: 'Nhà nguyên căn',
      shared: 'Ký túc xá / Ở ghép',
      apartment: 'Căn hộ chung cư',
      mini: 'Căn hộ mini',
      service: 'Căn hộ dịch vụ',
    };
    const typeLabel = type ? typeNames[type] || type : 'Phòng trọ';

    // Xây dựng chuỗi văn bản mô tả chi tiết tiện nghi
    let amenityDetails = `- Số tiện nghi: ${amenityCount}`;
    if (amenities && amenities.length > 0) {
      amenityDetails += `\n- Danh sách tiện nghi cụ thể: ${amenities}`;
    }
    if (amenityCount === 0 && (!amenities || amenities.length === 0)) {
      amenityDetails += ' (Phòng trống, không nội thất/tiện nghi)';
    }

    // Xây dựng chuỗi văn bản thông tin chi phí bổ sung và mô tả từ chủ nhà
    let extraInfo = '';
    if (electricityCost && electricityCost > 0) {
      extraInfo += `\n- Tiền điện: ${electricityCost.toLocaleString('vi-VN')}đ/kWh`;
    }
    if (waterCost && waterCost > 0) {
      extraInfo += `\n- Tiền nước: ${waterCost.toLocaleString('vi-VN')}đ/m³`;
    }
    if (deposit && deposit > 0) {
      extraInfo += `\n- Tiền đặt cọc: ${deposit.toLocaleString('vi-VN')}đ`;
    }
    if (description && description.length > 10) {
      // Giới hạn độ dài mô tả tối đa 300 ký tự tránh tràn token prompt gửi lên AI
      extraInfo += `\n- Mô tả của chủ nhà: "${description.substring(0, 300)}${description.length > 300 ? '...' : ''}"`;
    }

    // Xây dựng prompt gửi tới Gemini AI hướng dẫn rõ cách thức định giá và phản hồi bằng định dạng JSON
    const prompt = `Bạn là chuyên gia định giá bất động sản và phòng trọ tại Việt Nam. Phân tích và đưa ra giá thuê hợp lý cho loại bất động sản sau:

THÔNG TIN CHI TIẾT:
- Loại hình: ${typeLabel}
- Diện tích: ${area}m²
${amenityDetails}
- Tầng: ${floor}
- Khu vực: ${address}
${district ? `- Quận/Huyện: ${district}` : ''}
${currentPrice ? `- Giá chủ nhà đang đặt: ${currentPrice.toLocaleString('vi-VN')}đ/tháng` : ''}${extraInfo}

THAM KHẢO THUẬT TOÁN:
- Giá ước tính bằng hồi quy tuyến tính (cho các phòng cùng khu vực): ${olsEstimate.toLocaleString('vi-VN')}đ/tháng
- Dựa trên ${sampleSize} mẫu trong khu vực

YÊU CẦU: Trả về JSON duy nhất (không markdown, không giải thích thêm) với format:
{"adjustedPrice": <số nguyên giá đề xuất VND/tháng hoặc null nếu đồng ý với thuật toán>, "insight": "<1-2 câu nhận xét ngắn gọn bằng tiếng Việt về mức giá dựa trên toàn bộ thông tin đã cung cấp (loại hình, tiện nghi, khu vực, chi phí điện nước...), phù hợp hiển thị cho chủ nhà>"}`;

    // Gọi AI Service để lấy văn bản phản hồi từ Gemini
    const result = await this.aiService.generateText(prompt);
    if (!result) return null;

    try {
      // Sử dụng Regular Expression để tách lấy cấu trúc đối tượng JSON nằm bên trong chuỗi văn bản trả về của AI
      const jsonMatch = result.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]); // Chuyển đổi chuỗi thành đối tượng Javascript
      const finalResult = {
        // Đảm bảo adjustedPrice là kiểu số nguyên hoặc null
        adjustedPrice:
          typeof parsed.adjustedPrice === 'number'
            ? Math.round(parsed.adjustedPrice)
            : null,
        insight: parsed.insight || '', // Nhận xét phân tích của AI
      };

      // Lưu kết quả vào Cache
      this.aiEstimateCache.set(cacheKey, finalResult);
      return finalResult;
    } catch {
      return null;
    }
  }

  // ── Thuật toán loại bỏ dữ liệu ngoại lai bằng IQR (Interquartile Range) ──────────────────────────────────
  // Phương pháp thống kê: Loại bỏ các phòng có mức giá dị biệt vượt ra ngoài biên an toàn:
  // Biên dưới = Q1 - 1.5 * IQR và Biên trên = Q3 + 1.5 * IQR
  private removeOutliers(
    data: {
      price: number;
      area: number;
      amenityCount: number;
      floor: number;
    }[],
  ) {
    // Nếu tập dữ liệu quá nhỏ (< 4 mẫu), không đủ cơ sở để xác định phân vị Q1, Q3 nên giữ nguyên dữ liệu
    if (data.length < 4) return data;

    // Trích xuất danh sách giá và sắp xếp tăng dần
    const prices = data.map((d) => d.price).sort((a, b) => a - b);

    // Tìm điểm phân vị thứ 25 (Q1 - Tứ phân vị thứ nhất)
    const q1 = prices[Math.floor(prices.length * 0.25)];
    // Tìm điểm phân vị thứ 75 (Q3 - Tứ phân vị thứ ba)
    const q3 = prices[Math.floor(prices.length * 0.75)];

    const iqr = q3 - q1; // Tính khoảng tứ phân vị (Interquartile Range)
    const lower = q1 - 1.5 * iqr; // Tính biên dưới an toàn
    const upper = q3 + 1.5 * iqr; // Tính biên trên an toàn

    // Trả về tập dữ liệu đã lọc, chỉ giữ lại các phòng trọ nằm trong khoảng giá an toàn [lower, upper]
    return data.filter((d) => d.price >= lower && d.price <= upper);
  }

  // ── Ordinary Least Squares (OLS) hồi quy tuyến tính đa biến ─────────────────────
  // Giải phương trình chuẩn để tìm bộ tham số tối ưu β (hệ số): β = (XᵀX)⁻¹ Xᵀy
  // Phương trình dự đoán: y = b₀ (intercept) + b₁×area + b₂×amenity + b₃×floor
  private trainOLS(
    data: {
      price: number;
      area: number;
      amenityCount: number;
      floor: number;
    }[],
  ): Coefficients {
    const n = data.length; // Số lượng mẫu dữ liệu huấn luyện
    const p = 4; // Số lượng tham số cần tìm (hệ số chặn intercept, diện tích, tiện nghi, tầng)

    // Xây dựng ma trận X kích thước (n × 4) và vector cột y kích thước (n × 1)
    // Cột đầu tiên của ma trận X chứa toàn số 1 (ứng với hệ số chặn b₀), các cột sau là diện tích, tiện ích và tầng
    const X: number[][] = data.map((d) => [1, d.area, d.amenityCount, d.floor]);
    const y: number[] = data.map((d) => d.price); // Vector chứa giá phòng trọ thực tế

    // Bước 1: Tính ma trận tích XtX = Xᵀ × X (Kích thước 4 × 4)
    const XtX: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += X[k][i] * X[k][j]; // Cộng dồn tích các phần tử tương ứng của hai ma trận
        }
        XtX[i][j] = sum;
      }
    }

    // Bước 2: Tính vector tích Xty = Xᵀ × y (Kích thước 4 × 1)
    const Xty: number[] = Array(p).fill(0);
    for (let i = 0; i < p; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += X[k][i] * y[k]; // Cộng dồn tích giữa các phần tử của X và y
      }
      Xty[i] = sum;
    }

    // Bước 3: Giải hệ phương trình tuyến tính (XᵀX) × β = Xᵀy bằng thuật toán khử Gauss-Jordan
    const beta = this.solveLinearSystem(XtX, Xty);

    // Nếu ma trận suy biến (không có ma trận nghịch đảo), giải hệ phương trình thất bại
    if (!beta) {
      // Trả về bộ hệ số mặc định an toàn tránh ứng dụng bị dừng hoạt động
      return {
        intercept: 500_000,
        area: 80_000,
        amenity: 150_000,
        floor: 30_000,
      };
    }

    // Điều chỉnh giới hạn (Clamp) các hệ số để đảm bảo tính logic thực tế của nền kinh tế bất động sản:
    // - area >= 0: Diện tích phòng tăng thì giá phòng phải tăng hoặc bằng, không được phép giảm
    // - amenity >= 0: Số lượng tiện nghi tăng thì giá phòng phải tăng hoặc bằng
    // - floor: Giữ nguyên hệ số (có thể âm vì phòng tầng cao không thang máy thường rẻ hơn tầng thấp)
    return {
      intercept: Math.round(beta[0]),
      area: Math.round(Math.max(0, beta[1])),
      amenity: Math.round(Math.max(0, beta[2])),
      floor: Math.round(beta[3]),
    };
  }

  // ── Khử Gauss-Jordan (Gauss-Jordan Elimination) ──────────────────────────────────
  // Phương pháp giải hệ phương trình tuyến tính Ax = b (ở đây A là ma trận XtX, b là vector Xty)
  // Trả về mảng nghiệm x (vector β hệ số) hoặc trả về null nếu ma trận suy biến (không có nghiệm duy nhất)
  private solveLinearSystem(A: number[][], b: number[]): number[] | null {
    const n = A.length; // Số chiều của ma trận vuông (trong bài toán này là 4)

    // Tạo ma trận bổ sung (Augmented Matrix) kích thước n × (n + 1) bằng cách ghép thêm vector cột b vào sau ma trận A
    const aug: number[][] = A.map((row, i) => [...row, b[i]]);

    // Duyệt qua từng cột để biến đổi ma trận về dạng bậc thang rút gọn
    for (let col = 0; col < n; col++) {
      // Kỹ thuật xoay ma trận một phần (Partial Pivoting):
      // Tìm hàng từ cột hiện tại trở xuống có giá trị tuyệt đối tại cột 'col' lớn nhất để đưa lên làm Pivot hàng.
      // Kỹ thuật này giúp giảm thiểu tối đa sai số làm tròn số thập phân của máy tính.
      let maxRow = col;
      let maxVal = Math.abs(aug[col][col]);
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > maxVal) {
          maxVal = Math.abs(aug[row][col]);
          maxRow = row;
        }
      }

      // Nếu hàng chứa phần tử lớn nhất không phải hàng hiện tại, thực hiện hoán vị 2 hàng này với nhau
      if (maxRow !== col) {
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      }

      const pivot = aug[col][col]; // Lấy giá trị phần tử chốt (Pivot)
      // Nếu giá trị chốt xấp xỉ bằng 0 (quá nhỏ dưới 1e-10), ma trận này bị suy biến và không thể giải được nghiệm duy nhất
      if (Math.abs(pivot) < 1e-10) {
        return null; // Trả về null báo lỗi ma trận suy biến
      }

      // Chuẩn hóa hàng chứa phần tử chốt bằng cách chia tất cả các phần tử trên hàng cho giá trị chốt (pivot)
      // Điều này đưa phần tử tại vị trí chéo chính [col][col] về giá trị 1.
      for (let j = col; j <= n; j++) {
        aug[col][j] /= pivot;
      }

      // Khử tất cả các phần tử khác 0 ở các hàng khác nằm trên cùng cột 'col' để biến chúng về 0
      for (let row = 0; row < n; row++) {
        if (row === col) continue; // Bỏ qua hàng chốt hiện tại
        const factor = aug[row][col]; // Hệ số nhân để khử hàng
        // Biến đổi các cột từ vị trí hiện tại trở đi của hàng 'row'
        for (let j = col; j <= n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    // Sau khi ma trận được đưa về dạng ma trận đơn vị ở vế trái [I | x], cột cuối cùng chính là vector nghiệm cần tìm
    return aug.map((row) => row[n]);
  }

  // Hàm dự đoán giá trị phòng dựa trên các hệ số và các biến đặc trưng nhập vào
  // Công thức: Price = Intercept + Area * CoefArea + Amenity * CoefAmenity + Floor * CoefFloor
  private predict(
    coef: Coefficients,
    area: number,
    amenityCount: number,
    floor: number,
  ): number {
    return (
      coef.intercept +
      coef.area * area +
      coef.amenity * amenityCount +
      coef.floor * floor
    );
  }

  // Hàm lấy dữ liệu huấn luyện từ Database
  private async getTrainingData(address: string, type?: string) {
    // Trích xuất quận/huyện từ địa chỉ đầy đủ của phòng trọ
    const district = this.extractDistrict(address);

    // Truy vấn tối đa 100 phòng trọ thỏa mãn điều kiện
    const rooms = await this.prisma.room.findMany({
      where: {
        status: { not: 'HIDDEN' }, // Chỉ lấy các phòng đang mở hiển thị công khai (không lấy phòng bị ẩn)
        area: { not: null, gt: 0 }, // Diện tích phòng phải hợp lệ lớn hơn 0
        // Lọc địa chỉ theo quận/huyện để tìm phòng lân cận (không phân biệt chữ hoa chữ thường)
        ...(district && {
          address: { contains: district, mode: 'insensitive' },
        }),
        // Lọc theo loại hình phòng trọ nếu có truyền tham số loại hình
        ...(type && {
          type,
        }),
      },
      include: { amenities: true }, // Nối bảng lấy số lượng tiện ích kèm theo
      orderBy: { createdAt: 'desc' }, // Sắp xếp theo ngày đăng mới nhất trước
      take: 100, // Chỉ lấy tối đa 100 mẫu phòng gần nhất làm dữ liệu tham chiếu
    });

    // Chuyển đổi cấu trúc dữ liệu thô từ database thành cấu trúc tham số đầu vào cho thuật toán định giá
    return rooms.map((r) => ({
      price: Number(r.price), // Ép giá phòng về kiểu dữ liệu số
      area: r.area || 20, // Diện tích mặc định là 20m² nếu bị thiếu
      amenityCount: r.amenities.length, // Đếm tổng số tiện nghi của phòng trọ này
      floor: r.floor || 1, // Tầng mặc định là tầng 1 nếu bị thiếu
    }));
  }

  // Hàm sử dụng Regular Expression (Biểu thức chính quy) để trích xuất tên Quận/Huyện từ địa chỉ đầy đủ ở Việt Nam
  private extractDistrict(address: string): string {
    const match = address.match(
      /Quận\s+\d+|Quận\s+[A-Za-zÀ-ỹ]+|Huyện\s+[A-Za-zÀ-ỹ]+|Bình Thạnh|Gò Vấp|Tân Bình|Phú Nhuận|Thủ Đức|Bình Tân|Tân Phú|Bình Chánh|Hóc Môn|Nhà Bè|Cần Giờ|Củ Chi|Ba Đình|Hoàn Kiếm|Đống Đa|Hai Bà Trưng|Cầu Giấy|Thanh Xuân|Hoàng Mai|Long Biên|Nam Từ Liêm|Bắc Từ Liêm|Hà Đông|Tây Hồ/i,
    );
    // Trả về cụm từ khớp đầu tiên tìm thấy (ví dụ: 'Quận Bình Thạnh' hoặc 'Quận 1'), ngược lại trả về chuỗi rỗng
    return match ? match[0] : '';
  }

  // Hàm sinh gợi ý hiển thị cho chủ trọ dựa trên kết quả phân loại trạng thái so sánh giá
  private getSuggestion(status: string, diff: number): string {
    const map: Record<string, string> = {
      // Giá thực tế thấp hơn giá trị ước tính
      low: `💰 Giá đang thấp hơn thị trường ${diff}%. Có thể tăng thêm để tối ưu doanh thu.`,
      // Giá thực tế nằm trong biên hợp lý so với giá trị ước tính
      fair: `✅ Giá hợp lý so với thị trường. Dễ thu hút người thuê.`,
      // Giá thực tế cao hơn giá trị ước tính
      high: `⚠️ Giá cao hơn thị trường ${diff}%. Cân nhắc giảm hoặc bổ sung thêm tiện ích.`,
      // Giá thực tế cao vượt trội (>30%) so với ước tính
      very_high: `🚨 Giá cao hơn thị trường ${diff}%. Rất khó thu hút người thuê ở mức giá này.`,
    };
    return map[status] || map.fair;
  }
}
