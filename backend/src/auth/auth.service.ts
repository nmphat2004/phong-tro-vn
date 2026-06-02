/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyResetCodeDto,
} from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email đã tồn tại');

    const user = await this.userService.create(dto);
    const tokens = this.generateTokens(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    // Tìm user kể cả đã bị khóa để phân biệt "không tồn tại" vs "bị khóa"
    const userRaw = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (!userRaw) {
      throw new UnauthorizedException('Email không tồn tại');
    }

    // Kiểm tra tài khoản bị khóa
    if (userRaw.isDeleted) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
      );
    }

    // Google-only account → không có password
    if (!userRaw.passwordHash) {
      throw new UnauthorizedException(
        'Tài khoản này sử dụng Google để đăng nhập. Vui lòng dùng nút "Tiếp tục với Google".',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, userRaw.passwordHash);
    if (!isMatch)
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = userRaw;
    const tokens = this.generateTokens(userRaw.id, userRaw.email, userRaw.role);
    return { user: safeUser, ...tokens };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userService.findById(payload.sub);
      if (!user) throw new UnauthorizedException();

      return this.generateTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Google OAuth ────────────────────────────────────────────
  async googleLogin(idToken: string) {
    let payload: any;

    try {
      // Hỗ trợ cả access_token (implicit flow) lẫn id_token
      // Thử verify ID token trước
      try {
        const ticket = await this.googleClient.verifyIdToken({
          idToken,
          audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
        });
        payload = ticket.getPayload();
      } catch {
        // Nếu không phải ID token → coi là access_token, lấy userinfo từ Google API
        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${idToken}` } },
        );
        if (!res.ok) throw new Error('Invalid token');
        payload = await res.json();
      }
    } catch {
      throw new UnauthorizedException('Google token không hợp lệ');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Không lấy được thông tin Google');
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // 1. Tìm theo googleId (kể cả đã bị khóa)
    let user = await this.prisma.user.findFirst({
      where: { googleId },
    });

    if (!user) {
      // 2. Tìm theo email (kể cả đã bị khóa)
      user = await this.prisma.user.findFirst({
        where: { email },
      });

      if (user) {
        // Kiểm tra tài khoản bị khóa trước khi link
        if (user.isDeleted) {
          throw new UnauthorizedException(
            'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
          );
        }
        // Link Google account vào user hiện tại
        await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatarUrl: user.avatarUrl || picture },
        });
      } else {
        // 3. Tạo user mới
        const newUser = await this.userService.createGoogleUser({
          googleId,
          fullName: name || email.split('@')[0],
          email,
          avatarUrl: picture,
        });
        const tokens = this.generateTokens(newUser.id, newUser.email, newUser.role);
        return { user: newUser, ...tokens };
      }
    }

    // Kiểm tra tài khoản bị khóa
    if (user.isDeleted) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, ...safeUser } = user!;
    const tokens = this.generateTokens(user!.id, user!.email, user!.role);
    return { user: safeUser, ...tokens };
  }

  // ── Forgot Password ────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      // Không tiết lộ email không tồn tại (bảo mật)
      return { message: 'Nếu email tồn tại, mã xác nhận đã được gửi.' };
    }

    // Tạo mã OTP 6 số
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    // Xóa mã cũ chưa dùng
    await this.prisma.passwordResetCode.updateMany({
      where: { email: dto.email, used: false },
      data: { used: true },
    });

    // Lưu mã mới
    await this.prisma.passwordResetCode.create({
      data: {
        email: dto.email,
        code,
        expiresAt,
      },
    });

    // Gửi email
    await this.mailService.sendResetCode(dto.email, code);

    return { message: 'Nếu email tồn tại, mã xác nhận đã được gửi.' };
  }

  async verifyResetCode(dto: VerifyResetCodeDto) {
    const record = await this.prisma.passwordResetCode.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Verify code trước
    const record = await this.prisma.passwordResetCode.findFirst({
      where: {
        email: dto.email,
        code: dto.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    // Đánh dấu mã đã dùng
    await this.prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    // Đổi mật khẩu
    await this.userService.updatePasswordHash(dto.email, dto.newPassword);

    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }
}
