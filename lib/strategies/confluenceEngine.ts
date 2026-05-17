import { Candle, StrategyConfig } from '@/types';
import { calculateDidiIndex } from '../indicators/didiIndex';
import { calculateNadarayaWatson } from '../indicators/nadaraya';
import { calculateFibonacciRetracement } from '../indicators/fibonacci';
import { calculateSMC } from '../indicators/smc';
import { calculateSMA, calculateEMA } from '../indicators/movingAverage';
import { calculateStochastic } from '../indicators/stochastic';

export const runConfluenceEngine = (
  candles: Candle[], 
  config: StrategyConfig, 
  mtfAlignment: string = 'MIXED',
  sessionMultiplier: number = 1.0
) => {
  let score = 0;
  const breakdown: { indicator: string; contribution: number; signal: string }[] = [];

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // 1. Didi Index
  if (config.indicators.didi?.active) {
    const { signal } = calculateDidiIndex(closes);
    const weight = config.indicators.didi.weight;
    if (signal === 'BUY') {
      score += weight;
      breakdown.push({ indicator: 'Didi Index', contribution: weight, signal: 'BUY' });
    } else if (signal === 'SELL') {
      score -= weight;
      breakdown.push({ indicator: 'Didi Index', contribution: -weight, signal: 'SELL' });
    }
  }

  // 2. Nadaraya-Watson
  if (config.indicators.nadaraya?.active) {
    const { trend } = calculateNadarayaWatson(closes);
    const weight = config.indicators.nadaraya.weight;
    if (trend === 'UP') {
      score += weight;
      breakdown.push({ indicator: 'Nadaraya', contribution: weight, signal: 'BUY' });
    } else if (trend === 'DOWN') {
      score -= weight;
      breakdown.push({ indicator: 'Nadaraya', contribution: -weight, signal: 'SELL' });
    }
  }

  // 3. Fibonacci
  if (config.indicators.fibonacci?.active) {
    const { isNearLevel, currentTrend, nearestLevel } = calculateFibonacciRetracement(candles);
    const weight = config.indicators.fibonacci.weight;
    
    if (isNearLevel && nearestLevel) {
      if (currentTrend === 'UP') {
        score += weight;
        breakdown.push({ indicator: 'Fibonacci', contribution: weight, signal: 'BUY (Pullback Support)' });
      } else {
        score -= weight;
        breakdown.push({ indicator: 'Fibonacci', contribution: -weight, signal: 'SELL (Pullback Resistance)' });
      }
    }
  }

  // 4. SMC
  if (config.indicators.smc?.active) {
    const { bos, choch, fvgs, orderBlocks } = calculateSMC(candles);
    const weight = config.indicators.smc.weight;
    
    let smcScore = 0;
    let smcSignalStr = '';

    if (choch) {
      smcScore += choch.direction === 'bullish' ? weight : -weight;
      smcSignalStr += `CHoCH ${choch.direction} `;
    } else if (bos) {
      smcScore += bos.direction === 'bullish' ? weight * 0.5 : -weight * 0.5;
      smcSignalStr += `BOS ${bos.direction} `;
    }

    // Check if price is at a recent unfilled FVG or OB
    const currentPrice = closes[closes.length - 1];
    const recentFvg = fvgs.slice(-3).find(f => !f.filled);
    if (recentFvg) {
      if (recentFvg.type === 'bullish' && currentPrice <= recentFvg.bottom * 1.002) {
         smcScore += weight * 0.5;
         smcSignalStr += 'At Bullish FVG ';
      } else if (recentFvg.type === 'bearish' && currentPrice >= recentFvg.top * 0.998) {
         smcScore -= weight * 0.5;
         smcSignalStr += 'At Bearish FVG ';
      }
    }

    if (smcScore !== 0) {
      score += smcScore;
      breakdown.push({ indicator: 'SMC', contribution: smcScore, signal: smcSignalStr.trim() });
    }
  }

  // 5. Stochastic
  if (config.indicators.stochastic?.active) {
    const stoch = calculateStochastic(highs, lows, closes);
    const weight = config.indicators.stochastic.weight;
    if (stoch.length > 0) {
      const last = stoch[stoch.length - 1];
      if (last.k < 20 && last.d < 20 && last.k > last.d) {
        score += weight;
        breakdown.push({ indicator: 'Stochastic', contribution: weight, signal: 'BUY (Oversold)' });
      } else if (last.k > 80 && last.d > 80 && last.k < last.d) {
        score -= weight;
        breakdown.push({ indicator: 'Stochastic', contribution: -weight, signal: 'SELL (Overbought)' });
      }
    }
  }

  // 6. Moving Averages (EMA 9 vs EMA 21 crossover)
  if (config.indicators.ma?.active) {
    const ema9 = calculateEMA(9, closes);
    const ema21 = calculateEMA(21, closes);
    const weight = config.indicators.ma.weight;
    
    if (ema9.length > 0 && ema21.length > 0) {
      const lastEma9 = ema9[ema9.length - 1];
      const lastEma21 = ema21[ema21.length - 1];
      
      if (lastEma9 > lastEma21) {
        score += weight;
        breakdown.push({ indicator: 'Moving Averages', contribution: weight, signal: 'BUY (EMA9 > EMA21)' });
      } else if (lastEma9 < lastEma21) {
        score -= weight;
        breakdown.push({ indicator: 'Moving Averages', contribution: -weight, signal: 'SELL (EMA9 < EMA21)' });
      }
    }
  }

  // 7. Multi-Timeframe (MTF) Alignment
  if (config.indicators.mtf?.active) {
    const weight = config.indicators.mtf.weight;
    if (mtfAlignment === 'BULLISH') {
      score += weight;
      breakdown.push({ indicator: 'MTF Trend', contribution: weight, signal: 'BUY (Aligned)' });
    } else if (mtfAlignment === 'BEARISH') {
      score -= weight;
      breakdown.push({ indicator: 'MTF Trend', contribution: -weight, signal: 'SELL (Aligned)' });
    } else {
      breakdown.push({ indicator: 'MTF Trend', contribution: 0, signal: 'NEUTRAL (Mixed)' });
    }
  }

  // Normalize score to -100 to +100
  // Max possible score is sum of all active weights
  let maxPossible = 0;
  Object.values(config.indicators).forEach(ind => {
    if (ind.active) maxPossible += ind.weight;
  });

  // To prevent division by zero and cap at 100/-100
  let normalizedScore = maxPossible > 0 ? Math.max(-100, Math.min(100, (score / maxPossible) * 100)) : 0;

  // Apply Session Multiplier
  normalizedScore = Math.max(-100, Math.min(100, normalizedScore * sessionMultiplier));

  let finalSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (normalizedScore >= config.thresholds.buy) {
    finalSignal = 'BUY';
  } else if (normalizedScore <= -config.thresholds.sell) {
    finalSignal = 'SELL';
  }

  return {
    score: normalizedScore,
    signal: finalSignal,
    breakdown
  };
};
