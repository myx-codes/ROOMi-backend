import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BookableUnit as BookableUnitDto, BookableUnits } from '../../libs/dto/bookable-unit/bookable-unit';
import { BookableUnitInput } from '../../libs/dto/bookable-unit/bookable-unit.input';
import { BookingMode } from '../../libs/enums/booking.enum';
import { BookableUnitStatus, BookableUnitType, UnitRateModel } from '../../libs/enums/bookable-unit.enum';
import { BookableUnit as BookableUnitDocument } from '../../schemas/BookableUnit.model';
import { PropertyService } from '../property/property.service';

export type ResolvedBookableUnit = {
    _id: Types.ObjectId;
    propertyId: Types.ObjectId;
    unitType: BookableUnitType;
    name: string;
    code?: string;
    inventoryCount: number;
    basePrice: number;
    rateModel: UnitRateModel;
    packageNights: number;
    packagePerPerson: boolean;
    bookingMode: BookingMode;
    maxGuests: number;
    includedGuests: number;
    bedrooms: number;
    beds: number;
    bathrooms: number;
    cleaningFee: number;
    petFee: number;
    extraGuestFee: number;
    petsAllowed: boolean;
    infantsAllowed: boolean;
    amenities: string[];
    isVirtual?: boolean;
};

@Injectable()
export class BookableUnitService {
    constructor(
        @InjectModel('BookableUnit') private readonly unitModel: Model<BookableUnitDocument>,
        private readonly propertyService: PropertyService,
    ) {}

    public async getPublicUnits(propertyId: Types.ObjectId): Promise<BookableUnits> {
        const list = await this.unitModel.find({
            propertyId,
            status: BookableUnitStatus.ACTIVE,
        }).sort({ createdAt: 1 }).lean().exec();
        if (list.length > 0) {
            return { list: list.map((unit) => this.normalizeUnit(unit)) as unknown as BookableUnitDto[] };
        }

        const property = await this.propertyService.getPropertyForPricing(propertyId);
        const virtual = this.virtualUnitFromProperty({ ...property, _id: propertyId });
        return {
            list: [{
                ...virtual,
                status: BookableUnitStatus.ACTIVE,
            }] as unknown as BookableUnitDto[],
        };
    }

    public async createUnit(memberId: Types.ObjectId, input: BookableUnitInput): Promise<BookableUnitDto> {
        const propertyId = new Types.ObjectId(input.propertyId);
        const property = await this.propertyService.assertPropertyOwner(memberId, propertyId);
        this.validateUnitForProperty(property.propertyType as string, input);

        const unit = await this.unitModel.create({
            ...input,
            propertyId,
            basePrice: Number(input.basePrice),
            inventoryCount: Number(input.inventoryCount),
            rateModel: input.rateModel ?? this.defaultRateModel(property.propertyType as string),
            packageNights: input.packageNights ?? 1,
            packagePerPerson: input.packagePerPerson ?? String(property.propertyType).toUpperCase() === 'SANATORIUM',
            bookingMode: input.bookingMode ?? property.bookingMode ?? BookingMode.INSTANT,
            maxGuests: input.maxGuests ?? property.maxGuests ?? 1,
            includedGuests: input.includedGuests ?? input.maxGuests ?? property.maxGuests ?? 1,
            bedrooms: input.bedrooms ?? property.bedrooms ?? property.propertyRooms ?? 1,
            beds: input.beds ?? property.beds ?? property.propertyBeds ?? 1,
            bathrooms: input.bathrooms ?? property.bathrooms ?? 1,
            cleaningFee: input.cleaningFee ?? property.cleaningFee ?? 0,
            petFee: input.petFee ?? property.petFee ?? 0,
            extraGuestFee: input.extraGuestFee ?? property.extraGuestFee ?? 0,
            petsAllowed: input.petsAllowed ?? property.petsAllowed ?? false,
            infantsAllowed: input.infantsAllowed ?? property.infantsAllowed ?? true,
            amenities: input.amenities ?? property.propertyAmenities ?? [],
            status: BookableUnitStatus.ACTIVE,
        });
        return unit as unknown as BookableUnitDto;
    }

    public async archiveUnit(memberId: Types.ObjectId, unitId: string): Promise<BookableUnitDto> {
        const unit = await this.unitModel.findById(unitId).lean().exec();
        if (!unit) throw new NotFoundException('Bookable unit not found');
        await this.propertyService.assertPropertyOwner(memberId, unit.propertyId);
        const result = await this.unitModel.findByIdAndUpdate(
            unitId,
            { status: BookableUnitStatus.ARCHIVED },
            { returnDocument: 'after' },
        ).lean().exec();
        return result as unknown as BookableUnitDto;
    }

