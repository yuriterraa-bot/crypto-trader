import { NextResponse } from 'next/server';
import { analyzeMarket } from '@/lib/ai/aiAnalyst';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, candles, confluenceScore, technicalSignals, newsSentiment } = body;

    const result = await analyzeMarket({
      symbol,
      currentPrice: candles[candles.length - 1].close,
      recentCandles: candles.slice(-10),
      confluenceScore,
      technicalSignals,
      newsSentiment
    });

    // Save to Supabase
    await supabase.from('ai_analysis').insert([{
      symbol,
      recommendation: result.recommendation,
      confidence: result.confidence,
      reasoning: result.reasoning,
      risks: result.risks,
      confluence_score: confluenceScore,
      news_sentiment: newsSentiment
    }]);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
