export interface BBPoint {
  upper: number;
  middle: number;
  lower: number;
  width: number;
  percentB: number;
}

export function calculateBollingerBands(
  closes: number[], period = 20, stdDevMult = 2
): BBPoint[] {
  const result: BBPoint[] = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    const upper = mean + stdDevMult * std;
    const lower = mean - stdDevMult * std;
    const width = upper - lower;
    const percentB = width === 0 ? 0.5 : (closes[i] - lower) / width;
    result.push({ upper, middle: mean, lower, width, percentB });
  }
  return result;
}
