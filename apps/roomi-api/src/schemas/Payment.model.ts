import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentStatus, PaymentMethod } from '../libs/enums/payment.enum';

@Schema({ timestamps: true, collection: 'payments' })
export class Payment extends Document {
    @Prop({
        type: String,
        enum: PaymentStatus,
        default: PaymentStatus.CREATED,
    })
    paymentStatus: PaymentStatus;

    @Prop({
        type: String,
        enum: PaymentMethod,
        required: true,
    })
    paymentMethod: PaymentMethod;

    @Prop({
        type: Number,
        required: true,
    })
    paymentAmount: number;

    @Prop({
        type: Types.ObjectId,
        required: true,
        ref: 'Booking',
    })
    bookingId: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        required: true,
        ref: 'Member',
    })
    memberId: Types.ObjectId;

    @Prop({
        type: String,
        default: null,
        index: { unique: true, sparse: true }, // Indexni shu yerning o'zida berish qulay
    })
    transactionId?: string;

    @Prop({
        type: String,
        default: null,
        index: { unique: true, sparse: true },
    })
    providerTransactionId?: string | null;

    @Prop({
        type: String,
        default: null,
        index: { unique: true, sparse: true },
    })
    idempotencyKey?: string | null;

    @Prop({
        type: Boolean,
        default: false,
    })
    legacy?: boolean;

    @Prop({
        type: Object,
        default: null,
    })
    providerPayload?: Record<string, unknown> | null;

    @Prop({
        type: Date,
        default: null,
    })
    paidAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ bookingId: 1, paymentMethod: 1, paymentStatus: 1 });
