import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { BookingMode, BookingStatus } from '../../enums/booking.enum';
import { CancellationPolicy } from '../../enums/property.enum';
import { BookableUnitType, UnitRateModel } from '../../enums/bookable-unit.enum';
import { Member, TotalCounter } from '../member/member';
import { Property } from '../property/property';

@ObjectType()
export class Booking {
    @Field(() => ID)
    _id: Types.ObjectId;

    @Field(() => BookingStatus)
    bookingStatus: BookingStatus;

    @Field(() => BookingMode, { nullable: true })
    bookingMode?: BookingMode;

    @Field(() => Date)
    bookingStart: Date; // Kelish sanasi (Check-in)

    @Field(() => Date)
    bookingEnd: Date; // Ketish sanasi (Check-out)

    @Field(() => Int)
    totalPrice: number;

    @Field(() => String, { nullable: true })
    currency?: string;

    @Field(() => Int, { nullable: true })
    hostCommissionAmount?: number;

    @Field(() => Int, { nullable: true })
    hostPayoutAmount?: number;

    @Field(() => CancellationPolicy, { nullable: true })
    cancellationPolicy?: CancellationPolicy;

    @Field(() => Date, { nullable: true })
    expiresAt?: Date | null;

    /** Legacy aliases: yil/oy/sana (YYYY-MM-DD) */
    @Field(() => String, { description: 'Check-in sanasi: YYYY-MM-DD' })
    bookingCheckIn?: string;

    @Field(() => String, { description: 'Check-out sanasi: YYYY-MM-DD' })
    bookingCheckOut?: string;

    @Field(() => Int, { description: 'Alias for totalPrice' })
    bookingPrice?: number;

    @Field(() => Int)
    bookingGuests: number;

    @Field(() => Int, { nullable: true })
    adults?: number;

    @Field(() => Int, { nullable: true })
    children?: number;

    @Field(() => Int, { nullable: true })
    infants?: number;

    @Field(() => Int, { nullable: true })
    pets?: number;

    @Field(() => ID)
    propertyId: Types.ObjectId;

    @Field(() => ID, { nullable: true })
    unitId?: Types.ObjectId;

    @Field(() => BookableUnitType, { nullable: true })
    unitType?: BookableUnitType;

    @Field(() => UnitRateModel, { nullable: true })
    rateModel?: UnitRateModel;

    @Field(() => String, { nullable: true })
    unitName?: string;

    @Field(() => Int, { nullable: true })
    quantity?: number;

    @Field(() => ID)
    memberId: Types.ObjectId; // Bron qilgan mijoz

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;

    /** Aggregation orqali keladigan ma'lumotlar **/
    @Field(() => Property, { nullable: true })
    propertyData?: Property;

    @Field(() => Member, { nullable: true })
    memberData?: Member;
}

@ObjectType()
export class Bookings {
    @Field(() => [Booking])
    list: Booking[];

    @Field(() => [TotalCounter], { nullable: true })
    metaCounter: TotalCounter[];
}

@ObjectType()
export class RefundPreview {
    @Field(() => ID)
    bookingId: Types.ObjectId;

    @Field(() => CancellationPolicy)
    cancellationPolicy: CancellationPolicy;

    @Field(() => Int)
    guestTotal: number;

    @Field(() => Int)
    refundAmount: number;

    @Field(() => Int)
    retainedAmount: number;

    @Field(() => Int)
    refundableNightlyAmount: number;

    @Field(() => Int)
    refundableCleaningFee: number;

    @Field(() => String)
    reason: string;
}
