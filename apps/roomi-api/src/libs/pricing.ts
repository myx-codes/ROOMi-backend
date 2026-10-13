import { formatDateOnly, parseDateOnly } from './config';

export interface PricingSettings {
  propertyPrice: number;
  propertyType?: string;
  propertyRank?: number;
  propertyLikes?: number;
  propertyViews?: number;
  propertyComments?: number;
  propertyRatingCount?: number;
  dynamicPricingEnabled?: boolean;
  weekendMultiplier?: number | null;
  minMultiplier?: number | null;
  maxMultiplier?: number | null;
  manualMultiplierOverride?: number | null;
}

export interface PriceBreakdownItem {
  date: string;
  basePrice: number;
  multiplier: number;
  pricePerDay: number;
  isWeekend: boolean;
  mode: 'BASE' | 'WEEKEND' | 'AI' | 'MANUAL' | 'LOCKED';
  explanation: string[];
}

export interface PricePreview {
  dates: PriceBreakdownItem[];
  nights: number;
  baseTotal: number;
  totalPrice: number;
  averagePrice: number;
  /** Server-calculated booking totals for the selected unit and dimensions. */
  quantity?: number;
  billableGuests?: number;
  unitId?: string | null;
  unitName?: string | null;
  unitType?: string | null;
  rateModel?: string | null;
  currency?: string;
  nightlyTotal?: number;
  cleaningFee?: number;
  petFee?: number;
  extraGuestFee?: number;
  guestTotal?: number;
  hostCommissionAmount?: number;
  hostPayoutAmount?: number;
}

export interface BookingQuoteInput {
  property: { currency?: string };
  unit: {
    _id?: unknown;
    name?: string;
    unitType?: string;
    rateModel?: string;
    basePrice?: number;
    packageNights?: number;
    packagePerPerson?: boolean;
    maxGuests?: number;
    includedGuests?: number;
    cleaningFee?: number;
    petFee?: number;
    extraGuestFee?: number;
  };
  preview: Pick<PricePreview, 'dates' | 'nights' | 'baseTotal' | 'totalPrice'>;
  quantity?: number;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  hostCommissionRate?: number;
}

export interface BookingQuote {
  quantity: number;
  billableGuests: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  extraGuestCount: number;
  nightlyTotal: number;
  cleaningFee: number;
  petFee: number;
  extraGuestFee: number;
  guestTotal: number;
  currency: string;
  hostCommissionAmount: number;
  hostPayoutAmount: number;
  unitId: string | null;
  unitName: string | null;
  unitType: string | null;
  rateModel: string | null;
  snapshot: Record<string, unknown>;
}

/**
 * One authoritative quote formula used by both price preview and booking
 * creation. A client-provided total is never used here.
 */
