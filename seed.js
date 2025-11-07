require('dotenv').config();
const { MongoClient } = require('mongodb');
const lessons = require('./data/lessons.json');

const uri = process.env.MONGO_URI || "mongodb+srv://abdullahisalah3:daadir22@cluster0.coj6nag.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.DB_NAME || "lessons_app";

async function run() {
      console.log('🚀 Starting seed script...');

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('lessons');

    // Clear old lessons
    await collection.deleteMany({});
    console.log('🧹 Old lessons removed.');

    // Add your new lessons
    await collection.insertMany(lessons);
    console.log(`✅ ${lessons.length} lessons uploaded to MongoDB!`);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
  } finally {
    await client.close();
  }
}

run();
