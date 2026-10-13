import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BookingMode } from '../libs/enums/booking.enum';
import { BookableUnitStatus, BookableUnitType, UnitRateModel } from '../libs/enums/bookable-unit.enum';

@Schema({ timestamps: true, collection: 'bookable_units' })
export class BookableUnit extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
    propertyId: Types.ObjectId;

    @Prop({ type: String, enum: BookableUnitType, required: true })
    unitType: BookableUnitType;

    @Prop({ type: String, required: true, trim: true })
    name: string;

    @Prop({ type: String, trim: true, uppercase: true })
    code?: string;

    /** Bir xil xona/uydan nechta mavjudligi. Entire unit uchun odatda 1. */
    @Prop({ type: Number, required: true, min: 1, default: 1 })
    inventoryCount: number;

    @Prop({ type: Number, required: true, min: 0 })
    basePrice: number;

    @Prop({ type: String, enum: UnitRateModel, default: UnitRateModel.UNIT_NIGHT })
    rateModel: UnitRateModel;

    /** PACKAGE rate is valid for exactly this many nights. */
    @Prop({ type: Number, min: 1, default: 1 })
    packageNights: number;

    /** For treatment/meal packages, charge the package per billable guest. */
    @Prop({ type: Boolean, default: false })
    packagePerPerson: boolean;

    @Prop({ type: String, enum: BookingMode, default: BookingMode.INSTANT })
    bookingMode: BookingMode;

    @Prop({ type: Number, min: 1, default: 1 })
    maxGuests: number;

    @Prop({ type: Number, min: 0, default: 0 })
    includedGuests: number;

    @Prop({ type: Number, min: 0, default: 1 })
    bedrooms: number;

    @Prop({ type: Number, min: 0, default: 1 })
    beds: number;

    @Prop({ type: Number, min: 0, default: 1 })
    bathrooms: number;

    @Prop({ type: Number, min: 0, default: 0 })
    cleaningFee: number;

    @Prop({ type: Number, min: 0, default: 0 })
    petFee: number;

    /** Har bir qo‘shimcha mehmon uchun, har bir tun. */
    @Prop({ type: Number, min: 0, default: 0 })
    extraGuestFee: number;

    @Prop({ type: Boolean, default: false })
    petsAllowed: boolean;

    @Prop({ type: Boolean, default: true })
    infantsAllowed: boolean;

    @Prop({ type: [String], default: [] })
    amenities: string[];

    @Prop({ type: String, enum: BookableUnitStatus, default: BookableUnitStatus.ACTIVE, index: true })
    status: BookableUnitStatus;
}

export const BookableUnitSchema = SchemaFactory.createForClass(BookableUnit);
BookableUnitSchema.index({ propertyId: 1, code: 1 }, { unique: true, sparse: true });
BookableUnitSchema.index({ propertyId: 1, status: 1, unitType: 1 });
