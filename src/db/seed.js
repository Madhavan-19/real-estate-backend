/**
 * Seeds a demo owner account + N random property listings with realistic property details
 * and high-resolution real-estate images.
 *
 * Usage: npm run seed             (defaults to 500 properties)
 *        node src/db/seed.js 50000  (stress-test scale)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { pool } = require('../config/db');

const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata'];
const TYPES = ['apartment', 'villa', 'plot', 'office', 'pg'];
const LOCALITIES = {
  Bengaluru: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Jayanagar', 'JP Nagar', 'Electronic City'],
  Mumbai: ['Bandra West', 'Andheri West', 'Powai', 'Worli', 'Juhu', 'Lower Parel', 'Malad West'],
  Delhi: ['Vasant Kunj', 'Hauz Khas', 'South Extension', 'Dwarka', 'Greater Kailash', 'Saket'],
  Chennai: ['Adyar', 'Anna Nagar', 'Velachery', 'T. Nagar', 'Besant Nagar', 'OMR'],
  Hyderabad: ['Gachibowli', 'Hitec City', 'Jubilee Hills', 'Banjara Hills', 'Kondapur', 'Madhapur'],
  Pune: ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Baner', 'Wakad', 'Hadapsar'],
  Kolkata: ['Salt Lake', 'New Town', 'Ballygunge', 'Alipore', 'Park Street', 'Rajarhat']
};

const REAL_ESTATE_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600573472591-ee6c563aaec9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80'
];

const ALL_AMENITIES = ['Parking', 'Gym', 'Swimming Pool', 'Security', 'Power Backup', 'Clubhouse', 'Balcony', 'Lift', 'Garden', 'Intercom'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randSubArray(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seed() {
  const count = parseInt(process.argv[2], 10) || 500;

  const client = await pool.connect();
  try {
    const email = 'demo.owner@example.com';
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const ownerRes = await client.query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1,$2,$3,$4,'user')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['Demo Owner', email, passwordHash, '9876543210']
    );
    const ownerId = ownerRes.rows[0].id;
    console.log(`Owner ready: ${email} / Password123! (id=${ownerId})`);

    console.log(`Seeding ${count} properties...`);
    const batchSize = 500;
    for (let i = 0; i < count; i += batchSize) {
      const batch = Math.min(batchSize, count - i);
      const values = [];
      const params = [];
      for (let j = 0; j < batch; j++) {
        const idx = i + j;
        const city = rand(CITIES);
        const localityList = LOCALITIES[city] || ['Central'];
        const locality = rand(localityList);
        const type = rand(TYPES);
        const listingType = rand(['sale', 'rent']);
        const bedrooms = type === 'plot' || type === 'office' ? randInt(0, 2) : randInt(1, 5);
        const bathrooms = bedrooms > 0 ? randInt(1, bedrooms + 1) : 1;
        
        let price = listingType === 'rent'
          ? randInt(15, 150) * 1000
          : randInt(25, 600) * 100000;
        
        const areaSqft = randInt(450, 4200);
        const titlePrefixes = ['Luxury', 'Modern', 'Spacious', 'Premium', 'Serene', 'Elegant', 'Contemporary'];
        const title = `${rand(titlePrefixes)} ${bedrooms > 0 ? bedrooms + 'BHK ' : ''}${type.toUpperCase()} in ${locality}, ${city}`;
        const slug = `${slugify(title, { lower: true, strict: true })}-${idx}`;
        
        const img1 = REAL_ESTATE_IMAGES[idx % REAL_ESTATE_IMAGES.length];
        const img2 = REAL_ESTATE_IMAGES[(idx + 3) % REAL_ESTATE_IMAGES.length];
        const images = JSON.stringify([{ url: img1 }, { url: img2 }]);
        
        const amenities = JSON.stringify(randSubArray(ALL_AMENITIES, randInt(3, 7)));

        const description = `Discover this exceptional ${bedrooms > 0 ? bedrooms + ' bedroom ' : ''}${type} situated in the heart of ${locality}, ${city}. Featuring state-of-the-art architecture, prime connectivity to IT parks, top schools, and luxury amenities. Perfect for families and investors alike.`;

        const base = params.length;
        params.push(
          ownerId, title, slug, description, type, listingType, price, city,
          locality, `${randInt(1, 99)}, Sector ${randInt(1, 20)}, ${locality}, ${city}`,
          bedrooms, bathrooms, areaSqft, images, amenities
        );
        values.push(
          `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14},$${base + 15})`
        );
      }
      await client.query(
        `INSERT INTO properties
          (owner_id, title, slug, description, property_type, listing_type, price, city, locality, address, bedrooms, bathrooms, area_sqft, images, amenities)
         VALUES ${values.join(',')}
         ON CONFLICT (slug) DO NOTHING`,
        params
      );
      process.stdout.write(`  seeded ${Math.min(i + batchSize, count)}/${count}\r`);
    }
    console.log(`\nDone. Seeded up to ${count} properties with real-estate imagery.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

