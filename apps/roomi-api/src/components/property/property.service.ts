import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; // ObjectId ni shu yerdan olish ishonchliroq
import { Properties, Property } from '../../libs/dto/property/property';
import { AgentPropertiesInquiry, AllPropertiesInquiry, OrdinaryInquiry, PropertiesInquiry, PropertyInput } from '../../libs/dto/property/property.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticModify, T } from '../../libs/types/common';
import { BookingMode } from '../../libs/enums/booking.enum';
import { AvailabilityStatus } from '../../libs/enums/availability.enum';
import { CancellationPolicy, PropertyStatus } from '../../libs/enums/property.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import moment from 'moment';
import { lookupAuthMemberLiked, lookupMember, parseDateOnly, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeService } from '../like/like.service';

@Injectable()
export class PropertyService {

    constructor(
        @InjectModel("Property") private readonly propertyModel: Model<Property>,
        @InjectModel('Availability') private readonly availabilityModel: Model<any>,
        private readonly memberService: MemberService,
        private readonly viewService: ViewService,
        private readonly likeService: LikeService,
    ) {}

    public async createProperty(input: PropertyInput): Promise<Property> {
        try {
            const createInput = this.preparePropertyCreateInput(input);
            const result = await this.propertyModel.create(createInput);
            
            // increase memberProperties
            await this.memberService.memberStatsEditor({
                _id: result.memberId,
                targetKey: "memberProperties", 
                modifier: 1,
            });

            return result;
        } catch (err) {
            console.log("Error, Service.Model", err);
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    };

    private preparePropertyCreateInput(input: PropertyInput): T {
        const createInput: T = {
            ...input,
            propertyStatus: PropertyStatus.PENDING_REVIEW,
            bookingMode: input.bookingMode ?? BookingMode.INSTANT,
            currency: input.currency ?? 'UZS',
            maxGuests: input.maxGuests ?? input.propertyBeds ?? 1,
            bedrooms: input.bedrooms ?? input.propertyRooms ?? 1,
            beds: input.beds ?? input.propertyBeds ?? 1,
            bathrooms: input.bathrooms ?? 1,
            infantsAllowed: input.infantsAllowed ?? true,
            petsAllowed: input.petsAllowed ?? false,
            timezone: input.timezone ?? 'Asia/Tashkent',
            checkInTime: input.checkInTime ?? '14:00',
            checkOutTime: input.checkOutTime ?? '11:00',
            minNights: input.minNights ?? 1,
            maxNights: input.maxNights ?? 30,
            advanceNoticeHours: input.advanceNoticeHours ?? 0,
            preparationTimeHours: input.preparationTimeHours ?? 0,
            houseRules: input.houseRules ?? [],
            cancellationPolicy: input.cancellationPolicy ?? CancellationPolicy.MODERATE,
            cleaningFee: input.cleaningFee ?? 0,
            petFee: input.petFee ?? 0,
            extraGuestFee: input.extraGuestFee ?? 0,
        };

        if (typeof input.latitude === 'number' || typeof input.longitude === 'number') {
            createInput.propertyCoordinates = {
                lat: input.latitude,
                lng: input.longitude,
            };
            delete createInput.latitude;
            delete createInput.longitude;
        }

        return createInput;
    }

    public async getProperty(memberId: Types.ObjectId, propertyId: Types.ObjectId): Promise<Property> {
        const search: T = {
            _id: propertyId,
            propertyStatus: PropertyStatus.ACTIVE,
        };

        // 1-TUZATISH: .lean() dan keyin 'as Property' qo'shildi, chunki natija null bo'lishi mumkin
        const targetProperty: Property = await this.propertyModel.findOne(search).lean().exec() as Property;
        
        if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

        if (memberId) {
            const viewInput = { memberId: memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
            const newView = await this.viewService.recordView(viewInput);
            if (newView) {
                await this.propertyStatsEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });
                targetProperty.propertyViews++;
            }
        }

        // MeLiked
        const likeInput = { memberId: memberId, likeRefId: propertyId, likeGroup: LikeGroup.PROPERTY};
        targetProperty.meLiked = await this.likeService.checkLikeExistance(likeInput);
        targetProperty.memberData = await this.memberService.getMember(null as any, targetProperty.memberId);
        
        return targetProperty;
    }

