import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AvailabilityStatus } from '../libs/enums/availability.enum';

/**
 * Inventory slot per unit/date.  Hotel room types with inventoryCount=10 have
 * at most 10 slots for each date; villa/cabin units have one slot.
 */
@Schema({ timestamps: true, collection: 'unit_availabilities' })
export class UnitAvailability extends Document {
    @Prop({ type: Types.ObjectId, ref: 'BookableUnit', required: true, index: true })
    unitId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
    propertyId: Types.ObjectId;

    @Prop({ type: Date, required: true, index: true })
    availabilityDate: Date;

    @Prop({ type: Number, required: true, min: 0 })
    slot: number;

    @Prop({ type: String, enum: AvailabilityStatus, default: AvailabilityStatus.AVAILABLE })
    availabilityStatus: AvailabilityStatus;

    @Prop({ type: Number, default: 0, min: 0 })
    pricePerDay: number;

    @Prop({ type: Types.ObjectId, ref: 'Booking', default: null, index: true })
    bookingId?: Types.ObjectId | null;

    @Prop({ type: Date, default: null })
    heldUntil?: Date | null;
}

export const UnitAvailabilitySchema = SchemaFactory.createForClass(UnitAvailability);
UnitAvailabilitySchema.index({ unitId: 1, availabilityDate: 1, slot: 1 }, { unique: true });
