export interface SMCResult {
  bos: { direction: 'BULLISH' | 'BEARISH'; price: number } | null;
  choch: { direction: 'BULLISH' | 'BEARISH'; price: number } | null;
  fvgs: { top: number; bottom: number; direction: 'BULLISH' | 'BEARISH'; filled: boolean }[];
  orderBlocks: { top: number; bottom: number; direction: 'BULLISH' | 'BEARISH' }[];
}

export function calculateSMC(candles: any[]): SMCResult {
  if (candles.length < 10) return { bos: null, choch: null, fvgs: [], orderBlocks: [] };
  const slice = candles.slice(-30);
  const n = slice.length;
  // Fair Value Gaps: gap between candle[i-2].high and candle[i].low (bullish) or vice versa
  const fvgs: SMCResult['fvgs'] = [];
  for (let i = 2; i < n; i++) {
    const h0 = parseFloat(slice[i - 2].high);
    const l2 = parseFloat(slice[i].low);
    if (l2 > h0) {
      const filled = slice.slice(i).some((c: any) => parseFloat(c.low) <= l2);
      fvgs.push({ top: l2, bottom: h0, direction: 'BULLISH', filled });
    }
    const l0 = parseFloat(slice[i - 2].low);
    const h2 = parseFloat(slice[i].high);
    if (h2 < l0) {
      const filled = slice.slice(i).some((c: any) => parseFloat(c.high) >= h2);
      fvgs.push({ top: l0, bottom: h2, direction: 'BEARISH', filled });
    }
  }
  // BOS: Break of Structure — price breaks recent swing high/low
  const highs = slice.map((c: any) => parseFloat(c.high));
  const lows = slice.map((c: any) => parseFloat(c.low));
  const recentHigh = Math.max(...highs.slice(-10, -1));
  const recentLow = Math.min(...lows.slice(-10, -1));
  const lastHigh = highs[n - 1];
  const lastLow = lows[n - 1];
  let bos: SMCResult['bos'] = null;
  let choch: SMCResult['choch'] = null;
  if (lastHigh > recentHigh) bos = { direction: 'BULLISH', price: recentHigh };
  else if (lastLow < recentLow) bos = { direction: 'BEARISH', price: recentLow };
  // CHoCH: Change of Character (opposite BOS)
  if (bos?.direction === 'BULLISH' && lastLow < recentLow) choch = { direction: 'BEARISH', price: recentLow };
  else if (bos?.direction === 'BEARISH' && lastHigh > recentHigh) choch = { direction: 'BULLISH', price: recentHigh };
  // Order blocks: last bearish candle before bullish BOS, last bullish before bearish BOS
  const orderBlocks: SMCResult['orderBlocks'] = [];
  if (bos?.direction === 'BULLISH') {
    for (let i = n - 3; i >= n - 8 && i >= 0; i--) {
      if (parseFloat(slice[i].close) < parseFloat(slice[i].open)) {
        orderBlocks.push({ top: parseFloat(slice[i].open), bottom: parseFloat(slice[i].close), direction: 'BULLISH' });
        break;
      }
    }
  } else if (bos?.direction === 'BEARISH') {
    for (let i = n - 3; i >= n - 8 && i >= 0; i--) {
      if (parseFloat(slice[i].close) > parseFloat(slice[i].open)) {
        orderBlocks.push({ top: parseFloat(slice[i].close), bottom: parseFloat(slice[i].open), direction: 'BEARISH' });
        break;
      }
    }
  }
  return { bos, choch, fvgs: fvgs.slice(0, 5), orderBlocks };
}