    /** Biror property ning bir kecha narxini olish (bron totalPrice hisoblash uchun) */
    public async getPropertyPrice(propertyId: Types.ObjectId): Promise<number> {
        const doc = await this.propertyModel
            .findById(propertyId)
            .select('propertyPrice')
            .lean()
            .exec();
        if (!doc || (doc as any).propertyPrice == null) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
        return (doc as any).propertyPrice;
    }

    public async getPropertyForPricing(propertyId: Types.ObjectId): Promise<any> {
        const doc = await this.propertyModel
            .findById(propertyId)
            .select(
                'propertyTitle propertyPrice propertyType propertyLocation propertyAddress propertyRank propertyLikes propertyViews propertyComments propertyRatingCount dynamicPricingEnabled weekendMultiplier minMultiplier maxMultiplier manualMultiplierOverride propertyStatus currency cleaningFee petFee extraGuestFee cancellationPolicy maxGuests bedrooms beds bathrooms propertyRooms propertyBeds propertyAmenities minNights maxNights bookingMode infantsAllowed petsAllowed timezone checkInTime checkOutTime memberId',
            )
            .lean()
            .exec();

        if (!doc) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
        return doc;
    }

    /**
     * Small live catalogue snapshot used as grounding for the ROOMi assistant.
     * The model only receives ACTIVE properties and never queries MongoDB
     * directly or invents catalogue records.
     */
    public async getAssistantCatalogSnapshot(userMessage: string, limit = 8): Promise<{
        totalActive: number;
        matchedTotal: number;
        items: any[];
    }> {
        const properties = await this.propertyModel
            .find({ propertyStatus: PropertyStatus.ACTIVE })
            .select(
                '_id propertyTitle propertyType propertyLocation propertyAddress propertyPrice currency maxGuests bedrooms beds bathrooms propertyRooms propertyBeds propertyAmenities propertyRank propertyRatingCount propertyLikes propertyViews bookingMode cancellationPolicy checkInTime checkOutTime minNights maxNights petsAllowed infantsAllowed propertyDesc',
            )
            .lean()
            .exec();

        const normalized = this.normalizeAssistantSearchText(userMessage);
        const queryTokens = normalized.split(/\s+/).filter(Boolean);
        const requestedTypes = [
            { type: 'VILLA', aliases: ['villa', 'dacha', 'dala hovli', '빌라', '별장', '펜션'] },
            { type: 'HOTEL', aliases: ['hotel', 'mehmonxona', 'otel', '호텔'] },
            { type: 'APARTMENT', aliases: ['apartment', 'kvartira', 'xonadon', '아파트'] },
            { type: 'RESORT', aliases: ['resort', 'kurort', '리조트'] },
            { type: 'SANATORIUM', aliases: ['sanatorium', 'sanatoriy', '요양원', '휴양소'] },
        ]
            .filter(({ aliases }) => aliases.some((alias) => this.assistantAliasMatches(normalized, queryTokens, alias)))
            .map(({ type }) => type);
        const locationAliases: Record<string, string[]> = {
            TASHKENT: ['tashkent', 'toshkent', '타슈켄트'],
            SAMARKAND: ['samarkand', 'samarqand', '사마르칸트'],
            BUKHARA: ['bukhara', 'buxoro', '부하라'],
            KHIVA: ['khiva', 'xiva', '히바'],
            CHORVOQ: ['chorvoq', 'charvak', '차르박'],
            BOSTONLIQ: ["bo'stonliq", 'bostonliq', 'bostanlik', '보스톤리크'],
            ZAAMIN: ['zaamin', 'zomin', '자민'],
            CHIMGAN: ['chimgan', 'chimyon', '침간'],
            CHODAK: ['chodak'],
            SEOUL: ['seoul', 'seul', '서울'],
            BUSAN: ['busan', 'pusan', '부산'],
            INCHEON: ['incheon', 'inchon', '인천'],
            DAEGU: ['daegu', '대구'],
            GYEONGJU: ['gyeongju', '경주'],
            GWANGJU: ['gwangju', '광주'],
            CHONJU: ['chonju', 'jeonju', '전주'],
            DAEJON: ['daejeon', 'daejon', '대전'],
            JEJU: ['jeju', '제주'],
            BALI: ['bali', '발리'],
        };
        const requestedLocations = Object.entries(locationAliases)
            .filter(([, aliases]) => aliases.some((alias) => this.assistantAliasMatches(normalized, queryTokens, alias)))
            .map(([location]) => location);
        const guestMatch = normalized.match(/(\d{1,2})\s*([\p{L}]{1,14})/iu);
        const guestUnit = guestMatch?.[2] ?? '';
        const guestAliases = [
            'mehmon', 'mehmonlar', 'kishi', 'kishilik', 'kishiga',
            'odam', 'odamlik', 'odamga', 'guest', 'guests', 'people', 'person',
            '명', '인', '사람',
        ];
        const requestedGuests = guestMatch && guestAliases.some((alias) =>
            this.assistantAliasMatches(guestUnit, [guestUnit], alias),
        )
            ? Number(guestMatch[1])
            : 0;
        const requiresPets = /(?:\b(?:pet|pets|uy hayvoni|hayvon bilan)\b|반려동물|애완동물)/i.test(normalized);
        const prefersLowPrice = /(?:\b(?:arzon|hamyonbop|byudjet|budget|cheap|affordable)\b|저렴|가성비)/i.test(normalized);
        const tokens = queryTokens.filter((token) => token.length >= 4);

        const candidates = (properties as any[])
            .filter((property) => !requestedTypes.length || requestedTypes.includes(String(property.propertyType)))
            .filter((property) => !requestedLocations.length || requestedLocations.includes(String(property.propertyLocation)))
            .filter((property) => !requestedGuests || Number(property.maxGuests ?? property.propertyBeds ?? 1) >= requestedGuests)
            .filter((property) => !requiresPets || property.petsAllowed === true)
            .map((property) => {
                const haystack = [
                    property.propertyTitle,
                    property.propertyType,
                    property.propertyLocation,
                    property.propertyAddress,
                    property.propertyDesc,
                    ...(property.propertyAmenities ?? []),
                ].join(' ').toLocaleLowerCase();
                const haystackTokens = this.normalizeAssistantSearchText(haystack).split(/\s+/).filter(Boolean);
                const lexicalScore = tokens.reduce(
                    (score, token) => score + (
                        haystack.includes(token) || haystackTokens.some((candidate) => this.isAssistantFuzzyMatch(token, candidate))
                            ? 1
                            : 0
                    ),
                    0,
                );
                const familyScore = /oilaviy|family|children|bolalar|가족|아이/i.test(normalized)
                    ? Math.min(Number(property.maxGuests ?? 1), 8) / 8
                    : 0;
                return { property, score: lexicalScore + familyScore };
            })
            .sort((left, right) =>
                (prefersLowPrice
                    ? Number(left.property.propertyPrice ?? 0) - Number(right.property.propertyPrice ?? 0)
                    : right.score - left.score) ||
                right.score - left.score ||
                Number(right.property.propertyRank ?? 0) - Number(left.property.propertyRank ?? 0) ||
                Number(right.property.propertyLikes ?? 0) - Number(left.property.propertyLikes ?? 0) ||
                Number(right.property.propertyViews ?? 0) - Number(left.property.propertyViews ?? 0),
            );

        return {
            totalActive: properties.length,
            matchedTotal: candidates.length,
            items: candidates.slice(0, Math.max(1, Math.min(limit, 12))).map(({ property }) => property),
        };
    }

