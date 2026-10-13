import { registerEnumType } from '@nestjs/graphql';
import { BookingMode } from './booking.enum';

// --- Property Type ---
export enum PropertyType {
    VILLA = 'VILLA',
    APARTMENT = 'APARTMENT',
    RESORT = 'RESORT',
    HOTEL = 'HOTEL',
    SANATORIUM = 'SANATORIUM',

}
registerEnumType(PropertyType, { name: 'PropertyType' });

// --- Property Status ---
export enum PropertyStatus {
    DRAFT = 'DRAFT',
    PENDING_REVIEW = 'PENDING_REVIEW',
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    ARCHIVED = 'ARCHIVED',

    // Legacy statuses kept during additive MongoDB migration.
    HOLD = 'HOLD',
    BOOKED = 'BOOKED',
    DELETE = 'DELETE',
}
registerEnumType(PropertyStatus, { name: 'PropertyStatus' });

export { BookingMode };

export enum CancellationPolicy {
    FLEXIBLE = 'FLEXIBLE',
    MODERATE = 'MODERATE',
    FIRM = 'FIRM',
}

registerEnumType(CancellationPolicy, { name: 'CancellationPolicy' });

// --- Property Location ---
export enum PropertyLocation {
    SEOUL = 'SEOUL',
	BUSAN = 'BUSAN',
	INCHEON = 'INCHEON',
	DAEGU = 'DAEGU',
	GYEONGJU = 'GYEONGJU',
	GWANGJU = 'GWANGJU',
	CHONJU = 'CHONJU',
	DAEJON = 'DAEJON',
	JEJU = 'JEJU',
    TASHKENT = 'TASHKENT',
    SAMARKAND = 'SAMARKAND',
    BUKHARA = 'BUKHARA',
    KHIVA = 'KHIVA',
    CHORVOQ = 'CHORVOQ',
    BOSTONLIQ = 'BOSTONLIQ',
    ZAAMIN = 'ZAAMIN',
    CHIMGAN = 'CHIMGAN',
    CHODAK = 'CHODAK',
    BALI = 'BALI'
}
registerEnumType(PropertyLocation, { name: 'PropertyLocation' });
