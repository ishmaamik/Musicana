import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Sentiment from 'sentiment';
import Tesseract from 'tesseract.js';
import { PrismaClient } from '@prisma/client';
import YTMusic from 'ytmusic-api';

const sentimentAnalyzer = new Sentiment();
const prisma = new PrismaClient();
const ytmusic = new YTMusic();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 4001;

// Initialize YouTube Music API
try {
  await ytmusic.initialize();
  console.log('✅ YouTube Music API initialized');
} catch (err) {
  console.error('⚠️ YouTube Music initialization warning:', err.message);
}

app.use(cors());
app.use(express.json());

// ----- Helper Functions -----

function scoreToMood(comparative) {
  if (comparative > 2) return 'joyful';
  if (comparative > 0) return 'uplifting';
  if (comparative === 0) return 'calm';
  if (comparative > -2) return 'melancholic';
  return 'somber';
}

const moodToQueries = {
  joyful: [
    'Happy Pharrell Williams',
    'Good Life Kanye West T-Pain',
    'On Top of the World Imagine Dragons'
  ],
  uplifting: [
    'Stronger Kanye West',
    'Rise Katy Perry',
    'Shake It Off Taylor Swift'
  ],
  calm: [
    'Holocene Bon Iver',
    'Bloom The Paper Kites',
    'River Leon Bridges'
  ],
  melancholic: [
    'The Night We Met Lord Huron',
    'Skinny Love Bon Iver',
    'Fix You Coldplay'
  ],
  somber: [
    'Hurt Johnny Cash',
    'Creep Radiohead',
    'Black Adele'
  ],
};

// Reusable: fetch up to 10 unique songs from YTMusic results
function getUniqueSongs(results) {
  const uniqueMap = new Map();
  for (const song of results) {
    const videoId = song.videoId;
    if (!uniqueMap.has(videoId)) {
      uniqueMap.set(videoId, {
        title: song.name,
        artist: song.artist?.name || 'Unknown',
        videoId,
        url: `https://music.youtube.com/watch?v=${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      });
    }
    if (uniqueMap.size >= 10) break;
  }
  return Array.from(uniqueMap.values());
}

// ----- Routes -----

// OCR Endpoint
app.post('/api/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const result = await Tesseract.recognize(req.file.buffer, 'eng', { logger: () => {} });
    const text = result.data?.text?.trim() || '';
    res.json({ text });
  } catch (err) {
    console.error('OCR error:', err.message);
    res.status(500).json({ error: 'OCR failed' });
  }
});

// Sentiment Analysis Endpoint
app.post('/api/sentiment', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Text is required' });

    const s = sentimentAnalyzer.analyze(text);
    const mood = scoreToMood(s.comparative);

    const analysis = await prisma.analysis.create({
      data: {
        text,
        sentiment: s.score > 0 ? 'positive' : s.score < 0 ? 'negative' : 'neutral',
        mood,
      },
    });

    res.json({ score: s.score, comparative: s.comparative, mood, analysisId: analysis.id });
  } catch (err) {
    console.error('Sentiment error:', err.message);
    res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});

// YouTube Music Recommendation
app.get('/api/recommendations', async (req, res) => {
  try {
    const mood = (req.query.mood || 'calm').toString();
    const queries = moodToQueries[mood] || moodToQueries['calm'];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const results = await ytmusic.searchSongs(query);
console.log(JSON.stringify(results, null, 2));
    if (!results || results.length === 0) return res.status(404).json({ error: 'No songs found' });

    const songs = getUniqueSongs(results);

    // Save first song to DB
    await prisma.recommendation.create({
      data: {
        mood,
        query,
        title: songs[0]?.title || null,
        artist: songs[0]?.artist || null,
        url: songs[0]?.url || null,
      },
    });

    res.json({ mood, query, songs });
  } catch (err) {
    console.error('Recommendation error:', err.message);
    res.status(500).json({ error: 'Recommendation failed' });
  }
});

// Combined: Analyze Document + Recommend Music
app.post('/api/analyze-document', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const ocr = await Tesseract.recognize(req.file.buffer, 'eng', { logger: () => {} });
    const text = ocr.data?.text?.trim() || '';
    if (!text) return res.status(400).json({ error: 'No text extracted from image' });

    const s = sentimentAnalyzer.analyze(text);
    const mood = scoreToMood(s.comparative);

    const queries = moodToQueries[mood] || moodToQueries['calm'];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const results = await ytmusic.searchSongs(query);
    console.log(JSON.stringify(results, null, 2));
    if (!results || results.length === 0) return res.status(404).json({ error: 'No songs found' });

    const songs = getUniqueSongs(results);

    const analysis = await prisma.analysis.create({
      data: {
        text,
        sentiment: s.score > 0 ? 'positive' : s.score < 0 ? 'negative' : 'neutral',
        mood,
        recommendations: {
          create: songs.map(song => ({
            mood,
            query,
            title: song.title,
            artist: song.artist,
            url: song.url,
          })),
        },
      },
      include: { recommendations: true },
    });

    res.json({ text, score: s.score, mood, recommendations: songs });
  } catch (err) {
    console.error('Analyze document error:', err.message);
    res.status(500).json({ error: 'Analyze document failed' });
  }
});

// Health Check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Start Server
app.listen(PORT, () => {
  console.log(`Musicana server running on http://localhost:${PORT}`);
});
