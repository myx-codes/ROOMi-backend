import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { AvailabilityStatus } from '../../../../roomi-api/src/libs/enums/availability.enum';
import { PropertyStatus } from '../../../../roomi-api/src/libs/enums/property.enum';
import { calculateNightPrice, generateUpcomingDates } from '../../../../roomi-api/src/libs/pricing';
import {
  BATCH_TIMEZONE,
  DEFAULT_PRICING_LOOKAHEAD_DAYS,
  JOB_NAMES,
} from '../batch.constants';
import { BatchRunnerService } from '../services/batch-runner.service';

@Injectable()
export class PricingSyncJob {
  private readonly logger = new Logger(PricingSyncJob.name);

  constructor(
    @InjectModel('Property') private readonly propertyModel: Model<any>,
    @InjectModel('Availability') private readonly availabilityModel: Model<any>,
    private readonly batchRunnerService: BatchRunnerService,
  ) {}

  @Cron('0 4 * * *', { name: JOB_NAMES.PRICING_SYNC, timeZone: BATCH_TIMEZONE })
  public async syncFuturePricing(): Promise<void> {
    await this.batchRunnerService.run(
      JOB_NAMES.PRICING_SYNC,
      async ({ now, dryRun }) => {
        const properties = await this.propertyModel
          .find({ propertyStatus: { $ne: PropertyStatus.DELETE } })
          .lean()
          .exec();

        const upcomingDates = generateUpcomingDates(now, DEFAULT_PRICING_LOOKAHEAD_DAYS);
        const startDate = upcomingDates[0];
        const endDateExclusive = new Date(`${upcomingDates[upcomingDates.length - 1]}T00:00:00.000Z`);
        endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);

        let affectedCount = 0;

        for (const property of properties) {
          const propertyId = new Types.ObjectId(property._id);
          const existingDocs = await this.availabilityModel
            .find({
              propertyId,
              availabilityDate: {
                $gte: new Date(`${startDate}T00:00:00.000Z`),
                $lt: endDateExclusive,
              },
            })
            .lean()
            .exec();

          const existingMap = new Map(
            existingDocs.map((doc: any) => [
              new Date(doc.availabilityDate).toISOString().split('T')[0],
              doc,
            ]),
          );

          const operations = upcomingDates.flatMap((date) => {
            const existing = existingMap.get(date);
            if (
              existing?.availabilityStatus === AvailabilityStatus.HELD ||
              existing?.availabilityStatus === AvailabilityStatus.RESERVED ||
              existing?.availabilityStatus === AvailabilityStatus.BLOCKED ||
              existing?.availabilityStatus === AvailabilityStatus.OCCUPIED ||
              existing?.availabilityStatus === AvailabilityStatus.MAINTENANCE
            ) {
              return [];
            }

            const quote = calculateNightPrice(property, new Date(`${date}T12:00:00.000Z`), BATCH_TIMEZONE);
            return [
              {
                updateOne: {
                  filter: {
                    propertyId,
                    availabilityDate: new Date(`${date}T00:00:00.000Z`),
                  },
                  update: {
                    $setOnInsert: {
                      propertyId,
                      availabilityDate: new Date(`${date}T00:00:00.000Z`),
                      availabilityStatus: AvailabilityStatus.AVAILABLE,
                    },
                    $set: {
                      pricePerDay: quote.pricePerDay,
                      availabilityStatus: AvailabilityStatus.AVAILABLE,
                    },
                  },
                  upsert: true,
                },
              },
            ];
          });

          if (operations.length === 0) continue;
          affectedCount += operations.length;

          if (dryRun) {
            this.logger.log(
              `[${JOB_NAMES.PRICING_SYNC}] dry-run property=${String(propertyId)} candidateCount=${operations.length}`,
            );
            continue;
          }

          await this.availabilityModel.bulkWrite(operations as any, { ordered: false });
        }

        return affectedCount;
      },
      {
        meta: {
          cron: '0 4 * * *',
          lookaheadDays: DEFAULT_PRICING_LOOKAHEAD_DAYS,
        },
      },
    );
  }
}
