import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendResetCode(email: string, code: string): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Phòng trọ VN" <${this.configService.get<string>('MAIL_USER')}>`,
      to: email,
      subject: 'Mã xác nhận đặt lại mật khẩu - Phòng trọ VN',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">🏠 Phòng trọ VN</h1>
          </div>
          <h2 style="color: #1a1a2e; font-size: 18px; text-align: center; margin-bottom: 8px;">
            Đặt lại mật khẩu
          </h2>
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
            Nhập mã bên dưới để xác nhận đặt lại mật khẩu của bạn.
          </p>
          <div style="background: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb;">
              ${code}
            </span>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Mã có hiệu lực trong <strong>10 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
