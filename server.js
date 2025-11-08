// =======================================
// 📘 BACKEND SERVER — Lessons App
// =======================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { MongoClient } = require('mongodb');

const app = express();

// --- Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// --- Quick health & home routes (exist even if DB is down)
app.get('/', (_req, res) => {
  res.status(200).send('📘 Lessons API — try GET /health or /api/lessons');
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, status: 'healthy', time: new Date().toISOString() });
});

// --- Safe route lister (won’t crash if _router is missing)
app.get('/__routes', (req, res) => {
  const stack = (app._router && Array.isArray(app._router.stack)) ? app._router.stack : [];
  const routes = stack
    .filter(r => r.route && r.route.path)
    .map(r => ({
      method: Object.keys(r.route.methods)[0]?.toUpperCase() || 'GET',
      path: r.route.path
    }));
  res.json(routes);
});

// --- MongoDB setup
const uri = process.env.MONGO_URI ||
  'mongodb+srv://abdullahisalah3:daadir22@cluster0.coj6nag.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = process.env.DB_NAME || 'lessons_app';

let db, Lessons, Orders;

async function connectDB() {
  const client = new MongoClient(uri, {
    // Render/Atlas play nicely with defaults; keep TLS on
  });
  await client.connect();
  db = client.db(dbName);
  Lessons = db.collection('lessons');
  Orders = db.collection('orders');
  console.log('✅ Connected to MongoDB Atlas');
}

// --- API
app.get('/api/lessons', async (_req, res) => {
  try {
    if (!Lessons) throw new Error('DB not ready');
    const lessons = await Lessons.find().toArray();
    res.json(lessons);
  } catch (err) {
    console.error('GET /api/lessons error:', err.message);
    res.status(500).json({ message: 'Failed to load lessons' });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    if (!Orders) throw new Error('DB not ready');
    const { name, phone, items, total } = req.body;

    if (!/^[a-zA-Z ]+$/.test(name || '')) return res.status(400).json({ message: 'Invalid name format' });
    if (!/^[0-9]+$/.test(phone || '')) return res.status(400).json({ message: 'Invalid phone format' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Order must contain items' });
    if (!Number.isFinite(Number(total))) return res.status(400).json({ message: 'Invalid total' });

    const order = { name: name.trim(), phone: phone.trim(), items, total: Number(total), createdAt: new Date() };
    await Orders.insertOne(order);
    res.json({ message: '✅ Order received', order });
  } catch (err) {
    console.error('POST /api/order error:', err.message);
    res.status(500).json({ message: 'Failed to save order' });
  }
});

app.put('/api/lessons', async (req, res) => {
  try {
    if (!Lessons) throw new Error('DB not ready');
    const { subject, city, spaces } = req.body;
    if (!subject || !city || spaces === undefined) {
      return res.status(400).json({ message: 'subject, city, and spaces are required' });
    }
    const newSpaces = Number(spaces);
    if (!Number.isFinite(newSpaces) || newSpaces < 0) {
      return res.status(400).json({ message: 'spaces must be a non-negative number' });
    }

    const result = await Lessons.updateOne(
      { subject, 'locations.city': city },
      { $set: { 'locations.$.spaces': newSpaces } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ message: 'Lesson or city not found' });

    res.json({ ok: true, subject, city, spaces: newSpaces });
  } catch (err) {
    console.error('PUT /api/lessons error:', err.message);
    res.status(500).json({ message: 'Failed to update spaces' });
  }
});

// --- Start
const port = process.env.PORT || 3000;
(async () => {
  try {
    // Start server immediately so / and /health work,
    // then connect DB in the background.
    app.listen(port, () => console.log(`✅ Server running on http://localhost:${port}`));
    await connectDB();
  } catch (err) {
    console.error('❌ DB connect failed:', err);
    // Keep server up so health checks don’t 404
  }
})();
