import { Args, Int, Mutation, Parent, Resolver, Query, ResolveField } from '@nestjs/graphql';
import { BookingService } from './booking.service';
import { Booking, Bookings, RefundPreview } from '../../libs/dto/booking/booking';
import { BookingInput, BookingsInquiry } from '../../libs/dto/booking/booking.input';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Types } from 'mongoose';
import { formatDateOnly } from '../../libs/config';
import { Roles } from '../auth/decorators/roles.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver(() => Booking)
export class BookingResolver {
    constructor(private readonly bookingService: BookingService) {}

    @UseGuards(AuthGuard)
    @Mutation(() => Booking)
    async createBooking(
        @Args('input') input: BookingInput,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Booking> {
        return await this.bookingService.createBooking(memberId, input);
    }

    @UseGuards(AuthGuard)
    @Query(() => Bookings) // Diqqat: Bookings (list va metaCounter bilan)
    async getMyBookings(
        @Args('input') input: BookingsInquiry,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Bookings> {
        return await this.bookingService.getMyBookings(memberId, input);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Booking)
    async acceptBooking(
        @Args('bookingId') bookingId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Booking> {
        return await this.bookingService.acceptBooking(memberId, bookingId);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Booking)
    async rejectBooking(
        @Args('bookingId') bookingId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Booking> {
        return await this.bookingService.rejectBooking(memberId, bookingId);
    }

    @UseGuards(AuthGuard)
    @Mutation(() => Booking)
    async cancelBooking(
        @Args('bookingId') bookingId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Booking> {
        return await this.bookingService.cancelBooking(memberId, bookingId);
    }

    @UseGuards(AuthGuard)
    @Query(() => RefundPreview)
    async refundPreview(
        @Args('bookingId') bookingId: string,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<RefundPreview> {
        return await this.bookingService.refundPreview(memberId, bookingId);
    }

    @Roles(MemberType.AGENT)
    @UseGuards(RolesGuard)
    @Query(() => Bookings)
    async getBookingsForMyProperties(
        @Args('input') input: BookingsInquiry,
        @AuthMember('_id') memberId: Types.ObjectId,
    ): Promise<Bookings> {
        return await this.bookingService.getBookingsForMyProperties(memberId, input);
    }

    @ResolveField(() => String)
    bookingCheckIn(@Parent() booking: Booking): string {
        return booking.bookingStart ? formatDateOnly(new Date(booking.bookingStart)) : '';
    }

    @ResolveField(() => String)
    bookingCheckOut(@Parent() booking: Booking): string {
        return booking.bookingEnd ? formatDateOnly(new Date(booking.bookingEnd)) : '';
    }

    @ResolveField(() => Int)
    bookingPrice(@Parent() booking: Booking): number {
        return booking.totalPrice ?? 0;
    }
}
