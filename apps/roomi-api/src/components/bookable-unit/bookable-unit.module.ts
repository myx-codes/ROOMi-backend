import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookableUnitSchema } from '../../schemas/BookableUnit.model';
import { UnitAvailabilitySchema } from '../../schemas/UnitAvailability.model';
import { PropertyModule } from '../property/property.module';
import { AuthModule } from '../auth/auth.module';
import { BookableUnitResolver } from './bookable-unit.resolver';
import { BookableUnitService } from './bookable-unit.service';
import { UnitAvailabilityService } from './unit-availability.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: 'BookableUnit', schema: BookableUnitSchema },
            { name: 'UnitAvailability', schema: UnitAvailabilitySchema },
        ]),
        PropertyModule,
        AuthModule,
    ],
    providers: [BookableUnitResolver, BookableUnitService, UnitAvailabilityService],
    exports: [BookableUnitService, UnitAvailabilityService],
})
export class BookableUnitModule {}
