# Musicana Server

Express + Prisma backend for OCR, sentiment analysis, and Spotify scraper recommendations.

## Setup

1. Install dependencies:

```
npm install
```

2. Copy `.env.example` to `.env` and fill in your Neon PostgreSQL credentials and RapidAPI key:

```
RAPIDAPI_KEY=your_rapidapi_key_here
PORT=4001
DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/musicana?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/musicana?sslmode=require"
```

3. Initialize Prisma (Neon PostgreSQL):

```
npx prisma generate
npx prisma migrate dev --name init
```

4. Run server:

```
npm run dev
```

- API: `POST /api/analyze-document` (multipart `image`) returns `{ text, mood, recommendation }`
- API: `GET /api/recommendations?mood=joyful|uplifting|calm|melancholic|somber`

5. Run MCP server (in a separate terminal):

```
npm run dev:mcp
```

- MCP SSE endpoint: `http://localhost:4002/sse`
- Tools: `analyze_text_sentiment`, `recommend_music`

## Notes
- OCR: `tesseract.js` (no Redis required)
- Sentiment: `sentiment` npm package (analyzes text emotion and returns comparative score)
- Music Recommendations: `ytmusic-api` (unofficial YouTube Music scraper, no API key needed)
- Database: Neon PostgreSQL (serverless Postgres with connection pooling)
