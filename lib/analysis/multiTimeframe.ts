import { fetchCandles } from '@/lib/binance';
import { calculateEMA } from '@/lib/indicators/movingAverage';
import { RSI } from 'technicalindicators';

const HIERARCHY: Record<string, string[]> = {
  '1m': ['15m', '1h'],
  '3m': ['15m', '1h'],
  '5m': ['1h', '4h'],
  '15m': ['1h', '4h'],
  '30m': ['4h', '1d'],
  '1h': ['4h', '1d'],
  '2h': ['1d'],
  '4h': ['1d'],
  '1d': ['1w'], // Assume 1w if primary is 1d
};

export async function analyzeMultiTimeframe(symbol: string, primaryTF: string) {
  const higherTFs = HIERARCHY[primaryTF] || ['4h', '1d'];
  
  const details = [];
  let bullishPoints = 0;
  let bearishPoints = 0;
  let totalPoints = 0;

  for (const tf of higherTFs) {
    try {
      const candles = await fetchCandles(symbol, tf, 100);
      if (candles.length < 50) continue;

      const closes = candles.map((c: { close: number }) => c.close);
      const ema20 = calculateEMA(20, closes);
      const ema50 = calculateEMA(50, closes);
      const currentPrice = closes[closes.length - 1];
      const currentEma20 = ema20[ema20.length - 1];
      const currentEma50 = ema50[ema50.length - 1];

      // Trend
      let trend = 'NEUTRAL';
      if (currentPrice > currentEma20 && currentEma20 > currentEma50) trend = 'BULLISH';
      else if (currentPrice < currentEma20 && currentEma20 < currentEma50) trend = 'BEARISH';

      // Momentum
      const rsi = RSI.calculate({ values: closes, period: 14 });
      const currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : 50;
      let momentum = 'NEUTRAL';
      if (currentRsi > 55) momentum = 'BULLISH';
      else if (currentRsi < 45) momentum = 'BEARISH';

      // Simple Structure (Higher Highs / Lower Lows logic via simple price comparison over last 10 candles)
      const last10 = closes.slice(-10);
      const first5 = last10.slice(0, 5);
      const last5 = last10.slice(5);
      const maxFirst = Math.max(...first5);
      const maxLast = Math.max(...last5);
      const minFirst = Math.min(...first5);
      const minLast = Math.min(...last5);

      let structure = 'NEUTRAL';
      if (maxLast > maxFirst && minLast > minFirst) structure = 'BULLISH';
      else if (maxLast < maxFirst && minLast < minFirst) structure = 'BEARISH';

      details.push({ tf, trend, momentum, structure });

      const scores = { BULLISH: 1, BEARISH: -1, NEUTRAL: 0 };
      const tfScore = scores[trend as keyof typeof scores] + scores[momentum as keyof typeof scores] + scores[structure as keyof typeof scores];
      
      if (tfScore > 0) bullishPoints += tfScore;
      else if (tfScore < 0) bearishPoints += Math.abs(tfScore);
      
      totalPoints += 3; // 3 factors per timeframe

    } catch (e) {
      console.error(`Error analyzing MTF for ${symbol} on ${tf}`, e);
    }
  }

  // Calculate alignment
  let trendAlignment = 'MIXED';
  let confirmationScore = 0;

  if (totalPoints > 0) {
    const netScore = bullishPoints - bearishPoints;
    confirmationScore = Math.round((netScore / totalPoints) * 100);

    if (confirmationScore >= 50) trendAlignment = 'BULLISH';
    else if (confirmationScore <= -50) trendAlignment = 'BEARISH';
  }

  return {
    trendAlignment,
    confirmationScore,
    details
  };
}