    private normalizeAssistantSearchText(value: unknown): string {
        return String(value ?? '')
            .toLocaleLowerCase()
            .normalize('NFC')
            .replace(/[‘’`ʻʼ']/g, '')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private assistantAliasMatches(normalized: string, queryTokens: string[], alias: string): boolean {
        const normalizedAlias = this.normalizeAssistantSearchText(alias);
        if (!normalizedAlias) return false;
        if (normalized.includes(normalizedAlias)) return true;

        const aliasTokens = normalizedAlias.split(/\s+/).filter(Boolean);
        return aliasTokens.every((aliasToken) =>
            queryTokens.some((queryToken) => this.isAssistantFuzzyMatch(queryToken, aliasToken)),
        );
    }

    private isAssistantFuzzyMatch(left: string, right: string): boolean {
        if (left === right) return true;
        const shortest = Math.min(left.length, right.length);
        if (/[가-힣]/.test(left + right) && shortest >= 2) {
            return this.assistantEditDistance(left, right) <= 1;
        }
        if (shortest < 4) return false;
        const allowedDistance = shortest <= 5 ? 1 : 2;
        return this.assistantEditDistance(left, right) <= allowedDistance;
    }

    private assistantEditDistance(left: string, right: string): number {
        const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
        const current = new Array<number>(right.length + 1);

        for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
            current[0] = leftIndex;
            for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
                const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
                current[rightIndex] = Math.min(
                    current[rightIndex - 1] + 1,
                    previous[rightIndex] + 1,
                    previous[rightIndex - 1] + substitutionCost,
                );
            }
            for (let index = 0; index <= right.length; index += 1) previous[index] = current[index];
        }

        return previous[right.length];
    }

    public async getPropertyForBooking(propertyId: Types.ObjectId): Promise<any> {
        const doc = await this.propertyModel
            .findOne({
                _id: propertyId,
                propertyStatus: PropertyStatus.ACTIVE,
            })
            .select(
                'propertyTitle propertyPrice propertyStatus memberId bookingMode maxGuests bedrooms beds bathrooms propertyRooms propertyBeds propertyAmenities infantsAllowed petsAllowed minNights maxNights cancellationPolicy currency cleaningFee petFee extraGuestFee timezone advanceNoticeHours',
            )
            .lean()
            .exec();

        if (!doc) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
        return doc;
    }

    public async assertPropertyOwner(memberId: Types.ObjectId, propertyId: Types.ObjectId): Promise<Property> {
        const property = await this.propertyModel
            .findOne({
                _id: propertyId,
                memberId,
                propertyStatus: { $nin: [PropertyStatus.DELETE, PropertyStatus.ARCHIVED] },
            })
            .exec();

        if (!property) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        return property;
    }

    
    public async updateProperty(memberId: Types.ObjectId, input: PropertyUpdate): Promise<Property> {
        let { propertyStatus, deletedAt } = input;
        const search: T = {
            _id: input._id,
            memberId: memberId,
            propertyStatus: { $nin: [PropertyStatus.DELETE, PropertyStatus.ARCHIVED] },
        };
        
      
        if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();
        if (propertyStatus === PropertyStatus.ACTIVE || propertyStatus === PropertyStatus.SUSPENDED) {
            input.propertyStatus = PropertyStatus.PENDING_REVIEW;
        }
        if (deletedAt) input.deletedAt = deletedAt;
        
        const result = await this.propertyModel
        .findOneAndUpdate(search, input, {
            new: true,
        })
        .exec();
        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
        
       
            if (deletedAt) {
                await this.memberService.memberStatsEditor({
                    _id: memberId,
                    targetKey: 'memberProperties',
                    modifier: -1,
                });
            }
            
            return result;
        };
        
        
        public async getProperties(memberId: Types.ObjectId, input: PropertiesInquiry): Promise<Properties> {
            const match: T = { propertyStatus: PropertyStatus.ACTIVE };
            const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
            
            this.shapeMatchQuery(match, input);
            await this.appendAvailabilityMatch(match, input);
            
            const result = await this.propertyModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * input.limit },
                            { $limit: input.limit },
                            lookupAuthMemberLiked(memberId),
                            lookupMember,
                            {
                                $unwind: {
                                    path: '$memberData',
                                    preserveNullAndEmptyArrays: true,
                                },
                            },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();
            if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
            
            return result[0];
        };
        
        private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
            const {
                memberId,
                locationList,
                roomsList,
                bedsList,
                typeList,
                periodsRange,
                pricesRange,
                squaresRange,
                options,
                text,
                checkIn,
                checkOut,
                guests,
                bookingMode,
                amenities,
            } = input.search;
            
            if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
            if (locationList) match.propertyLocation = { $in: locationList };
            if (roomsList) match.propertyRooms = { $in: roomsList };
            if (bedsList) match.propertyBeds = { $in: bedsList };
            if (typeList) match.propertyType = { $in: typeList };
            if (guests) match.maxGuests = { $gte: guests };
            if (bookingMode) match.bookingMode = bookingMode;
            if (amenities?.length) match.propertyAmenities = { $all: amenities };
            
            if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
            if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
            if (squaresRange) match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };
            
            if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
            if (options) {
                match['$or'] = options.map((ele) => {
                    return { [ele]: true };
                });
            }
        };

        private async appendAvailabilityMatch(match: T, input: PropertiesInquiry): Promise<void> {
            const checkIn = input.search?.checkIn;
            const checkOut = input.search?.checkOut;
            if (!checkIn || !checkOut) return;

            const start = parseDateOnly(checkIn);
            const end = parseDateOnly(checkOut);
            if (end.getTime() <= start.getTime()) throw new BadRequestException('checkOut must be after checkIn');

            const maxSearchNights = Number(process.env.MAX_SEARCH_NIGHTS ?? 60);
            const nights = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
            if (nights > maxSearchNights) {
                throw new BadRequestException(`Search date range cannot exceed ${maxSearchNights} nights`);
            }

            const now = new Date();
            const lockedStatuses = [
                AvailabilityStatus.RESERVED,
                AvailabilityStatus.BLOCKED,
                AvailabilityStatus.OCCUPIED,
                AvailabilityStatus.MAINTENANCE,
            ];
            const lockedDates = await this.availabilityModel
                .find({
                    availabilityDate: { $gte: start, $lt: end },
                    $or: [
                        { availabilityStatus: { $in: lockedStatuses } },
                        {
                            availabilityStatus: AvailabilityStatus.HELD,
                            heldUntil: { $gt: now },
                        },
                    ],
                })
                .select('propertyId')
                .lean()
                .exec();

            const unavailablePropertyIds = lockedDates
                .map((item: any) => item.propertyId)
                .filter(Boolean)
                .map((propertyId: any) => shapeIntoMongoObjectId(propertyId));

            if (!unavailablePropertyIds.length) return;

            match._id = match._id ?? {};
            match._id.$nin = [...(match._id.$nin ?? []), ...unavailablePropertyIds];
        }
        
        
        public async getAgentProperties(memberId: Types.ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
            const { propertyStatus } = input.search;
            if (propertyStatus === PropertyStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
            
            const match: T = {
                memberId: memberId,
                propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE },
            };
            const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
            
            const result = await this.propertyModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * input.limit },
                            { $limit: input.limit },
                            lookupMember,
                            { $unwind: '$memberData' },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();
            if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
            
            return result[0];
        };
        
        
        
        public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
            const { propertyStatus, propertyLocationList } = input.search;
            const match: T = {};
            const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
            
            if (propertyStatus) match.propertyStatus = propertyStatus;
            if (propertyLocationList) match.propertyLocation = { $in: propertyLocationList };
            
            const result = await this.propertyModel
            .aggregate([
                { $match: match },
                { $sort: sort },
                {
                    $facet: {
                        list: [
                            { $skip: (input.page - 1) * input.limit },
                            { $limit: input.limit },
                            lookupMember,
                            { $unwind: '$memberData' },
                        ],
                        metaCounter: [{ $count: 'total' }],
                    },
                },
            ])
            .exec();
            if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
            
            return result[0];
        };
        
        
        
        public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
            let { propertyStatus, deletedAt } = input;
            const search: T = {
                _id: input._id,
            };
            
            
            if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();
            if (deletedAt) input.deletedAt = deletedAt;
            
            const result = await this.propertyModel
            .findOneAndUpdate(search, input, {
                returnDocument: 'after',
            })
            .exec();
            if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
            
            if (deletedAt) {
                await this.memberService.memberStatsEditor({
                    _id: result.memberId,
                    targetKey: 'memberProperties',
                    modifier: -1,
                });
            }
            
            return result;
        };
        
        
        
        public async removePropertyByAdmin(propertyId: Types.ObjectId): Promise<Property> {
            const search: T = { _id: propertyId, propertyStatus: PropertyStatus.DELETE };
            const result = await this.propertyModel.findOneAndDelete(search).exec();
            if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
            
            return result;
        };
        
        
        
        
        
        public async propertyStatsEditor(input: StatisticModify): Promise<Property> {
            const { _id, targetKey, modifier } = input;
            return await this.propertyModel
                .findByIdAndUpdate(
                    _id,
                    { $inc: { [targetKey]: modifier } },
                    { new: true }
                )
                .exec() as Property; // 3-TUZATISH: Qaytuvchi qiymatni majburlab 'Property' deb belgilaymiz
        };

        public async likeTargetProperty(memberId: Types.ObjectId, likeRefId: Types.ObjectId): Promise<Property> {
            const target = await this.propertyModel.findOne({
                _id: likeRefId,
                propertyStatus: PropertyStatus.ACTIVE,
            }).exec();
            if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

            const input = {
                memberId,
                likeRefId,
                likeGroup: LikeGroup.PROPERTY,
            };

            const modifier: number = await this.likeService.togglike(input);
            const result = await this.propertyStatsEditor({
                _id: likeRefId,
                targetKey: 'propertyLikes',
                modifier,
            });

            if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
            return result;
        };


        public async getFavorites(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Properties>{
            return await this.likeService.getFavoriteProperties(memberId, input);
        };


        public async getVisited(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Properties>{
            return await this.viewService.getVisitedProperties(memberId, input);
        }
        
        
        
    }
    
    
    
    
    
    
