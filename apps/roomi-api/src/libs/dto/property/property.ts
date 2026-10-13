import { Field, Int, Float, ID, ObjectType } from "@nestjs/graphql";
import { Types } from "mongoose"; // ObjectId xatoligini oldini olish uchun Types import qilindi
import { BookingMode, CancellationPolicy, PropertyLocation, PropertyStatus, PropertyType } from "../../enums/property.enum";
import { Member, TotalCounter } from "../member/member";
import { MeLiked } from "../like/like";

@ObjectType()
export class PropertyCoordinates {
    @Field(() => Float, { nullable: true })
    lat?: number;

    @Field(() => Float, { nullable: true })
    lng?: number;
}

@ObjectType()
export class Property {
    @Field(() => ID)
    _id: Types.ObjectId; // SchemaType o'rniga Types.ObjectId ishlatildi

    @Field(() => PropertyType)
    propertyType: PropertyType;

    @Field(() => PropertyStatus)
    propertyStatus: PropertyStatus;

    @Field(() => PropertyLocation)
    propertyLocation: PropertyLocation;

    @Field(() => PropertyCoordinates, { nullable: true })
    propertyCoordinates?: PropertyCoordinates;

    @Field(() => String)
    propertyAddress: string;

    @Field(() => String)
    propertyTitle: string;

    @Field(() => Float)
    propertyPrice: number; // Bir kunlik ijara narxi

    @Field(() => BookingMode, { nullable: true })
    bookingMode?: BookingMode;

    @Field(() => String, { nullable: true })
    currency?: string;

    @Field(() => Boolean, { defaultValue: true, nullable: true })
    dynamicPricingEnabled?: boolean;

    @Field(() => Float, { nullable: true })
    weekendMultiplier?: number;

    @Field(() => Float, { nullable: true })
    minMultiplier?: number;

    @Field(() => Float, { nullable: true })
    maxMultiplier?: number;

    @Field(() => Float, { nullable: true })
    manualMultiplierOverride?: number | null;

    @Field(() => Float)
    propertySquare: number;

    @Field(() => Int)
    propertyBeds: number;

    @Field(() => Int, { nullable: true })
    maxGuests?: number;

    @Field(() => Int, { nullable: true })
    bedrooms?: number;

    @Field(() => Int, { nullable: true })
    beds?: number;

    @Field(() => Int, { nullable: true })
    bathrooms?: number;

    @Field(() => Boolean, { nullable: true })
    infantsAllowed?: boolean;

    @Field(() => Boolean, { nullable: true })
    petsAllowed?: boolean;

    @Field(() => Int)
    propertyRooms: number;

    @Field(() => Int)
    propertyViews: number;

    @Field(() => Int)
    propertyLikes: number;

    @Field(() => Int)
    propertyComments: number;

    @Field(() => Float)
    propertyRank: number;

    @Field(() => Int)
    propertyRatingCount: number;

    @Field(() => [String], { nullable: true })
    propertyAmenities?: string[];

    @Field(() => [String])
    propertyImages: string[];

    @Field(() => String, { nullable: true })
    propertyDesc?: string;

    @Field(() => Boolean)
    propertyRent: boolean; // true - ijaraga ochiq, false - yopilgan

    @Field(() => String, { nullable: true })
    timezone?: string;

    @Field(() => String, { nullable: true })
    checkInTime?: string;

    @Field(() => String, { nullable: true })
    checkOutTime?: string;

    @Field(() => Int, { nullable: true })
    minNights?: number;

    @Field(() => Int, { nullable: true })
    maxNights?: number;

    @Field(() => Int, { nullable: true })
    advanceNoticeHours?: number;

    @Field(() => Int, { nullable: true })
    preparationTimeHours?: number;

    @Field(() => [String], { nullable: true })
    houseRules?: string[];

    @Field(() => CancellationPolicy, { nullable: true })
    cancellationPolicy?: CancellationPolicy;

    @Field(() => Int, { nullable: true })
    cleaningFee?: number;

    @Field(() => Int, { nullable: true })
    petFee?: number;

    @Field(() => Int, { nullable: true })
    extraGuestFee?: number;

    @Field(() => ID)
    memberId: Types.ObjectId;

    /** Ijara mantiqi uchun soldAt o'rniga quyidagilar mantiqiyroq **/
    
    @Field(() => Date, { nullable: true })
    deletedAt?: Date;

    @Field(() => Date, { nullable: true })
    constructedAt?: Date;

    @Field(() => Date)
    createdAt: Date;

    @Field(() => Date)
    updatedAt: Date;

    /** from Aggregation **/

    @Field(() => Member, { nullable: true })
    memberData?: Member; // Obyekt egasi (Agent/Owner) haqida ma'lumot
    
    @Field(() => [MeLiked], { nullable: true })
    meLiked?: MeLiked[]; // Tizimga kirgan foydalanuvchi layk bosganmi yoki yo'q
}

@ObjectType()
export class Properties {
    @Field(() => [Property])
    list: Property[];

    @Field(() => [TotalCounter], { nullable: true })
    metaCounter: TotalCounter[];
}
