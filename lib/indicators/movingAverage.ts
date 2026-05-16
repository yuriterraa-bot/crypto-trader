import { SMA, EMA } from 'technicalindicators';

export const calculateSMA = (period: number, values: number[]) => {
  return SMA.calculate({ period, values });
};

export const calculateEMA = (period: number, values: number[]) => {
  return EMA.calculate({ period, values });
};
