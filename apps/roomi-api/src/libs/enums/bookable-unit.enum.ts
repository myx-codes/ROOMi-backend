import { registerEnumType } from '@nestjs/graphql';

/** Bron qilinadigan resursning fizik turi. */
export enum BookableUnitType {
    ENTIRE_UNIT = 'ENTIRE_UNIT',
    ROOM_TYPE = 'ROOM_TYPE',
    ROOM = 'ROOM',
    CABIN = 'CABIN',
    SHARED_ROOM = 'SHARED_ROOM',
}
registerEnumType(BookableUnitType, { name: 'BookableUnitType' });

/** Narx qanday birlik bo‘yicha hisoblanishini belgilaydi. */
export enum UnitRateModel {
    UNIT_NIGHT = 'UNIT_NIGHT',
    PERSON_NIGHT = 'PERSON_NIGHT',
    PACKAGE = 'PACKAGE',
}
registerEnumType(UnitRateModel, { name: 'UnitRateModel' });

export enum BookableUnitStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    ARCHIVED = 'ARCHIVED',
}
registerEnumType(BookableUnitStatus, { name: 'BookableUnitStatus' });
