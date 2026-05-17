export const calculateStochastic = (
  highs: number[], lows: number[], closes: number[], 
  kPeriod = 14, dPeriod = 3
): { k: number; d: number }[] => {
  const results: { k: number; d: number }[] = [];
  const kValues: number[] = [];
  
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
    const periodLows = lows.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    const range = highestHigh - lowestLow;
    const k = range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100;
    kValues.push(k);
  }
  
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const d = kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod;
    results.push({ k: kValues[i], d });
  }
  
  return results;
};
