import { NextResponse } from 'next/server';
import { fetchNews, analyzeNewsSentiment } from '@/lib/news/newsService';

// In-memory cache
let cachedNews: any = null;
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    if (cachedNews && (now - lastFetch < CACHE_TTL)) {
      return NextResponse.json(cachedNews);
    }

    const news = await fetchNews();
    const sentiment = analyzeNewsSentiment(news);
    
    cachedNews = { news, sentiment };
    lastFetch = now;

    return NextResponse.json(cachedNews);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
