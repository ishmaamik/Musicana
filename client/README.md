# Musicana Client

NextJS 16 frontend for document OCR & sentiment-based music recommendations.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` or `.env.local` (optional):

```
SERVER_ORIGIN=http://localhost:4001
```

3. Run dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features
- Upload image → extract text (OCR)
- Determine mood (joyful / uplifting / calm / melancholic / somber)
- Recommend track via Spotify scraper (RapidAPI)
