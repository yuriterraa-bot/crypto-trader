import { Stochastic } from 'technicalindicators';

export const calculateStochastic = (
  high: number[],
  low: number[],
  close: number[],
  period: number = 14,
  signalPeriod: number = 3
) => {
  return Stochastic.calculate({
    high,
    low,
    close,
    period,
    signalPeriod
  });
};
