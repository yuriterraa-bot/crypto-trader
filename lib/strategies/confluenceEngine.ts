import { Candle, StrategyConfig } from '@/types';
import { calculateDidiIndex } from '../indicators/didiIndex';
import { calculateNadarayaWatson } from '../indicators/nadaraya';
import { calculateFibonacciRetracement } from '../indicators/fibonacci';
import { calculateSMC } from '../indicators/smc';
import { calculateSMA, calculateEMA } from '../indicators/movingAverage';
import { calculateStochastic } from '../indicators/stochastic';
import { calculateMACD } from '../indicators/macd';
import { calcRSI } from '../indicators/base';

export const runConfluenceEngine = (
  candles: Candle[], 
  config: StrategyConfig, 
  mtfAlignment: string = 'MIXED',
  sessionMultiplier: number = 1.0,
  timeframe?: string
) => {
  const isSwingTimeframe = timeframe && ['4h', '1d', '1w'].includes(timeframe.toLowerCase());

  // Resolve and override weights for swing timeframes
  const weights = {
    didi: isSwingTimeframe ? 2 : (config.indicators.didi?.weight ?? 5),
    nadaraya: isSwingTimeframe ? 8 : (config.indicators.nadaraya?.weight ?? 5),
    fibonacci: isSwingTimeframe ? 7 : (config.indicators.fibonacci?.weight ?? 5),
    smc: isSwingTimeframe ? 9 : (config.indicators.smc?.weight ?? 5),
    stochastic: isSwingTimeframe ? 2 : (config.indicators.stochastic?.weight ?? 5),
    ma: isSwingTimeframe ? 8 : (config.indicators.ma?.weight ?? 5),
    mtf: isSwingTimeframe ? 10 : (config.indicators.mtf?.weight ?? 5),
    macd: isSwingTimeframe ? 7 : (config.indicators.macd?.weight ?? 5),
    rsi: isSwingTimeframe ? 6 : (config.indicators.rsi?.weight ?? 5)
  };

  let score = 0;
  const breakdown: { indicator: string; contribution: number; signal: string }[] = [];

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // 1. Didi Index
  if (config.indicators.didi?.active) {
    const { signal } = calculateDidiIndex(closes);
    const weight = weights.didi;
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
    const weight = weights.nadaraya;
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
    const weight = weights.fibonacci;
    
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
    const weight = weights.smc;
    
    let smcScore = 0;
    let smcSignalStr = '';

    if (choch) {
      smcScore += choch.direction === 'BULLISH' ? weight : -weight;
      smcSignalStr += `CHoCH ${choch.direction} `;
    } else if (bos) {
      smcScore += bos.direction === 'BULLISH' ? weight * 0.5 : -weight * 0.5;
      smcSignalStr += `BOS ${bos.direction} `;
    }

    const currentPrice = closes[closes.length - 1];
    const recentFvg = fvgs.slice(-3).find(f => !f.filled);
    if (recentFvg) {
      if (recentFvg.direction === 'BULLISH' && currentPrice <= recentFvg.bottom * 1.002) {
         smcScore += weight * 0.5;
         smcSignalStr += 'At Bullish FVG ';
      } else if (recentFvg.direction === 'BEARISH' && currentPrice >= recentFvg.top * 0.998) {
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
    const weight = weights.stochastic;
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
    const weight = weights.ma;
    
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
  const isMtfActive = config.indicators.mtf?.active;
  if (isMtfActive) {
    const weight = weights.mtf;
    
    if (isSwingTimeframe && closes.length > 1) {
      // Weekly trend approximation using EMA 200 (since we are on >=4H, 200 EMA represents the long-term trend)
      const ema200 = calculateEMA(Math.min(200, closes.length - 1), closes);
      const lastClose = closes[closes.length - 1];
      const lastEma200 = ema200.length > 0 ? ema200[ema200.length - 1] : lastClose;
      const isWeeklyBullish = lastClose > lastEma200;

      // OBV (On Balance Volume) Trend Check
      const obv: number[] = [0];
      for (let i = 1; i < candles.length; i++) {
        const prevObv = obv[i - 1];
        if (closes[i] > closes[i - 1]) {
          obv.push(prevObv + candles[i].volume);
        } else if (closes[i] < closes[i - 1]) {
          obv.push(prevObv - candles[i].volume);
        } else {
          obv.push(prevObv);
        }
      }
      const obvEma20 = calculateEMA(Math.min(20, obv.length - 1), obv);
      const lastObv = obv[obv.length - 1];
      const lastObvEma20 = obvEma20.length > 0 ? obvEma20[obvEma20.length - 1] : lastObv;
      const isObvBullish = lastObv > lastObvEma20;

      // Range vs Trend check using EMA 9, 21, and 50 alignment
      const ema9 = calculateEMA(Math.min(9, closes.length - 1), closes);
      const ema21 = calculateEMA(Math.min(21, closes.length - 1), closes);
      const ema50 = calculateEMA(Math.min(50, closes.length - 1), closes);
      const lastEma9 = ema9.length > 0 ? ema9[ema9.length - 1] : lastClose;
      const lastEma21 = ema21.length > 0 ? ema21[ema21.length - 1] : lastClose;
      const lastEma50 = ema50.length > 0 ? ema50[ema50.length - 1] : lastClose;
      
      const isTrendingUp = lastEma9 > lastEma21 && lastEma21 > lastEma50;
      const isTrendingDown = lastEma9 < lastEma21 && lastEma21 < lastEma50;
      const isTrending = isTrendingUp || isTrendingDown;
      
      let swingMtfScore = 0;
      if (mtfAlignment === 'BULLISH') swingMtfScore += 2;
      if (mtfAlignment === 'BEARISH') swingMtfScore -= 2;
      
      swingMtfScore += isWeeklyBullish ? 1 : -1;
      swingMtfScore += isObvBullish ? 1 : -1;
      
      if (isTrendingUp) swingMtfScore += 1;
      if (isTrendingDown) swingMtfScore -= 1;

      let swingSignalStr = '';
      let mtfContribution = 0;

      if (swingMtfScore >= 2) {
        mtfContribution = weight;
        swingSignalStr = `BUY (Weekly ${isWeeklyBullish ? 'Bullish' : 'Bearish'} | OBV ${isObvBullish ? 'Bullish' : 'Bearish'} | State: ${isTrending ? 'Trending' : 'Ranging'})`;
      } else if (swingMtfScore <= -2) {
        mtfContribution = -weight;
        swingSignalStr = `SELL (Weekly ${isWeeklyBullish ? 'Bullish' : 'Bearish'} | OBV ${isObvBullish ? 'Bullish' : 'Bearish'} | State: ${isTrending ? 'Trending' : 'Ranging'})`;
      } else {
        mtfContribution = 0;
        swingSignalStr = `NEUTRAL (Weekly ${isWeeklyBullish ? 'Bullish' : 'Bearish'} | OBV ${isObvBullish ? 'Bullish' : 'Bearish'} | State: ${isTrending ? 'Trending' : 'Ranging'})`;
      }

      score += mtfContribution;
      breakdown.push({
        indicator: 'MTF Trend',
        contribution: mtfContribution,
        signal: swingSignalStr
      });
    } else {
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
  }

  // 8. MACD
  const isMacdActive = config.indicators.macd?.active ?? isSwingTimeframe;
  if (isMacdActive) {
    const macdPoints = calculateMACD(closes);
    const weight = weights.macd;
    if (macdPoints.length > 1) {
      const last = macdPoints[macdPoints.length - 1];
      const prev = macdPoints[macdPoints.length - 2];
      
      if (last.histogram > 0 && prev.histogram <= 0) {
        score += weight;
        breakdown.push({ indicator: 'MACD', contribution: weight, signal: 'BUY (Bullish Cross)' });
      } else if (last.histogram < 0 && prev.histogram >= 0) {
        score -= weight;
        breakdown.push({ indicator: 'MACD', contribution: -weight, signal: 'SELL (Bearish Cross)' });
      } else if (last.histogram > 0) {
        score += weight * 0.5;
        breakdown.push({ indicator: 'MACD', contribution: weight * 0.5, signal: 'BUY (Bullish Momentum)' });
      } else {
        score -= weight * 0.5;
        breakdown.push({ indicator: 'MACD', contribution: -weight * 0.5, signal: 'SELL (Bearish Momentum)' });
      }
    }
  }

  // 9. RSI
  const isRsiActive = config.indicators.rsi?.active ?? isSwingTimeframe;
  if (isRsiActive) {
    const rsiValues = calcRSI(closes);
    const weight = weights.rsi;
    if (rsiValues.length > 0) {
      const lastRsi = rsiValues[rsiValues.length - 1];
      if (lastRsi < 30) {
        score += weight;
        breakdown.push({ indicator: 'RSI', contribution: weight, signal: `BUY (Oversold: ${lastRsi.toFixed(1)})` });
      } else if (lastRsi > 70) {
        score -= weight;
        breakdown.push({ indicator: 'RSI', contribution: -weight, signal: `SELL (Overbought: ${lastRsi.toFixed(1)})` });
      } else if (lastRsi > 50) {
        score += weight * 0.5;
        breakdown.push({ indicator: 'RSI', contribution: weight * 0.5, signal: `BUY (Bullish Zone: ${lastRsi.toFixed(1)})` });
      } else if (lastRsi < 50) {
        score -= weight * 0.5;
        breakdown.push({ indicator: 'RSI', contribution: -weight * 0.5, signal: `SELL (Bearish Zone: ${lastRsi.toFixed(1)})` });
      }
    }
  }

  // Max possible score is sum of all active weights
  let maxPossible = 0;
  if (config.indicators.didi?.active) maxPossible += weights.didi;
  if (config.indicators.nadaraya?.active) maxPossible += weights.nadaraya;
  if (config.indicators.fibonacci?.active) maxPossible += weights.fibonacci;
  if (config.indicators.smc?.active) maxPossible += weights.smc;
  if (config.indicators.stochastic?.active) maxPossible += weights.stochastic;
  if (config.indicators.ma?.active) maxPossible += weights.ma;
  if (isMtfActive) maxPossible += weights.mtf;
  if (isMacdActive) maxPossible += weights.macd;
  if (isRsiActive) maxPossible += weights.rsi;

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
