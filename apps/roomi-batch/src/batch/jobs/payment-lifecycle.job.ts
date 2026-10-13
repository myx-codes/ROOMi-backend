import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { PaymentStatus } from '../../../../roomi-api/src/libs/enums/payment.enum';
import {
  BATCH_TIMEZONE,
  DEFAULT_PENDING_PAYMENT_TTL_HOURS,
  JOB_NAMES,
} from '../batch.constants';
import { BatchRunnerService } from '../services/batch-runner.service';

@Injectable()
export class PaymentLifecycleJob {
  private readonly logger = new Logger(PaymentLifecycleJob.name);

  constructor(
    @InjectModel('Payment') private readonly paymentModel: Model<any>,
    private readonly batchRunnerService: BatchRunnerService,
  ) {}

  @Cron('30 * * * *', { name: JOB_NAMES.PAYMENT_FAIL_STALE_PENDING, timeZone: BATCH_TIMEZONE })
  public async failStalePendingPayments(): Promise<void> {
    await this.batchRunnerService.run(
      JOB_NAMES.PAYMENT_FAIL_STALE_PENDING,
      async ({ now, dryRun }) => {
        const cutoff = new Date(now.getTime() - DEFAULT_PENDING_PAYMENT_TTL_HOURS * 60 * 60 * 1000);
        const search = {
          paymentStatus: { $in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
          createdAt: { $lte: cutoff },
        };

        const candidateCount = await this.paymentModel.countDocuments(search).exec();
        if (candidateCount === 0) return 0;
        if (dryRun) {
          this.logger.log(
            `[${JOB_NAMES.PAYMENT_FAIL_STALE_PENDING}] dry-run candidateCount=${candidateCount}`,
          );
          return candidateCount;
        }

        const result = await this.paymentModel
          .updateMany(search, {
            $set: {
              paymentStatus: PaymentStatus.FAILED,
            },
          })
          .exec();

        return result.modifiedCount;
      },
      {
        meta: {
          cron: '30 * * * *',
          pendingPaymentTtlHours: DEFAULT_PENDING_PAYMENT_TTL_HOURS,
        },
      },
    );
  }
}
