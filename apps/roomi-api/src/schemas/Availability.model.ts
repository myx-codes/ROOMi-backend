import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AvailabilityStatus } from '../libs/enums/availability.enum';

@Schema({ timestamps: true, collection: 'availabilities' })
export class Availability extends Document {
    @Prop({
        type: Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true, // Qidiruv tez bo'lishi uchun
    })
    propertyId: Types.ObjectId;

    @Prop({
        type: Date,
        required: true,
        index: true,
    })
    availabilityDate: Date; // Ma'lum bir sana (masalan: 2026-03-15)

    @Prop({
        type: String,
        enum: AvailabilityStatus,
        default: AvailabilityStatus.AVAILABLE,
    })
    availabilityStatus: AvailabilityStatus;

    @Prop({
        type: Number,
        required: true,
    })
    pricePerDay: number; // Aynan shu kungi narx (Hafta oxiri qimmatroq bo'lishi mumkin)

    @Prop({
        type: Types.ObjectId,
        ref: 'Booking',
        default: null,
    })
    bookingId?: Types.ObjectId; // Agar band bo'lsa, qaysi bron asosida bandligini bilish uchun

    @Prop({
        type: Date,
        default: null,
        index: true,
    })
    heldUntil?: Date | null;

    @Prop({
        type: String,
        default: 'Asia/Tashkent',
    })
    timezone?: string;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

/** Murakkab qidiruvlar uchun kompozit index: 
 * Bir xil property uchun bir xil sanadan ikkita bo'lmasligi kerak **/
AvailabilitySchema.index({ propertyId: 1, availabilityDate: 1 }, { unique: true });
