import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FakeListingResult, FakeListingService } from './fake-listing.service';
import { FakeReviewService } from './fake-review.service';
import { JwtGuard } from '../auth/guards/jwt.guard';

@ApiTags('Fraud Detection')
@Controller('fraud')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class FraudController {
  constructor(
    private fakeListingService: FakeListingService,
    private fakeReviewService: FakeReviewService,
  ) {}

  // Admin phân tích tin đăng
  @Get('listing/:roomId')
  @ApiOperation({ summary: 'Analyze a room listing for fraud signals' })
  analyzeListing(@Param('roomId') roomId: string): Promise<FakeListingResult> {
    return this.fakeListingService.analyzeRoom(roomId, false);
  }
}
