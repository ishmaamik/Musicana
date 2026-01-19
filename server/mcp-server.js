// ----------------------- Imports -----------------------
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { PrismaClient } from '@prisma/client';
import Sentiment from 'sentiment';
import YTMusic from 'ytmusic-api';

// ----------------------- Setup -----------------------
const sentimentAnalyzer = new Sentiment();
const prisma = new PrismaClient();
const ytmusic = new YTMusic();

// Initialize YouTube Music API
try {
  await ytmusic.initialize();
  console.log('✅ YouTube Music API initialized');
} catch (err) {
  console.error('⚠️ YouTube Music initialization warning:', err.message);
}

// ----------------------- Helper Functions -----------------------
const scoreToMood = (c) => {
  if (c > 2) return 'joyful';
  if (c > 0) return 'uplifting';
  if (c === 0) return 'calm';
  if (c > -2) return 'melancholic';
  return 'somber';
};

const moodToQueries = {
  joyful: ['Happy Pharrell Williams', 'Good Life Kanye West T-Pain', 'On Top of the World Imagine Dragons'],
  uplifting: ['Stronger Kanye West', 'Rise Katy Perry', 'Shake It Off Taylor Swift'],
  calm: ['Holocene Bon Iver', 'Bloom The Paper Kites', 'River Leon Bridges'],
  melancholic: ['The Night We Met Lord Huron', 'Skinny Love Bon Iver', 'Fix You Coldplay'],
  somber: ['Hurt Johnny Cash', 'Creep Radiohead', 'Black Adele'],
};

// ----------------------- Create Server -----------------------
const server = new Server(
  {
    name: 'musicana-mcp',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// ----------------------- Tool Handlers -----------------------

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'analyze_text_sentiment',
        description: 'Analyze sentiment and map to mood',
        inputSchema: {
          type: 'object',
          properties: {
            text: { 
              type: 'string', 
              description: 'Text to analyze' 
            }
          },
          required: ['text']
        }
      },
      {
        name: 'recommend_music',
        description: 'Recommend a track via RapidAPI spotify-scraper given a mood',
        inputSchema: {
          type: 'object',
          properties: {
            mood: {
              type: 'string',
              description: 'Mood type',
              enum: ['joyful', 'uplifting', 'calm', 'melancholic', 'somber']
            }
          },
          required: ['mood']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'analyze_text_sentiment') {
      const { text } = args;
      
      if (!text || typeof text !== 'string') {
        throw new Error('Text is required and must be a string');
      }

      const s = sentimentAnalyzer.analyze(text);
      const mood = scoreToMood(s.comparative);

      const analysis = await prisma.analysis.create({
        data: {
          text,
          sentiment: s.score > 0 ? 'positive' : s.score < 0 ? 'negative' : 'neutral',
          mood
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mood,
              score: s.score,
              comparative: s.comparative,
              analysisId: analysis.id
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'recommend_music') {
      const { mood } = args;

      if (!mood) {
        throw new Error('Mood is required');
      }

      const list = moodToQueries[mood] || moodToQueries['calm'];
      const query = list[Math.floor(Math.random() * list.length)];

      const results = await ytmusic.searchSongs(query, { limit: 10 });
      
      if (!results || results.length === 0) {
        throw new Error('No songs found');
      }

      const songs = results.slice(0, 10).map(song => ({
  title: song.name,
  artist: song.artists?.map(a => a.name).join(', '),
  url: `https://music.youtube.com/watch?v=${song.videoId}`
}));

// Save all recommendations to database
for (const song of songs) {
  await prisma.recommendation.create({
    data: {
      mood,
      query,
      title: song.title || null,
      artist: song.artist || null,
      url: song.url,
    }
  });
}

return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({ 
        mood, 
        query,
        count: songs.length,
        songs: songs
      }, null, 2)
    }
  ]
};
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            error: error.message,
            tool: name
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// ----------------------- Start Server -----------------------
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('🎵 Musicana MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});