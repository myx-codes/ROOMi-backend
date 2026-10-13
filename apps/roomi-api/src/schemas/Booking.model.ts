import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BookingMode, BookingStatus } from '../libs/enums/booking.enum';
import { CancellationPolicy } from '../libs/enums/property.enum';
import { BookableUnitType, UnitRateModel } from '../libs/enums/bookable-unit.enum';

@Schema({ timestamps: true, collection: 'bookings' })
export class Booking extends Document {
    @Prop({
        type: String,
        enum: BookingStatus,
        default: BookingStatus.AWAITING_PAYMENT,
    })
    bookingStatus: BookingStatus;

    @Prop({
        type: String,
        enum: BookingMode,
        default: BookingMode.INSTANT,
    })
    bookingMode: BookingMode;

    @Prop({
        type: Types.ObjectId,
        ref: 'Property',
        required: true,
    })
    propertyId: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: 'Member',
        required: true,
    })
    memberId: Types.ObjectId; // Bron qilgan foydalanuvchi

    @Prop({ type: Types.ObjectId, ref: 'BookableUnit', default: null, index: true })
    unitId?: Types.ObjectId | null;

    @Prop({ type: String, enum: BookableUnitType, default: null })
    unitType?: BookableUnitType | null;

    @Prop({ type: String, enum: UnitRateModel, default: null })
    rateModel?: UnitRateModel | null;

    @Prop({ type: String, default: null })
    unitName?: string | null;

    @Prop({ type: Number, min: 1, default: 1 })
    quantity: number;

    @Prop({
        type: Date,
        required: true,
    })
    bookingStart: Date; // Kelish sanasi (Check-in)

    @Prop({
        type: Date,
        required: true,
    })
    bookingEnd: Date; // Ketish sanasi (Check-out)

    @Prop({
        type: Number,
    })
    totalPrice: number; // Jami hisoblangan summa

    @Prop({
        type: String,
        default: 'UZS',
    })
    currency: string;

    @Prop({
        type: Number,
        default: 0,
    })
    hostCommissionAmount: number;

    @Prop({
        type: Number,
        default: 0,
    })
    hostPayoutAmount: number;

    @Prop({
        type: Object,
        default: null,
    })
    priceSnapshot?: Record<string, unknown> | null;

    @Prop({
        type: String,
        enum: CancellationPolicy,
        default: CancellationPolicy.MODERATE,
    })
    cancellationPolicy: CancellationPolicy;

    @Prop({
        type: Object,
        default: null,
    })
    cancellationPolicySnapshot?: Record<string, unknown> | null;

    @Prop({
        type: Date,
        default: null,
        index: true,
    })
    expiresAt?: Date | null;

    @Prop({
        type: Number,
        default: 0,
    })
    bookingGuests: number; // Mehmonlar soni

    @Prop({
        type: Number,
        default: 0,
    })
    adults: number;

    @Prop({
        type: Number,
        default: 0,
    })
    children: number;

    @Prop({
        type: Number,
        default: 0,
    })
    infants: number;

    @Prop({
        type: Number,
        default: 0,
    })
    pets: number;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ propertyId: 1, bookingStart: 1, bookingEnd: 1, bookingStatus: 1 });
