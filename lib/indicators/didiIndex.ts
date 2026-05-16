import { SMA } from 'technicalindicators';

export const calculateDidiIndex = (closePrices: number[]) => {
  const sma3 = SMA.calculate({ period: 3, values: closePrices });
  const sma8 = SMA.calculate({ period: 8, values: closePrices });
  const sma20 = SMA.calculate({ period: 20, values: closePrices });

  // Didi Index uses the 8-period SMA as a zero-line (reference)
  // We calculate the distance of SMA3 and SMA20 to the SMA8
  
  const minLength = Math.min(sma3.length, sma8.length, sma20.length);
  
  // Align arrays to the end
  const sma3Aligned = sma3.slice(sma3.length - minLength);
  const sma8Aligned = sma8.slice(sma8.length - minLength);
  const sma20Aligned = sma20.slice(sma20.length - minLength);

  const didi3: number[] = [];
  const didi20: number[] = [];
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';

  for (let i = 0; i < minLength; i++) {
    // Distance from the reference line (SMA8)
    const d3 = sma3Aligned[i] - sma8Aligned[i];
    const d20 = sma20Aligned[i] - sma8Aligned[i];
    
    didi3.push(d3);
    didi20.push(d20);
    
    // Check for "Agulhada" in the last few periods
    if (i === minLength - 1 && i > 0) {
      const prevD3 = didi3[i - 1];
      const prevD20 = didi20[i - 1];
      
      // All moving averages very close to zero in the previous period
      const threshold = (closePrices[closePrices.length - 1] * 0.001); // 0.1% threshold for "closeness"
      const wasPinched = Math.abs(prevD3) < threshold && Math.abs(prevD20) < threshold;
      
      if (wasPinched) {
        if (d3 > 0 && d20 < 0) {
          signal = 'BUY'; // Agulhada para cima
        } else if (d3 < 0 && d20 > 0) {
          signal = 'SELL'; // Agulhada para baixo
        }
      }
    }
  }

  return { didi3, didi20, signal };
};
