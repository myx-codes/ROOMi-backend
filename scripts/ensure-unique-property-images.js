require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function resolveMongoUri() {
  const uri = process.env.MONGO_DEV || process.env.MONGO_URL || process.env.MONGO_PROD || process.env.MONGO_URL_PROD;
  if (!uri) throw new Error('MongoDB URI is missing');
  return uri.replace(/\.net\/\//, '.net/');
}

const uploadDir = path.join(__dirname, '..', 'uploads', 'property');

function imageUrl(property, propertyIndex, slot) {
  const type = String(property.propertyType || 'stay').toLowerCase();
  const imageIndex = (propertyIndex * 3 + slot) % 10;
  return `/uploads/property/${type}${imageIndex + 1}.jpg`;
}

function duplicateSlots(properties) {
  let duplicates = 0;
  for (const property of properties) {
    const images = property.propertyImages || [];
    duplicates += images.length - new Set(images).size;
  }
  return duplicates;
}

function invalidLocalImages(properties) {
  let invalid = 0;
  for (const property of properties) {
    for (const image of property.propertyImages || []) {
      if (!/^\/uploads\/property\/(villa|hotel|sanatorium|apartment|resort)\d+\.jpg$/.test(image)) {
        invalid += 1;
        continue;
      }
      if (!fs.existsSync(path.join(__dirname, '..', image.replace(/^\//, '')))) invalid += 1;
    }
  }
  return invalid;
}

async function main() {
  await mongoose.connect(resolveMongoUri());
  const properties = mongoose.connection.db.collection('properties');
  const all = await properties.find({}).project({ _id: 1, propertyType: 1, propertyImages: 1 }).sort({ propertyType: 1, _id: 1 }).toArray();
  const counters = new Map();

  let updated = 0;
  for (const property of all) {
    const propertyIndex = counters.get(property.propertyType) || 0;
    counters.set(property.propertyType, propertyIndex + 1);
    const imageCount = 5 + (propertyIndex % 3);
    const nextImages = Array.from({ length: imageCount }, (_, slot) => imageUrl(property, propertyIndex, slot));
    const currentImages = property.propertyImages || [];
    if (currentImages.length !== nextImages.length || currentImages.some((image, index) => image !== nextImages[index])) {
      await properties.updateOne({ _id: property._id }, { $set: { propertyImages: nextImages, updatedAt: new Date() } });
      updated += 1;
    }
  }

  const afterProperties = await properties.find({}).project({ _id: 1, propertyType: 1, propertyImages: 1 }).sort({ propertyType: 1, _id: 1 }).toArray();
  console.log(JSON.stringify({
    properties: all.length,
    updated,
    duplicateSlotsWithinProperty: duplicateSlots(afterProperties),
    invalidLocalImages: invalidLocalImages(afterProperties),
    imagesPerProperty: '5-7',
    directory: uploadDir,
  }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
