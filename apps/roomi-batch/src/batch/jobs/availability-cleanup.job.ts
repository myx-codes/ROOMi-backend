import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { AvailabilityStatus } from '../../../../roomi-api/src/libs/enums/availability.enum';
import {
  BATCH_TIMEZONE,
  DEFAULT_OCCUPIED_AVAILABILITY_RETENTION_DAYS,
  JOB_NAMES,
} from '../batch.constants';
import { BatchRunnerService } from '../services/batch-runner.service';

@Injectable()
export class AvailabilityCleanupJob {
  private readonly logger = new Logger(AvailabilityCleanupJob.name);

  constructor(
    @InjectModel('Availability') private readonly availabilityModel: Model<any>,
    private readonly batchRunnerService: BatchRunnerService,
  ) {}

  @Cron('10 2 * * 0', { name: JOB_NAMES.AVAILABILITY_CLEANUP, timeZone: BATCH_TIMEZONE })
  public async cleanupOldOccupiedDates(): Promise<void> {
    await this.batchRunnerService.run(
      JOB_NAMES.AVAILABILITY_CLEANUP,
      async ({ now, dryRun }) => {
        const cutoff = new Date(
          now.getTime() - DEFAULT_OCCUPIED_AVAILABILITY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
        );
        const search = {
          availabilityStatus: { $in: [AvailabilityStatus.RESERVED, AvailabilityStatus.OCCUPIED] },
          availabilityDate: { $lt: cutoff },
        };

        const candidateCount = await this.availabilityModel.countDocuments(search).exec();
        if (candidateCount === 0) return 0;
        if (dryRun) {
          this.logger.log(`[${JOB_NAMES.AVAILABILITY_CLEANUP}] dry-run candidateCount=${candidateCount}`);
          return candidateCount;
        }

        const result = await this.availabilityModel.deleteMany(search).exec();
        return result.deletedCount ?? 0;
      },
      {
        meta: {
          cron: '10 2 * * 0',
          retentionDays: DEFAULT_OCCUPIED_AVAILABILITY_RETENTION_DAYS,
        },
      },
    );
  }
}
