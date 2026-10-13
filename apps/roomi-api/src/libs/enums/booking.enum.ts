import { registerEnumType } from '@nestjs/graphql';

export enum BookingStatus {
    REQUESTED = 'REQUESTED',
    AWAITING_PAYMENT = 'AWAITING_PAYMENT',
    CONFIRMED = 'CONFIRMED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED',

    // Legacy statuses kept during additive MongoDB migration.
    WAITING = 'WAITING',
    FINISHED = 'FINISHED',
}

registerEnumType(BookingStatus, {
    name: 'BookingStatus',
    description: 'Bron qilish holatlari',
});

export enum BookingGroup {
    PROPERTY = 'PROPERTY', // Hozircha faqat obyektlar uchun, lekin kelajakda boshqa xizmatlar qo'shilishi mumkin
}

registerEnumType(BookingGroup, {
    name: 'BookingGroup',
});

export enum BookingMode {
    INSTANT = 'INSTANT',
    REQUEST = 'REQUEST',
}

registerEnumType(BookingMode, {
    name: 'BookingMode',
    description: 'Bron qilish tartibi: darhol toʻlov yoki host tasdigʻi bilan',
});
