import { Candle, OrderBlock, FVG, BOS, CHoCH } from '@/types';

export const calculateSMC = (candles: Candle[]) => {
  const orderBlocks: OrderBlock[] = [];
  const fvgs: FVG[] = [];
  let bos: BOS | null = null;
  let choch: CHoCH | null = null;

  if (candles.length < 5) return { orderBlocks, fvgs, bos, choch };

  let lastSwingHigh = candles[0].high;
  let lastSwingLow = candles[0].low;
  let currentTrend: 'bullish' | 'bearish' = 'bullish';

  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2];
    const c1 = candles[i - 1];
    const c2 = candles[i];

    // FVG Detection
    if (c0.high < c2.low) {
      fvgs.push({ type: 'bullish', top: c2.low, bottom: c0.high, timestamp: c1.openTime, filled: false });
    } else if (c0.low > c2.high) {
      fvgs.push({ type: 'bearish', top: c0.low, bottom: c2.high, timestamp: c1.openTime, filled: false });
    }

    // Swing High/Low updates & BOS / CHoCH detection
    // Simple swing detection: lower than prev and next
    const isSwingLow = c1.low < c0.low && c1.low < c2.low;
    const isSwingHigh = c1.high > c0.high && c1.high > c2.high;

    if (isSwingHigh) {
      if (currentTrend === 'bullish' && c1.high > lastSwingHigh) {
        bos = { direction: 'bullish', price: c1.high, timestamp: c1.openTime };
        lastSwingHigh = c1.high;
      } else if (currentTrend === 'bearish' && c1.high > lastSwingHigh) {
        choch = { direction: 'bullish', price: c1.high, timestamp: c1.openTime };
        currentTrend = 'bullish';
        lastSwingHigh = c1.high;
      } else {
        lastSwingHigh = c1.high;
      }
    }

    if (isSwingLow) {
      if (currentTrend === 'bearish' && c1.low < lastSwingLow) {
        bos = { direction: 'bearish', price: c1.low, timestamp: c1.openTime };
        lastSwingLow = c1.low;
      } else if (currentTrend === 'bullish' && c1.low < lastSwingLow) {
        choch = { direction: 'bearish', price: c1.low, timestamp: c1.openTime };
        currentTrend = 'bearish';
        lastSwingLow = c1.low;
      } else {
        lastSwingLow = c1.low;
      }
    }

    // Order Block Detection (simplified)
    // Bullish OB: last bearish candle before a strong bullish move (that creates FVG or breaks structure)
    if (c0.close < c0.open && c1.close > c1.open && c2.close > c2.open) {
      const isStrongMove = (c2.close - c1.open) > (c0.open - c0.close) * 1.5;
      if (isStrongMove) {
        orderBlocks.push({ type: 'bullish', high: c0.high, low: c0.low, price: c0.low, timestamp: c0.openTime });
      }
    }

    // Bearish OB: last bullish candle before a strong bearish move
    if (c0.close > c0.open && c1.close < c1.open && c2.close < c2.open) {
      const isStrongMove = (c1.open - c2.close) > (c0.close - c0.open) * 1.5;
      if (isStrongMove) {
        orderBlocks.push({ type: 'bearish', high: c0.high, low: c0.low, price: c0.high, timestamp: c0.openTime });
      }
    }
  }

  // Check FVG filling
  const currentPrice = candles[candles.length - 1].close;
  fvgs.forEach(fvg => {
    if (!fvg.filled) {
      if (fvg.type === 'bullish' && currentPrice <= fvg.bottom) fvg.filled = true;
      if (fvg.type === 'bearish' && currentPrice >= fvg.top) fvg.filled = true;
    }
  });

  return { orderBlocks, fvgs, bos, choch };
};
