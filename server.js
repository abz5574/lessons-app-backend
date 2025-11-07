// =======================================
// 📘 BACKEND SERVER — Lessons App
// =======================================

// 1️⃣ Dependencies
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { MongoClient } = require('mongodb');

// 2️⃣ Express app setup
const app = express();
app.use(cors());             // Allow frontend (e.g. localhost:5500)
app.use(express.json());     // Parse JSON bodies
app.use(morgan('dev'));      // Log requests in console

// Optional: serve images if you keep them locally in /images
// app.use('/images', express.static('images'));

// 3️⃣ MongoDB connection
const uri =
  process.env.MONGO_URI ||
  "mongodb+srv://abdullahisalah3:daadir22@cluster0.coj6nag.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const dbName = process.env.DB_NAME || "lessons_app";

let db, Lessons, Orders;

async function connectDB() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    Lessons = db.collection('lessons');
    Orders = db.collection('orders');
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}
connectDB();

// =======================================
// ROUTES
// =======================================

// ✅ GET /api/lessons
// Fetch all lessons from the database
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await Lessons.find().toArray();
    res.json(lessons);
  } catch (err) {
    console.error('GET /api/lessons error:', err);
    res.status(500).json({ message: 'Failed to load lessons' });
  }
});

// ✅ POST /api/order
// Save a new order in MongoDB
app.post('/api/order', async (req, res) => {
  try {
    const order = req.body;
    await Orders.insertOne(order);
    res.json({ message: '✅ Order received', order });
  } catch (err) {
    console.error('POST /api/order error:', err);
    res.status(500).json({ message: 'Failed to save order' });
  }
});

// ✅ PUT /api/lessons
// Update remaining spaces for a lesson’s city
app.put('/api/lessons', async (req, res) => {
  try {
    const { subject, city, spaces } = req.body;

    // Validation
    if (!subject || !city || spaces === undefined) {
      return res
        .status(400)
        .json({ message: 'subject, city and spaces are required' });
    }

    const newSpaces = Number(spaces);
    if (!Number.isFinite(newSpaces) || newSpaces < 0) {
      return res
        .status(400)
        .json({ message: 'spaces must be a non-negative number' });
    }

    // Update the document in MongoDB
    const result = await Lessons.updateOne(
      { subject, 'locations.city': city },
      { $set: { 'locations.$.spaces': newSpaces } }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ message: 'Lesson or city not found in database' });
    }

    res.json({ ok: true, subject, city, spaces: newSpaces });
  } catch (err) {
    console.error('PUT /api/lessons error:', err);
    res.status(500).json({ message: 'Failed to update spaces' });
  }
});

// 🧩 Debug route (optional): lists all registered routes
app.get('/__routes', (req, res) => {
  const routes = app._router.stack
    .filter(r => r.route)
    .map(r => ({
      method: Object.keys(r.route.methods)[0].toUpperCase(),
      path: r.route.path
    }));
  res.json(routes);
});

// =======================================
// Server start
// =======================================
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
