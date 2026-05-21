/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class LandlordGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.role !== 'LANDLORD' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Chỉ chủ trọ mới có thể thực hiện thao tác này. Vui lòng chuyển sang tài khoản chủ trọ.',
      );
    }

    return true;
  }
}
