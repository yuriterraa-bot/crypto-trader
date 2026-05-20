/**
 * lib/indicators/base.ts
 * Cálculo puro de indicadores técnicos em TypeScript
 */

export function calcEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return closes.map(() => NaN);
  const k = 2 / (period + 1);
  const result: number[] = new Array(period - 1).fill(NaN);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

export function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = new Array(period).fill(NaN);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

/** Didi Index: usa 3 EMAs (3, 8, 20). Fast = EMA3/EMA8-1, Slow = EMA20/EMA8-1 */
export function calcDidi(closes: number[]): { fast: number[], slow: number[] } {
  const e3 = calcEMA(closes, 3);
  const e8 = calcEMA(closes, 8);
  const e20 = calcEMA(closes, 20);
  const fast = closes.map((_, i) =>
    isNaN(e3[i]) || isNaN(e8[i]) || e8[i] === 0 ? NaN : (e3[i] / e8[i] - 1) * 100
  );
  const slow = closes.map((_, i) =>
    isNaN(e20[i]) || isNaN(e8[i]) || e8[i] === 0 ? NaN : (e20[i] / e8[i] - 1) * 100
  );
  return { fast, slow };
}

/** Stochastic Momentum Index — versão suavizada do Estocástico */
export function calcSMI(
  highs: number[], lows: number[], closes: number[],
  period = 14, smooth = 3
): number[] {
  const raw: number[] = new Array(period - 1).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    const sliceH = highs.slice(i - period + 1, i + 1);
    const sliceL = lows.slice(i - period + 1, i + 1);
    const hh = Math.max(...sliceH);
    const ll = Math.min(...sliceL);
    const range = hh - ll;
    raw.push(range === 0 ? 0 : ((closes[i] - (hh + ll) / 2) / (range / 2)) * 100);
  }
  // Smooth the raw values
  const validStart = raw.findIndex(v => !isNaN(v));
  const validRaw = raw.filter(v => !isNaN(v));
  const smoothed = calcEMA(validRaw, smooth);
  return [...new Array(validStart).fill(NaN), ...smoothed];
}

/** Nadaraya-Watson Envelope — regressão de kernel gaussiano */
export function calcNadarayaWatson(
  closes: number[], bandwidth = 8, mult = 2.0
): { upper: number[], lower: number[], mid: number[] } {
  const n = closes.length;
  const mid: number[] = [];
  for (let i = 0; i < n; i++) {
    let sumVal = 0, sumW = 0;
    for (let j = 0; j < n; j++) {
      const w = Math.exp(-((i - j) ** 2) / (2 * bandwidth ** 2));
      sumVal += w * closes[j]; sumW += w;
    }
    mid.push(sumVal / sumW);
  }
  const residuals = closes.map((c, i) => c - mid[i]);
  const std = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / n);
  return {
    mid,
    upper: mid.map(m => m + mult * std),
    lower: mid.map(m => m - mult * std),
  };
}

/** Coppock Curve = WMA(ROC(14) + ROC(11), 10) */
export function calcCoppock(closes: number[], wmaLen = 10, r1 = 14, r2 = 11): number[] {
  const roc = (p: number) => closes.map((c, i) =>
    i < p ? NaN : ((c - closes[i - p]) / closes[i - p]) * 100
  );
  const combined = roc(r1).map((v, i) => {
    const v2 = roc(r2)[i];
    return isNaN(v) || isNaN(v2) ? NaN : v + v2;
  });
  const result: number[] = [];
  const start = combined.findIndex(v => !isNaN(v));
  for (let i = 0; i < start + wmaLen - 1; i++) result.push(NaN);
  for (let i = start + wmaLen - 1; i < closes.length; i++) {
    let sw = 0, sumW = 0;
    let valid = true;
    for (let j = 0; j < wmaLen; j++) {
      if (isNaN(combined[i - j])) { valid = false; break; }
      const w = wmaLen - j;
      sw += w * combined[i - j]; sumW += w;
    }
    result.push(valid ? sw / sumW : NaN);
  }
  return result;
}

/** EMA Cross signal */
export function emaCrossSignal(closes: number[], fast = 13, slow = 30): {
  signal: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'BULLISH' | 'BEARISH';
  score: number;
} {
  const eFast = calcEMA(closes, fast);
  const eSlow = calcEMA(closes, slow);
  const n = closes.length;
  const prev = eFast[n - 2] - eSlow[n - 2];
  const curr = eFast[n - 1] - eSlow[n - 1];
  if (prev <= 0 && curr > 0) return { signal: 'GOLDEN_CROSS', score: 3 };
  if (prev >= 0 && curr < 0) return { signal: 'DEATH_CROSS', score: -3 };
  if (curr > 0) return { signal: 'BULLISH', score: 1.5 };
  return { signal: 'BEARISH', score: -1.5 };
}
