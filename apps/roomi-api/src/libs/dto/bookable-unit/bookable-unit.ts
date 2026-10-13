import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';
import { BookingMode } from '../../enums/booking.enum';
import { BookableUnitStatus, BookableUnitType, UnitRateModel } from '../../enums/bookable-unit.enum';

@ObjectType()
export class BookableUnit {
    @Field(() => ID)
    _id: Types.ObjectId;

    @Field(() => ID)
    propertyId: Types.ObjectId;

    @Field(() => BookableUnitType)
    unitType: BookableUnitType;

    @Field(() => String)
    name: string;

    @Field(() => String, { nullable: true })
    code?: string;

    @Field(() => Int)
    inventoryCount: number;

    @Field(() => Int)
    basePrice: number;

    @Field(() => UnitRateModel)
    rateModel: UnitRateModel;

    @Field(() => Int)
    packageNights: number;

    @Field(() => Boolean)
    packagePerPerson: boolean;

    @Field(() => BookingMode)
    bookingMode: BookingMode;

    @Field(() => Int)
    maxGuests: number;

    @Field(() => Int)
    includedGuests: number;

    @Field(() => Int)
    bedrooms: number;

    @Field(() => Int)
    beds: number;

    @Field(() => Int)
    bathrooms: number;

    @Field(() => Int)
    cleaningFee: number;

    @Field(() => Int)
    petFee: number;

    @Field(() => Int)
    extraGuestFee: number;

    @Field(() => Boolean)
    petsAllowed: boolean;

    @Field(() => Boolean)
    infantsAllowed: boolean;

    @Field(() => [String])
    amenities: string[];

    @Field(() => BookableUnitStatus)
    status: BookableUnitStatus;
}

@ObjectType()
export class BookableUnits {
    @Field(() => [BookableUnit])
    list: BookableUnit[];
}
