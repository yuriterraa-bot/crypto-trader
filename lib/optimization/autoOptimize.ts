import { fetchCandles } from '@/lib/binance';
import { runConfluenceEngine } from '@/lib/strategies/confluenceEngine';
import { StrategyConfig } from '@/types';

export const autoOptimize = async (symbol: string, lookbackDays: number) => {
  // Configs to test
  const testWeights = [1, 2, 3, 4, 5];
  const testBuyThresholds = [40, 50, 60, 70, 80];
  const testSellThresholds = [40, 50, 60, 70, 80];
  const testTimeframes = ['15m', '1h', '4h'];

  const results = [];

  // Limit combinations to avoid excessive time
  // For demo, we just sample a few combinations
  const combinations = [
    { t: '15m', buy: 60, sell: 60, w: { smc: 4, didi: 3, nadaraya: 3 } },
    { t: '15m', buy: 50, sell: 50, w: { smc: 5, didi: 2, nadaraya: 2 } },
    { t: '1h', buy: 70, sell: 70, w: { smc: 3, didi: 4, nadaraya: 4 } },
    { t: '4h', buy: 60, sell: 60, w: { smc: 5, didi: 1, nadaraya: 1 } },
    { t: '15m', buy: 80, sell: 80, w: { smc: 4, didi: 4, nadaraya: 4 } },
  ];

  for (const combo of combinations) {
    try {
      const limit = Math.min(1000, lookbackDays * 24 * (combo.t === '15m' ? 4 : (combo.t === '1h' ? 1 : 0.25)));
      const candles = await fetchCandles(symbol, combo.t, Math.floor(limit));

      // Simulate
      let initialBalance = 1000;
      let balance = initialBalance;
      let wins = 0;
      let losses = 0;
      let maxDrawdown = 0;
      let peak = balance;

      // Simplistic backtest over historical candles (stepped)
      for (let i = 50; i < candles.length - 1; i++) {
        const slice = candles.slice(0, i);
        
        const config: StrategyConfig = {
          indicators: {
            ma: { active: true, weight: 1 },
            stochastic: { active: true, weight: 1 },
            fibonacci: { active: true, weight: 2 },
            didi: { active: true, weight: combo.w.didi },
            nadaraya: { active: true, weight: combo.w.nadaraya },
            smc: { active: true, weight: combo.w.smc },
          },
          thresholds: { buy: combo.buy, sell: combo.sell },
          risk: { per_trade: 1, rr_ratio: 2, atr_multiplier: 1.5 }
        };

        const { signal } = runConfluenceEngine(slice, config);
        
        if (signal === 'BUY' || signal === 'SELL') {
          // Assume outcome based on next candle (super simplistic)
          const nextCandle = candles[i+1];
          const isWin = signal === 'BUY' 
            ? nextCandle.close > nextCandle.open 
            : nextCandle.close < nextCandle.open;

          if (isWin) {
            wins++;
            balance += (balance * 0.01 * 2); // 2R win
          } else {
            losses++;
            balance -= (balance * 0.01); // 1R loss
          }

          if (balance > peak) peak = balance;
          const dd = (peak - balance) / peak;
          if (dd > maxDrawdown) maxDrawdown = dd;
        }
      }

      const totalTrades = wins + losses;
      const winRate = totalTrades > 0 ? wins / totalTrades : 0;
      const profitFactor = losses > 0 ? (wins * 2) / losses : (wins > 0 ? 99 : 0);
      const sharpeRatio = (winRate * 2 - (1 - winRate)) / (maxDrawdown || 0.01); // simplified

      results.push({
        config: combo,
        metrics: {
          winRate: winRate * 100,
          sharpeRatio,
          profitFactor,
          maxDrawdown: maxDrawdown * 100,
          totalTrades,
          finalBalance: balance
        }
      });

    } catch (e) {
      console.error('Auto optimize error:', e);
    }
  }

  return results.sort((a, b) => b.metrics.sharpeRatio - a.metrics.sharpeRatio).slice(0, 5);
};
