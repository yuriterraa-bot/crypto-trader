import {
  fetchCandles,
  fetchTicker24h,
  fetchFundingRate,
  fetchOpenInterest,
  fetchLongShortRatio
} from '@/lib/binance';
import {
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateFibonacciRetracement,
  calculateSMC,
  calcRSI,
  calcEMA,
  calcDidi,
  calcNadarayaWatson,
  detectPatterns,
  detectDivergences
} from '@/lib/indicators';
import { analyzeMultiTimeframe } from './multiTimeframe';
import { getCurrentSession } from './sessionFilter';

export interface AssetAnalysis {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  
  // Technical Confluence
  technicalScore: number; // -100 to +100
  technicalSignal: 'FORTE COMPRA' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'FORTE VENDA';
  
  // Detailed Indicators
  indicators: {
    ema: {
      ema9: number;
      ema21: number;
      ema50: number;
      signal: 'BULLISH' | 'BEARISH' | 'NEUTRO';
    };
    rsi: {
      value: number;
      signal: 'OVERSOLD' | 'OVERBOUGHT' | 'BULLISH' | 'BEARISH' | 'NEUTRO';
    };
    macd: {
      macd: number;
      signalLine: number;
      histogram: number;
      trend: 'BULLISH' | 'BEARISH' | 'NEUTRO';
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
      percentB: number;
      signal: 'BULLISH_OVERSOLD' | 'BEARISH_OVERBOUGHT' | 'NEUTRO';
    };
    stochastic: {
      k: number;
      d: number;
      signal: 'BULLISH_OVERSOLD' | 'BEARISH_OVERBOUGHT' | 'NEUTRO';
    };
    fibonacci: {
      levels: { ratio: number; price: number; label: string }[];
      isNearLevel: boolean;
      nearestLevel: { ratio: number; price: number } | null;
      trend: string;
    };
    smc: {
      bos: { direction: 'BULLISH' | 'BEARISH'; price: number } | null;
      choch: { direction: 'BULLISH' | 'BEARISH'; price: number } | null;
      fvgs: { top: number; bottom: number; direction: 'BULLISH' | 'BEARISH'; filled: boolean }[];
      orderBlocks: { top: number; bottom: number; direction: 'BULLISH' | 'BEARISH' }[];
    };
    didi: {
      fast: number;
      slow: number;
      signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
    };
    nadaraya: {
      upper: number;
      lower: number;
      mid: number;
      signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
    };
    patterns: {
      name: string;
      type: 'bullish' | 'bearish' | 'neutral';
      strength: 'fraco' | 'moderado' | 'forte';
      description: string;
      candleIndex: number;
    }[];
    divergences: {
      type: 'bullish_regular' | 'bearish_regular' | 'bullish_hidden' | 'bearish_hidden';
      description: string;
      strength: 'fraco' | 'moderado' | 'forte';
      startIndex: number;
      endIndex: number;
    }[];
  };
  
  // Multi Timeframe Analysis
  mtf: {
    trendAlignment: string;
    confirmationScore: number;
    details: any[];
  };

  // Derivatives / Volume metrics
  derivatives: {
    fundingRate: number;
    openInterest: number;
    longShortRatio: number;
    longPercentage: number;
    shortPercentage: number;
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRO';
  };

  // Session & Time
  session: {
    name: string;
    nextSession: string;
    volatilityMultiplier: number;
  };

  analyzedAt: string;
}

