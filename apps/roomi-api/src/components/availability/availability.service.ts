import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Availability } from '../../libs/dto/availability/availability';
import { AvailabilityInput, AvailabilityPricingInquiry } from '../../libs/dto/availability/availability.input';
import { Message } from '../../libs/enums/common.enum';
import { AvailabilityStatus } from '../../libs/enums/availability.enum';
import { parseDateOnly, formatDateOnly } from '../../libs/config';
import {
  calculateNightPrice,
  calculateBookingQuote,
  PricePreview,
  iterateDateRange,
} from '../../libs/pricing';
import { PropertyService } from '../property/property.service';
import { PriceBreakdownItem } from '../../libs/dto/availability/availability';
import { BookableUnitService } from '../bookable-unit/bookable-unit.service';
import { UnitAvailabilityService } from '../bookable-unit/unit-availability.service';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel('Availability') private readonly availabilityModel: Model<Availability>,
    private readonly propertyService: PropertyService,
    private readonly bookableUnitService: BookableUnitService,
    private readonly unitAvailabilityService: UnitAvailabilityService,
  ) {}

  private buildPropertyIdFilter(propertyId: Types.ObjectId): { $in: Array<Types.ObjectId | string> } {
    return { $in: [new Types.ObjectId(propertyId), String(propertyId)] };
  }

  private readonly lockedStatuses = [
    AvailabilityStatus.HELD,
    AvailabilityStatus.RESERVED,
    AvailabilityStatus.BLOCKED,
    AvailabilityStatus.OCCUPIED,
    AvailabilityStatus.MAINTENANCE,
  ];

  // Agent o'z dachasini ma'lum kungi holatini o'zgartirish yoki bronni yozish uchun
  public async updateAvailability(memberId: Types.ObjectId, input: any): Promise<Availability | null> {
    const { propertyId, date, isBooked } = input;

    try {
      await this.propertyService.assertPropertyOwner(memberId, new Types.ObjectId(propertyId));
      const availabilityDate = parseDateOnly(date);
      if (isBooked) {
        return await this.availabilityModel.findOneAndUpdate(
          {
            propertyId: new Types.ObjectId(propertyId),
            availabilityDate,
            $or: [{ bookingId: { $exists: false } }, { bookingId: null }],
          },
          {
            $set: {
              propertyId: new Types.ObjectId(propertyId),
              availabilityDate,
              availabilityStatus: AvailabilityStatus.BLOCKED,
              pricePerDay: input.pricePerDay ?? 0,
              bookingId: null,
              heldUntil: null,
            },
          },
          { upsert: true, returnDocument: 'after' },
        ).exec();
      } else {
        await this.availabilityModel.findOneAndDelete({
          propertyId: new Types.ObjectId(propertyId),
          availabilityDate,
          availabilityStatus: { $in: [AvailabilityStatus.BLOCKED, AvailabilityStatus.MAINTENANCE] },
          $or: [{ bookingId: { $exists: false } }, { bookingId: null }],
        }).exec();
        return null;
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Availability update failed!');
    }
  }

  public async getPropertyAvailability(propertyId: Types.ObjectId): Promise<Availability[]> {
    const todayYmd = new Date().toISOString().split('T')[0];
    const startOfToday = parseDateOnly(todayYmd);

    const docs = await this.availabilityModel
      .find({
        propertyId: this.buildPropertyIdFilter(propertyId),
        availabilityDate: { $gte: startOfToday },
        availabilityStatus: { $in: this.lockedStatuses },
      })
      .sort({ availabilityDate: 1 })
      .lean()
      .exec();

    return (docs as unknown as Array<{
      _id: Types.ObjectId;
      propertyId: Types.ObjectId;
      availabilityDate: Date;
      availabilityStatus?: AvailabilityStatus;
      pricePerDay?: number;
      createdAt: Date;
      updatedAt: Date;
    }>).map((d) => ({
      _id: d._id,
      propertyId: d.propertyId,
      date: formatDateOnly(new Date(d.availabilityDate)),
      isBooked: true,
      availabilityStatus: d.availabilityStatus,
      pricePerDay: d.pricePerDay ?? 0,
      memberId: d.propertyId,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })) as Availability[];
  }

  public async getPropertyPricePreview(input: AvailabilityPricingInquiry): Promise<PricePreview> {
    const property = await this.propertyService.getPropertyForPricing(new Types.ObjectId(input.propertyId));
    const unit = await this.bookableUnitService.resolveForBooking(
      { ...property, _id: new Types.ObjectId(input.propertyId) },
      input.unitId ? String(input.unitId) : undefined,
    );
    const dates = iterateDateRange(input.startDate, input.endDate);
    const maxQuoteNights = Number(process.env.MAX_QUOTE_NIGHTS ?? 60);
    if (dates.length <= 0) throw new BadRequestException('endDate must be after startDate');
    if (dates.length > maxQuoteNights) {
      throw new BadRequestException(`Price preview cannot exceed ${maxQuoteNights} nights`);
    }
    const requestedDates = dates.map((date) => formatDateOnly(date));
    const quantity = Math.max(1, Math.floor(Number(input.quantity ?? 1)));
    const adults = Math.max(1, Math.floor(Number(input.adults ?? input.guests ?? 1)));
    const children = Math.max(0, Math.floor(Number(input.children ?? 0)));
    const infants = Math.max(0, Math.floor(Number(input.infants ?? 0)));
    const pets = Math.max(0, Math.floor(Number(input.pets ?? 0)));
    const billableGuests = Math.max(1, adults + children);
    if (quantity > unit.inventoryCount) {
      throw new BadRequestException('Requested room or unit quantity is not available');
    }
    if (unit.unitType === 'ENTIRE_UNIT' && quantity !== 1) {
      throw new BadRequestException('Entire homes can only be quoted one unit at a time');
    }
    if (billableGuests > unit.maxGuests * quantity) {
      throw new BadRequestException(`Guest count exceeds the selected unit capacity (${unit.maxGuests * quantity})`);
    }
    if (unit.rateModel === 'PACKAGE' && dates.length !== Math.max(1, Number(unit.packageNights ?? 1))) {
      throw new BadRequestException(`This package requires exactly ${unit.packageNights} nights`);
    }
    const unitUnavailableDates = unit.isVirtual
      ? new Set<string>()
      : await this.unitAvailabilityService.getUnavailableDates(
          unit,
          requestedDates,
          Math.max(1, Number(input.quantity ?? 1)),
        );
    const availabilityDocs = await this.availabilityModel
      .find({
        propertyId: this.buildPropertyIdFilter(new Types.ObjectId(input.propertyId)),
        availabilityDate: {
          $gte: parseDateOnly(requestedDates[0] ?? input.startDate),
          $lt: parseDateOnly(input.endDate),
        },
      })
      .lean()
      .exec();

    const availabilityMap = new Map<string, { availabilityStatus?: AvailabilityStatus; pricePerDay?: number; heldUntil?: Date | null }>();
    for (const doc of availabilityDocs as unknown as Array<{
      availabilityDate: Date;
      availabilityStatus?: AvailabilityStatus;
      pricePerDay?: number;
      heldUntil?: Date | null;
    }>) {
      availabilityMap.set(formatDateOnly(new Date(doc.availabilityDate)), {
        availabilityStatus: doc.availabilityStatus,
        pricePerDay: doc.pricePerDay,
        heldUntil: doc.heldUntil,
      });
    }

    const breakdown = dates.map((date) => {
      const ymd = formatDateOnly(date);
      const existing = availabilityMap.get(ymd);
      const calculated = calculateNightPrice(
        {
          ...property,
          propertyPrice: unit.basePrice,
          propertyType: property.propertyType,
        },
        date,
        property.timezone ?? process.env.BATCH_TIMEZONE ?? 'Asia/Tashkent',
      );

      if (
        unitUnavailableDates.has(ymd) || this.isLockedAvailability(existing?.availabilityStatus, existing as any)
      ) {
        return {
          ...calculated,
          mode: 'LOCKED' as const,
          pricePerDay: existing?.pricePerDay ?? calculated.pricePerDay,
          multiplier: existing?.pricePerDay && calculated.basePrice > 0
            ? Number((existing.pricePerDay / calculated.basePrice).toFixed(3))
            : calculated.multiplier,
          explanation: ['locked_availability'],
        };
      }

      return calculated;
    });

    const baseTotal = breakdown.reduce((sum, item) => sum + item.basePrice, 0);
    const totalPrice = breakdown.reduce((sum, item) => sum + item.pricePerDay, 0);

    const quote = calculateBookingQuote({
      property,
      unit,
      preview: {
        dates: breakdown,
        nights: breakdown.length,
        baseTotal,
        totalPrice,
      },
      quantity,
      adults,
      children,
      infants,
      pets,
    });

    return {
      dates: breakdown,
      nights: breakdown.length,
      baseTotal,
      totalPrice,
      averagePrice: breakdown.length ? Math.round(totalPrice / breakdown.length) : 0,
      quantity: quote.quantity,
      billableGuests: quote.billableGuests,
      unitId: quote.unitId,
      unitName: quote.unitName,
      unitType: quote.unitType,
      rateModel: quote.rateModel,
      currency: quote.currency,
      nightlyTotal: quote.nightlyTotal,
      cleaningFee: quote.cleaningFee,
      petFee: quote.petFee,
      extraGuestFee: quote.extraGuestFee,
      guestTotal: quote.guestTotal,
      hostCommissionAmount: quote.hostCommissionAmount,
      hostPayoutAmount: quote.hostPayoutAmount,
    };
  }

  private isLockedAvailability(
    availabilityStatus?: AvailabilityStatus,
    doc?: { heldUntil?: Date | string | null },
  ): boolean {
    if (!availabilityStatus || availabilityStatus === AvailabilityStatus.AVAILABLE) return false;
    if (availabilityStatus === AvailabilityStatus.HELD) {
      if (!doc?.heldUntil) return true;
      return new Date(doc.heldUntil).getTime() > Date.now();
    }
    return this.lockedStatuses.includes(availabilityStatus);
  }

  public async holdBookingDates(
    propertyId: Types.ObjectId,
    dates: PriceBreakdownItem[],
    bookingId: Types.ObjectId,
    heldUntil: Date,
    timezone = 'Asia/Tashkent',
  ): Promise<string[]> {
    const reservedDates: string[] = [];
    const objectId = new Types.ObjectId(propertyId);
    const propertyFilter = this.buildPropertyIdFilter(objectId);

    try {
      for (const item of dates) {
        const availabilityDate = parseDateOnly(item.date);
        const reserved = await this.availabilityModel.findOneAndUpdate(
          {
            propertyId: propertyFilter,
            availabilityDate,
            $and: [
              {
                $or: [
                  { availabilityStatus: { $exists: false } },
                  { availabilityStatus: AvailabilityStatus.AVAILABLE },
                  {
                    availabilityStatus: AvailabilityStatus.HELD,
                    heldUntil: { $lte: new Date() },
                  },
                ],
              },
              {
                $or: [
                  { bookingId: { $exists: false } },
                  { bookingId: null },
                  {
                    availabilityStatus: AvailabilityStatus.HELD,
                    heldUntil: { $lte: new Date() },
                  },
                ],
              },
            ],
          },
          {
            $setOnInsert: {
              propertyId: objectId,
              availabilityDate,
            },
            $set: {
              availabilityStatus: AvailabilityStatus.HELD,
              pricePerDay: item.pricePerDay,
              bookingId,
              heldUntil,
              timezone,
            },
          },
          { upsert: true, returnDocument: 'after' },
        ).exec();

        if (!reserved) {
          throw new BadRequestException(`Selected date is no longer available: ${item.date}`);
        }

        reservedDates.push(item.date);
      }

      return reservedDates;
    } catch (err) {
      await this.releaseReservedBookingDates(objectId, reservedDates);
      const code = typeof err === 'object' && err !== null && 'code' in err ? (err as any).code : null;
      if (code === 11000) {
        throw new BadRequestException('Selected dates are already booked');
      }
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw err;
    }
  }

  public async reserveBookingDates(
    propertyId: Types.ObjectId,
    dates: PriceBreakdownItem[],
  ): Promise<string[]> {
    return this.holdBookingDates(propertyId, dates, new Types.ObjectId(), new Date(Date.now() + 30 * 60 * 1000));
  }

  public async markHeldDatesReserved(
    propertyId: Types.ObjectId,
    dates: string[],
    bookingId: Types.ObjectId,
  ): Promise<number> {
    if (!dates.length) return 0;

    const result = await this.availabilityModel.updateMany(
      {
        propertyId: this.buildPropertyIdFilter(new Types.ObjectId(propertyId)),
        availabilityDate: { $in: dates.map((date) => parseDateOnly(date)) },
        availabilityStatus: AvailabilityStatus.HELD,
        bookingId,
        heldUntil: { $gt: new Date() },
      },
      {
        $set: {
          bookingId,
          availabilityStatus: AvailabilityStatus.RESERVED,
          heldUntil: null,
        },
      },
    ).exec();

    return result.modifiedCount ?? 0;
  }

  public async attachBookingToReservedDates(
    propertyId: Types.ObjectId,
    dates: string[],
    bookingId: Types.ObjectId,
  ): Promise<void> {
    await this.markHeldDatesReserved(propertyId, dates, bookingId);
  }

  public async releaseReservedBookingDates(propertyId: Types.ObjectId, dates: string[]): Promise<void> {
    if (!dates.length) return;

    await this.availabilityModel.deleteMany({
      propertyId: this.buildPropertyIdFilter(new Types.ObjectId(propertyId)),
      availabilityDate: { $in: dates.map((date) => parseDateOnly(date)) },
      availabilityStatus: AvailabilityStatus.HELD,
    }).exec();
  }

  public async releaseBookingDates(propertyId: Types.ObjectId, bookingId: Types.ObjectId): Promise<void> {
    await this.availabilityModel.deleteMany({
      propertyId: this.buildPropertyIdFilter(new Types.ObjectId(propertyId)),
      bookingId,
      availabilityStatus: { $in: [AvailabilityStatus.HELD, AvailabilityStatus.RESERVED, AvailabilityStatus.OCCUPIED] },
    }).exec();
  }

  public async extendHeldBookingDates(
    propertyId: Types.ObjectId,
    bookingId: Types.ObjectId,
    heldUntil: Date,
  ): Promise<number> {
    const result = await this.availabilityModel.updateMany(
      {
        propertyId: this.buildPropertyIdFilter(new Types.ObjectId(propertyId)),
        bookingId,
        availabilityStatus: AvailabilityStatus.HELD,
      },
      {
        $set: { heldUntil },
      },
    ).exec();
    return result.modifiedCount ?? 0;
  }
}
