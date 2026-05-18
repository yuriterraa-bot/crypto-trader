import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchCandles, getBalance, getPositions, openPosition, closePosition, calculateQuantity } from '@/lib/binance';
import { runConfluenceEngine } from '@/lib/strategies/confluenceEngine';
import { calculateRisk } from '@/lib/strategies/riskManager';
import { alwaysInMarketStrategy } from '@/lib/strategies/alwaysInMarket';
import { BotConfig, Signal } from '@/types';
import { fetchNews, analyzeNewsSentiment } from '@/lib/news/newsService';
import { analyzeMarket } from '@/lib/ai/aiAnalyst';
import { analyzeMultiTimeframe } from '@/lib/analysis/multiTimeframe';
import { getCurrentSession } from '@/lib/analysis/sessionFilter';
import { calculateVWAP } from '@/lib/indicators/vwap';
import { calculateVolumeProfile } from '@/lib/indicators/volumeProfile';

export async function POST(request: Request) {
  try {
    // Check if a specific symbol was passed
    let reqSymbol = null;
    try {
      const body = await request.json();
      if (body && body.symbol) reqSymbol = body.symbol;
    } catch (e) {
      // Ignore JSON parse errors for empty body
    }

    // 1. Get bot config
    const { data: configRows, error: configError } = await supabase
      .from('bot_config')
      .select('*')
      .limit(1);

    if (configError) throw configError;

    const defaultStrategyConfig = {
      indicators: {
        ma: { active: true, weight: 5 },
        stochastic: { active: true, weight: 3 },
        fibonacci: { active: true, weight: 4 },
        didi: { active: true, weight: 4 },
        nadaraya: { active: true, weight: 6 },
        smc: { active: true, weight: 7 },
        mtf: { active: true, weight: 5 }
      },
      thresholds: { buy: 60, sell: 60 },
      risk: { per_trade: 1.0, rr_ratio: 2, atr_multiplier: 2 }
    };

    // Se não há config, usar padrão e continuar
    const config = (configRows && configRows.length > 0) 
      ? configRows[0] 
      : {
          is_running: true,
          is_paper_trade: true,
          risk_per_trade: 1.0,
          max_positions: 3,
          timeframe: '15m',
          strategy_config: defaultStrategyConfig
        };

    // Se strategy_config está vazio no registro, usar padrão
    const strategyConfig = config.strategy_config && 
      Object.keys(config.strategy_config).length > 0 
      ? config.strategy_config 
      : defaultStrategyConfig;

    // Só parar se bot não estiver rodando
    if (!config.is_running) {
      return NextResponse.json({ 
        status: 'stopped', 
        message: 'Bot pausado. Clique em Iniciar Bot.' 
      });
    }

    const timeframe = config.timeframe || '15m';

    // 2. Fetch required account info
    const [balanceData, positionsData] = await Promise.all([
      getBalance(),
      getPositions()
    ]);
    
    const usdtBalance = parseFloat(balanceData.find((b: any) => b.asset === 'USDT')?.availableBalance || '0');
    const activePositionsCount = positionsData.filter((pos: any) => parseFloat(pos.positionAmt) !== 0).length;

    let news: any = null;
    try {
      news = await fetchNews();
    } catch(e: any) {
      console.error('fetchNews failed:', e.message);
      news = { finalSentiment: { btc: 0, eth: 0 }, headlines: [], 
        fearGreedIndex: 50, fearGreedLabel: 'Neutro', 
        fearGreedSentiment: 0, trending: { btc: false, eth: false } };
    }
    
    let sentimentScores: any = { btc: 0, eth: 0 };
    try {
      sentimentScores = analyzeNewsSentiment(news);
    } catch(e: any) {
      console.error('analyzeNewsSentiment failed:', e.message);
    }

    // Mock Fear & Greed for now, in a real app this would fetch from an API like alternative.me
    const fearAndGreed = 50;

    // 3. Process symbols
    const symbols = reqSymbol ? [reqSymbol] : ['BTCUSDT', 'ETHUSDT'];
    const results: any[] = [];

    const { session, confidenceMultiplier } = getCurrentSession();

    for (const symbol of symbols) {
      // Get klines
      const klines = await fetchCandles(symbol, timeframe, 200);
      
      // Advanced Metrics
      let mtfAlignment = 'MIXED';
      try {
        if (config.use_mtf !== false) {
          const mtf = await analyzeMultiTimeframe(symbol, timeframe);
          mtfAlignment = mtf.trendAlignment;
        }
      } catch(e: any) {
        console.error('MTF failed:', e.message);
        mtfAlignment = 'MIXED';
      }

      let vwapData = null;
      try {
        vwapData = calculateVWAP(klines);
      } catch(e: any) {
        console.error('VWAP failed:', e.message);
      }

      let volumeProfile = null;
      try {
        volumeProfile = calculateVolumeProfile(klines);
      } catch(e: any) {
        console.error('VolumeProfile failed:', e.message);
      }

      // Session Filter logic
      const sessionFilters = config.session_filter || { asia: true, london: true, ny: true };
      let sessionAllowed = true;
      if (session === 'ASIA' && !sessionFilters.asia) sessionAllowed = false;
      if (session === 'LONDON' && !sessionFilters.london) sessionAllowed = false;
      if (session === 'NEW_YORK' && !sessionFilters.ny) sessionAllowed = false;
      if (session === 'OVERLAP_LONDON_NY' && (!sessionFilters.london || !sessionFilters.ny)) sessionAllowed = false;

      // Run confluence engine
      let score = 0, techSignal = 'NEUTRAL', breakdown: any = [];
      try {
        const result = runConfluenceEngine(
          klines, strategyConfig, mtfAlignment, confidenceMultiplier
        );
        score = result.score;
        techSignal = result.signal;
        breakdown = result.breakdown;
        
        console.log('=== BREAKDOWN DETALHADO ===');
        console.log(JSON.stringify(breakdown, null, 2));
        console.log('Score final:', score);
        console.log('Candles recebidos:', klines.length);
        console.log('Último candle:', JSON.stringify(klines[klines.length-1]));
      } catch(e: any) {
        console.error('ConfluenceEngine failed:', e.message);
      }
      let action = 'none';
      let riskResult = null;
      let finalRecommendation = techSignal;
      let aiResult = null;
      const currencyKey = symbol.includes('BTC') ? 'btc' : 'eth';
      const newsSentiment = (sentimentScores as any)[currencyKey] || 0;

      // Integration: Check Technical + News + AI
      if (Math.abs(score) > 40 && sessionAllowed) {
        // Only run AI if score is strong enough
        if (Math.abs(score) > 60) {
          
          // Fetch last 3 trades
          const { data: lastTrades } = await supabase.from('trades').select('side, status').eq('symbol', symbol).order('created_at', { ascending: false }).limit(3);

          aiResult = await analyzeMarket({
            symbol,
            timeframe,
            currentPrice: klines[klines.length - 1].close,
            recentCandles: klines.slice(-10),
            confluenceScore: score,
            technicalSignals: breakdown,
            newsSentiment,
            fearAndGreed,
            mtfAlignment,
            session,
            vwapBias: vwapData?.bias || 'NEUTRAL',
            volumeProfile: volumeProfile || {},
            lastTrades: lastTrades || []
          });
          
          // Save to Supabase
          await supabase.from('ai_analysis').insert([{
            symbol,
            recommendation: aiResult.recommendation,
            confidence: aiResult.confidence,
            reasoning: aiResult.reasoning,
            risks: aiResult.risks,
            confluence_score: score,
            news_sentiment: newsSentiment
          }]);

          // Combine: score (60%) + news (20%) + AI (20%)
          // Map AI recommendation to score -100 to 100
          const aiScoreMap: Record<string, number> = {
            'STRONG_BUY': 100, 'BUY': 50, 'NEUTRAL': 0, 'SELL': -50, 'STRONG_SELL': -100
          };
          const aiScore = aiScoreMap[aiResult.recommendation] || 0;
          const newsScore = newsSentiment * 100;

          const combinedScore = (score * 0.6) + (newsScore * 0.2) + (aiScore * 0.2);

          if (combinedScore > strategyConfig.thresholds.buy) {
             finalRecommendation = 'BUY';
          } else if (combinedScore < -strategyConfig.thresholds.sell) {
             finalRecommendation = 'SELL';
          } else {
             finalRecommendation = 'NEUTRAL';
          }
        }
      } else if (!sessionAllowed) {
        finalRecommendation = 'NEUTRAL'; // Blocked by session
      }

      if (finalRecommendation === 'BUY' || finalRecommendation === 'SELL') {
        // Run risk manager
        riskResult = calculateRisk(
          klines, 
          strategyConfig, 
          usdtBalance, 
          activePositionsCount, 
          config.max_positions, 
          finalRecommendation
        );

        if (riskResult.canTrade) {
          action = config.is_paper_trade ? 'paper_trade' : 'live_trade';
          
          // Save signal to database
          const signalToSave: Signal = {
            symbol,
            strategy: aiResult ? 'AI_Confluence' : 'ConfluenceEngine',
            signal_type: finalRecommendation,
            price: klines[klines.length - 1].close,
            score,
            breakdown,
          };

          await supabase.from('signals').insert([signalToSave]);
          
          await supabase.from('trades').insert([{
            symbol,
            side: finalRecommendation === 'BUY' ? 'BUY' : 'SELL',
            quantity: riskResult?.positionSize || 0,
            price: klines[klines.length - 1].close,
            status: config.is_paper_trade ? 'PAPER' : 'FILLED',
            strategy_id: null,
            created_at: new Date().toISOString()
          }]);
        }
      }

      results.push({ symbol, score, techSignal, finalRecommendation, action, risk: riskResult, ai: aiResult, sessionAllowed, breakdown });

      // ── ALWAYS-IN MARKET ─────────────────────────────────────────────
      if (config.always_in_market) {
        try {
          const aimResult = alwaysInMarketStrategy(klines);

          // Detectar posição atual neste símbolo
          const openPos = positionsData.find(
            (p: any) => p.symbol === symbol && Math.abs(parseFloat(p.positionAmt)) > 0
          );
          const currentSide = openPos
            ? (parseFloat(openPos.positionAmt) > 0 ? 'LONG' : 'SHORT')
            : null;

          let aimAction: 'open' | 'reverse' | 'hold' = 'hold';

          if (!currentSide) {
            aimAction = 'open'; // Sem posição: abrir
          } else if (currentSide !== aimResult.direction) {
            aimAction = 'reverse'; // Direção mudou: reverter
          }
          // Mesma direção → hold

          const aimSide: 'BUY' | 'SELL' = aimResult.direction === 'LONG' ? 'BUY' : 'SELL';

          // Registrar no log independente da execução
          await supabase.from('signals').insert([{
            symbol,
            strategy: 'AlwaysInMarket',
            signal_type: aimSide,
            price: klines[klines.length - 1].close,
            score: aimResult.score,
            breakdown: aimResult.reasons.map(r => ({ indicator: r, contribution: 0, signal: aimResult.direction }))
          }]).catch(() => {});

          // Execução real apenas fora do paper trade
          if (!config.is_paper_trade && aimAction !== 'hold') {
            const leverage = config.leverage || 3;

            // Se REVERSE: fechar posição atual primeiro
            if (aimAction === 'reverse' && openPos) {
              const closeSide: 'BUY' | 'SELL' = parseFloat(openPos.positionAmt) > 0 ? 'SELL' : 'BUY';
              await closePosition(symbol, closeSide).catch(e =>
                console.error(`AIM closePosition error: ${e.message}`)
              );
            }

            // Abrir nova posição com 95% do saldo
            const qty = calculateQuantity(usdtBalance * 0.95, klines[klines.length - 1].close, symbol);
            if (qty > 0) {
              await openPosition(symbol, aimSide, qty, leverage).catch(e =>
                console.error(`AIM openPosition error: ${e.message}`)
              );
            }
          }

          // Adicionar AIM result ao resultado do símbolo
          const lastResult = results[results.length - 1];
          if (lastResult) {
            lastResult.aim = { ...aimResult, action: aimAction, currentSide };
          }
        } catch (aimErr: any) {
          console.error('AIM strategy error:', aimErr.message);
        }
      }
      // ─────────────────────────────────────────────────────────────────
    }

    // Auto-reagendar se timeframe < 5m
    const tf = config.timeframe || '15m';
    if (['1m', '3m'].includes(tf) && config.is_running) {
      const delay = tf === '1m' ? 60000 : 180000;
      setTimeout(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bot/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'BTCUSDT' })
          });
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bot/run`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'ETHUSDT' })
          });
        } catch(e) {}
      }, delay);
    }

    return NextResponse.json({ 
      status: 'success', 
      results: results.map(r => ({
        ...r,
        breakdown: r.breakdown || []
      }))
    });
  } catch (error: any) {
    console.error('=== BOT RUN ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack?.split('\n').slice(0,5),
      details: error.response?.data || null
    }, { status: 500 });
  }
}

  
