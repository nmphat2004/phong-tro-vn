/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ renterId: userId }, { ownerId: userId }],
      },
      include: {
        room: {
          select: {
            id: true,
            title: true,
            price: true,
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
        reads: {
          where: { userId },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      conversations.map(async (conversation) => {
        const lastReadAt = conversation.reads?.[0]?.lastReadAt ?? new Date(0);
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            sentAt: { gt: lastReadAt },
          },
        });

        return {
          ...conversation,
          unreadCount,
        };
      }),
    );
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 20,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    if (conversation.ownerId !== userId && conversation.renterId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    await this.markConversationAsRead(conversationId, userId);

    return {
      data: messages.reverse(),
      meta: {
        total,
        page,
        limit,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  async getOrCreateConversation(renterId: string, dto: CreateConversationDto) {
    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });

    if (!room) throw new NotFoundException('Room not found');

    if (room.ownerId === renterId)
      throw new ForbiddenException('Cannot chat with yourself');

    const conversationInclude = {
      room: {
        select: {
          id: true,
          title: true,
          price: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
      renter: { select: { id: true, fullName: true, avatarUrl: true } },
      owner: { select: { id: true, fullName: true, avatarUrl: true } },
      messages: {
        orderBy: { sentAt: 'desc' as const },
        take: 1,
      },
    };

    const existing = await this.prisma.conversation.findUnique({
      where: {
        roomId_renterId: {
          roomId: dto.roomId,
          renterId,
        },
      },
      include: conversationInclude,
    });

    if (existing) return existing;

    const created = await this.prisma.conversation.create({
      data: {
        roomId: dto.roomId,
        renterId,
        ownerId: room.ownerId,
      },
      include: conversationInclude,
    });

    await this.prisma.conversationRead.createMany({
      data: [
        { conversationId: created.id, userId: renterId },
        { conversationId: created.id, userId: room.ownerId },
      ],
      skipDuplicates: true,
    });

    return created;
  }

  async saveMessage(senderId: string, dto: SendMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    if (
      conversation.renterId !== senderId &&
      conversation.ownerId !== senderId
    ) {
      throw new ForbiddenException('Not your conversation');
    }

    const createdMessage = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId,
        content: dto.content,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        conversation: {
          select: { id: true, ownerId: true, renterId: true },
        },
      },
    });

    const receiverId =
      conversation.ownerId === senderId
        ? conversation.renterId
        : conversation.ownerId;
    await this.notificationsService.create({
      userId: receiverId,
      type: 'NEW_MESSAGE',
      title: 'Tin nhắn mới',
      content: createdMessage.content,
      link: `/chat?conversationId=${dto.conversationId}`,
    });

    return createdMessage;
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, ownerId: true, renterId: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    if (conversation.ownerId !== userId && conversation.renterId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }

    await this.prisma.conversationRead.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      update: { lastReadAt: new Date() },
      create: { conversationId, userId, lastReadAt: new Date() },
    });

    return { success: true };
  }

  async getUnreadSummary(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ renterId: userId }, { ownerId: userId }],
      },
      select: { id: true },
    });
    const conversationIds = conversations.map((item) => item.id);
    const reads = await this.prisma.conversationRead.findMany({
      where: {
        userId,
        conversationId: { in: conversationIds },
      },
    });

    const readMap = new Map(
      reads.map((item) => [item.conversationId, item.lastReadAt]),
    );
    let chatUnreadCount = 0;
    for (const conversation of conversations) {
      const lastReadAt = readMap.get(conversation.id) ?? new Date(0);
      chatUnreadCount += await this.prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          sentAt: { gt: lastReadAt },
        },
      });
    }

    const notificationUnreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false, type: { not: 'NEW_MESSAGE' } },
    });

    return {
      chatUnreadCount,
      notificationUnreadCount,
      totalUnreadCount: chatUnreadCount + notificationUnreadCount,
    };
  }
}
