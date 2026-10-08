require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const libraryRoutes = require('./routes/libraries');
const chatRoutes = require('./routes/chat');

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5174';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/libraries', libraryRoutes);
app.use('/api', chatRoutes); // exposes /api/libraries/:id/conversations and /api/conversations/:id/messages

app.get('/api/health', (req, res) => res.json({ ok: true }));

// In production (e.g. deployed on Render), this server also serves the
// built React app, so the whole thing is one deployable service. Locally,
// client/dist won't exist (you run `npm run dev` for the client instead),
// so this block is simply skipped.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`DocuMind API running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your-')) {
    console.warn('⚠️  GEMINI_API_KEY is not set - chat requests will fail.');
  }
  if (!process.env.VOYAGE_API_KEY || process.env.VOYAGE_API_KEY.includes('your-')) {
    console.warn('⚠️  VOYAGE_API_KEY is not set - document uploads will fail.');
  }
});