    public async getOwnedUnit(
        memberId: Types.ObjectId,
        propertyId: Types.ObjectId,
        unitId: Types.ObjectId,
    ): Promise<ResolvedBookableUnit> {
        await this.propertyService.assertPropertyOwner(memberId, propertyId);
        const unit = await this.unitModel.findOne({
            _id: unitId,
            propertyId,
            status: { $ne: BookableUnitStatus.ARCHIVED },
        }).lean().exec();
        if (!unit) throw new NotFoundException('Bookable unit not found');
        return this.normalizeUnit(unit);
    }

    /**
     * Legacy properties do not have units yet. They are treated as one virtual
     * entire-unit inventory so old listings remain bookable during migration.
     */
    public async resolveForBooking(
        property: any,
        requestedUnitId?: string,
    ): Promise<ResolvedBookableUnit> {
        const propertyId = new Types.ObjectId(property._id);
        if (requestedUnitId) {
            const unit = await this.unitModel.findOne({
                _id: new Types.ObjectId(requestedUnitId),
                propertyId,
                status: BookableUnitStatus.ACTIVE,
            }).lean().exec();
            if (!unit && String(requestedUnitId) === String(propertyId)) {
                return this.ensureDefaultUnit(property);
            }
            if (!unit) throw new NotFoundException('Selected room or unit is not available');
            return this.normalizeUnit(unit);
        }

        const units = await this.unitModel.find({ propertyId, status: BookableUnitStatus.ACTIVE }).sort({ createdAt: 1 }).lean().exec();
        if (units.length === 1) return this.normalizeUnit(units[0]);
        if (units.length > 1) {
            throw new BadRequestException('Please select a room or unit type before booking');
        }

        return this.ensureDefaultUnit(property);
    }

