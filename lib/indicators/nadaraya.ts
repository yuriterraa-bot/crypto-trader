export const calculateNadarayaWatson = (closePrices: number[], bandwidth: number = 8, lookback: number = 100) => {
  const envelope_upper: number[] = [];
  const envelope_lower: number[] = [];
  let trend: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
  
  if (closePrices.length < lookback) {
    return { envelope_upper, envelope_lower, trend };
  }

  const prices = closePrices.slice(-lookback);
  const n = prices.length;
  
  // Gaussian kernel weighting
  const getWeight = (i: number, j: number, h: number) => {
    return Math.exp(-Math.pow(i - j, 2) / (2 * Math.pow(h, 2)));
  };

  const smoothed: number[] = [];

  for (let i = 0; i < n; i++) {
    let sumWeights = 0;
    let sumPriceWeights = 0;
    
    for (let j = 0; j < n; j++) {
      const weight = getWeight(i, j, bandwidth);
      sumWeights += weight;
      sumPriceWeights += weight * prices[j];
    }
    
    smoothed.push(sumPriceWeights / sumWeights);
  }

  // Calculate Mean Absolute Error for the envelopes
  let mae = 0;
  for (let i = 0; i < n; i++) {
    mae += Math.abs(prices[i] - smoothed[i]);
  }
  mae = mae / n;
  
  const mult = 1.5; // Envelope multiplier

  for (let i = 0; i < n; i++) {
    envelope_upper.push(smoothed[i] + mae * mult);
    envelope_lower.push(smoothed[i] - mae * mult);
  }
  
  // Determine trend based on the last few smoothed points
  if (n >= 2) {
    const lastSmoothed = smoothed[n - 1];
    const prevSmoothed = smoothed[n - 2];
    const diff = (lastSmoothed - prevSmoothed) / prevSmoothed;
    
    if (diff > 0.0005) {
      trend = 'UP';
    } else if (diff < -0.0005) {
      trend = 'DOWN';
    } else {
      trend = 'SIDEWAYS';
    }
  }

  return { envelope_upper, envelope_lower, trend };
};
