import { Candle } from '@/types';

export function calculateVWAP(candles: Candle[]) {
  if (candles.length === 0) return null;

  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  // Assuming all candles are within the same session for intraday VWAP
  // A robust VWAP would reset at 00:00 UTC, but for simplified use we calculate over the provided dataset
  
  const vwapValues = candles.map(candle => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = candle.volume;

    cumulativeTypicalVolume += typicalPrice * volume;
    cumulativeVolume += volume;

    return cumulativeTypicalVolume / cumulativeVolume;
  });

  const currentVwap = vwapValues[vwapValues.length - 1];
  const currentPrice = candles[candles.length - 1].close;

  // Calculate standard deviation for bands
  let varianceSum = 0;
  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const diff = typicalPrice - vwapValues[i];
    varianceSum += (diff * diff) * candles[i].volume;
  }
  
  const stdDev = Math.sqrt(varianceSum / cumulativeVolume);

  const band1Upper = currentVwap + stdDev;
  const band1Lower = currentVwap - stdDev;
  const band2Upper = currentVwap + (stdDev * 2);
  const band2Lower = currentVwap - (stdDev * 2);

  let bias = 'NEUTRAL';
  if (currentPrice > currentVwap) bias = 'BULLISH';
  if (currentPrice < currentVwap) bias = 'BEARISH';

  const distancePercent = ((currentPrice - currentVwap) / currentVwap) * 100;

  return {
    vwap: currentVwap,
    band1Upper,
    band1Lower,
    band2Upper,
    band2Lower,
    bias,
    distancePercent
  };
}
