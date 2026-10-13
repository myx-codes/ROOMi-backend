import { describe, expect, it } from '@jest/globals';
import { calculateBookingQuote } from './pricing';

const preview = {
  dates: [],
  nights: 2,
  baseTotal: 200,
  totalPrice: 220,
};

describe('calculateBookingQuote', () => {
  it('charges hotel room inventory by room quantity', () => {
    const quote = calculateBookingQuote({
      property: { currency: 'UZS' },
      unit: {
        _id: 'room-type',
        name: 'Deluxe room',
        unitType: 'ROOM_TYPE',
        rateModel: 'UNIT_NIGHT',
        inventoryCount: 10,
        includedGuests: 2,
        cleaningFee: 50,
      },
      preview,
      quantity: 2,
      adults: 4,
      children: 0,
    });

    expect(quote.nightlyTotal).toBe(440);
    expect(quote.cleaningFee).toBe(100);
    expect(quote.guestTotal).toBe(540);
    expect(quote.hostPayoutAmount).toBe(486);
  });

  it('charges sanatorium person-night rates by billable guests', () => {
    const quote = calculateBookingQuote({
      property: { currency: 'UZS' },
      unit: {
        _id: 'treatment-room',
        name: 'Treatment room',
        unitType: 'ROOM_TYPE',
        rateModel: 'PERSON_NIGHT',
        includedGuests: 2,
      },
      preview,
      quantity: 1,
      adults: 2,
      children: 1,
    });

    expect(quote.billableGuests).toBe(3);
    expect(quote.nightlyTotal).toBe(660);
    expect(quote.extraGuestCount).toBe(0);
  });

  it('charges a fixed package per person when configured', () => {
    const quote = calculateBookingQuote({
      property: { currency: 'UZS' },
      unit: {
        _id: '7-day-package',
        name: '7-day treatment package',
        unitType: 'ROOM_TYPE',
        rateModel: 'PACKAGE',
        basePrice: 7000,
        packageNights: 7,
        packagePerPerson: true,
      },
      preview: {
        dates: [],
        nights: 7,
        baseTotal: 7000,
        totalPrice: 7700,
      },
      quantity: 1,
      adults: 2,
    });

    expect(quote.nightlyTotal).toBe(15400);
    expect(quote.guestTotal).toBe(15400);
  });
});
