import { Field, InputType, Int, ID, Float } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, Length, Min, IsArray, IsBoolean, IsString, Matches } from 'class-validator';
import { BookingMode, CancellationPolicy, PropertyLocation, PropertyStatus, PropertyType } from '../../enums/property.enum';
import { Types } from 'mongoose';

@InputType()
export class PropertyUpdate {
    @IsNotEmpty()
    @Field(() => ID) // GraphQL ID tipi qulayroq
    _id: Types.ObjectId;

    @IsOptional()
    @Field(() => PropertyType, { nullable: true })
    propertyType?: PropertyType;

    @IsOptional()
    @Field(() => PropertyStatus, { nullable: true })
    propertyStatus?: PropertyStatus;

    @IsOptional()
    @Field(() => PropertyLocation, { nullable: true })
    propertyLocation?: PropertyLocation;

    @IsOptional()
    @Length(3, 100)
    @Field(() => String, { nullable: true })
    propertyAddress?: string;

    @IsOptional()
    @Length(3, 100)
    @Field(() => String, { nullable: true })
    propertyTitle?: string;

    @IsOptional()
    @Min(0)
    @Field(() => Float, { nullable: true }) // Narx butun son bo'lmasligi mumkin
    propertyPrice?: number;

    @IsOptional()
    @Field(() => BookingMode, { nullable: true })
    bookingMode?: BookingMode;

    @IsOptional()
    @Field(() => String, { nullable: true })
    currency?: string;

    @IsOptional()
    @Field(() => Boolean, { nullable: true })
    dynamicPricingEnabled?: boolean;

    @IsOptional()
    @Field(() => Float, { nullable: true })
    weekendMultiplier?: number;

    @IsOptional()
    @Field(() => Float, { nullable: true })
    minMultiplier?: number;

    @IsOptional()
    @Field(() => Float, { nullable: true })
    maxMultiplier?: number;

    @IsOptional()
    @Field(() => Float, { nullable: true })
    manualMultiplierOverride?: number | null;

    @IsOptional()
    @Min(1)
    @Field(() => Float, { nullable: true })
    propertySquare?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    propertyBeds?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    maxGuests?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    bedrooms?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    beds?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    bathrooms?: number;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    infantsAllowed?: boolean;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    petsAllowed?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    propertyRooms?: number;

    @IsOptional()
    @IsArray()
    @Field(() => [String], { nullable: true })
    propertyImages?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Field(() => [String], { nullable: true })
    propertyAmenities?: string[];

    @IsOptional()
    @Length(5, 500)
    @Field(() => String, { nullable: true })
    propertyDesc?: string;

    @IsOptional()
    @IsBoolean()
    @Field(() => Boolean, { nullable: true })
    propertyRent?: boolean; // Bo'sh yoki Band ekanligini yangilash uchun

    @IsOptional()
    @Field(() => String, { nullable: true })
    timezone?: string;

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/)
    @Field(() => String, { nullable: true })
    checkInTime?: string;

    @IsOptional()
    @Matches(/^\d{2}:\d{2}$/)
    @Field(() => String, { nullable: true })
    checkOutTime?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    minNights?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    maxNights?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    advanceNoticeHours?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Field(() => Int, { nullable: true })
    preparationTimeHours?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Field(() => [String], { nullable: true })
    houseRules?: string[];

    @IsOptional()
    @Field(() => CancellationPolicy, { nullable: true })
    cancellationPolicy?: CancellationPolicy;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    cleaningFee?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    petFee?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Int, { nullable: true })
    extraGuestFee?: number;

    // soldAt olib tashlandi (ijarada shart emas)
    
    deletedAt?: Date; // Buni admin yoki tizim o'zi boshqaradi

    @IsOptional()
    @Field(() => Date, { nullable: true })
    constructedAt?: Date;
}
