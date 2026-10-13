import { Field, InputType, Int, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Matches, Min } from 'class-validator';
import { Types } from 'mongoose';
import { BookingMode, BookingStatus } from '../../enums/booking.enum';

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@InputType()
export class BookingInput {
    @Field(() => ID)
    propertyId: Types.ObjectId;

    /** Hotel/sanatorium room type or a specific cabin/apartment unit. */
    @IsOptional()
    @Field(() => ID, { nullable: true })
    unitId?: Types.ObjectId;

    @Field(() => String, { description: 'Check-in sana: YYYY-MM-DD' })
    @Matches(YMD_PATTERN, { message: 'bookingStart formati YYYY-MM-DD bo\'lishi kerak (masalan: 2026-05-20)' })
    bookingStart: string;

    @Field(() => String, { description: 'Check-out sana: YYYY-MM-DD' })
    @Matches(YMD_PATTERN, { message: 'bookingEnd formati YYYY-MM-DD bo\'lishi kerak (masalan: 2026-05-22)' })
    bookingEnd: string;

    @Field(() => Int)
    bookingGuests: number;

    /** Number of identical rooms/cabins requested. Usually 1 for entire units. */
    @IsOptional()
    @Min(1)
    @Field(() => Int, { nullable: true })
    quantity?: number;

    @IsOptional()
    @Field(() => BookingMode, { nullable: true })
    bookingMode?: BookingMode;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    adults?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    children?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    infants?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    pets?: number;

    @Field(() => Int, { nullable: true })
    totalPrice?: number;
}

@InputType()
export class BookingsInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @Field(() => BookingStatus, { nullable: true })
    bookingStatus?: BookingStatus;
}
