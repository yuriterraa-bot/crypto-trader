import { Candle } from '@/types';

export const calculateFibonacciRetracement = (candles: Candle[], lookback: number = 100) => {
  if (candles.length < lookback) {
    return { levels: [], isNearLevel: false, currentTrend: 'SIDEWAYS' as const, nearestLevel: null };
  }

  const recentCandles = candles.slice(-lookback);
  let highest = recentCandles[0].high;
  let lowest = recentCandles[0].low;
  let highestIdx = 0;
  let lowestIdx = 0;

  recentCandles.forEach((c, idx) => {
    if (c.high > highest) {
      highest = c.high;
      highestIdx = idx;
    }
    if (c.low < lowest) {
      lowest = c.low;
      lowestIdx = idx;
    }
  });

  // Determine if the trend from lowest to highest is UP or DOWN (based on what happened last)
  const trend = highestIdx > lowestIdx ? 'UP' : 'DOWN';
  const diff = highest - lowest;
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  
  const levels = trend === 'UP' 
    ? ratios.map(r => highest - (diff * r))
    : ratios.map(r => lowest + (diff * r));

  const currentPrice = candles[candles.length - 1].close;
  const threshold = currentPrice * 0.003; // 0.3%

  let isNearLevel = false;
  let nearestLevel: { ratio: number, price: number } | null = null;

  // Check relevance of specific levels: 0.382, 0.5, 0.618
  const relevantIndices = [2, 3, 4];
  
  for (const idx of relevantIndices) {
    const levelPrice = levels[idx];
    if (Math.abs(currentPrice - levelPrice) <= threshold) {
      isNearLevel = true;
      nearestLevel = { ratio: ratios[idx], price: levelPrice };
      break;
    }
  }

  return { levels, isNearLevel, currentTrend: trend, nearestLevel };
};
