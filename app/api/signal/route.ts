import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchNews, analyzeNewsSentiment } from '@/lib/news/newsService';

export async function GET(request: Request) {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT'];
    const result: any = {};

    // Get news sentiment
    let newsData: any = null;
    try {
      const news = await fetchNews();
      const sentiment = analyzeNewsSentiment(news);
      newsData = { news, sentiment };
    } catch (e) {
      console.error('Error fetching news:', e);
    }

    for (const symbol of symbols) {
      // Get latest signal
      const { data: signals } = await supabase
        .from('signals')
        .select('*')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1);

      // Get latest AI analysis
      const { data: aiAnalysis } = await supabase
        .from('ai_analysis')
        .select('*')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestSignal = signals && signals.length > 0 ? signals[0] : null;
      const latestAi = aiAnalysis && aiAnalysis.length > 0 ? aiAnalysis[0] : null;

      // Extract news sentiment for the symbol
      let symbolNewsScore = 0;
      if (newsData && newsData.sentiment) {
        if (symbol === 'BTCUSDT' && newsData.sentiment.finalSentiment) {
          symbolNewsScore = newsData.sentiment.finalSentiment.btc || 0;
        } else if (symbol === 'ETHUSDT' && newsData.sentiment.finalSentiment) {
          symbolNewsScore = newsData.sentiment.finalSentiment.eth || 0;
        }
      }

      const fearGreedIndex = newsData?.news?.fearGreedIndex || 50;

      // Combine scores
      // Tech score: map from -100 to 100 based on score?
      // signal.score is usually from tech analysis. Let's normalize it to -100 to 100 if it's not.
      let techScore = latestSignal?.score || 0;
      if (techScore > 100) techScore = 100;
      if (techScore < -100) techScore = -100;

      // AI score mapping
      let aiScore = 0;
      let aiConfidence = 0;
      if (latestAi) {
        aiConfidence = latestAi.confidence || 0;
        if (latestAi.recommendation === 'BUY') aiScore = aiConfidence;
        else if (latestAi.recommendation === 'SELL') aiScore = -aiConfidence;
      }

      // News score: map from -1 to 1 to -100 to 100
      const newsScore = symbolNewsScore * 100;

      // Final score formula: 60% tech + 20% news + 20% AI
      const finalScore = (techScore * 0.6) + (newsScore * 0.2) + (aiScore * 0.2);

      let finalRecommendation = 'NEUTRAL';
      if (finalScore >= 60) finalRecommendation = 'STRONG_BUY';
      else if (finalScore >= 20) finalRecommendation = 'BUY';
      else if (finalScore <= -60) finalRecommendation = 'STRONG_SELL';
      else if (finalScore <= -20) finalRecommendation = 'SELL';

      result[symbol] = {
        technical: {
          score: techScore,
          signal: latestSignal?.signal_type || 'NEUTRAL',
          breakdown: latestSignal?.breakdown || [],
          timestamp: latestSignal?.created_at,
        },
        ai: {
          recommendation: latestAi?.recommendation || 'NEUTRAL',
          confidence: aiConfidence,
          reasoning: latestAi?.reasoning || 'Nenhuma análise recente disponível.',
          risks: latestAi?.risks || [],
          timestamp: latestAi?.created_at,
        },
        news: {
          score: newsScore,
          sentiment: symbolNewsScore,
          fearGreedIndex,
        },
        combined: {
          score: finalScore,
          recommendation: finalRecommendation,
        }
      };
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
