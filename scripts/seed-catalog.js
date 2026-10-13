require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const resolveMongoUri = () => {
  const production = process.env.SEED_TARGET === 'production' || process.env.NODE_ENV === 'production';
  const uri = production
    ? (process.env.MONGO_PROD || process.env.MONGO_URL_PROD || process.env.MONGO_URL)
    : (process.env.MONGO_DEV || process.env.MONGO_URL || process.env.MONGO_PROD || process.env.MONGO_URL_PROD);
  if (!uri) throw new Error('MongoDB URI is missing');
  return uri.replace(/\.net\/\//, '.net/');
};

const imageSets = {
  VILLA: [
    'photo-1601918774946-25832a4be0d6', 'photo-1600607687920-4e2a09cf159d',
    'photo-1613490493576-7fde63acd811', 'photo-1600607688969-a5bfcd646154',
    'photo-1600047509807-ba8f99d2cdde', 'photo-1510798831971-661eb04b3739',
  ],
  HOTEL: [
    'photo-1566073771259-6a8506099945', 'photo-1551882547-ff40c63fe5fa',
    'photo-1564501049412-61c2a3083791', 'photo-1582719478250-c89cae4dc85b',
    'photo-1556742049-0cfed4f6a45d', 'photo-1590490360182-c33d57733427',
  ],
  SANATORIUM: [
    'photo-1544161515-4ab6ce6db874', 'photo-1540555700478-4be289fbecef',
    'photo-1600334089648-b0d9d3028eb2', 'photo-1506126613408-eca07ce68773',
    'photo-1571019613454-1cb2f99b2d8b', 'photo-1552693673-1bf958ಿಗf2d',
  ],
  APARTMENT: [
    'photo-1522708323590-d24dbb6b0267', 'photo-1493809842364-78817add7ffb',
    'photo-1502672023488-70e25813eb80', 'photo-1560185008-b033106af5c3',
    'photo-1484154218962-a197022b5858', 'photo-1524758631624-e2822e304c36',
  ],
  RESORT: [
    'photo-1498503182468-3b51cbb6cb24', 'photo-1571896349842-33c89424de2d',
    'photo-1507525428034-b723cf961d3e', 'photo-1540541338287-41700207dee6',
    'photo-1573843981267-be1999ff37cd', 'photo-1602002418082-a4443e081dd1',
  ],
};

imageSets.SANATORIUM[5] = 'photo-1552693673-1bf958a0f5e2';

const locationInfo = {
  TASHKENT: { city: 'Toshkent', lat: 41.3111, lng: 69.2797 },
  SAMARKAND: { city: 'Samarqand', lat: 39.6542, lng: 66.9597 },
  BUKHARA: { city: 'Buxoro', lat: 39.7747, lng: 64.4286 },
  KHIVA: { city: 'Xiva', lat: 41.3775, lng: 60.3639 },
  CHORVOQ: { city: 'Chorvoq', lat: 41.6297, lng: 70.0847 },
  BOSTONLIQ: { city: 'Bo‘stonliq', lat: 41.5722, lng: 69.9407 },
  ZAAMIN: { city: 'Zomin', lat: 39.9606, lng: 68.3957 },
  CHIMGAN: { city: 'Chimyon', lat: 41.5167, lng: 70.0167 },
  CHODAK: { city: 'Chodak', lat: 41.4, lng: 70.95 },
  BALI: { city: 'Bali', lat: -8.4095, lng: 115.1889 },
};

const catalog = {
  VILLA: [
    'Chimyon Panorama Villa', 'Zomin Cedar Retreat', 'Chorvoq Lake House', 'Beldersoy Alpine Villa',
    'Amirsoy Sky Lodge', 'Boysun Stone Villa', 'Sarmishsoy Garden Villa', 'Yangiabad Forest House',
    'Kumushkon Valley Villa', 'Chodak River Villa', 'Nurota Desert Villa', 'Shahrisabz Orchard House',
    'Qo‘qon Heritage Villa', 'Farg‘ona Garden Villa', 'Samarqand Courtyard Villa', 'Buxoro Old Town Residence',
    'Xiva Oasis Villa', 'Toshkent Hills Villa', 'Parkent Vineyard Villa', 'Chorvoq Sunset Villa',
  ],
  HOTEL: [
    'Silk Road Grand Hotel', 'Registan Garden Hotel', 'Ark Boulevard Hotel', 'Khiva Ichan Kala Hotel',
    'Tashkent City View Hotel', 'Chorvoq Mountain Hotel', 'Zomin Pine Hotel', 'Samarkand Heritage Hotel',
    'Bukhara Caravan Hotel', 'Amirsoy Alpine Hotel', 'Chimyon Springs Hotel', 'Navoi Avenue Hotel',
    'Samarqand Plaza Hotel', 'Old Town Courtyard Hotel', 'Blue Dome Boutique Hotel', 'Mirzo Ulugbek Hotel',
    'Zarafshan Riverside Hotel', 'Orient Star Hotel', 'Lazizbek Residence Hotel', 'Oqtepa Grand Hotel',
  ],
  SANATORIUM: [
    'Chimyon Mineral Health Resort', 'Zomin Pine Wellness Sanatorium', 'Chorvoq Healing Springs', 'Sitorai Wellness Center',
    'Bukhara Thermal Care', 'Samarkand Balance Sanatorium', 'Tashkent Aqua Therapy Center', 'Farg‘ona Valley Health House',
    'Oltinsoy Rehabilitation Resort', 'Nurota Calm Retreat', 'Mountain Air Treatment Center', 'Navbahor Wellness Sanatorium',
    'Sog‘lom Hayot Medical Resort', 'Zarafshan Mineral Spa', 'Oromgoh Health Residence', 'Shifo Springs Sanatorium',
    'Bunyodkor Wellness House', 'Yangi O‘zbekiston Recovery Center', 'Mehribon Care Resort', 'Oq Bulok Sanatorium',
  ],
  APARTMENT: [
    'Tashkent City Center Apartment', 'Samarqand Registon Apartment', 'Bukhara Old Town Apartment', 'Khiva Courtyard Apartment',
    'Chorvoq Family Apartment', 'Yunusobod Modern Apartment', 'Mirabad Park Apartment', 'Chilonzor Comfort Apartment',
    'Sergeli Garden Apartment', 'Shota Rustaveli Apartment', 'Amir Temur Avenue Apartment', 'Sebzor Heritage Apartment',
    'Samarqand Boulevard Apartment', 'Bukhara Lyabi House Apartment', 'Khiva Ichan Kala Apartment', 'Qorasuv Family Apartment',
    'Olmazor Sunrise Apartment', 'Yashnobod Business Apartment', 'Childuxtaron Apartment', 'Minor Residence Apartment',
  ],
  RESORT: [
    'Chorvoq Lakeside Resort', 'Amirsoy Mountain Resort', 'Zomin National Park Resort', 'Beldersoy Valley Resort',
    'Chimyon Forest Resort', 'Sarmishsoy Nature Resort', 'Charvak Blue Water Resort', 'Kumushkon Family Resort',
    'Yangiabad Adventure Resort', 'Chodak Riverside Resort', 'Aydarkul Desert Resort', 'Zaamin Eco Resort',
    'Boysun Heritage Resort', 'Pskem Valley Resort', 'Toshkent Hills Resort', 'Samarkand Silk Road Resort',
    'Bukhara Oasis Resort', 'Khiva Caravan Resort', 'Parkent Vineyard Resort', 'Oqsoy Panorama Resort',
  ],
};

const locationsByType = {
  VILLA: ['CHIMGAN', 'ZAAMIN', 'CHORVOQ', 'BOSTONLIQ', 'CHODAK', 'TASHKENT', 'SAMARKAND', 'BUKHARA'],
  HOTEL: ['TASHKENT', 'SAMARKAND', 'BUKHARA', 'KHIVA', 'CHORVOQ', 'ZAAMIN'],
  SANATORIUM: ['CHIMGAN', 'ZAAMIN', 'CHORVOQ', 'TASHKENT', 'SAMARKAND', 'BUKHARA'],
  APARTMENT: ['TASHKENT', 'SAMARKAND', 'BUKHARA', 'KHIVA', 'CHORVOQ'],
  RESORT: ['CHORVOQ', 'BOSTONLIQ', 'ZAAMIN', 'CHIMGAN', 'CHODAK', 'BALI'],
};

const amenitiesByType = {
  VILLA: ['WIFI', 'PARKING', 'KITCHEN', 'BBQ', 'POOL', 'MOUNTAIN_VIEW'],
  HOTEL: ['WIFI', 'PARKING', 'RESTAURANT', 'BREAKFAST', 'AC', 'ROOM_SERVICE'],
  SANATORIUM: ['WIFI', 'SPA', 'POOL', 'RESTAURANT', 'GYM', 'MEDICAL_CENTER'],
  APARTMENT: ['WIFI', 'KITCHEN', 'WASHING_MACHINE', 'AC', 'ELEVATOR', 'PARKING'],
  RESORT: ['WIFI', 'POOL', 'RESTAURANT', 'PARKING', 'SAUNA', 'NATURE_VIEW'],
};

const money = (type, index) => {
  const ranges = { VILLA: 850000, HOTEL: 520000, SANATORIUM: 680000, APARTMENT: 430000, RESORT: 950000 };
  const steps = { VILLA: 95000, HOTEL: 65000, SANATORIUM: 80000, APARTMENT: 55000, RESORT: 110000 };
  return ranges[type] + (index % 10) * steps[type] + Math.floor(index / 10) * 125000;
};

const imageUrl = (type, index, imageIndex) => {
  const imageIndexInType = (index + imageIndex) % 10;
  return `/uploads/property/${type.toLowerCase()}${imageIndexInType + 1}.jpg`;
};

function propertyDocument(type, title, index, memberId) {
  const location = locationsByType[type][index % locationsByType[type].length];
  const info = locationInfo[location];
  const price = money(type, index);
  const roomCount = type === 'HOTEL' || type === 'SANATORIUM' ? 18 + (index % 18) : type === 'APARTMENT' ? 2 : 3 + (index % 4);
  const beds = type === 'HOTEL' || type === 'SANATORIUM' ? 1 + (index % 2) : type === 'APARTMENT' ? 2 + (index % 2) : 4 + (index % 5);
  const titleLocation = info.city;
  return {
    catalogKey: `roomi-catalog-v1-${type.toLowerCase()}-${index + 1}`,
    propertyType: type,
    propertyStatus: 'ACTIVE',
    bookingMode: type === 'VILLA' || type === 'RESORT' ? (index % 4 === 0 ? 'REQUEST' : 'INSTANT') : 'INSTANT',
    currency: 'UZS',
    propertyLocation: location,
    propertyAddress: `${titleLocation}, ${index + 4}-uy, ${type === 'HOTEL' ? 'Markaziy ko‘cha' : 'Tinch hudud'}`,
    propertyTitle: title,
    propertyPrice: price,
    dynamicPricingEnabled: true,
    weekendMultiplier: 1.15 + (index % 4) * 0.03,
    minMultiplier: 0.85,
    maxMultiplier: 1.65,
    propertySquare: type === 'APARTMENT' ? 55 + (index % 7) * 8 : 110 + (index % 8) * 18,
    propertyBeds: beds,
    maxGuests: type === 'HOTEL' || type === 'SANATORIUM' ? 2 + (index % 2) : type === 'APARTMENT' ? 3 + (index % 2) : 5 + (index % 5),
    bedrooms: type === 'HOTEL' || type === 'SANATORIUM' ? 1 : type === 'APARTMENT' ? 1 + (index % 2) : 2 + (index % 3),
    beds,
    bathrooms: type === 'HOTEL' || type === 'SANATORIUM' ? 1 : 1 + (index % 2),
    infantsAllowed: true,
    petsAllowed: type === 'VILLA' || type === 'RESORT' ? index % 3 !== 0 : false,
    propertyRooms: roomCount,
    propertyAmenities: amenitiesByType[type],
    propertyCoordinates: { lat: info.lat + ((index % 5) - 2) * 0.002, lng: info.lng + ((index % 7) - 3) * 0.002 },
    timezone: 'Asia/Tashkent',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    minNights: type === 'SANATORIUM' ? 3 : 1,
    maxNights: type === 'SANATORIUM' ? 21 : 30,
    advanceNoticeHours: type === 'SANATORIUM' ? 24 : 4,
    preparationTimeHours: type === 'VILLA' || type === 'RESORT' ? 3 : 1,
    houseRules: ['Chekish taqiqlanadi', 'Tinchlik vaqti 23:00 dan keyin'],
    cancellationPolicy: index % 3 === 0 ? 'FLEXIBLE' : index % 3 === 1 ? 'MODERATE' : 'FIRM',
    cleaningFee: type === 'HOTEL' || type === 'SANATORIUM' ? 0 : Math.round(price * 0.08),
    petFee: type === 'VILLA' || type === 'RESORT' ? 70000 : 0,
    extraGuestFee: type === 'HOTEL' || type === 'SANATORIUM' ? 90000 : 120000,
    propertyViews: 180 + index * 47,
    propertyLikes: 20 + index * 3,
    propertyComments: 8 + index * 2,
    propertyRank: Number((4.45 + (index % 6) * 0.08).toFixed(2)),
    propertyRatingCount: 12 + index * 4,
    propertyImages: Array.from({ length: 5 + (index % 3) }, (_, imageIndex) => imageUrl(type, index, imageIndex)),
    propertyDesc: `${titleLocation} hududidagi qulay ${type === 'HOTEL' ? 'mehmonxona' : type === 'SANATORIUM' ? 'sog‘lomlashtirish maskani' : type === 'APARTMENT' ? 'kvartira' : type === 'RESORT' ? 'dam olish maskani' : 'villa'}. Oilaviy dam olish, xizmat sifati va qulay joylashuv bir joyda.`,
    propertyRent: false,
    memberId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function unitsFor(type, property, index) {
  const base = property.propertyPrice;
  if (type === 'HOTEL') {
    return [
      { code: 'STANDARD', name: 'Standard xona', unitType: 'ROOM_TYPE', inventoryCount: 8 + (index % 10), basePrice: base, maxGuests: 2, includedGuests: 2 },
      { code: 'DELUXE', name: 'Deluxe xona', unitType: 'ROOM_TYPE', inventoryCount: 3 + (index % 5), basePrice: Math.round(base * 1.35), maxGuests: 3, includedGuests: 2 },
    ].map((unit) => ({ ...unit, rateModel: 'UNIT_NIGHT' }));
  }
  if (type === 'SANATORIUM') {
    return [
      { code: 'HEALTH', name: 'Sog‘lomlashtirish xonasi', unitType: 'ROOM_TYPE', inventoryCount: 8 + (index % 8), basePrice: base, maxGuests: 2, includedGuests: 1, rateModel: 'PERSON_NIGHT' },
      { code: 'PACKAGE7', name: '7 kunlik davolanish paketi', unitType: 'ROOM_TYPE', inventoryCount: 4 + (index % 4), basePrice: Math.round(base * 6.5), maxGuests: 2, includedGuests: 1, rateModel: 'PACKAGE', packageNights: 7, packagePerPerson: true },
    ];
  }
  if (type === 'RESORT') {
    return [
      { code: 'FAMILY-CABIN', name: 'Family cabin', unitType: 'CABIN', inventoryCount: 3 + (index % 3), basePrice: base, maxGuests: property.maxGuests, includedGuests: property.maxGuests, rateModel: 'UNIT_NIGHT' },
      { code: 'PREMIUM-CABIN', name: 'Premium cabin', unitType: 'CABIN', inventoryCount: 1, basePrice: Math.round(base * 1.45), maxGuests: property.maxGuests + 2, includedGuests: property.maxGuests, rateModel: 'UNIT_NIGHT' },
    ];
  }
  return [{
    code: 'ENTIRE-HOME',
    name: type === 'APARTMENT' ? 'Entire apartment' : 'Entire villa',
    unitType: 'ENTIRE_UNIT',
    inventoryCount: 1,
    basePrice: base,
    maxGuests: property.maxGuests,
    includedGuests: property.maxGuests,
    rateModel: 'UNIT_NIGHT',
  }];
}

async function main() {
  await mongoose.connect(resolveMongoUri());
  const db = mongoose.connection.db;
  const members = db.collection('members');
  const properties = db.collection('properties');
  const units = db.collection('bookable_units');
  const catalogHostNick = 'roomi.catalog.host';
  let host = await members.findOne({ memberNick: catalogHostNick });
  if (!host) {
    // Seed listings always use a dedicated technical owner. It is not exposed
    // as a login account and its password value is intentionally not a hash.
    const seedHost = {
      memberType: 'AGENT',
      memberStatus: 'ACTIVE',
      memberAuthType: 'PHONE',
      memberPhone: '+998000000001',
      memberNick: catalogHostNick,
      memberPassword: 'catalog-seed-only',
      memberFullName: 'ROOMi Catalog',
      memberVerified: true,
      memberImage: '',
      memberProperties: 0,
      memberArticles: 0,
      memberBookings: 0,
      memberPoints: 0,
      memberLikes: 0,
      memberViews: 0,
      memberComments: 0,
      memberRank: 0,
      memberWarnings: 0,
      memberBlocks: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await members.updateOne(
      { memberNick: seedHost.memberNick },
      { $setOnInsert: seedHost },
      { upsert: true },
    );
    host = await members.findOne({ memberNick: seedHost.memberNick });
  }

  const report = {};
  let repairedOwners = 0;
  for (const [type, titles] of Object.entries(catalog)) {
    let inserted = 0;
    for (let index = 0; index < titles.length; index += 1) {
      const key = `roomi-catalog-v1-${type.toLowerCase()}-${index + 1}`;
      const existing = await properties.findOne({ catalogKey: key });
      let property = existing;
      if (!property) {
        const document = propertyDocument(type, titles[index], index, host._id);
        const result = await properties.insertOne(document);
        property = { ...document, _id: result.insertedId };
        inserted += 1;
      } else if (String(property.memberId) !== String(host._id)) {
        await properties.updateOne(
          { _id: property._id },
          { $set: { memberId: host._id, updatedAt: new Date() } },
        );
        property = { ...property, memberId: host._id };
        repairedOwners += 1;
      }

      for (const unit of unitsFor(type, property, index)) {
        await units.updateOne(
          { propertyId: property._id, code: unit.code },
          {
            $setOnInsert: {
              ...unit,
              propertyId: property._id,
              bookingMode: property.bookingMode,
              cleaningFee: property.cleaningFee || 0,
              petFee: property.petFee || 0,
              extraGuestFee: property.extraGuestFee || 0,
              petsAllowed: property.petsAllowed === true,
              infantsAllowed: property.infantsAllowed !== false,
              amenities: property.propertyAmenities || [],
              status: 'ACTIVE',
              packageNights: unit.packageNights || 1,
              packagePerPerson: unit.packagePerPerson === true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
      }
    }
    report[type] = { requested: titles.length, inserted };
  }

  const catalogPropertyCount = await properties.countDocuments({
    catalogKey: { $regex: '^roomi-catalog-v1-' },
  });
  await members.updateOne(
    { _id: host._id },
    {
      $set: {
        memberType: 'AGENT',
        memberStatus: 'ACTIVE',
        memberProperties: catalogPropertyCount,
        updatedAt: new Date(),
      },
    },
  );

  const totals = await properties.aggregate([
    { $match: { catalogKey: { $regex: '^roomi-catalog-v1-' } } },
    { $group: { _id: '$propertyType', total: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  console.log(JSON.stringify({ hostId: String(host._id), repairedOwners, report, totals }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
