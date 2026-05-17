export const calculateEMA = (period: number, data: number[]): number[] => {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const emas: number[] = [];
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  emas.push(ema);
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
};

export const calculateSMA = (period: number, data: number[]): number[] => {
  if (data.length < period) return [];
  const smas: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    smas.push(sum / period);
  }
  return smas;
};
