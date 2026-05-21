/* eslint-disable @typescript-eslint/no-unsafe-return */
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({ where: { email, isDeleted: false } });
  }

  async findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async create(data: {
    fullName: string;
    email: string;
    password: string;
    role?: Role;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        role: data.role ?? 'RENTER',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findFirst({
      where: { googleId, isDeleted: false },
    });
  }

  async createGoogleUser(data: {
    googleId: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  }) {
    return this.prisma.user.create({
      data: {
        googleId: data.googleId,
        fullName: data.fullName,
        email: data.email,
        avatarUrl: data.avatarUrl,
        passwordHash: null,
        role: 'RENTER',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });
  }

  async updatePasswordHash(email: string, newPassword: string) {
    const hashed = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { email },
      data: { passwordHash: hashed },
    });
  }

  async update(
    id: string,
    data: { fullName?: string; phone?: string; avatarUrl?: string; role?: 'RENTER' | 'LANDLORD' },
  ) {
    // Chỉ cho phép đổi role sang RENTER hoặc LANDLORD, không cho phép tự nâng lên ADMIN
    if (data.role && data.role !== 'RENTER' && data.role !== 'LANDLORD') {
      throw new BadRequestException('Role không hợp lệ');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  }

  async changePassword(
    id: string,
    data: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, passwordHash: true },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid Credentials');

    const isMatch = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) throw new UnauthorizedException('Invalid Credentials');

    const isSame = await bcrypt.compare(data.newPassword, user.passwordHash);
    if (isSame) throw new BadRequestException('Password must be different');

    const hashed = await bcrypt.hash(data.newPassword, 10);

    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashed,
      },
    });
  }

  async getSavedRooms(userId: string) {
    const savedRooms = await this.prisma.savedRoom.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      include: {
        room: {
          include: {
            images: true,
            amenities: { include: { amenity: true } },
            owner: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    return savedRooms.map((item: { room: any }) => item.room);
  }

  async saveRoom(userId: string, roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, title: true, ownerId: true },
    });
    if (!room) throw new BadRequestException('Room not found');

    await this.prisma.savedRoom.upsert({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
      update: {},
      create: {
        userId,
        roomId,
      },
    });

    if (room.ownerId !== userId) {
      await this.notificationsService.create({
        userId: room.ownerId,
        type: 'SAVED_ROOM',
        title: 'Tin đăng được lưu',
        content: `Phòng "${room.title}" vừa được một người dùng lưu.`,
        link: `/rooms/${room.id}`,
      });
    }

    return { saved: true };
  }

  async unsaveRoom(userId: string, roomId: string) {
    await this.prisma.savedRoom.deleteMany({
      where: {
        userId,
        roomId,
      },
    });

    return { saved: false };
  }

  async isRoomSaved(userId: string, roomId: string) {
    const saved = await this.prisma.savedRoom.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    return { saved: Boolean(saved) };
  }
}
