import { registerEnumType } from '@nestjs/graphql';

export enum AvailabilityStatus {
    AVAILABLE = 'AVAILABLE',
    HELD = 'HELD',
    RESERVED = 'RESERVED',
    BLOCKED = 'BLOCKED',

    // Legacy statuses kept during additive MongoDB migration.
    OCCUPIED = 'OCCUPIED',
    MAINTENANCE = 'MAINTENANCE',
}

registerEnumType(AvailabilityStatus, {
    name: 'AvailabilityStatus',
    description: 'Obyektning maʼlum bir sanadagi holati',
});