export function calculateBookingQuote(input: BookingQuoteInput): BookingQuote {
  const quantity = Math.max(1, Math.floor(Number(input.quantity ?? 1)));
  const adults = Math.max(0, Math.floor(Number(input.adults ?? 1)));
  const children = Math.max(0, Math.floor(Number(input.children ?? 0)));
  const infants = Math.max(0, Math.floor(Number(input.infants ?? 0)));
  const pets = Math.max(0, Math.floor(Number(input.pets ?? 0)));
  const billableGuests = Math.max(1, adults + children);
  const rateModel = String(input.unit.rateModel ?? 'UNIT_NIGHT');
  const nights = Math.max(1, Number(input.preview.nights ?? 0));
  const packageMultiplier = input.preview.baseTotal > 0
    ? input.preview.totalPrice / input.preview.baseTotal
    : 1;

  let nightlyTotal = 0;
  if (rateModel === 'PERSON_NIGHT') {
    nightlyTotal = input.preview.totalPrice * billableGuests;
  } else if (rateModel === 'PACKAGE') {
    // PACKAGE is a fixed stay package. Seasonal/demand pricing still applies
    // through the average multiplier from the selected dates.
    const packagePrice = Math.max(0, Number(input.unit.basePrice ?? 0)) * packageMultiplier;
    nightlyTotal = packagePrice * (input.unit.packagePerPerson ? billableGuests : quantity);
  } else {
    nightlyTotal = input.preview.totalPrice * quantity;
  }

  const cleaningFee = Math.max(0, Number(input.unit.cleaningFee ?? 0)) * quantity;
  const petFee = pets > 0 ? Math.max(0, Number(input.unit.petFee ?? 0)) * quantity : 0;
  const includedGuests = Math.max(0, Number(input.unit.includedGuests ?? input.unit.maxGuests ?? 1));
  const extraGuestCount = rateModel === 'PERSON_NIGHT' || input.unit.packagePerPerson
    ? 0
    : Math.max(0, billableGuests - includedGuests * quantity);
  const extraGuestFee = extraGuestCount * Math.max(0, Number(input.unit.extraGuestFee ?? 0)) * nights;
  const guestTotal = roundPrice(nightlyTotal + cleaningFee + petFee + extraGuestFee);
  const hostCommissionRate = Math.min(1, Math.max(0, Number(input.hostCommissionRate ?? 0.1)));
  const hostCommissionAmount = roundPrice(guestTotal * hostCommissionRate);
  const hostPayoutAmount = Math.max(0, guestTotal - hostCommissionAmount);

  return {
    quantity,
    billableGuests,
    adults,
    children,
    infants,
    pets,
    extraGuestCount,
    nightlyTotal: roundPrice(nightlyTotal),
    cleaningFee: roundPrice(cleaningFee),
    petFee: roundPrice(petFee),
    extraGuestFee: roundPrice(extraGuestFee),
    guestTotal,
    currency: input.property.currency ?? 'UZS',
    hostCommissionAmount,
    hostPayoutAmount,
    unitId: input.unit._id ? String(input.unit._id) : null,
    unitName: input.unit.name ?? null,
    unitType: input.unit.unitType ?? null,
    rateModel: input.unit.rateModel ?? null,
    snapshot: {
      currency: input.property.currency ?? 'UZS',
      nights,
      dates: input.preview.dates,
      quantity,
      billableGuests,
      adults,
      children,
      infants,
      pets,
      nightlyTotal: roundPrice(nightlyTotal),
      cleaningFee: roundPrice(cleaningFee),
      petFee: roundPrice(petFee),
      extraGuestFee: roundPrice(extraGuestFee),
      extraGuestCount,
      guestTotal,
      hostCommissionAmount,
      hostPayoutAmount,
      hostCommissionRate,
      unitId: input.unit._id ? String(input.unit._id) : null,
      unitName: input.unit.name ?? null,
      unitType: input.unit.unitType ?? null,
      rateModel: input.unit.rateModel ?? null,
      packageNights: input.unit.packageNights ?? null,
      packagePerPerson: input.unit.packagePerPerson === true,
    },
  };
}

const WEEKEND_WEEKDAYS = new Set(['SAT', 'SUN']);
const DEFAULT_WEEKEND_MULTIPLIER = 1.22;
const DEFAULT_MIN_MULTIPLIER = 0.85;
const DEFAULT_MAX_MULTIPLIER = 1.8;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundPrice(value: number): number {
  return Math.max(0, Math.round(value));
}

