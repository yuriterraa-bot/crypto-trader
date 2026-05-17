import { Candle } from '@/types';

export function calculateVolumeProfile(candles: Candle[], bucketsCount = 20) {
  if (candles.length === 0) return null;

  let minPrice = Math.min(...candles.map(c => c.low));
  let maxPrice = Math.max(...candles.map(c => c.high));
  
  // Create buckets
  const bucketSize = (maxPrice - minPrice) / bucketsCount;
  const buckets = Array.from({ length: bucketsCount }, (_, i) => ({
    price: minPrice + (i * bucketSize) + (bucketSize / 2),
    min: minPrice + (i * bucketSize),
    max: minPrice + ((i + 1) * bucketSize),
    volume: 0
  }));

  // Assign volume
  let totalVolume = 0;
  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    totalVolume += candle.volume;
    
    // Find bucket
    const bucketIndex = buckets.findIndex(b => typicalPrice >= b.min && typicalPrice <= b.max);
    if (bucketIndex !== -1) {
      buckets[bucketIndex].volume += candle.volume;
    } else if (typicalPrice > maxPrice) {
      buckets[buckets.length - 1].volume += candle.volume;
    } else if (typicalPrice < minPrice) {
      buckets[0].volume += candle.volume;
    }
  }

  // Find POC
  let maxVol = 0;
  let poc = 0;
  buckets.forEach(b => {
    if (b.volume > maxVol) {
      maxVol = b.volume;
      poc = b.price;
    }
  });

  // Calculate Value Area (70% of total volume)
  // Simple approximation: sort buckets by volume and add until 70%
  const sortedBuckets = [...buckets].sort((a, b) => b.volume - a.volume);
  let vaVolume = 0;
  const targetVaVolume = totalVolume * 0.7;
  const vaPrices = [];

  for (const b of sortedBuckets) {
    vaVolume += b.volume;
    vaPrices.push(b.price);
    if (vaVolume >= targetVaVolume) break;
  }

  const vah = Math.max(...vaPrices);
  const val = Math.min(...vaPrices);

  return {
    poc,
    vah,
    val,
    profile: buckets.map(b => ({ price: b.price, volume: b.volume }))
  };
}
