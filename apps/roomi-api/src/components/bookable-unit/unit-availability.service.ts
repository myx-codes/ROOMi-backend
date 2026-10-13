import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AvailabilityStatus } from '../../libs/enums/availability.enum';
import { formatDateOnly, parseDateOnly } from '../../libs/config';
import { UnitAvailability as UnitAvailabilityDocument } from '../../schemas/UnitAvailability.model';
import { ResolvedBookableUnit } from './bookable-unit.service';

@Injectable()
export class UnitAvailabilityService {
    constructor(
        @InjectModel('UnitAvailability') private readonly model: Model<UnitAvailabilityDocument>,
    ) {}

    public async assertAvailable(unit: ResolvedBookableUnit, dates: string[], quantity: number): Promise<void> {
        if (quantity < 1 || quantity > unit.inventoryCount) throw new BadRequestException('Requested inventory quantity is invalid');
        for (const date of dates) {
            const locked = await this.model.countDocuments({
                unitId: unit._id,
                availabilityDate: parseDateOnly(date),
                availabilityStatus: { $in: [AvailabilityStatus.HELD, AvailabilityStatus.RESERVED, AvailabilityStatus.OCCUPIED, AvailabilityStatus.MAINTENANCE, AvailabilityStatus.BLOCKED] },
                $or: [
                    { availabilityStatus: { $ne: AvailabilityStatus.HELD } },
                    { heldUntil: { $gt: new Date() } },
                    { availabilityStatus: AvailabilityStatus.HELD, heldUntil: { $exists: false } },
                    { availabilityStatus: AvailabilityStatus.HELD, heldUntil: null },
                ],
            }).exec();
            if (locked + quantity > unit.inventoryCount) {
                throw new BadRequestException(`Selected room type is not available on ${date}`);
            }
        }
    }

    public async getUnavailableDates(unit: ResolvedBookableUnit, dates: string[], quantity: number): Promise<Set<string>> {
        const unavailable = new Set<string>();
        for (const date of dates) {
            const locked = await this.model.countDocuments({
                unitId: unit._id,
                availabilityDate: parseDateOnly(date),
                availabilityStatus: { $in: [AvailabilityStatus.HELD, AvailabilityStatus.RESERVED, AvailabilityStatus.OCCUPIED, AvailabilityStatus.MAINTENANCE, AvailabilityStatus.BLOCKED] },
                $or: [
                    { availabilityStatus: { $ne: AvailabilityStatus.HELD } },
                    { heldUntil: { $gt: new Date() } },
                    { availabilityStatus: AvailabilityStatus.HELD, heldUntil: { $exists: false } },
                    { availabilityStatus: AvailabilityStatus.HELD, heldUntil: null },
                ],
            }).exec();
            if (locked + quantity > unit.inventoryCount) unavailable.add(date);
        }
        return unavailable;
    }

    public async hold(unit: ResolvedBookableUnit, dates: string[], bookingId: Types.ObjectId, heldUntil: Date, quantity: number, pricePerDay: number): Promise<void> {
        const created: Array<{ date: Date; slot: number }> = [];
        try {
            for (const date of dates) {
                let heldForDate = 0;
                for (let slot = 0; slot < unit.inventoryCount && heldForDate < quantity; slot += 1) {
                    try {
                        const result = await this.model.findOneAndUpdate(
                            {
                                unitId: unit._id,
                                availabilityDate: parseDateOnly(date),
                                slot,
                                $or: [
                                    { availabilityStatus: { $exists: false } },
                                    { availabilityStatus: AvailabilityStatus.AVAILABLE },
                                    { availabilityStatus: AvailabilityStatus.HELD, heldUntil: { $lte: new Date() } },
                                ],
                            },
                            {
                                $set: {
                                    unitId: unit._id,
                                    propertyId: unit.propertyId,
                                    availabilityDate: parseDateOnly(date),
                                    slot,
                                    availabilityStatus: AvailabilityStatus.HELD,
                                    bookingId,
                                    heldUntil,
                                    pricePerDay,
                                },
                            },
                            { upsert: true, returnDocument: 'after' },
                        ).exec();
                        if (result) {
                            created.push({ date: parseDateOnly(date), slot });
                            heldForDate += 1;
                        }
                    } catch (error) {
                        if ((error as any)?.code !== 11000) throw error;
                    }
                }
                if (heldForDate < quantity) throw new BadRequestException(`Selected room type is no longer available on ${date}`);
            }
        } catch (error) {
            await this.release(unit._id, bookingId);
            throw error;
        }
    }

