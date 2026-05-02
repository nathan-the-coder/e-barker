/**
 * Seed default fare settings into the database.
 * Run once: node backend/scripts/seedSettings.js
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  description: String
}, { timestamps: true });
const Setting = mongoose.model('Setting', settingSchema);

const DEFAULTS = [
  { key: 'base_fare',    value: '15',  description: 'Fixed base fare in PHP per passenger per trip' },
  { key: 'per_km_rate', value: '5',   description: 'Additional fare per kilometer in PHP' },
  { key: 'terminal_fee',value: '10',  description: 'Fee charged to driver per dispatch in PHP' }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const item of DEFAULTS) {
    const existing = await Setting.findOne({ key: item.key });
    if (existing) {
      console.log(`  ⏭  Skipping "${item.key}" (already exists: ${existing.value})`);
    } else {
      await Setting.create(item);
      console.log(`  ✅ Created "${item.key}" = ${item.value || '(empty)'}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nSeed complete!');
}

seed().catch(err => { console.error(err); process.exit(1); });
