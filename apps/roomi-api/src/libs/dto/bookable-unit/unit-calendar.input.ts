import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Matches, Min } from 'class-validator';
import { Types } from 'mongoose';

@InputType()
export class UnitCalendarInput {
    @IsNotEmpty()
    @Field(() => ID)
    propertyId: Types.ObjectId;

    @IsNotEmpty()
    @Field(() => ID)
    unitId: Types.ObjectId;

    @IsNotEmpty()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    @Field(() => String)
    startDate: string;

    @IsNotEmpty()
    @Matches(/^\d{4}-\d{2}-\d{2}$/)
    @Field(() => String)
    endDate: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Field(() => Int, { nullable: true, description: 'Room type uchun bloklanadigan inventory soni' })
    quantity?: number;

    @IsBoolean()
    @Field(() => Boolean)
    blocked: boolean;
}
