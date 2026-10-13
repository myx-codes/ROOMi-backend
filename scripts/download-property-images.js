require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const https = require('https');
const mongoose = require('mongoose');

const uploadDir = path.join(__dirname, '..', 'uploads', 'property');
const imageSets = {
  VILLA: [
    'photo-1601918774946-25832a4be0d6',
    'photo-1600607687920-4e2a09cf159d',
    'photo-1613490493576-7fde63acd811',
    'photo-1600607688969-a5bfcd646154',
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1510798831971-661eb04b3739',
    'photo-1600566753190-17f0baa2a6c3',
    'photo-1600585154340-be6161a56a0c',
    'photo-1600585154526-990dced4db0d',
    'photo-1600566753086-00f18fb6b3ea',
  ],
  HOTEL: [
    'photo-1566073771259-6a8506099945',
    'photo-1551882547-ff40c63fe5fa',
    'photo-1564501049412-61c2a3083791',
    'photo-1582719478250-c89cae4dc85b',
    'photo-1556742049-0cfed4f6a45d',
    'photo-1590490360182-c33d57733427',
    'photo-1542314831-068cd1dbfeeb',
    'photo-1445019980597-93fa8acb246c',
    'photo-1566665797739-1674de7a421a',
    'photo-1578683010236-d716f9a3f461',
  ],
  SANATORIUM: [
    'photo-1544161515-4ab6ce6db874',
    'photo-1540555700478-4be289fbecef',
    'photo-1600334089648-b0d9d3028eb2',
    'photo-1506126613408-eca07ce68773',
    'photo-1571019613454-1cb2f99b2d8b',
    'photo-1519823551278-64ac92734fb1',
    'photo-1515377905703-c4788e51af15',
    'photo-1596178065887-1198b6148b2b',
    'photo-1583416750470-965b2707b355',
    'photo-1570172619644-dfd03ed5d881',
  ],
  APARTMENT: [
    'photo-1522708323590-d24dbb6b0267',
    'photo-1493809842364-78817add7ffb',
    'photo-1502672023488-70e25813eb80',
    'photo-1560185008-b033106af5c3',
    'photo-1484154218962-a197022b5858',
    'photo-1524758631624-e2822e304c36',
    'photo-1505693416388-ac5ce068fe85',
    'photo-1600210492486-724fe5c67fb0',
    'photo-1554995207-c18c203602cb',
    'photo-1618220179428-22790b461013',
  ],
  RESORT: [
    'photo-1498503182468-3b51cbb6cb24',
    'photo-1571896349842-33c89424de2d',
    'photo-1507525428034-b723cf961d3e',
    'photo-1540541338287-41700207dee6',
    'photo-1573843981267-be1999ff37cd',
    'photo-1602002418082-a4443e081dd1',
    'photo-1500534623283-312aade485b7',
    'photo-1470770841072-f978cf4d019e',
    'photo-1448375240586-882707db888b',
    'photo-1464822759023-fed622ff2c3b',
  ],
};

function resolveMongoUri() {
  const uri = process.env.MONGO_DEV || process.env.MONGO_URL || process.env.MONGO_PROD || process.env.MONGO_URL_PROD;
  if (!uri) throw new Error('MongoDB URI is missing');
  return uri.replace(/\.net\/\//, '.net/');
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(response.headers.location).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`${response.statusCode} ${url}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

function localImagePath(type, index) {
  return `/uploads/property/${type.toLowerCase()}${index + 1}.jpg`;
}

async function main() {
  fs.mkdirSync(uploadDir, { recursive: true });
  const downloaded = {};

  for (const [type, ids] of Object.entries(imageSets)) {
    downloaded[type] = 0;
    for (let index = 0; index < ids.length; index += 1) {
      const fileName = `${type.toLowerCase()}${index + 1}.jpg`;
      const filePath = path.join(uploadDir, fileName);
      const url = `https://images.unsplash.com/${ids[index]}?auto=format&fit=crop&w=1600&q=86`;
      const image = await download(url);
      fs.writeFileSync(filePath, image);
      downloaded[type] += 1;
    }
  }

  await mongoose.connect(resolveMongoUri());
  const properties = mongoose.connection.db.collection('properties');
  const all = await properties.find({ propertyType: { $in: Object.keys(imageSets) } }).sort({ propertyType: 1, _id: 1 }).toArray();
  const counters = new Map(Object.keys(imageSets).map((type) => [type, 0]));
  let updated = 0;
  for (const property of all) {
    const type = String(property.propertyType);
    const propertyIndex = counters.get(type) || 0;
    counters.set(type, propertyIndex + 1);
    const imageCount = 5 + (propertyIndex % 3);
    const images = Array.from({ length: imageCount }, (_, slot) => {
      const imageIndex = (propertyIndex * 3 + slot) % imageSets[type].length;
      return localImagePath(type, imageIndex);
    });
    await properties.updateOne({ _id: property._id }, { $set: { propertyImages: images, updatedAt: new Date() } });
    updated += 1;
  }

  console.log(JSON.stringify({ downloaded, propertiesUpdated: updated, imagesPerProperty: '5-7', directory: uploadDir }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
