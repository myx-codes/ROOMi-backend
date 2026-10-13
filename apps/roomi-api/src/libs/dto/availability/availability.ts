import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { AvailabilityStatus } from '../../enums/availability.enum';

@ObjectType()
export class Availability {
    @Field(() => ID)
    _id: Types.ObjectId;

    @Field(() => ID)
    propertyId: Types.ObjectId;

    @Field(() => ID)
    memberId: Types.ObjectId; // Dachaga mas'ul bo'lgan agent/ega

    @Field(() => String)
    date: string; // "YYYY-MM-DD" formati tavsiya etiladi

    @Field(() => Boolean)
    isBooked: boolean;

    @Field(() => AvailabilityStatus, { nullable: true })
    availabilityStatus?: AvailabilityStatus;

    @Field(() => Number)
    pricePerDay: number;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;
}

@ObjectType()
export class PriceBreakdownItem {
    @Field(() => String)
    date: string;

    @Field(() => Number)
    basePrice: number;

    @Field(() => Number)
    multiplier: number;

    @Field(() => Number)
    pricePerDay: number;

    @Field(() => Boolean)
    isWeekend: boolean;

    @Field(() => String)
    mode: string;

    @Field(() => [String])
    explanation: string[];
}

@ObjectType()
export class PricePreview {
    @Field(() => [PriceBreakdownItem])
    dates: PriceBreakdownItem[];

    @Field(() => Number)
    nights: number;

    @Field(() => Number)
    baseTotal: number;

    @Field(() => Number)
    totalPrice: number;

    @Field(() => Number)
    averagePrice: number;

    @Field(() => Number, { nullable: true })
    quantity?: number;

    @Field(() => Number, { nullable: true })
    billableGuests?: number;

    @Field(() => ID, { nullable: true })
    unitId?: string | null;

    @Field(() => String, { nullable: true })
    unitName?: string | null;

    @Field(() => String, { nullable: true })
    unitType?: string | null;

    @Field(() => String, { nullable: true })
    rateModel?: string | null;

    @Field(() => String, { nullable: true })
    currency?: string;

    @Field(() => Number, { nullable: true })
    nightlyTotal?: number;

    @Field(() => Number, { nullable: true })
    cleaningFee?: number;

    @Field(() => Number, { nullable: true })
    petFee?: number;

    @Field(() => Number, { nullable: true })
    extraGuestFee?: number;

    @Field(() => Number, { nullable: true })
    guestTotal?: number;

    @Field(() => Number, { nullable: true })
    hostCommissionAmount?: number;

    @Field(() => Number, { nullable: true })
    hostPayoutAmount?: number;
}
