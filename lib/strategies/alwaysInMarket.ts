import { Candle } from '@/types';
import { calculateEMA } from '../indicators/movingAverage';
import { calculateStochastic } from '../indicators/stochastic';

export interface AIMResult {
  direction: 'LONG' | 'SHORT';
  confidence: number;
  score: number;
  reasons: string[];
}

export const alwaysInMarketStrategy = (candles: Candle[]): AIMResult => {
  if (candles.length < 55) {
    return { direction: 'LONG', confidence: 0, score: 0, reasons: ['Candles insuficientes'] };
  }

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // EMA Trend
  const ema9 = calculateEMA(9, closes);
  const ema21 = calculateEMA(21, closes);
  const ema50 = calculateEMA(50, closes);

  // Stochastic RSI para timing
  const stoch = calculateStochastic(highs, lows, closes, 14, 3);

  const currentPrice = closes[closes.length - 1];
  const lastEma9 = ema9[ema9.length - 1];
  const lastEma21 = ema21[ema21.length - 1];
  const lastEma50 = ema50[ema50.length - 1];
  const lastStoch = stoch[stoch.length - 1];

  // Score de direção
  let directionScore = 0;
  const reasons: string[] = [];

  // EMA 9 vs 21
  if (lastEma9 > lastEma21) {
    directionScore += 2;
    reasons.push('✅ EMA9 > EMA21 (bullish)');
  } else {
    directionScore -= 2;
    reasons.push('❌ EMA9 < EMA21 (bearish)');
  }

  // Preço vs EMA50
  if (currentPrice > lastEma50) {
    directionScore += 2;
    reasons.push('✅ Preço acima EMA50');
  } else {
    directionScore -= 2;
    reasons.push('❌ Preço abaixo EMA50');
  }

  // Stochastic
  if (lastStoch && lastStoch.k < 50) {
    directionScore -= 1;
    reasons.push('❌ Stoch < 50 (bearish momentum)');
  } else if (lastStoch && lastStoch.k >= 50) {
    directionScore += 1;
    reasons.push('✅ Stoch >= 50 (bullish momentum)');
  }

  // EMA slope (tendência)
  const ema21Prev = ema21[ema21.length - 4] || ema21[ema21.length - 2];
  const ema21Slope = ema21Prev ? (lastEma21 - ema21Prev) / ema21Prev : 0;
  if (ema21Slope > 0.0002) {
    directionScore += 1;
    reasons.push('✅ EMA21 subindo');
  } else if (ema21Slope < -0.0002) {
    directionScore -= 1;
    reasons.push('❌ EMA21 caindo');
  } else {
    reasons.push('⚪ EMA21 lateral');
  }

  // Preço vs EMA9 (momentum imediato)
  if (currentPrice > lastEma9) {
    directionScore += 1;
    reasons.push('✅ Preço acima EMA9');
  } else {
    directionScore -= 1;
    reasons.push('❌ Preço abaixo EMA9');
  }

  // SEMPRE retorna LONG ou SHORT, nunca NEUTRAL
  const direction: 'LONG' | 'SHORT' = directionScore >= 0 ? 'LONG' : 'SHORT';
  const maxScore = 7; // máx possível
  const confidence = Math.min(100, Math.round((Math.abs(directionScore) / maxScore) * 100));

  return { direction, confidence, score: directionScore, reasons };
};
