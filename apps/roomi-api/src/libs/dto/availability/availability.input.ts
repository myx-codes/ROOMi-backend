import { Field, InputType, ID } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Types } from 'mongoose';

@InputType()
export class AvailabilityInput {
    @IsNotEmpty()
    @Field(() => ID)
    propertyId: Types.ObjectId;

    @IsNotEmpty()
    @IsString()
    // Faqat "2024-12-31" kabi formatni qabul qilish uchun regex validatsiyasi
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sana YYYY-MM-DD formatida boʻlishi shart' })
    @Field(() => String)
    date: string;

    @IsNotEmpty()
    @IsBoolean()
    @Field(() => Boolean)
    isBooked: boolean;
}

@InputType()
export class AvailabilityPricingInquiry {
    @IsNotEmpty()
    @Field(() => ID)
    propertyId: Types.ObjectId;

    @IsOptional()
    @Field(() => ID, { nullable: true })
    unitId?: Types.ObjectId;

    @IsOptional()
    @Field(() => Number, { nullable: true })
    quantity?: number;

    @IsOptional()
    @Field(() => Number, { nullable: true })
    guests?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Number, { nullable: true })
    adults?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Number, { nullable: true })
    children?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Number, { nullable: true })
    infants?: number;

    @IsOptional()
    @Min(0)
    @Field(() => Number, { nullable: true })
    pets?: number;

    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sana YYYY-MM-DD formatida boʻlishi shart' })
    @Field(() => String)
    startDate: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Sana YYYY-MM-DD formatida boʻlishi shart' })
    @Field(() => String)
    endDate: string;

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    sessionId?: string;
}
