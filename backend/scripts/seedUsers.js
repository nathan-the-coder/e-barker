import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['driver', 'dispatcher', 'admin'], default: 'driver' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const usersToCreate = [
  { username: 'testadmin', email: 'testadmin@ebarker.local', password: 'Test1234!', name: 'Test Admin', role: 'admin' },
  { username: 'testdispatcher', email: 'testdispatcher@ebarker.local', password: 'Test1234!', name: 'Test Dispatcher', role: 'dispatcher' },
  { username: 'testdriver', email: 'testdriver@ebarker.local', password: 'Test1234!', name: 'Test Driver', role: 'driver' }
];

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (let u of usersToCreate) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`User ${u.email} already exists. Updating password...`);
        existing.password = await bcrypt.hash(u.password, 10);
        await existing.save();
        console.log(`Updated ${u.email}`);
      } else {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await User.create({ ...u, password: hashedPassword });
        console.log(`Created ${u.email}`);
      }
    }
    console.log('User seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedUsers();
