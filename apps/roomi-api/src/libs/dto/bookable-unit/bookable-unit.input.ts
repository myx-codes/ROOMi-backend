import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Types } from 'mongoose';
import { BookingMode } from '../../enums/booking.enum';
import { BookableUnitType, UnitRateModel } from '../../enums/bookable-unit.enum';

@InputType()
export class BookableUnitInput {
    @Field(() => ID)
    propertyId: Types.ObjectId;

    @IsEnum(BookableUnitType)
    @Field(() => BookableUnitType)
    unitType: BookableUnitType;

    @IsNotEmpty()
    @IsString()
    @Field(() => String)
    name: string;

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    code?: string;

    @IsInt()
    @Min(1)
    @Field(() => Int)
    inventoryCount: number;

    @IsInt()
    @Min(0)
    @Field(() => Int)
    basePrice: number;

    @IsOptional()
    @IsEnum(UnitRateModel)
    @Field(() => UnitRateModel, { nullable: true })
    rateModel?: UnitRateModel;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true, description: 'PACKAGE uchun majburiy tunlar soni' })
    packageNights?: number;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true, description: 'PACKAGE narxini mehmon boshiga hisoblash' })
    packagePerPerson?: boolean;

    @IsOptional()
    @IsEnum(BookingMode)
    @Field(() => BookingMode, { nullable: true })
    bookingMode?: BookingMode;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    maxGuests?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    includedGuests?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    bedrooms?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    beds?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    bathrooms?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    cleaningFee?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    petFee?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    extraGuestFee?: number;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    petsAllowed?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    infantsAllowed?: boolean;

    @IsOptional()
    @Field(() => [String], { nullable: true })
    amenities?: string[];
}
