import { registerEnumType } from '@nestjs/graphql';

export enum PaymentStatus {
    CREATED = 'CREATED',
    PENDING = 'PENDING',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
    REFUND_PENDING = 'REFUND_PENDING',
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
    REFUNDED = 'REFUNDED',

    // Legacy status kept during additive MongoDB migration.
    SUCCESS = 'SUCCESS',
}

registerEnumType(PaymentStatus, {
    name: 'PaymentStatus',
    description: 'Toʻlov tranzaksiyasining holati',
});

export enum PaymentMethod {
    CLICK = 'CLICK',
    PAYME = 'PAYME',
    UZUM = 'UZUM',
    CASH = 'CASH',     // Joyida naqd to'lash (agar ruxsat berilsa)
    WALLET = 'WALLET', // Foydalanuvchining ichki hamyoni (balansi)
}

registerEnumType(PaymentMethod, {
    name: 'PaymentMethod',
    description: 'Toʻlov turlari',
});
