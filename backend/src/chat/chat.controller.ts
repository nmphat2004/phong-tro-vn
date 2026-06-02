/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Patch,
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Query,
  Body,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateConversationDto, SendMessageHttpDto } from './dto/chat.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@ApiTags('Chat')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get my conversations' })
  getConversation(@Req() req: any) {
    return this.chatService.getConversations(req.user.id);
  }

  @Get('unread-summary')
  @ApiOperation({ summary: 'Get unread chat and notification summary' })
  getUnreadSummary(@Req() req: any) {
    return this.chatService.getUnreadSummary(req.user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get message in a conversation' })
  getMessage(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 1,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.chatService.getMessages(id, req.user.id, page, limit);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start a conversation about a room' })
  getOrCreate(@Req() req: any, @Body() dto: CreateConversationDto) {
    return this.chatService.getOrCreateConversation(req.user.id, dto);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  markConversationRead(@Req() req: any, @Param('id') id: string) {
    return this.chatService.markConversationAsRead(id, req.user.id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send message via HTTP (fallback)' })
  sendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SendMessageHttpDto,
  ) {
    return this.chatService.saveMessage(req.user.id, {
      conversationId: id,
      content: dto.content,
    });
  }
}
