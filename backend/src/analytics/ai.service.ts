import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  // ── In-memory TTL cache ──────────────────────────────────────────
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
    });
  }

  async generateText(prompt: string): Promise<string> {
    // Kiểm tra cache trước khi gọi Gemini
    const cached = this.cache.get(prompt);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.log('[AI Cache HIT] Trả kết quả từ cache');
      return cached.value;
    }

    // Cache miss hoặc hết hạn — gọi Gemini
    try {
      this.logger.log('[AI Cache MISS] Đang gọi Gemini API...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Lưu vào cache với TTL 24h
      this.cache.set(prompt, {
        value: text,
        expiresAt: Date.now() + this.TTL_MS,
      });

      // Dọn dẹp các entry đã hết hạn (lazy cleanup)
      this.cleanExpiredEntries();

      return text;
    } catch (error) {
      console.error('Gemini AI Error:', error);
      return '';
    }
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
