export interface StochPoint { k: number; d: number; }

export function calculateStochastic(
  highs: number[], lows: number[], closes: number[],
  kPeriod = 14, dPeriod = 3
): StochPoint[] {
  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const ll = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    rawK.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
  }
  const result: StochPoint[] = [];
  for (let i = dPeriod - 1; i < rawK.length; i++) {
    const d = rawK.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod;
    result.push({ k: rawK[i], d });
  }
  return result;
}