    public async reserve(unitId: Types.ObjectId, bookingId: Types.ObjectId): Promise<number> {
        const result = await this.model.updateMany(
            { unitId, bookingId, availabilityStatus: AvailabilityStatus.HELD, heldUntil: { $gt: new Date() } },
            { $set: { availabilityStatus: AvailabilityStatus.RESERVED, heldUntil: null } },
        ).exec();
        return result.modifiedCount ?? 0;
    }

    public async countActiveHold(unitId: Types.ObjectId, bookingId: Types.ObjectId): Promise<number> {
        return this.model.countDocuments({
            unitId,
            bookingId,
            availabilityStatus: AvailabilityStatus.HELD,
            heldUntil: { $gt: new Date() },
        }).exec();
    }

    public async extend(unitId: Types.ObjectId, bookingId: Types.ObjectId, heldUntil: Date): Promise<void> {
        await this.model.updateMany(
            { unitId, bookingId, availabilityStatus: AvailabilityStatus.HELD },
            { $set: { heldUntil } },
        ).exec();
    }

    public async release(unitId: Types.ObjectId, bookingId: Types.ObjectId): Promise<void> {
        await this.model.deleteMany({
            unitId,
            bookingId,
            availabilityStatus: { $in: [AvailabilityStatus.HELD, AvailabilityStatus.RESERVED, AvailabilityStatus.OCCUPIED] },
        }).exec();
    }

    public async setBlocked(
        unit: ResolvedBookableUnit,
        dates: string[],
        blocked: boolean,
        quantity?: number,
    ): Promise<void> {
        const requestedQuantity = unit.unitType === 'ENTIRE_UNIT'
            ? 1
            : Math.min(unit.inventoryCount, Math.max(1, Math.floor(quantity ?? 1)));

        for (const date of dates) {
            const availabilityDate = parseDateOnly(date);
            if (!blocked) {
                const slotFilter = quantity == null ? { $gte: 0 } : { $lt: requestedQuantity };
                await this.model.deleteMany({
                    unitId: unit._id,
                    availabilityDate,
                    slot: slotFilter,
                    availabilityStatus: AvailabilityStatus.BLOCKED,
                    $or: [{ bookingId: { $exists: false } }, { bookingId: null }],
                }).exec();
                continue;
            }

            const occupied = await this.model.countDocuments({
                unitId: unit._id,
                availabilityDate,
                availabilityStatus: {
                    $in: [AvailabilityStatus.HELD, AvailabilityStatus.RESERVED, AvailabilityStatus.OCCUPIED, AvailabilityStatus.MAINTENANCE],
                },
                $or: [
                    { availabilityStatus: { $ne: AvailabilityStatus.HELD } },
                    { heldUntil: { $gt: new Date() } },
                ],
            }).exec();
            if (occupied + requestedQuantity > unit.inventoryCount) {
                throw new BadRequestException(`Date ${date} already has no free inventory to block`);
            }

            let blockedForDate = 0;
            for (let slot = 0; slot < unit.inventoryCount && blockedForDate < requestedQuantity; slot += 1) {
                try {
                    const result = await this.model.findOneAndUpdate(
                        {
                            unitId: unit._id,
                            availabilityDate,
                            slot,
                            $or: [
                                { availabilityStatus: { $exists: false } },
                                { availabilityStatus: AvailabilityStatus.AVAILABLE },
                                { availabilityStatus: AvailabilityStatus.BLOCKED, bookingId: null },
                                { availabilityStatus: AvailabilityStatus.BLOCKED, bookingId: { $exists: false } },
                            ],
                        },
                        {
                            $set: {
                                unitId: unit._id,
                                propertyId: unit.propertyId,
                                availabilityDate,
                                slot,
                                availabilityStatus: AvailabilityStatus.BLOCKED,
                                bookingId: null,
                                heldUntil: null,
                            },
                        },
                        { upsert: true, returnDocument: 'after' },
                    ).exec();
                    if (result) blockedForDate += 1;
                } catch (error) {
                    if ((error as any)?.code !== 11000) throw error;
                }
            }
            if (blockedForDate < requestedQuantity) {
                throw new BadRequestException(`Date ${date} could not be blocked because inventory changed`);
            }
        }
    }

    public async getBlockedDates(unitId: Types.ObjectId, from = new Date()): Promise<string[]> {
        const docs = await this.model.find({
            unitId,
            availabilityDate: { $gte: from },
            availabilityStatus: { $in: [AvailabilityStatus.HELD, AvailabilityStatus.RESERVED, AvailabilityStatus.BLOCKED, AvailabilityStatus.OCCUPIED, AvailabilityStatus.MAINTENANCE] },
        }).sort({ availabilityDate: 1 }).lean().exec();
        return docs.map((doc) => formatDateOnly(new Date(doc.availabilityDate)));
    }
}
