import { calcEMA } from './base';

export interface MACDPoint {
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateMACD(
  closes: number[],
  fast = 12, slow = 26, signal = 9
): MACDPoint[] {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  // Align by trimming to shortest valid length
  const startFast = emaFast.findIndex(v => !isNaN(v));
  const startSlow = emaSlow.findIndex(v => !isNaN(v));
  const startIdx = Math.max(startFast, startSlow);
  const macdLine: number[] = [];
  for (let i = startIdx; i < closes.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  const sigLine = calcEMA(macdLine, signal);
  const sigStart = sigLine.findIndex(v => !isNaN(v));
  const result: MACDPoint[] = [];
  for (let i = sigStart; i < sigLine.length; i++) {
    result.push({
      macd: macdLine[macdLine.length - sigLine.length + i],
      signal: sigLine[i],
      histogram: macdLine[macdLine.length - sigLine.length + i] - sigLine[i],
    });
  }
  return result;
}