export async function analyzeAsset(symbol: string, timeframe = '15m'): Promise<AssetAnalysis> {
  // 1. Fetch Candles (fetch 200 candles)
  const candles = await fetchCandles(symbol, timeframe, 200);
  if (candles.length < 50) {
    throw new Error(`Dados insuficientes para análise do par ${symbol}. Requer no mínimo 50 candles.`);
  }

  const closes = candles.map((c: any) => c.close);
  const highs = candles.map((c: any) => c.high);
  const lows = candles.map((c: any) => c.low);
  const currentPrice = closes[closes.length - 1];

  // 2. Fetch Derivatives & Market Data in parallel (handling failures gracefully)
  let tickerData = { priceChangePercent: 0, quoteVolume: 0, highPrice: currentPrice, lowPrice: currentPrice };
  let fundingData = { lastFundingRate: 0.0001 };
  let oiData = { openInterest: 0 };
  let lsRatioData = { longShortRatio: 1.0, longAccount: 0.5, shortAccount: 0.5 };

  try {
    const [t, f, o, ls] = await Promise.allSettled([
      fetchTicker24h(symbol),
      fetchFundingRate(symbol),
      fetchOpenInterest(symbol),
      fetchLongShortRatio(symbol, '5m')
    ]);

    if (t.status === 'fulfilled') tickerData = t.value;
    if (f.status === 'fulfilled') fundingData = f.value;
    if (o.status === 'fulfilled') oiData = o.value;
    if (ls.status === 'fulfilled') lsRatioData = ls.value;
  } catch (err) {
    console.error(`Erro ao obter dados de derivativos para ${symbol}:`, err);
  }

  // 3. Compute Technical Indicators
  // EMA
  const ema9Arr = calcEMA(closes, 9);
  const ema21Arr = calcEMA(closes, 21);
  const ema50Arr = calcEMA(closes, 50);
  const ema9 = ema9Arr[ema9Arr.length - 1] || currentPrice;
  const ema21 = ema21Arr[ema21Arr.length - 1] || currentPrice;
  const ema50 = ema50Arr[ema50Arr.length - 1] || currentPrice;

  let emaSignal: 'BULLISH' | 'BEARISH' | 'NEUTRO' = 'NEUTRO';
  let emaPoints = 0;
  if (currentPrice > ema9 && ema9 > ema21 && ema21 > ema50) {
    emaSignal = 'BULLISH';
    emaPoints = 20;
  } else if (currentPrice < ema9 && ema9 < ema21 && ema21 < ema50) {
    emaSignal = 'BEARISH';
    emaPoints = -20;
  }

  // RSI
  const rsiArr = calcRSI(closes, 14);
  const rsiVal = rsiArr[rsiArr.length - 1] || 50;
  let rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'BULLISH' | 'BEARISH' | 'NEUTRO' = 'NEUTRO';
  let rsiPoints = 0;
  if (rsiVal < 30) {
    rsiSignal = 'OVERSOLD';
    rsiPoints = 15;
  } else if (rsiVal > 70) {
    rsiSignal = 'OVERBOUGHT';
    rsiPoints = -15;
  } else if (rsiVal > 55) {
    rsiSignal = 'BULLISH';
    rsiPoints = 5;
  } else if (rsiVal < 45) {
    rsiSignal = 'BEARISH';
    rsiPoints = -5;
  }

  // MACD
  const macdArr = calculateMACD(closes);
  const macdPoint = macdArr[macdArr.length - 1] || { macd: 0, signal: 0, histogram: 0 };
  let macdTrend: 'BULLISH' | 'BEARISH' | 'NEUTRO' = 'NEUTRO';
  let macdPoints = 0;
  if (macdPoint.histogram > 0 && macdPoint.macd > macdPoint.signal) {
    macdTrend = 'BULLISH';
    macdPoints = 15;
  } else if (macdPoint.histogram < 0 && macdPoint.macd < macdPoint.signal) {
    macdTrend = 'BEARISH';
    macdPoints = -15;
  }

  // Bollinger Bands
  const bbArr = calculateBollingerBands(closes);
  const bbPoint = bbArr[bbArr.length - 1] || { upper: currentPrice * 1.02, middle: currentPrice, lower: currentPrice * 0.98, percentB: 0.5 };
  let bbSignal: 'BULLISH_OVERSOLD' | 'BEARISH_OVERBOUGHT' | 'NEUTRO' = 'NEUTRO';
  let bbPoints = 0;
  if (bbPoint.percentB <= 0.05) {
    bbSignal = 'BULLISH_OVERSOLD';
    bbPoints = 15;
  } else if (bbPoint.percentB >= 0.95) {
    bbSignal = 'BEARISH_OVERBOUGHT';
    bbPoints = -15;
  }

  // Stochastic
  const stochArr = calculateStochastic(highs, lows, closes);
  const stochPoint = stochArr[stochArr.length - 1] || { k: 50, d: 50 };
  let stochSignal: 'BULLISH_OVERSOLD' | 'BEARISH_OVERBOUGHT' | 'NEUTRO' = 'NEUTRO';
  let stochPoints = 0;
  if (stochPoint.k < 20 && stochPoint.d < 20 && stochPoint.k > stochPoint.d) {
    stochSignal = 'BULLISH_OVERSOLD';
    stochPoints = 10;
  } else if (stochPoint.k > 80 && stochPoint.d > 80 && stochPoint.k < stochPoint.d) {
    stochSignal = 'BEARISH_OVERBOUGHT';
    stochPoints = -10;
  }

  // Fibonacci Retracement
  const fibResult = calculateFibonacciRetracement(candles);
  let fibPoints = 0;
  if (fibResult.isNearLevel && fibResult.nearestLevel) {
    const isUpTrend = fibResult.currentTrend === 'UP';
    const isSupportRatio = [0.5, 0.618, 0.786].includes(fibResult.nearestLevel.ratio);
    if (isUpTrend && isSupportRatio) {
      fibPoints = 10;
    } else if (!isUpTrend && !isSupportRatio) {
      fibPoints = -10;
    }
  }

  // SMC (Smart Money Concepts)
  const smcResult = calculateSMC(candles);
  let smcPoints = 0;
  if (smcResult.bos?.direction === 'BULLISH' || smcResult.choch?.direction === 'BULLISH') {
    smcPoints = 15;
  } else if (smcResult.bos?.direction === 'BEARISH' || smcResult.choch?.direction === 'BEARISH') {
    smcPoints = -15;
  }

  // Didi Index
  const didiResult = calcDidi(closes);
  const lastDidiIdx = didiResult.fast.length - 1;
  const lastDidiFast = didiResult.fast[lastDidiIdx] || 0;
  const lastDidiSlow = didiResult.slow[lastDidiIdx] || 0;
  const prevDidiFast = didiResult.fast[lastDidiIdx - 1] || 0;
  const prevDidiSlow = didiResult.slow[lastDidiIdx - 1] || 0;

  let didiSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = 'NEUTRO';
  let didiPoints = 0;
  if (prevDidiFast <= prevDidiSlow && lastDidiFast > lastDidiSlow && lastDidiFast > 0) {
    didiSignal = 'COMPRA';
    didiPoints = 10;
  } else if (prevDidiFast >= prevDidiSlow && lastDidiFast < lastDidiSlow && lastDidiFast < 0) {
    didiSignal = 'VENDA';
    didiPoints = -10;
  }

  // Nadaraya-Watson Envelope
  const nwResult = calcNadarayaWatson(closes);
  const lastNWUpper = nwResult.upper[nwResult.upper.length - 1] || currentPrice * 1.02;
  const lastNWLower = nwResult.lower[nwResult.lower.length - 1] || currentPrice * 0.98;
  const lastNWMid = nwResult.mid[nwResult.mid.length - 1] || currentPrice;

  let nwSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = 'NEUTRO';
  let nwPoints = 0;
  if (currentPrice <= lastNWLower) {
    nwSignal = 'COMPRA';
    nwPoints = 15;
  } else if (currentPrice >= lastNWUpper) {
    nwSignal = 'VENDA';
    nwPoints = -15;
  }

  // 3.5. Detect Candle Patterns and RSI Divergences
  const patternList = detectPatterns(candles);
  let patternPoints = 0;
  patternList.forEach(p => {
    if (p.strength === 'forte') {
      if (p.type === 'bullish') patternPoints += 8;
      if (p.type === 'bearish') patternPoints -= 8;
    }
  });

  const divergenceList = detectDivergences(candles, rsiArr);
  let divergencePoints = 0;
  divergenceList.forEach(d => {
    if (d.type.startsWith('bullish')) divergencePoints += 12;
    if (d.type.startsWith('bearish')) divergencePoints -= 12;
  });

  // 4. Calculate technicalScore (-100 to +100)
  // Max possible bullish points = 20 (EMA) + 15 (RSI) + 15 (MACD) + 15 (BB) + 10 (Stoch) + 10 (Fib) + 15 (SMC) + 10 (Didi) + 15 (NW) = 125
  const rawScore = emaPoints + rsiPoints + macdPoints + bbPoints + stochPoints + fibPoints + smcPoints + didiPoints + nwPoints + patternPoints + divergencePoints;
  const maxPossible = 125;
  const technicalScore = Math.min(100, Math.max(-100, Math.round((rawScore / maxPossible) * 100)));

  let technicalSignal: 'FORTE COMPRA' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'FORTE VENDA' = 'NEUTRO';
  if (technicalScore >= 60) technicalSignal = 'FORTE COMPRA';
  else if (technicalScore >= 20) technicalSignal = 'COMPRA';
  else if (technicalScore <= -60) technicalSignal = 'FORTE VENDA';
  else if (technicalScore <= -20) technicalSignal = 'VENDA';

  // 5. Multi-Timeframe Analysis
  let mtfResult: { trendAlignment: string; confirmationScore: number; details: any[] } = { trendAlignment: 'MIXED', confirmationScore: 0, details: [] };
  try {
    mtfResult = await analyzeMultiTimeframe(symbol, timeframe);
  } catch (err) {
    console.error(`Erro ao obter análise MTF para ${symbol}:`, err);
  }

  // 6. Derivatives Sentiment
  const longPercentage = lsRatioData.longAccount * 100;
  const shortPercentage = lsRatioData.shortAccount * 100;
  let derivativesSignal: 'BULLISH' | 'BEARISH' | 'NEUTRO' = 'NEUTRO';

  if (lsRatioData.longShortRatio > 1.2 && fundingData.lastFundingRate > 0) {
    derivativesSignal = 'BULLISH';
  } else if (lsRatioData.longShortRatio < 0.8 && fundingData.lastFundingRate < 0) {
    derivativesSignal = 'BEARISH';
  }

  // 7. Market Session Filter
  const sessionResult = getCurrentSession();

  return {
    symbol,
    price: currentPrice,
    change24h: tickerData.priceChangePercent,
    volume24h: tickerData.quoteVolume,
    high24h: tickerData.highPrice,
    low24h: tickerData.lowPrice,
    
    technicalScore,
    technicalSignal,

    indicators: {
      ema: {
        ema9,
        ema21,
        ema50,
        signal: emaSignal
      },
      rsi: {
        value: rsiVal,
        signal: rsiSignal
      },
      macd: {
        macd: macdPoint.macd,
        signalLine: macdPoint.signal,
        histogram: macdPoint.histogram,
        trend: macdTrend
      },
      bollinger: {
        upper: bbPoint.upper,
        middle: bbPoint.middle,
        lower: bbPoint.lower,
        percentB: bbPoint.percentB,
        signal: bbSignal
      },
      stochastic: {
        k: stochPoint.k,
        d: stochPoint.d,
        signal: stochSignal
      },
      fibonacci: {
        levels: fibResult.levels,
        isNearLevel: fibResult.isNearLevel,
        nearestLevel: fibResult.nearestLevel,
        trend: fibResult.currentTrend
      },
      smc: smcResult,
      didi: {
        fast: lastDidiFast,
        slow: lastDidiSlow,
        signal: didiSignal
      },
      nadaraya: {
        upper: lastNWUpper,
        lower: lastNWLower,
        mid: lastNWMid,
        signal: nwSignal
      },
      patterns: patternList,
      divergences: divergenceList
    },

    mtf: mtfResult,

    derivatives: {
      fundingRate: fundingData.lastFundingRate,
      openInterest: oiData.openInterest,
      longShortRatio: lsRatioData.longShortRatio,
      longPercentage,
      shortPercentage,
      signal: derivativesSignal
    },

    session: {
      name: sessionResult.session,
      nextSession: sessionResult.nextSession,
      volatilityMultiplier: sessionResult.confidenceMultiplier
    },

    analyzedAt: new Date().toISOString()
  };
}
