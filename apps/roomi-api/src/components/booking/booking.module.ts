import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingResolver } from './booking.resolver';
import { BookingService } from './booking.service';
import {BookingSchema} from '../../schemas/Booking.model';
import { AuthModule } from '../auth/auth.module';
import { PropertyModule } from '../property/property.module';
import { AvailabilityModule } from '../availability/availability.module';
import { NoticeModule } from '../notifaction/notice.module';
import { BookableUnitModule } from '../bookable-unit/bookable-unit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
    AuthModule,
    PropertyModule,
    AvailabilityModule,
    NoticeModule,
    BookableUnitModule,
  ],
  providers: [BookingResolver, BookingService],
  exports: [BookingService],
})
export class BookingModule {}
