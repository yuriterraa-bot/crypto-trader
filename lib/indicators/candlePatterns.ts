import { Candle } from '@/types';

export interface CandlePattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  strength: 'fraco' | 'moderado' | 'forte';
  description: string;
  candleIndex: number;
}

export const detectPatterns = (candles: Candle[]): CandlePattern[] => {
  const patterns: CandlePattern[] = [];
  if (candles.length < 5) return patterns;

  // Detect patterns in the last 10 candles
  const start = Math.max(2, candles.length - 10);
  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];

    const cClose = parseFloat(c.close as any);
    const cOpen = parseFloat(c.open as any);
    const cHigh = parseFloat(c.high as any);
    const cLow = parseFloat(c.low as any);

    const prevClose = parseFloat(prev.close as any);
    const prevOpen = parseFloat(prev.open as any);
    const prevHigh = parseFloat(prev.high as any);
    const prevLow = parseFloat(prev.low as any);

    const body = Math.abs(cClose - cOpen);
    const range = cHigh - cLow;
    if (range === 0) continue;

    const upperWick = cHigh - Math.max(cOpen, cClose);
    const lowerWick = Math.min(cOpen, cClose) - cLow;
    const isBullish = cClose > cOpen;
    const isBearish = cClose < cOpen;

    const prevBody = Math.abs(prevClose - prevOpen);
    const prevIsBullish = prevClose > prevOpen;
    const prevIsBearish = prevClose < prevOpen;

    // 1. Doji
    if (body < range * 0.1) {
      patterns.push({
        name: 'Doji',
        type: 'neutral',
        strength: 'moderado',
        description: 'Indecisão do mercado. Equilíbrio entre compradores e vendedores.',
        candleIndex: i
      });
    }

    // 2. Hammer (Martelo)
    if (lowerWick > body * 2 && upperWick < body * 0.5 && isBullish) {
      patterns.push({
        name: 'Martelo (Hammer)',
        type: 'bullish',
        strength: 'forte',
        description: 'Pressão compradora forte após queda. Possível reversão de alta.',
        candleIndex: i
      });
    }

    // 3. Shooting Star (Estrela Cadente)
    if (upperWick > body * 2 && lowerWick < body * 0.5 && isBearish) {
      patterns.push({
        name: 'Estrela Cadente',
        type: 'bearish',
        strength: 'forte',
        description: 'Pressão vendedora forte após alta. Possível reversão de baixa.',
        candleIndex: i
      });
    }

    // 4. Engulfing Bullish (Engolfo de Alta)
    if (isBullish && prevIsBearish && cOpen <= prevClose && cClose >= prevOpen && body > prevBody) {
      patterns.push({
        name: 'Engolfo de Alta',
        type: 'bullish',
        strength: 'forte',
        description: 'Reversão de alta confirmada por corpo que engole a vela anterior.',
        candleIndex: i
      });
    }

    // 5. Engulfing Bearish (Engolfo de Baixa)
    if (isBearish && prevIsBullish && cOpen >= prevClose && cClose <= prevOpen && body > prevBody) {
      patterns.push({
        name: 'Engolfo de Baixa',
        type: 'bearish',
        strength: 'forte',
        description: 'Reversão de baixa confirmada por corpo que engole a vela anterior.',
        candleIndex: i
      });
    }

    // 6. Marubozu Bullish
    if (isBullish && upperWick < body * 0.05 && lowerWick < body * 0.05 && body > range * 0.9) {
      patterns.push({
        name: 'Marubozu de Alta',
        type: 'bullish',
        strength: 'forte',
        description: 'Força compradora extremamente dominante, sem sombras relevantes.',
        candleIndex: i
      });
    }

    // 7. Marubozu Bearish
    if (isBearish && upperWick < body * 0.05 && lowerWick < body * 0.05 && body > range * 0.9) {
      patterns.push({
        name: 'Marubozu de Baixa',
        type: 'bearish',
        strength: 'forte',
        description: 'Força vendedora extremamente dominante, sem sombras relevantes.',
        candleIndex: i
      });
    }

    // 8. Pinbar (Sombra longa)
    if ((upperWick > body * 3 || lowerWick > body * 3) && body < range * 0.25) {
      const pinType = lowerWick > upperWick ? 'bullish' : 'bearish';
      patterns.push({
        name: 'Pinbar',
        type: pinType,
        strength: 'forte',
        description: `Forte rejeição de preço na extremidade ${pinType === 'bullish' ? 'inferior' : 'superior'}.`,
        candleIndex: i
      });
    }

    // 9. Morning Star (Estrela da Manhã) - Padrão de 3 candles
    if (prev2) {
      const prev2Close = parseFloat(prev2.close as any);
      const prev2Open = parseFloat(prev2.open as any);
      const prev2IsBearish = prev2Close < prev2Open;
      const prev2Body = Math.abs(prev2Close - prev2Open);

      if (
        prev2IsBearish && // 1º candle: Bearish grande
        prevBody < prev2Body * 0.3 && // 2º candle: Estrela pequena
        isBullish && cClose > (prev2Open + prev2Close) / 2 // 3º candle: Bullish grande subindo mais de 50% do 1º
      ) {
        patterns.push({
          name: 'Estrela da Manhã (Morning Star)',
          type: 'bullish',
          strength: 'forte',
          description: 'Padrão clássico de reversão de alta de 3 velas após tendência de queda.',
          candleIndex: i
        });
      }
    }

    // 10. Evening Star (Estrela da Tarde) - Padrão de 3 candles
    if (prev2) {
      const prev2Close = parseFloat(prev2.close as any);
      const prev2Open = parseFloat(prev2.open as any);
      const prev2IsBullish = prev2Close > prev2Open;
      const prev2Body = Math.abs(prev2Close - prev2Open);

      if (
        prev2IsBullish && // 1º candle: Bullish grande
        prevBody < prev2Body * 0.3 && // 2º candle: Estrela pequena
        isBearish && cClose < (prev2Open + prev2Close) / 2 // 3º candle: Bearish grande caindo mais de 50% do 1º
      ) {
        patterns.push({
          name: 'Estrela da Tarde (Evening Star)',
          type: 'bearish',
          strength: 'forte',
          description: 'Padrão clássico de reversão de baixa de 3 velas após tendência de alta.',
          candleIndex: i
        });
      }
    }
  }

  return patterns;
};
