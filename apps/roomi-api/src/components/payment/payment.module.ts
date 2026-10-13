import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentResolver } from './payment.resolver';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentSchema } from '../../schemas/Payment.model';
import { BookingSchema } from '../../schemas/Booking.model';
import { AuthModule } from '../auth/auth.module';
import { NoticeModule } from '../notifaction/notice.module';
import { PropertyModule } from '../property/property.module';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Payment', schema: PaymentSchema },
      { name: 'Booking', schema: BookingSchema },
    ]),
    AuthModule,
    NoticeModule,
    PropertyModule,
    BookingModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentResolver, PaymentService]
})
export class PaymentModule {}
