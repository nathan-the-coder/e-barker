import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();
async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/e-barker');
  const db = mongoose.connection.db;
  const queues = await db.collection('queues').find().sort({createdAt:-1}).limit(3).toArray();
  console.log(JSON.stringify(queues, null, 2));
  process.exit(0);
}
run();
