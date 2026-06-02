import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ example: 'room-uuid' })
  @IsUUID()
  @IsNotEmpty()
  roomId: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 'conversation-uuid' })
  @IsUUID()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ example: 'Phòng còn trống không ạ?' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class SendMessageHttpDto {
  @ApiProperty({ example: 'Phòng còn trống không ạ?' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
