import { NextRequest, NextResponse } from 'next/server';
import { analyzeAsset } from '@/lib/analysis/marketAnalyzer';
import { analyzeMarket } from '@/lib/ai/aiAnalyst';
import { fetchNews } from '@/lib/news/newsService';
import { supabase } from '@/lib/supabase';
import { fetchCandles } from '@/lib/binance';

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const { searchParams } = new URL(req.url);
  const timeframe = searchParams.get('timeframe') || '15m';
  const aiRequested = searchParams.get('ai') === 'true';
  const forceRefresh = searchParams.get('refresh') === 'true';
  
  const rawSymbol = params.symbol || 'BTCUSDT';
  const symbol = rawSymbol.toUpperCase();

  try {
    // 1. Check Supabase Cache (if forceRefresh is false)
    if (!forceRefresh) {
      try {
        const { data: cached, error } = await supabase
          .from('analysis_cache')
          .select('*')
          .eq('symbol', symbol)
          .eq('timeframe', timeframe)
          .maybeSingle();

        if (cached) {
          const updatedAt = new Date(cached.updated_at).getTime();
          const age = Date.now() - updatedAt;
          const CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes cache

          if (age < CACHE_MAX_AGE) {
            const hasAi = cached.data && cached.data.aiAnalysis;
            // If AI is requested, but cached data doesn't have it, we bypass cache and calculate it
            if (!aiRequested || hasAi) {
              return NextResponse.json({
                ...cached.data,
                cached: true,
                updatedAt: cached.updated_at
              });
            }
          }
        }
      } catch (cacheErr) {
        console.warn('[Cache Read Warning] Failed to read from analysis_cache:', cacheErr);
      }
    }

    // 2. Fetch fresh technical analysis
    const analysis: any = await analyzeAsset(symbol, timeframe);

    // 3. Add AI analysis if requested
    if (aiRequested) {
      try {
        const news = await fetchNews().catch(() => ({
          finalSentiment: { btc: 0, eth: 0 },
          fearGreedIndex: 50
        }));

        let newsSentiment = 0;
        if (symbol.includes('BTC')) newsSentiment = news.finalSentiment.btc;
        else if (symbol.includes('ETH')) newsSentiment = news.finalSentiment.eth;

        const candles = await fetchCandles(symbol, timeframe, 10).catch(() => []);

        const aiParams = {
          symbol,
          timeframe,
          currentPrice: analysis.price,
          recentCandles: candles,
          confluenceScore: analysis.technicalScore,
          technicalSignals: [
            `Technical: ${analysis.technicalSignal} (Score: ${analysis.technicalScore})`,
            `RSI: ${analysis.indicators.rsi.value.toFixed(1)} (${analysis.indicators.rsi.signal})`,
            `MACD: ${analysis.indicators.macd.trend}`,
            `Bollinger: ${analysis.indicators.bollinger.signal}`,
            `SMC BOS: ${analysis.indicators.smc.bos ? analysis.indicators.smc.bos.direction : 'None'}`
          ],
          newsSentiment,
          fearAndGreed: news.fearGreedIndex || 50,
          mtfAlignment: analysis.mtf.trendAlignment,
          session: analysis.session.name,
          vwapBias: analysis.indicators.ema.signal,
          volumeProfile: { poc: analysis.price, vah: analysis.price * 1.01, val: analysis.price * 0.99 },
          lastTrades: []
        };

        const aiResult = await analyzeMarket(aiParams);
        analysis.aiAnalysis = aiResult;
      } catch (aiErr) {
        console.error(`[AI Error] Failed to generate AI analysis for ${symbol}:`, aiErr);
        analysis.aiAnalysis = {
          recommendation: 'NEUTRAL',
          setupQuality: 'C',
          positionSizeRecommendation: 'QUARTER',
          confidence: 0,
          reasoning: 'Não foi possível gerar a análise da inteligência artificial neste momento devido a uma falha na API ou timeout.',
          risks: 'Sem dados adicionais de risco.',
          keyLevel: null,
          invalidationLevel: null
        };
      }
    }

    // 4. Save to Supabase Cache (graceful fallback if DB fails)
    try {
      await supabase.from('analysis_cache').upsert({
        symbol,
        timeframe,
        data: analysis,
        updated_at: new Date().toISOString()
      }, { onConflict: 'symbol,timeframe' });
    } catch (dbErr) {
      console.warn('[Cache Write Warning] Failed to write to analysis_cache:', dbErr);
    }

    return NextResponse.json({
      ...analysis,
      cached: false,
      updatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`Error in /api/analysis/${symbol}:`, error);
    return NextResponse.json(
      { error: 'Erro ao processar análise do ativo.', details: error.message },
      { status: 500 }
    );
  }
}
