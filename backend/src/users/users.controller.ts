/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from './users.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  getMe(@Req() req: any) {
    return this.userService.findById(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile' })
  updateMe(
    @Req() req: any,
    @Body() dto: { fullName?: string; phone?: string; avatarUrl?: string; role?: 'RENTER' | 'LANDLORD' },
  ) {
    return this.userService.update(req.user.id, dto);
  }

  @Delete('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa tài khoản (xóa mềm)' })
  async deleteAccount(@Req() req: any) {
    if (req.user.role === 'ADMIN') {
      throw new ForbiddenException('Admin không thể tự xóa tài khoản');
    }
    return this.userService.delete(req.user.id);
  }

  @Put('change-password')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  changePassword(
    @Req() req: any,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(req.user.id, dto);
  }

  @Get('saved-rooms')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my saved rooms' })
  getSavedRooms(@Req() req: any) {
    return this.userService.getSavedRooms(req.user.id);
  }

  @Get('saved-rooms/:roomId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check room saved status' })
  isSaved(@Req() req: any, @Param('roomId') roomId: string) {
    return this.userService.isRoomSaved(req.user.id, roomId);
  }

  @Post('saved-rooms/:roomId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save room to wishlist' })
  saveRoom(@Req() req: any, @Param('roomId') roomId: string) {
    return this.userService.saveRoom(req.user.id, roomId);
  }

  @Delete('saved-rooms/:roomId')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove room from wishlist' })
  unsaveRoom(@Req() req: any, @Param('roomId') roomId: string) {
    return this.userService.unsaveRoom(req.user.id, roomId);
  }
}
