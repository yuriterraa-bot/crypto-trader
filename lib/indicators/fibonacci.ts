export interface FibResult {
  isNearLevel: boolean;
  nearestLevel: { ratio: number; price: number } | null;
  currentTrend: 'UP' | 'DOWN' | 'SIDEWAYS';
  levels: { ratio: number; price: number; label: string }[];
}

export function calculateFibonacciRetracement(candles: any[]): FibResult {
  const n = Math.min(candles.length, 50);
  const slice = candles.slice(-n);
  const highs = slice.map((c: any) => parseFloat(c.high));
  const lows = slice.map((c: any) => parseFloat(c.low));
  const swingHigh = Math.max(...highs);
  const swingLow = Math.min(...lows);
  const range = swingHigh - swingLow;
  const currentPrice = parseFloat(candles[candles.length - 1].close);
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const labels = ['0%','23.6%','38.2%','50%','61.8%','78.6%','100%'];
  // Determine trend by comparing first and last price
  const firstClose = parseFloat(slice[0].close);
  const lastClose = parseFloat(slice[slice.length - 1].close);
  const trend: 'UP' | 'DOWN' | 'SIDEWAYS' = lastClose > firstClose * 1.005 ? 'UP' : lastClose < firstClose * 0.995 ? 'DOWN' : 'SIDEWAYS';
  const levels = ratios.map((r, i) => ({
    ratio: r,
    price: trend === 'UP' ? swingHigh - r * range : swingLow + r * range,
    label: labels[i],
  }));
  let nearest: { ratio: number; price: number } | null = null;
  let minDist = Infinity;
  for (const l of levels) {
    const dist = Math.abs(currentPrice - l.price) / currentPrice;
    if (dist < minDist) { minDist = dist; nearest = l; }
  }
  return {
    isNearLevel: minDist < 0.005,
    nearestLevel: nearest,
    currentTrend: trend,
    levels,
  };
}
