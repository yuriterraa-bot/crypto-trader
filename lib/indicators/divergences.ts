import { Candle } from '@/types';

export interface DivergenceResult {
  type: 'bullish_regular' | 'bearish_regular' | 'bullish_hidden' | 'bearish_hidden';
  description: string;
  strength: 'fraco' | 'moderado' | 'forte';
  startIndex: number;
  endIndex: number;
}

export const detectDivergences = (
  candles: Candle[],
  rsiValues: number[]
): DivergenceResult[] => {
  const divergences: DivergenceResult[] = [];
  if (candles.length < 20 || rsiValues.length < 20) return divergences;

  const closes = candles.map(c => parseFloat(c.close as any));
  const highs = candles.map(c => parseFloat(c.high as any));
  const lows = candles.map(c => parseFloat(c.low as any));

  // Align arrays: rsiValues matches the index of closes.
  // In our project, calcRSI outputs an array of the same length as closes, with NaNs at the beginning.
  const lookback = 25;
  const endIdx = closes.length - 1;
  const startIdx = Math.max(5, closes.length - lookback);

  // We search for pivots (peaks/troughs) in Price and check if RSI forms a divergence.
  for (let i = startIdx + 2; i < endIdx; i++) {
    // 1. TROUGHS (Fundos) - for Bullish Divergences
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      // Find a previous trough within the lookback window
      for (let j = i - 3; j >= startIdx; j--) {
        if (lows[j] < lows[j - 1] && lows[j] < lows[j + 1]) {
          const priceCurrentLow = lows[i];
          const pricePrevLow = lows[j];
          const rsiCurrentLow = rsiValues[i];
          const rsiPrevLow = rsiValues[j];

          if (isNaN(rsiCurrentLow) || isNaN(rsiPrevLow)) continue;

          // A. Regular Bullish Divergence: Price Lower Low + RSI Higher Low (reversal bullish)
          if (priceCurrentLow < pricePrevLow * 0.999 && rsiCurrentLow > rsiPrevLow + 2) {
            divergences.push({
              type: 'bullish_regular',
              description: 'Divergência Bullish Regular: Preço fez fundo mais baixo, mas RSI fez fundo mais alto. Forte sinal de reversão de alta.',
              strength: rsiCurrentLow < 30 ? 'forte' : 'moderado',
              startIndex: j,
              endIndex: i
            });
          }
          // B. Hidden Bullish Divergence: Price Higher Low + RSI Lower Low (continuation bullish)
          else if (priceCurrentLow > pricePrevLow * 1.001 && rsiCurrentLow < rsiPrevLow - 2) {
            divergences.push({
              type: 'bullish_hidden',
              description: 'Divergência Bullish Oculta: Preço fez fundo mais alto, mas RSI fez fundo mais baixo. Sinal de continuação de tendência de alta.',
              strength: 'moderado',
              startIndex: j,
              endIndex: i
            });
          }
          break;
        }
      }
    }

    // 2. PEAKS (Topos) - for Bearish Divergences
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      // Find a previous peak within the lookback window
      for (let j = i - 3; j >= startIdx; j--) {
        if (highs[j] > highs[j - 1] && highs[j] > highs[j + 1]) {
          const priceCurrentHigh = highs[i];
          const pricePrevHigh = highs[j];
          const rsiCurrentHigh = rsiValues[i];
          const rsiPrevHigh = rsiValues[j];

          if (isNaN(rsiCurrentHigh) || isNaN(rsiPrevHigh)) continue;

          // A. Regular Bearish Divergence: Price Higher High + RSI Lower High (reversal bearish)
          if (priceCurrentHigh > pricePrevHigh * 1.001 && rsiCurrentHigh < rsiPrevHigh - 2) {
            divergences.push({
              type: 'bearish_regular',
              description: 'Divergência Bearish Regular: Preço fez topo mais alto, mas RSI fez topo mais baixo. Forte sinal de reversão de baixa.',
              strength: rsiCurrentHigh > 70 ? 'forte' : 'moderado',
              startIndex: j,
              endIndex: i
            });
          }
          // B. Hidden Bearish Divergence: Price Lower High + RSI Higher High (continuation bearish)
          else if (priceCurrentHigh < pricePrevHigh * 0.999 && rsiCurrentHigh > rsiPrevHigh + 2) {
            divergences.push({
              type: 'bearish_hidden',
              description: 'Divergência Bearish Oculta: Preço fez topo mais baixo, mas RSI fez topo mais alto. Sinal de continuação de tendência de baixa.',
              strength: 'moderado',
              startIndex: j,
              endIndex: i
            });
          }
          break;
        }
      }
    }
  }

  // Deduplicate and return only the latest divergence for the symbol to keep visual results clean.
  return divergences.slice(-3);
};