export function getWeekdayShort(date: Date, timeZone: string): string {
  const stableDate = new Date(date.getTime() + 12 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(stableDate).toUpperCase();
}

export function isWeekendDate(date: Date, timeZone: string): boolean {
  return WEEKEND_WEEKDAYS.has(getWeekdayShort(date, timeZone));
}

export function iterateDateRange(startDate: string, endDateExclusive: string): Date[] {
  const dates: Date[] = [];
  let cursor = parseDateOnly(startDate);
  const end = parseDateOnly(endDateExclusive);

  while (cursor.getTime() < end.getTime()) {
    dates.push(new Date(cursor));
    cursor = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function generateUpcomingDates(startDate: Date, daysAhead: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(12, 0, 0, 0);

  for (let i = 0; i < daysAhead; i += 1) {
    dates.push(formatDateOnly(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function getDemandAdjustment(settings: PricingSettings): { multiplier: number; explanation: string[] } {
  const explanation: string[] = [];

  const rating = Math.max(0, Number(settings.propertyRank ?? 0));
  if (rating > 0) {
    const ratingBoost = clamp((rating / 5) * 0.12, 0, 0.12);
    if (ratingBoost > 0) {
      explanation.push(`rating_boost=${ratingBoost.toFixed(3)}`);
    }
    const popularityBase =
      (Number(settings.propertyViews ?? 0) + Number(settings.propertyLikes ?? 0) + Number(settings.propertyComments ?? 0)) || 0;
    const popularityBoost = clamp(Math.log10(popularityBase + 1) / 25, 0, 0.08);
    if (popularityBoost > 0) {
      explanation.push(`popularity_boost=${popularityBoost.toFixed(3)}`);
    }

    const ratingCountBoost = clamp(Math.log10(Number(settings.propertyRatingCount ?? 0) + 1) / 40, 0, 0.05);
    if (ratingCountBoost > 0) {
      explanation.push(`rating_volume_boost=${ratingCountBoost.toFixed(3)}`);
    }

    return {
      multiplier: 1 + ratingBoost + popularityBoost + ratingCountBoost,
      explanation,
    };
  }

  explanation.push('no_rating_signal');
  return { multiplier: 1, explanation };
}

export function calculateNightPrice(
  settings: PricingSettings,
  date: Date,
  timeZone: string,
): PriceBreakdownItem {
  const basePrice = Math.max(0, Number(settings.propertyPrice ?? 0));
  const weekendMultiplier = Number(settings.weekendMultiplier ?? DEFAULT_WEEKEND_MULTIPLIER);
  const minMultiplier = Number(settings.minMultiplier ?? DEFAULT_MIN_MULTIPLIER);
  const maxMultiplier = Number(settings.maxMultiplier ?? DEFAULT_MAX_MULTIPLIER);
  const manualOverride = settings.manualMultiplierOverride;
  const dynamicEnabled = settings.dynamicPricingEnabled !== false;
  const weekend = isWeekendDate(date, timeZone);
  const explanation: string[] = [];

  if (!dynamicEnabled) {
    return {
      date: formatDateOnly(date),
      basePrice,
      multiplier: 1,
      pricePerDay: roundPrice(basePrice),
      isWeekend: weekend,
      mode: 'BASE',
      explanation: ['dynamic_pricing_disabled'],
    };
  }

  if (manualOverride != null && Number.isFinite(Number(manualOverride)) && Number(manualOverride) > 0) {
    const multiplier = clamp(Number(manualOverride), minMultiplier, maxMultiplier);
    explanation.push(`manual_override=${Number(manualOverride).toFixed(3)}`);
    return {
      date: formatDateOnly(date),
      basePrice,
      multiplier,
      pricePerDay: roundPrice(basePrice * multiplier),
      isWeekend: weekend,
      mode: 'MANUAL',
      explanation,
    };
  }

  const demand = getDemandAdjustment(settings);
  const weekendBoost = weekend ? weekendMultiplier : 1;
  if (weekend) {
    explanation.push(`weekend_multiplier=${weekendMultiplier.toFixed(3)}`);
  }
  explanation.push(...demand.explanation);

  const rawMultiplier = weekendBoost * demand.multiplier;
  const multiplier = clamp(rawMultiplier, minMultiplier, maxMultiplier);

  return {
    date: formatDateOnly(date),
    basePrice,
    multiplier,
    pricePerDay: roundPrice(basePrice * multiplier),
    isWeekend: weekend,
    mode: weekend ? 'WEEKEND' : 'AI',
    explanation,
  };
}

export function previewPriceRange(
  settings: PricingSettings,
  startDate: string,
  endDateExclusive: string,
  timeZone: string,
): PricePreview {
  const dates = iterateDateRange(startDate, endDateExclusive).map((date) =>
    calculateNightPrice(settings, date, timeZone),
  );
  const baseTotal = dates.reduce((sum, item) => sum + item.basePrice, 0);
  const totalPrice = dates.reduce((sum, item) => sum + item.pricePerDay, 0);

  return {
    dates,
    nights: dates.length,
    baseTotal,
    totalPrice,
    averagePrice: dates.length ? Math.round(totalPrice / dates.length) : 0,
  };
}
