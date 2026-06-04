import { Module } from '@nestjs/common';
import { FakeListingService } from './fake-listing.service';
import { FakeReviewService } from './fake-review.service';
import { FraudController } from './fraud.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [FakeListingService, FakeReviewService],
  controllers: [FraudController],
  exports: [FakeListingService, FakeReviewService],
})
export class FraudModule {}
