import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilitySchema } from '../../../roomi-api/src/schemas/Availability.model';
import { UnitAvailabilitySchema } from '../../../roomi-api/src/schemas/UnitAvailability.model';
import { BookingSchema } from '../../../roomi-api/src/schemas/Booking.model';
import NoticeSchema from '../../../roomi-api/src/schemas/Notification.model';
import { PaymentSchema } from '../../../roomi-api/src/schemas/Payment.model';
import PropertySchema from '../../../roomi-api/src/schemas/Property.model';
import RatingSchema from '../../../roomi-api/src/schemas/Rating.model';
import { AvailabilityCleanupJob } from './jobs/availability-cleanup.job';
import { BookingLifecycleJob } from './jobs/booking-lifecycle.job';
import { NotificationRetentionJob } from './jobs/notification-retention.job';
import { PaymentLifecycleJob } from './jobs/payment-lifecycle.job';
import { PricingSyncJob } from './jobs/pricing-sync.job';
import { PropertyRankRebuildJob } from './jobs/property-rank-rebuild.job';
import { BatchJobAuditSchema } from './schemas/batch-job-audit.schema';
import { BatchLockSchema } from './schemas/batch-lock.schema';
import { BatchAuditService } from './services/batch-audit.service';
import { BatchLockService } from './services/batch-lock.service';
import { BatchRunnerService } from './services/batch-runner.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'BatchLock', schema: BatchLockSchema },
      { name: 'BatchJobAudit', schema: BatchJobAuditSchema },
      { name: 'Booking', schema: BookingSchema },
      { name: 'Payment', schema: PaymentSchema },
      { name: 'Notice', schema: NoticeSchema },
      { name: 'Availability', schema: AvailabilitySchema },
      { name: 'UnitAvailability', schema: UnitAvailabilitySchema },
      { name: 'Rating', schema: RatingSchema },
      { name: 'Property', schema: PropertySchema },
    ]),
  ],
  providers: [
    BatchAuditService,
    BatchLockService,
    BatchRunnerService,
    BookingLifecycleJob,
    PaymentLifecycleJob,
    NotificationRetentionJob,
    AvailabilityCleanupJob,
    PricingSyncJob,
    PropertyRankRebuildJob,
  ],
})
export class BatchJobsModule {}
