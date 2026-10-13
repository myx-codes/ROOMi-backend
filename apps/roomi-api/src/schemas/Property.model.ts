import { Schema } from 'mongoose';
import { BookingMode, CancellationPolicy, PropertyLocation, PropertyStatus, PropertyType } from '../libs/enums/property.enum';

const PropertySchema = new Schema(
    {
        propertyType: {
            type: String,
            enum: PropertyType,
            required: true,
        },

        propertyStatus: {
            type: String,
            enum: PropertyStatus,
            default: PropertyStatus.PENDING_REVIEW,
        },

        // Idempotent catalog imports use this internal key; it is not exposed
        // in the public GraphQL property response.
        catalogKey: {
            type: String,
            index: { unique: true, sparse: true },
            select: false,
        },

        bookingMode: {
            type: String,
            enum: BookingMode,
            default: BookingMode.INSTANT,
            index: true,
        },

        currency: {
            type: String,
            default: 'UZS',
        },

        propertyLocation: {
            type: String,
            enum: PropertyLocation,
            required: true,
        },

        propertyAddress: {
            type: String,
            required: true,
        },

        propertyTitle: {
            type: String,
            required: true,
            index: true, // Sarlavha bo'yicha qidiruv uchun
        },

        propertyPrice: {
            type: Number,
            required: true,
        },

        dynamicPricingEnabled: {
            type: Boolean,
            default: true,
        },

        weekendMultiplier: {
            type: Number,
            default: 1.22,
        },

        minMultiplier: {
            type: Number,
            default: 0.85,
        },

        maxMultiplier: {
            type: Number,
            default: 1.8,
        },

        manualMultiplierOverride: {
            type: Number,
            default: null,
        },

        propertySquare: {
            type: Number,
            required: true,
        },

        propertyBeds: {
            type: Number,
            required: true,
        },

        maxGuests: {
            type: Number,
            default: 1,
            index: true,
        },

        bedrooms: {
            type: Number,
            default: 1,
        },

        beds: {
            type: Number,
            default: 1,
        },

        bathrooms: {
            type: Number,
            default: 1,
        },

        infantsAllowed: {
            type: Boolean,
            default: true,
        },

        petsAllowed: {
            type: Boolean,
            default: false,
        },

        propertyRooms: {
            type: Number,
            required: true,
        },

        // ROOMi uchun qo'shimchalar:
        propertyAmenities: {
            type: [String], // ['POOL', 'WIFI', 'SAUNA', 'BBQ']
            default: [],
        },

        // Xaritada ko'rsatish uchun (GeoJSON format)
        propertyCoordinates: {
            lat: { type: Number },
            lng: { type: Number },
        },

        timezone: {
            type: String,
            default: 'Asia/Tashkent',
        },

        checkInTime: {
            type: String,
            default: '14:00',
        },

        checkOutTime: {
            type: String,
            default: '11:00',
        },

        minNights: {
            type: Number,
            default: 1,
        },

        maxNights: {
            type: Number,
            default: 30,
        },

        advanceNoticeHours: {
            type: Number,
            default: 0,
        },

        preparationTimeHours: {
            type: Number,
            default: 0,
        },

        houseRules: {
            type: [String],
            default: [],
        },

        cancellationPolicy: {
            type: String,
            enum: CancellationPolicy,
            default: CancellationPolicy.MODERATE,
        },

        cleaningFee: {
            type: Number,
            default: 0,
        },

        petFee: {
            type: Number,
            default: 0,
        },

        extraGuestFee: {
            type: Number,
            default: 0,
        },

        propertyViews: {
            type: Number,
            default: 0,
        },

        propertyLikes: {
            type: Number,
            default: 0,
        },

        propertyComments: {
            type: Number,
            default: 0,
        },

        propertyRank: {
            type: Number, // O'rtacha reyting (Yulduzchalar)
            default: 0,
        },

        propertyRatingCount: {
            type: Number,
            default: 0,
        },

        propertyImages: {
            type: [String],
            required: true,
        },

        propertyDesc: {
            type: String,
        },

    

        propertyRent: {
            type: Boolean,
            default: false,
        },

        memberId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Member',
        },

        soldAt: {
            type: Date,
        },

        deletedAt: {
            type: Date,
        },

        constructedAt: {
            type: Date,
        },
    },
    { timestamps: true, collection: 'properties' },
);

// Qidiruv filtrlarini optimallashtirish uchun indekslar
PropertySchema.index({ propertyType: 1, propertyLocation: 1, propertyPrice: 1 });
PropertySchema.index({ propertyTitle: 'text', propertyDesc: 'text' }); // Matnli qidiruv uchun

export default PropertySchema;
