import { InputType, Field, Int } from "@nestjs/graphql";
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Min } from "class-validator"
import { BookingMode, CancellationPolicy, PropertyLocation, PropertyStatus, PropertyType } from "../../enums/property.enum";
import type { Types } from "mongoose";
import { Direction } from "../../enums/common.enum";
import { availableOptions, availablePropertySorts } from "../../config";




@InputType()
export class PropertyInput {

    @IsNotEmpty()
    @Field(() => PropertyType)
    propertyType: PropertyType;

    @IsNotEmpty()
    @Field(() => PropertyLocation)
    propertyLocation: PropertyLocation;

    @IsNotEmpty()
    @Length(3, 100)
    @Field(() => String)
    propertyAddress: string;

    @IsNotEmpty()
    @Length(3, 100)
    @Field(() => String)
    propertyTitle: string;

    @IsNotEmpty()
    @Field(() => Number)
    propertyPrice: number;

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
    @Field(() => Number, { nullable: true })
    weekendMultiplier?: number;

    @IsOptional()
    @Field(() => Number, { nullable: true })
    minMultiplier?: number;

    @IsOptional()
    @Field(() => Number, { nullable: true })
    maxMultiplier?: number;

    @IsOptional()
    @Field(() => Number, { nullable: true })
    manualMultiplierOverride?: number | null;

    @IsNotEmpty()
    @Field(() => Number)
    propertySquare: number;

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Field(() => Int)
    propertyBeds: number;

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

    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Field(() => Int)
    propertyRooms: number;

    @IsNotEmpty()
    @IsString({ each: true }) 
    @Field(() => [String])    
    propertyImages: string[]; 

    @IsOptional()
    @Length(5, 500)
    @Field(() => String, {nullable: true})
    propertyDesc?: string;


    @IsOptional()
    @Field(() => Boolean, {nullable: true})
    propertyRent?: boolean;

    @IsOptional()
    @IsString({ each: true })
    @Field(() => [String], { nullable: true })
    propertyAmenities?: string[];

    @IsOptional()
    @Field(() => Number, { nullable: true })
    latitude?: number;

    @IsOptional()
    @Field(() => Number, { nullable: true })
    longitude?: number;

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

    memberId?: Types.ObjectId;

    @IsOptional()
    @Field(() => Date, {nullable: true})
    constructedAt: Date;

}

@InputType()
export class PricesRange {
    @Field(() => Int)
    start: number;

    @Field(() => Int)
    end: number;
}

@InputType()
export class SquaresRange {
    @Field(() => Int)
    start: number;

    @Field(() => Int)
    end: number;
}

@InputType()
export class PeriodsRange {
    @Field(() => Date)
    start: Date;

    @Field(() => Date)
    end: Date;
}


@InputType()
class PISearch {
    @IsOptional()
    @Field(() => String, { nullable: true })
    memberId?: Types.ObjectId;

    @IsOptional()
    @Field(() => [PropertyLocation], { nullable: true })
    locationList?: PropertyLocation[];

    @IsOptional()
    @Field(() => [PropertyType], { nullable: true })
    typeList?: PropertyType[];

    @IsOptional()
    @Field(() => [Int], { nullable: true })
    roomsList?: Number[];

    @IsOptional()
    @Field(() => [Int], { nullable: true })
    bedsList?: Number[];

    @IsOptional()
    @IsIn(availableOptions, { each: true })
    @Field(() => [String], { nullable: true })
    options?: string[];

    @IsOptional()
    @Field(() => PricesRange, { nullable: true })
    pricesRange?: PricesRange;

    @IsOptional()
    @Field(() => PeriodsRange, { nullable: true })
    periodsRange?: PeriodsRange;

    @IsOptional()
    @Field(() => SquaresRange, { nullable: true })
    squaresRange?: SquaresRange;

    @IsOptional()
    @Field(() => String, { nullable: true })
    text?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    @Field(() => String, { nullable: true })
    checkIn?: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    @Field(() => String, { nullable: true })
    checkOut?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true })
    guests?: number;

    @IsOptional()
    @Field(() => BookingMode, { nullable: true })
    bookingMode?: BookingMode;

    @IsOptional()
    @IsString({ each: true })
    @Field(() => [String], { nullable: true })
    amenities?: string[];
}

    
@InputType()
export class PropertiesInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availablePropertySorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => PISearch)
    search: PISearch;
}

@InputType()
class APISearch {
    @IsOptional()
    @Field(() => PropertyStatus, { nullable: true })
    propertyStatus?: PropertyStatus;
}

@InputType()
export class AgentPropertiesInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availablePropertySorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => APISearch)
    search: APISearch;
}


@InputType()
class ALPISearch {
    @IsOptional()
    @Field(() => PropertyStatus, { nullable: true })
    propertyStatus?: PropertyStatus;

    @IsOptional()
    @Field(() => [PropertyLocation], { nullable: true })
    propertyLocationList?: PropertyLocation[];
}

@InputType()
export class AllPropertiesInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;

    @IsOptional()
    @IsIn(availablePropertySorts)
    @Field(() => String, { nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => Direction, { nullable: true })
    direction?: Direction;

    @IsNotEmpty()
    @Field(() => ALPISearch)
    search: ALPISearch;
}

@InputType()
export class OrdinaryInquiry {
    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    page: number;

    @IsNotEmpty()
    @Min(1)
    @Field(() => Int)
    limit: number;
}
