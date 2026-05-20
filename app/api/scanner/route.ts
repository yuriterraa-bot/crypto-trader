import { NextRequest, NextResponse } from 'next/server';
import { analyzeAsset } from '@/lib/analysis/marketAnalyzer';
import { supabase } from '@/lib/supabase';

const DEFAULT_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'MATICUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT'
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeframe = searchParams.get('timeframe') || '15m';
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    const results: any[] = [];
    const pendingPairs: string[] = [];
    const CACHE_MAX_AGE = 3 * 60 * 1000; // 3 minutes cache for scanner

    // 1. If not forcing refresh, fetch all cached analyses from Supabase in a single query
    if (!forceRefresh) {
      try {
        const { data: cachedList } = await supabase
          .from('analysis_cache')
          .select('*')
          .in('symbol', DEFAULT_PAIRS)
          .eq('timeframe', timeframe);

        if (cachedList && cachedList.length > 0) {
          const cachedMap = new Map(cachedList.map(item => [item.symbol, item]));

          for (const symbol of DEFAULT_PAIRS) {
            const cachedItem = cachedMap.get(symbol);
            if (cachedItem) {
              const age = Date.now() - new Date(cachedItem.updated_at).getTime();
              if (age < CACHE_MAX_AGE) {
                results.push({
                  ...cachedItem.data,
                  cached: true,
                  updatedAt: cachedItem.updated_at
                });
                continue;
              }
            }
            pendingPairs.push(symbol);
          }
        } else {
          pendingPairs.push(...DEFAULT_PAIRS);
        }
      } catch (cacheErr) {
        console.warn('[Scanner Cache Read Warning] Failed to read cached scanner items:', cacheErr);
        pendingPairs.push(...DEFAULT_PAIRS);
      }
    } else {
      pendingPairs.push(...DEFAULT_PAIRS);
    }

    // 2. Fetch/Analyze pending pairs in parallel
    if (pendingPairs.length > 0) {
      console.log(`[Scanner] Fetching ${pendingPairs.length} expired or missing pairs in parallel:`, pendingPairs);
      
      const promises = pendingPairs.map(symbol => analyzeAsset(symbol, timeframe));
      const outcomes = await Promise.allSettled(promises);

      const dbUpdates: any[] = [];

      outcomes.forEach((outcome, idx) => {
        const symbol = pendingPairs[idx];
        if (outcome.status === 'fulfilled') {
          const analysis = outcome.value;
          results.push({
            ...analysis,
            cached: false,
            updatedAt: new Date().toISOString()
          });

          // Add to db cache queue
          dbUpdates.push({
            symbol,
            timeframe,
            data: analysis,
            updated_at: new Date().toISOString()
          });
        } else {
          console.error(`[Scanner Error] Failed to analyze ${symbol}:`, outcome.reason);
        }
      });

      // Bulk upsert fresh analyses to Supabase cache
      if (dbUpdates.length > 0) {
        try {
          await supabase.from('analysis_cache').upsert(dbUpdates, { onConflict: 'symbol,timeframe' });
        } catch (dbErr) {
          console.warn('[Scanner Cache Write Warning] Failed to write bulk updates to analysis_cache:', dbErr);
        }
      }
    }

    // 3. Sort results by absolute value of technicalScore descending
    // So strong buys and strong sells appear first on top!
    results.sort((a, b) => Math.abs(b.technicalScore) - Math.abs(a.technicalScore));

    return NextResponse.json({
      pairsCount: results.length,
      timeframe,
      results
    });

  } catch (error: any) {
    console.error('Error in /api/scanner:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar o scanner de mercado.', details: error.message },
      { status: 500 }
    );
  }
}
