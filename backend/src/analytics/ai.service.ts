import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // Danh sách lưu trữ các client AI và model tương ứng với từng API key
  private apiClients: {
    genAI: GoogleGenerativeAI;
    model: any;
    keySnippet: string;
  }[] = [];
  // Chỉ mục (Index) của API Key hiện tại đang được sử dụng
  private currentKeyIndex = 0;

  // ── In-memory TTL cache ──────────────────────────────────────────
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

  constructor(private configService: ConfigService) {
    const keys: string[] = [];

    // 1. Lấy danh sách API Key chính (hỗ trợ phân tách nhiều key bằng dấu phẩy)
    const mainKeys = this.configService.get<string>('GEMINI_API_KEY');
    if (mainKeys) {
      keys.push(
        ...mainKeys
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      );
    }

    // 2. Lấy thêm danh sách API Key dự phòng nếu được định nghĩa (hỗ trợ dấu phẩy)
    const backupKeys = this.configService.get<string>('GEMINI_API_KEY_BACKUP');
    if (backupKeys) {
      keys.push(
        ...backupKeys
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      );
    }

    if (keys.length === 0) {
      throw new Error(
        'No GEMINI_API_KEY or GEMINI_API_KEY_BACKUP defined in environment variables',
      );
    }

    // Khởi tạo các đối tượng GoogleGenerativeAI client riêng biệt cho từng Key
    for (const apiKey of keys) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
      });
      // Lấy 4 ký tự cuối của key để hiển thị log kiểm tra (không log toàn bộ key để bảo mật)
      const keySnippet = `***${apiKey.slice(-4)}`;
      this.apiClients.push({ genAI, model, keySnippet });
    }

    this.logger.log(
      `[Gemini API Rotation] Đã cấu hình thành công ${this.apiClients.length} API Key để xoay vòng phòng chống lỗi 429.`,
    );
  }

  // Hàm sinh văn bản từ Prompt hỗ trợ xoay vòng API Key tự động khi gặp lỗi (ví dụ lỗi 429)
  async generateText(prompt: string): Promise<string> {
    // 1. Kiểm tra bộ nhớ đệm (Cache) trước để giảm lượt gọi API tối đa
    const cached = this.cache.get(prompt);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.log('[AI Cache HIT] Trả kết quả trực tiếp từ cache');
      return cached.value;
    }

    // Cache miss — Gọi API với cơ chế tự động xoay vòng khóa khi gặp lỗi
    let attempts = 0;
    const totalKeys = this.apiClients.length;

    while (attempts < totalKeys) {
      const client = this.apiClients[this.currentKeyIndex];
      try {
        this.logger.log(
          `[AI Cache MISS] Đang gọi Gemini API bằng Key Index: ${this.currentKeyIndex} (${client.keySnippet})...`,
        );
        const result = await client.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Lưu vào cache với thời gian sống (TTL) 24h
        this.cache.set(prompt, {
          value: text,
          expiresAt: Date.now() + this.TTL_MS,
        });

        // Dọn dẹp các cache entry cũ đã hết hạn
        this.cleanExpiredEntries();

        return text;
      } catch (error: any) {
        attempts++;
        this.logger.warn(
          `[Gemini API Error] Key Index: ${this.currentKeyIndex} (${client.keySnippet}) gặp lỗi. Số lần thử: ${attempts}/${totalKeys}. Chi tiết lỗi: ${error.message || error}`,
        );

        // Chuyển chỉ mục sang API Key tiếp theo trong mảng tròn
        this.currentKeyIndex = (this.currentKeyIndex + 1) % totalKeys;

        // Nếu đã thử qua tất cả các Key mà đều bị lỗi, ghi log lỗi nghiêm trọng và thoát vòng lặp
        if (attempts >= totalKeys) {
          this.logger.error(
            `[Gemini API Critical] Tất cả ${totalKeys} API Key được cấu hình đều thất bại.`,
          );
          break;
        }

        this.logger.log(
          `[Gemini API Rotation] Tự động xoay vòng sang sử dụng Key Index mới: ${this.currentKeyIndex}`,
        );
      }
    }

    return '';
  }

  /** Xóa toàn bộ cache (dùng khi Admin cần reset) */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`[AI Cache] Đã xóa ${size} mục trong cache`);
  }

  /** Lấy thông tin cache hiện tại */
  getCacheStats(): { size: number; ttlMs: number } {
    return { size: this.cache.size, ttlMs: this.TTL_MS };
  }

  /** Dọn dẹp các entry đã hết hạn */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.log(`[AI Cache] Đã dọn ${cleaned} mục hết hạn`);
    }
  }
}
