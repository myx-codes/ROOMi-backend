import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { BookableUnit, BookableUnits } from '../../libs/dto/bookable-unit/bookable-unit';
import { BookableUnitInput } from '../../libs/dto/bookable-unit/bookable-unit.input';
import { UnitCalendarInput } from '../../libs/dto/bookable-unit/unit-calendar.input';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberType } from '../../libs/enums/member.enum';
import { BookableUnitService } from './bookable-unit.service';
import { UnitAvailabilityService } from './unit-availability.service';
import { iterateDateRange } from '../../libs/pricing';

@Resolver(() => BookableUnit)
export class BookableUnitResolver {
    constructor(
        private readonly service: BookableUnitService,
        private readonly unitAvailabilityService: UnitAvailabilityService,
    ) {}

    @Query(() => BookableUnits)
    async getBookableUnits(@Args('propertyId') propertyId: string): Promise<BookableUnits> {
        return this.service.getPublicUnits(new Types.ObjectId(propertyId));
    }

    @Roles(MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Mutation(() => BookableUnit)
    async createBookableUnit(
        @Args('input') input: BookableUnitInput,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<BookableUnit> {
        return this.service.createUnit(memberId, input);
    }

    @Roles(MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Mutation(() => BookableUnit)
    async archiveBookableUnit(
        @Args('unitId') unitId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<BookableUnit> {
        return this.service.archiveUnit(memberId, unitId);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Boolean)
    async setUnitCalendarDates(
        @Args('input') input: UnitCalendarInput,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<boolean> {
        const propertyId = new Types.ObjectId(input.propertyId);
        const unitId = new Types.ObjectId(input.unitId);
        const unit = await this.service.getOwnedUnit(memberId, propertyId, unitId);
        const dates = iterateDateRange(input.startDate, input.endDate).map((date) => date.toISOString().slice(0, 10));
        if (!dates.length) throw new BadRequestException('endDate must be after startDate');
        await this.unitAvailabilityService.setBlocked(unit, dates, input.blocked, input.quantity);
        return true;
    }
}
