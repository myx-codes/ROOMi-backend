import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, Bookings, RefundPreview } from '../../libs/dto/booking/booking';
import { BookingInput, BookingsInquiry } from '../../libs/dto/booking/booking.input';
import { AvailabilityService } from '../availability/availability.service';
import { PropertyService } from '../property/property.service';
import { BookingMode, BookingStatus } from '../../libs/enums/booking.enum';
import { T } from '../../libs/types/common';
import { Booking as BookingSchemaDoc } from '../../schemas/Booking.model';
import { formatDateOnly, parseDateOnly, shapeIntoMongoObjectId } from '../../libs/config';
import { NoticeService } from '../notifaction/notice.service';
import { NoticeCategory, NoticeStatus } from '../../libs/enums/notification.enum';
import { CancellationPolicy } from '../../libs/enums/property.enum';
import { calculateBookingQuote, PricePreview } from '../../libs/pricing';
import { BookableUnitService, ResolvedBookableUnit } from '../bookable-unit/bookable-unit.service';
import { UnitAvailabilityService } from '../bookable-unit/unit-availability.service';

const INSTANT_PAYMENT_WINDOW_MINUTES = 30;
const REQUEST_HOLD_HOURS = 24;
const HOST_COMMISSION_RATE = 0.1;

const TERMINAL_BOOKING_STATUSES = [
    BookingStatus.CANCELLED,
    BookingStatus.EXPIRED,
    BookingStatus.COMPLETED,
    BookingStatus.FINISHED,
];

@Injectable()
export class BookingService {
    constructor(
        @InjectModel('Booking') private readonly bookingModel: Model<BookingSchemaDoc>,
        private readonly availabilityService: AvailabilityService,
        private readonly propertyService: PropertyService,
        private readonly noticeService: NoticeService,
        private readonly bookableUnitService: BookableUnitService,
        private readonly unitAvailabilityService: UnitAvailabilityService,
    ) {}