    private async ensureDefaultUnit(property: any): Promise<ResolvedBookableUnit> {
        const propertyType = String(property.propertyType ?? '').toUpperCase();
        const roomInventory = propertyType === 'HOTEL' || propertyType === 'SANATORIUM';
        const defaultUnit = await this.unitModel.findOneAndUpdate(
            { propertyId: new Types.ObjectId(property._id), code: 'LEGACY-DEFAULT' },
            {
                $setOnInsert: {
                    propertyId: new Types.ObjectId(property._id),
                    unitType: roomInventory ? BookableUnitType.ROOM_TYPE : BookableUnitType.ENTIRE_UNIT,
                    name: roomInventory
                        ? (propertyType === 'SANATORIUM' ? 'Standard treatment room' : 'Standard room')
                        : property.propertyTitle,
                    code: 'LEGACY-DEFAULT',
                    inventoryCount: roomInventory ? Math.max(1, Number(property.propertyRooms ?? 1)) : 1,
                    basePrice: Number(property.propertyPrice ?? 0),
                    rateModel: this.defaultRateModel(propertyType),
                    packageNights: 1,
                    packagePerPerson: propertyType === 'SANATORIUM',
                    bookingMode: property.bookingMode ?? BookingMode.INSTANT,
                    maxGuests: Number(property.maxGuests ?? 1),
                    includedGuests: Number(property.maxGuests ?? 1),
                    bedrooms: Number(property.bedrooms ?? property.propertyRooms ?? 1),
                    beds: Number(property.beds ?? property.propertyBeds ?? 1),
                    bathrooms: Number(property.bathrooms ?? 1),
                    cleaningFee: Number(property.cleaningFee ?? 0),
                    petFee: Number(property.petFee ?? 0),
                    extraGuestFee: Number(property.extraGuestFee ?? 0),
                    petsAllowed: property.petsAllowed === true,
                    infantsAllowed: property.infantsAllowed !== false,
                    amenities: property.propertyAmenities ?? [],
                    status: BookableUnitStatus.ACTIVE,
                },
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
        ).lean().exec();
        return this.normalizeUnit(defaultUnit);
    }

    public virtualUnitFromProperty(property: any): ResolvedBookableUnit {
        const propertyType = String(property.propertyType ?? '').toUpperCase();
        const roomInventory = propertyType === 'HOTEL' || propertyType === 'SANATORIUM';
        return {
            _id: new Types.ObjectId(property._id),
            propertyId: new Types.ObjectId(property._id),
            unitType: roomInventory
                ? BookableUnitType.ROOM_TYPE
                : BookableUnitType.ENTIRE_UNIT,
            name: roomInventory
                ? (propertyType === 'SANATORIUM' ? 'Standard treatment room' : 'Standard room')
                : property.propertyTitle,
            inventoryCount: roomInventory ? Math.max(1, Number(property.propertyRooms ?? 1)) : 1,
            basePrice: Number(property.propertyPrice ?? 0),
            rateModel: this.defaultRateModel(propertyType),
            packageNights: 1,
            packagePerPerson: propertyType === 'SANATORIUM',
            bookingMode: property.bookingMode ?? BookingMode.INSTANT,
            maxGuests: Number(property.maxGuests ?? 1),
            includedGuests: Number(property.maxGuests ?? 1),
            bedrooms: Number(property.bedrooms ?? property.propertyRooms ?? 1),
            beds: Number(property.beds ?? property.propertyBeds ?? 1),
            bathrooms: Number(property.bathrooms ?? 1),
            cleaningFee: Number(property.cleaningFee ?? 0),
            petFee: Number(property.petFee ?? 0),
            extraGuestFee: Number(property.extraGuestFee ?? 0),
            petsAllowed: property.petsAllowed === true,
            infantsAllowed: property.infantsAllowed !== false,
            amenities: property.propertyAmenities ?? [],
            isVirtual: true,
        };
    }

    private defaultRateModel(propertyType: string): UnitRateModel {
        return String(propertyType).toUpperCase() === 'SANATORIUM'
            ? UnitRateModel.PERSON_NIGHT
            : UnitRateModel.UNIT_NIGHT;
    }

    private validateUnitForProperty(propertyType: string, input: BookableUnitInput): void {
        const type = String(propertyType).toUpperCase();
        if (['HOTEL', 'SANATORIUM'].includes(type) && input.unitType === BookableUnitType.ENTIRE_UNIT) {
            throw new BadRequestException('Hotel and sanatorium listings should use room or room-type inventory');
        }
        if (['VILLA', 'APARTMENT', 'RESORT'].includes(type) && [BookableUnitType.ROOM_TYPE, BookableUnitType.ROOM].includes(input.unitType)) {
            throw new BadRequestException('Villa, apartment and resort listings should use an entire unit or cabin inventory');
        }
        if (input.inventoryCount < 1 || input.basePrice < 0) {
            throw new BadRequestException('Inventory count and price are invalid');
        }
        if ([BookableUnitType.ENTIRE_UNIT, BookableUnitType.ROOM].includes(input.unitType) && input.inventoryCount !== 1) {
            throw new BadRequestException('Specific rooms and entire units must have inventoryCount=1');
        }
        if (type === 'SANATORIUM' && input.rateModel === UnitRateModel.UNIT_NIGHT) {
            throw new BadRequestException('Sanatorium units must use person-night or package pricing');
        }
        if (input.rateModel === UnitRateModel.PACKAGE && (input.packageNights ?? 1) < 1) {
            throw new BadRequestException('Package duration must be at least one night');
        }
    }

    private normalizeUnit(unit: any): ResolvedBookableUnit {
        return {
            ...unit,
            packageNights: Math.max(1, Number(unit?.packageNights ?? 1)),
            packagePerPerson: unit?.packagePerPerson === true,
            inventoryCount: Math.max(1, Number(unit?.inventoryCount ?? 1)),
            basePrice: Math.max(0, Number(unit?.basePrice ?? 0)),
            maxGuests: Math.max(1, Number(unit?.maxGuests ?? 1)),
            includedGuests: Math.max(0, Number(unit?.includedGuests ?? unit?.maxGuests ?? 1)),
            cleaningFee: Math.max(0, Number(unit?.cleaningFee ?? 0)),
            petFee: Math.max(0, Number(unit?.petFee ?? 0)),
            extraGuestFee: Math.max(0, Number(unit?.extraGuestFee ?? 0)),
            bedrooms: Math.max(0, Number(unit?.bedrooms ?? 1)),
            beds: Math.max(0, Number(unit?.beds ?? 1)),
            bathrooms: Math.max(0, Number(unit?.bathrooms ?? 1)),
            petsAllowed: unit?.petsAllowed === true,
            infantsAllowed: unit?.infantsAllowed !== false,
            amenities: Array.isArray(unit?.amenities) ? unit.amenities : [],
        } as ResolvedBookableUnit;
    }
}
