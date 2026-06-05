/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat.dto';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map lưu userId → Set các socketId (hỗ trợ nhiều tab)
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  // Khi user kết nối WebSocket
  async handleConnection(client: Socket) {
    try {
      // Lấy token từ header
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify token
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET as string,
      });

      // Lưu userId vào socket data
      client.data.userId = payload.sub;
      client.data.fullName = payload.fullName;

      // Lưu vào map (hỗ trợ nhiều tab)
      let userSockets = this.connectedUsers.get(payload.sub);
      if (!userSockets) {
        userSockets = new Set<string>();
        this.connectedUsers.set(payload.sub, userSockets);
        // Phát sự kiện online cho các user khác
        this.server.emit('user_online', payload.sub);
      }
      userSockets.add(client.id);

      // Gửi danh sách các user đang online cho chính client này
      client.emit('online_users', Array.from(this.connectedUsers.keys()));

      await this.emitUnreadSummary(payload.sub);

      console.log(`✅ User ${payload.sub} connected — socket: ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  // Khi user ngắt kết nối
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
          // Phát sự kiện offline khi tắt tất cả các tab
          this.server.emit('user_offline', userId);
        }
      }
      console.log(`❌ User ${userId} disconnected`);
    }
  }

  // Vào phòng chat (join conversation room)
  @SubscribeMessage('join_conversation')
  handleJoin(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(conversationId);
    console.log(
      `User ${client.data.userId} joined conversation ${conversationId}`,
    );
    return { success: true };
  }

  // Rời phòng chat
  @SubscribeMessage('leave_conversation')
  handleLeave(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(conversationId);
    return { success: true };
  }

  // Gửi tin nhắn realtime
  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Lưu vào database
      const message = await this.chatService.saveMessage(
        client.data.userId,
        dto,
      );

      await this.broadcastNewMessage(message);

      return { success: true, message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Phát tin nhắn realtime dùng chung cho cả WebSocket Gateway và REST API Fallback
  async broadcastNewMessage(message: any) {
    if (!this.server) return;

    // Gửi tin nhắn đến tất cả user trong conversation room
    this.server.to(message.conversationId).emit('new_message', message);

    // Xác định receiver
    const receiverId =
      message.conversation.ownerId === message.senderId
        ? message.conversation.renterId
        : message.conversation.ownerId;

    // Gửi trực tiếp cho receiver để đảm bảo nhận được dù chưa join room
    // Frontend sẽ tự deduplicate bằng msg.id
    const receiverSockets = this.connectedUsers.get(receiverId);
    if (receiverSockets) {
      for (const socketId of receiverSockets) {
        this.server.to(socketId).emit('new_message', message);
      }
    }

    await this.emitUnreadSummary(message.senderId);
    await this.emitUnreadSummary(receiverId);
    this.emitNotificationCreated(receiverId);
  }

  // Đang gõ...
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    // Gửi cho các user khác trong conversation
    client.to(conversationId).emit('user_typing', {
      userId: client.data.userId,
    });
  }

  // Dừng gõ
  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @MessageBody() conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.to(conversationId).emit('user_stop_typing', {
      userId: client.data.userId,
    });
  }

  private async emitUnreadSummary(userId: string) {
    const socketIds = this.connectedUsers.get(userId);
    if (!socketIds || socketIds.size === 0) return;
    const summary = await this.chatService.getUnreadSummary(userId);
    for (const socketId of socketIds) {
      this.server.to(socketId).emit('unread_summary', summary);
    }
  }

  private emitNotificationCreated(userId: string) {
    const socketIds = this.connectedUsers.get(userId);
    if (!socketIds || socketIds.size === 0) return;
    for (const socketId of socketIds) {
      this.server.to(socketId).emit('notification_created');
    }
  }
}