    public async getBookingById(bookingId: Types.ObjectId): Promise<BookingSchemaDoc> {
        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) throw new NotFoundException('Booking not found');
        return booking;
    }

    public async updateStatus(bookingId: Types.ObjectId, bookingStatus: BookingStatus): Promise<Booking> {
        const result = await this.bookingModel
            .findByIdAndUpdate(bookingId, { bookingStatus }, { returnDocument: 'after' })
            .exec();
        if (!result) throw new NotFoundException('Booking not found');
        return result as unknown as Booking;
    }

    public async createBooking(memberId: Types.ObjectId, input: BookingInput): Promise<Booking> {
        const propertyId = new Types.ObjectId(input.propertyId);
        const bookingStart = parseDateOnly(input.bookingStart);
        const bookingEnd = parseDateOnly(input.bookingEnd);
        let heldDates: string[] = [];
        let bookingId: Types.ObjectId | null = null;
        let selectedUnit: ResolvedBookableUnit | null = null;

        try {
            const property = await this.propertyService.getPropertyForBooking(propertyId);
            if (String(property.memberId) === String(memberId)) {
                throw new BadRequestException('Hosts cannot book their own listing');
            }

            selectedUnit = await this.bookableUnitService.resolveForBooking(property, input.unitId ? String(input.unitId) : undefined);

            const pricePreview = await this.availabilityService.getPropertyPricePreview({
                propertyId: input.propertyId,
                unitId: selectedUnit.isVirtual ? undefined : selectedUnit._id,
                quantity: input.quantity ?? 1,
                guests: input.bookingGuests,
                adults: input.adults,
                children: input.children,
                infants: input.infants,
                pets: input.pets,
                startDate: input.bookingStart,
                endDate: input.bookingEnd,
            });

            await this.validateBookingRequest(property, selectedUnit, input, pricePreview, bookingStart, bookingEnd);

            const bookingMode = this.resolveBookingMode(selectedUnit, input.bookingMode);
            const expiresAt = this.resolveExpiry(bookingMode);
            const bookingStatus = bookingMode === BookingMode.REQUEST
                ? BookingStatus.REQUESTED
                : BookingStatus.AWAITING_PAYMENT;
            const quote = this.calculateQuote(property, selectedUnit, input, pricePreview);

            const result = await this.bookingModel.create({
                propertyId,
                unitId: selectedUnit.isVirtual ? null : selectedUnit._id,
                unitType: selectedUnit.unitType,
                rateModel: selectedUnit.rateModel,
                unitName: selectedUnit.name,
                quantity: quote.quantity,
                memberId,
                bookingStart,
                bookingEnd,
                bookingStatus,
                bookingMode,
                expiresAt,
                bookingGuests: quote.bookingGuests,
                adults: quote.adults,
                children: quote.children,
                infants: quote.infants,
                pets: quote.pets,
                totalPrice: quote.guestTotal,
                currency: quote.currency,
                hostCommissionAmount: quote.hostCommissionAmount,
                hostPayoutAmount: quote.hostPayoutAmount,
                priceSnapshot: quote.snapshot,
                cancellationPolicy: quote.cancellationPolicy,
                cancellationPolicySnapshot: this.buildCancellationPolicySnapshot(quote.cancellationPolicy),
            });
            bookingId = new Types.ObjectId((result as any)._id);

            if (selectedUnit.isVirtual) {
                heldDates = await this.availabilityService.holdBookingDates(
                    propertyId,
                    pricePreview.dates,
                    bookingId,
                    expiresAt,
                    property.timezone ?? 'Asia/Tashkent',
                );
            } else {
                await this.unitAvailabilityService.hold(
                    selectedUnit,
                    pricePreview.dates.map((item) => item.date),
                    bookingId,
                    expiresAt,
                    quote.quantity,
                    pricePreview.averagePrice,
                );
            }

            try {
                await this.noticeService.createNotification({
                    category: NoticeCategory.BOOKING,
                    status: NoticeStatus.UNREAD,
                    title: bookingMode === BookingMode.REQUEST ? 'Yangi booking so‘rovi' : 'Yangi to‘lov kutilayotgan booking',
                    content: `${property.propertyTitle} — ${selectedUnit.name} uchun ${input.bookingStart} dan ${input.bookingEnd} gacha bron yaratildi. Jami: ${quote.guestTotal} ${quote.currency}.`,
                    receiverId: property.memberId,
                    creatorId: memberId,
                    propertyId,
                });
            } catch (noticeErr) {
                const message = noticeErr instanceof Error ? noticeErr.message : String(noticeErr);
                console.warn('Booking created, but notification failed:', message);
            }

            return result as unknown as Booking;
        } catch (err) {
            if (bookingId) {
                if (selectedUnit && !selectedUnit.isVirtual) {
                    await this.unitAvailabilityService.release(selectedUnit._id, bookingId).catch(() => undefined);
                } else {
                    await this.availabilityService.releaseBookingDates(propertyId, bookingId).catch(() => undefined);
                }
                await this.bookingModel.findByIdAndDelete(bookingId).exec().catch(() => undefined);
            } else if (heldDates.length) {
                await this.availabilityService.releaseReservedBookingDates(propertyId, heldDates).catch(() => undefined);
            }

            if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
            const errorMessage = err instanceof Error ? err.message : String(err);
            throw new InternalServerErrorException(`Bron qilishda xatolik yuz berdi: ${errorMessage}`);
        }
    }

    public async acceptBooking(memberId: Types.ObjectId, bookingId: string): Promise<Booking> {
        const booking = await this.getBookingById(shapeIntoMongoObjectId(bookingId));
        await this.propertyService.assertPropertyOwner(memberId, booking.propertyId);
        if (booking.bookingStatus !== BookingStatus.REQUESTED) {
            throw new BadRequestException('Only requested bookings can be accepted');
        }

        const expiresAt = new Date(Date.now() + INSTANT_PAYMENT_WINDOW_MINUTES * 60 * 1000);
        const bookingDates = this.dateStringsForBooking(booking);
        const expectedSlots = bookingDates.length * Number(booking.quantity ?? 1);
        if (booking.unitId) {
            const activeHold = await this.unitAvailabilityService.countActiveHold(new Types.ObjectId(booking.unitId), booking._id);
            if (activeHold !== expectedSlots) {
                await this.unitAvailabilityService.release(new Types.ObjectId(booking.unitId), booking._id);
                await this.bookingModel.findByIdAndUpdate(booking._id, { bookingStatus: BookingStatus.EXPIRED, expiresAt: null }).exec();
                throw new BadRequestException('Booking hold has expired or is no longer available');
            }
            await this.unitAvailabilityService.extend(new Types.ObjectId(booking.unitId), booking._id, expiresAt);
        } else {
            const activeHold = await this.availabilityService.extendHeldBookingDates(booking.propertyId, booking._id, expiresAt);
            if (activeHold !== bookingDates.length) {
                await this.availabilityService.releaseBookingDates(booking.propertyId, booking._id);
                await this.bookingModel.findByIdAndUpdate(booking._id, { bookingStatus: BookingStatus.EXPIRED, expiresAt: null }).exec();
                throw new BadRequestException('Booking hold has expired or is no longer available');
            }
        }
        const result = await this.bookingModel
            .findByIdAndUpdate(
                booking._id,
                { bookingStatus: BookingStatus.AWAITING_PAYMENT, expiresAt },
                { returnDocument: 'after' },
            )
            .exec();
        if (!result) throw new NotFoundException('Booking not found');
        return result as unknown as Booking;
    }

    public async rejectBooking(memberId: Types.ObjectId, bookingId: string): Promise<Booking> {
        const booking = await this.getBookingById(shapeIntoMongoObjectId(bookingId));
        await this.propertyService.assertPropertyOwner(memberId, booking.propertyId);
        if (booking.bookingStatus !== BookingStatus.REQUESTED) {
            throw new BadRequestException('Only requested bookings can be rejected');
        }

        if (booking.unitId) {
            await this.unitAvailabilityService.release(new Types.ObjectId(booking.unitId), booking._id);
        } else {
            await this.availabilityService.releaseBookingDates(booking.propertyId, booking._id);
        }
        const result = await this.bookingModel
            .findByIdAndUpdate(
                booking._id,
                { bookingStatus: BookingStatus.CANCELLED, expiresAt: null },
                { returnDocument: 'after' },
            )
            .exec();
        if (!result) throw new NotFoundException('Booking not found');
        return result as unknown as Booking;
    }

    public async cancelBooking(memberId: Types.ObjectId, bookingId: string): Promise<Booking> {
        const booking = await this.getBookingById(shapeIntoMongoObjectId(bookingId));
        const property = await this.propertyService.getPropertyForPricing(booking.propertyId);
        const isGuest = String(booking.memberId) === String(memberId);
        const isHost = String(property.memberId) === String(memberId);
        if (!isGuest && !isHost) throw new ForbiddenException('Not allowed to cancel this booking');
        if (TERMINAL_BOOKING_STATUSES.includes(booking.bookingStatus)) {
            throw new BadRequestException('Booking is already closed');
        }

        if (booking.unitId) {
            await this.unitAvailabilityService.release(new Types.ObjectId(booking.unitId), booking._id);
        } else {
            await this.availabilityService.releaseBookingDates(booking.propertyId, booking._id);
        }
        const refund = this.calculateRefund(booking as any, isHost);
        const result = await this.bookingModel
            .findByIdAndUpdate(
                booking._id,
                {
                    bookingStatus: BookingStatus.CANCELLED,
                    expiresAt: null,
                    cancellationSnapshot: refund,
                },
                { returnDocument: 'after' },
            )
            .exec();
        if (!result) throw new NotFoundException('Booking not found');
        return result as unknown as Booking;
    }

    public async refundPreview(memberId: Types.ObjectId, bookingId: string): Promise<RefundPreview> {
        const booking = await this.getBookingById(shapeIntoMongoObjectId(bookingId));
        const property = await this.propertyService.getPropertyForPricing(booking.propertyId);
        const isGuest = String(booking.memberId) === String(memberId);
        const isHost = String(property.memberId) === String(memberId);
        if (!isGuest && !isHost) throw new ForbiddenException('Not allowed to view this refund');
        return this.calculateRefund(booking as any, isHost);
    }

    public async confirmPaidBooking(bookingId: Types.ObjectId): Promise<Booking> {
        const booking = await this.getBookingById(bookingId);
        if (booking.bookingStatus === BookingStatus.CONFIRMED) return booking as unknown as Booking;
        if (booking.bookingStatus !== BookingStatus.AWAITING_PAYMENT && booking.bookingStatus !== BookingStatus.WAITING) {
            throw new BadRequestException('Booking is not awaiting payment');
        }

        const bookingDates = this.dateStringsForBooking(booking);
        if (booking.unitId) {
            const reservedCount = await this.unitAvailabilityService.reserve(new Types.ObjectId(booking.unitId), booking._id);
            const expected = bookingDates.length * Number(booking.quantity ?? 1);
            if (reservedCount !== expected) throw new BadRequestException('Booking hold is expired or no longer available');
        } else {
            const reservedCount = await this.availabilityService.markHeldDatesReserved(
                booking.propertyId,
                bookingDates,
                booking._id,
            );
            if (reservedCount !== bookingDates.length) {
                throw new BadRequestException('Booking hold is expired or no longer available');
            }
        }
        const result = await this.bookingModel
            .findByIdAndUpdate(
                booking._id,
                { bookingStatus: BookingStatus.CONFIRMED, expiresAt: null },
                { returnDocument: 'after' },
            )
            .exec();
        if (!result) throw new NotFoundException('Booking not found');
        return result as unknown as Booking;
    }

    /** 3. FOYDALANUVCHI BRONLARINI OLISH **/
    public async getMyBookings(memberId: Types.ObjectId, input: BookingsInquiry): Promise<Bookings> {
        const { page, limit, bookingStatus } = input;
        const normalizedMemberId = shapeIntoMongoObjectId(memberId as any);
        const memberIdAsString = String(memberId);
        const match: T = {
            $or: [
                { memberId: normalizedMemberId },
                { memberId: memberIdAsString },
            ],
        };
        
        if (bookingStatus) match.bookingStatus = bookingStatus;
    
        const result = await this.bookingModel.aggregate([
            { $match: match },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    list: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'properties',
                                localField: 'propertyId',
                                foreignField: '_id',
                                as: 'propertyData',
                            },
                        },
                        { $unwind: { path: '$propertyData', preserveNullAndEmptyArrays: true } },
                    ],
                    metaCounter: [{ $count: 'total' }],
                },
            },
        ]).exec();
    
        return {
            list: result[0]?.list || [],
            metaCounter: result[0]?.metaCounter || [{ total: 0 }],
        };
    }

    /** 4. AGENTGA TEGISHLI PROPERTY BRONLARINI OLISH **/
    public async getBookingsForMyProperties(agentId: Types.ObjectId, input: BookingsInquiry): Promise<Bookings> {
        const { page, limit, bookingStatus } = input;
        const agentIdAsString = String(agentId);

        const result = await this.bookingModel.aggregate([
            ...(bookingStatus ? [{ $match: { bookingStatus } }] : []),
            {
                $addFields: {
                    propertyIdObj: {
                        $convert: {
                            input: '$propertyId',
                            to: 'objectId',
                            onError: null,
                            onNull: null,
                        },
                    },
                    memberIdObj: {
                        $convert: {
                            input: '$memberId',
                            to: 'objectId',
                            onError: null,
                            onNull: null,
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: 'properties',
                    localField: 'propertyIdObj',
                    foreignField: '_id',
                    as: 'propertyData',
                },
            },
            { $unwind: { path: '$propertyData', preserveNullAndEmptyArrays: false } },
            {
                $match: {
                    $expr: {
                        $eq: [{ $toString: '$propertyData.memberId' }, agentIdAsString],
                    },
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    list: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'members',
                                localField: 'memberIdObj',
                                foreignField: '_id',
                                as: 'memberData',
                            },
                        },
                        { $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
                    ],
                    metaCounter: [{ $count: 'total' }],
                },
            },
        ]).exec();

        return {
            list: result[0]?.list || [],
            metaCounter: result[0]?.metaCounter?.length ? result[0].metaCounter : [{ total: 0 }],
        };
    }

    private async validateBookingRequest(
        property: any,
        unit: ResolvedBookableUnit,
        input: BookingInput,
        pricePreview: PricePreview,
        bookingStart: Date,
        bookingEnd: Date,
    ): Promise<void> {
        if (bookingEnd.getTime() <= bookingStart.getTime()) {
            throw new BadRequestException('bookingEnd must be after bookingStart');
        }

        const today = parseDateOnly(formatDateOnly(new Date()));
        if (bookingStart.getTime() < today.getTime()) {
            throw new BadRequestException('bookingStart cannot be in the past');
        }

        const minNights = Number(property.minNights ?? 1);
        const maxNights = Number(property.maxNights ?? 30);
        if (pricePreview.nights < minNights) throw new BadRequestException(`Minimum stay is ${minNights} nights`);
        if (pricePreview.nights > maxNights) throw new BadRequestException(`Maximum stay is ${maxNights} nights`);
        if (unit.rateModel === 'PACKAGE' && pricePreview.nights !== Math.max(1, Number(unit.packageNights ?? 1))) {
            throw new BadRequestException(`This package requires exactly ${unit.packageNights} nights`);
        }
        const guests = this.resolveGuestCounts(input);
        const quantity = Math.max(1, Number(input.quantity ?? 1));
        if (unit.unitType === 'ENTIRE_UNIT' && quantity !== 1) {
            throw new BadRequestException('Entire homes can only be booked one unit at a time');
        }
        if (guests.bookingGuests > Number(unit.maxGuests ?? 1) * quantity) {
            throw new BadRequestException(`Guest count exceeds the selected unit capacity (${Number(unit.maxGuests ?? 1) * quantity})`);
        }
        if (guests.infants > 0 && unit.infantsAllowed === false) {
            throw new BadRequestException('This listing does not allow infants');
        }
        if (guests.pets > 0 && unit.petsAllowed !== true) {
            throw new BadRequestException('This listing does not allow pets');
        }
        const advanceNoticeHours = Number(property.advanceNoticeHours ?? 0);
        if (advanceNoticeHours > 0 && bookingStart.getTime() - Date.now() < advanceNoticeHours * 60 * 60 * 1000) {
            throw new BadRequestException(`This listing requires ${advanceNoticeHours} hours advance notice`);
        }
        if (unit.isVirtual) {
            if (pricePreview.dates.some((item) => item.mode === 'LOCKED')) {
                throw new BadRequestException('Selected dates are not available');
            }
        } else {
            await this.unitAvailabilityService.assertAvailable(
                unit,
                pricePreview.dates.map((item) => item.date),
                quantity,
            );
        }
    }

    private resolveBookingMode(unit: ResolvedBookableUnit, requestedMode?: BookingMode): BookingMode {
        const listingMode = unit.bookingMode ?? BookingMode.INSTANT;
        if (requestedMode && requestedMode !== listingMode) {
            throw new BadRequestException(`Listing booking mode is ${listingMode}`);
        }
        return listingMode;
    }

    private resolveExpiry(bookingMode: BookingMode): Date {
        const ttlMs = bookingMode === BookingMode.REQUEST
            ? REQUEST_HOLD_HOURS * 60 * 60 * 1000
            : INSTANT_PAYMENT_WINDOW_MINUTES * 60 * 1000;
        return new Date(Date.now() + ttlMs);
    }

    private resolveGuestCounts(input: BookingInput): {
        bookingGuests: number;
        adults: number;
        children: number;
        infants: number;
        pets: number;
    } {
        const readCount = (value: unknown, fallback: number): number => {
            const parsed = value == null ? fallback : Number(value);
            if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
                throw new BadRequestException('Guest counts must be non-negative integers');
            }
            return parsed;
        };
        const adults = readCount(input.adults ?? input.bookingGuests, 1);
        const children = readCount(input.children, 0);
        const infants = readCount(input.infants, 0);
        const pets = readCount(input.pets, 0);
        const bookingGuests = Math.max(readCount(input.bookingGuests, 0), adults + children);
        if (bookingGuests < 1) throw new BadRequestException('At least one adult or child is required');
        return { bookingGuests, adults, children, infants, pets };
    }

    private calculateQuote(property: any, unit: ResolvedBookableUnit, input: BookingInput, pricePreview: PricePreview) {
        const guests = this.resolveGuestCounts(input);
        const quote = calculateBookingQuote({
            property,
            unit,
            preview: pricePreview,
            quantity: input.quantity ?? 1,
            adults: guests.adults,
            children: guests.children,
            infants: guests.infants,
            pets: guests.pets,
            hostCommissionRate: HOST_COMMISSION_RATE,
        });
        const cancellationPolicy = property.cancellationPolicy ?? CancellationPolicy.MODERATE;

        return {
            ...guests,
            ...quote,
            bookingGuests: guests.bookingGuests,
            unitId: unit.isVirtual ? null : unit._id,
            cancellationPolicy,
        };
    }

    private buildCancellationPolicySnapshot(cancellationPolicy: CancellationPolicy): Record<string, unknown> {
        return {
            cancellationPolicy,
            capturedAt: new Date().toISOString(),
            flexible: '100% refund until 24h before check-in; then 0%',
            moderate: '100% refund until 5 days before check-in; 50% between 24h and 5 days; 0% under 24h',
            firm: '100% refund until 30 days before check-in; 50% between 7 and 30 days; 0% under 7 days',
            grace: '100% refund within 24h after booking if check-in is at least 7 days away',
        };
    }

    private calculateRefund(booking: any, hostCancellation: boolean): RefundPreview {
        const policy = booking.cancellationPolicy ?? CancellationPolicy.MODERATE;
        const guestTotal = Number(booking.totalPrice ?? 0);
        const snapshot = booking.priceSnapshot ?? {};
        const cleaningFee = Number(snapshot.cleaningFee ?? 0);
        const nonCleaningTotal = Math.max(0, guestTotal - cleaningFee);

        if (hostCancellation) {
            return this.buildRefundPreview(booking, policy, guestTotal, guestTotal, guestTotal - cleaningFee, cleaningFee, 'host_cancellation');
        }

        const now = new Date();
        const checkIn = new Date(booking.bookingStart);
        const createdAt = new Date(booking.createdAt ?? now);
        const hoursAfterBooking = (now.getTime() - createdAt.getTime()) / (60 * 60 * 1000);
        const daysBeforeCheckIn = (checkIn.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

        if (hoursAfterBooking <= 24 && daysBeforeCheckIn >= 7) {
            return this.buildRefundPreview(booking, policy, guestTotal, guestTotal, nonCleaningTotal, cleaningFee, 'grace_period');
        }

        let refundableRatio = 0;
        let reason = 'policy_no_refund';
        if (policy === CancellationPolicy.FLEXIBLE) {
            refundableRatio = daysBeforeCheckIn >= 1 ? 1 : 0;
            reason = refundableRatio === 1 ? 'flexible_24h' : reason;
        } else if (policy === CancellationPolicy.MODERATE) {
            if (daysBeforeCheckIn >= 5) {
                refundableRatio = 1;
                reason = 'moderate_5d';
            } else if (daysBeforeCheckIn >= 1) {
                refundableRatio = 0.5;
                reason = 'moderate_50_percent';
            }
        } else if (policy === CancellationPolicy.FIRM) {
            if (daysBeforeCheckIn >= 30) {
                refundableRatio = 1;
                reason = 'firm_30d';
            } else if (daysBeforeCheckIn >= 7) {
                refundableRatio = 0.5;
                reason = 'firm_50_percent';
            }
        }

        const refundableNightlyAmount = Math.round(nonCleaningTotal * refundableRatio);
        const refundableCleaningFee = now.getTime() < checkIn.getTime() ? cleaningFee : 0;
        const refundAmount = Math.min(guestTotal, refundableNightlyAmount + refundableCleaningFee);
        return this.buildRefundPreview(
            booking,
            policy,
            guestTotal,
            refundAmount,
            refundableNightlyAmount,
            refundableCleaningFee,
            reason,
        );
    }

    private buildRefundPreview(
        booking: any,
        policy: CancellationPolicy,
        guestTotal: number,
        refundAmount: number,
        refundableNightlyAmount: number,
        refundableCleaningFee: number,
        reason: string,
    ): RefundPreview {
        return {
            bookingId: booking._id,
            cancellationPolicy: policy,
            guestTotal,
            refundAmount,
            retainedAmount: Math.max(0, guestTotal - refundAmount),
            refundableNightlyAmount,
            refundableCleaningFee,
            reason,
        };
    }

    private dateStringsForBooking(booking: BookingSchemaDoc): string[] {
        const dates: string[] = [];
        let cursor = new Date(booking.bookingStart);
        const end = new Date(booking.bookingEnd);

        while (cursor.getTime() < end.getTime()) {
            dates.push(formatDateOnly(cursor));
            cursor = new Date(cursor);
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        return dates;
    }
}
