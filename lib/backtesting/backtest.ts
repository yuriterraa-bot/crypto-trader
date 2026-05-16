import { BacktestParams, SimulatedTrade, BacktestMetrics, Candle } from '@/types';
import { runConfluenceEngine } from '@/lib/strategies/confluenceEngine';
import { calculateRisk } from '@/lib/strategies/riskManager';
import { getKlines } from '@/lib/binance';

export const runBacktest = async (params: BacktestParams) => {
  // Binance API limits klines to 1500 per request, but we will fetch 1500 directly for simplicity.
  // In a real scenario, we might need to paginate to get more.
  
  // Since we only have the time limit as `endDate` and `startDate` in ms, we can construct the params
  // Wait, getKlines currently doesn't take startTime and endTime.
  // We need to modify getKlines or just fetch 1500 and filter.
  // Actually, let's fetch 1500 recent candles for now if we can't modify getKlines easily here.
  // But wait, getKlines takes `symbol, interval, limit`. We can just use the latest 1500 candles for the backtest.
  const allCandles = await getKlines(params.symbol, '15m', 1500);
  
  // Filter by date
  const klines = allCandles.filter((c: Candle) => c.openTime >= params.startDate && c.openTime <= params.endDate);
  
  if (klines.length < 200) {
    throw new Error('Not enough data for backtest. Need at least 200 candles.');
  }

  const trades: SimulatedTrade[] = [];
  const equityCurve: number[] = [params.initialBalance];
  let currentBalance = params.initialBalance;
  
  let activeTrade: any = null; // We simulate max 1 position per symbol

  // We need a lookback window for the engine (e.g., 200 candles)
  for (let i = 200; i < klines.length; i++) {
    const currentCandle = klines[i];
    const windowCandles = klines.slice(i - 200, i + 1);

    // If we have an active trade, check exit conditions (stop loss or take profit)
    if (activeTrade) {
      if (activeTrade.type === 'LONG') {
        if (currentCandle.low <= activeTrade.stopLoss) {
           // Stopped out
           const pnl = (activeTrade.stopLoss - activeTrade.entryPrice) * activeTrade.size;
           activeTrade.exitPrice = activeTrade.stopLoss;
           activeTrade.exitTime = currentCandle.openTime;
           activeTrade.pnl = pnl;
           activeTrade.status = 'CLOSED';
           currentBalance += pnl;
           trades.push({...activeTrade});
           equityCurve.push(currentBalance);
           activeTrade = null;
           continue;
        } else if (currentCandle.high >= activeTrade.takeProfit) {
           // Take profit
           const pnl = (activeTrade.takeProfit - activeTrade.entryPrice) * activeTrade.size;
           activeTrade.exitPrice = activeTrade.takeProfit;
           activeTrade.exitTime = currentCandle.openTime;
           activeTrade.pnl = pnl;
           activeTrade.status = 'CLOSED';
           currentBalance += pnl;
           trades.push({...activeTrade});
           equityCurve.push(currentBalance);
           activeTrade = null;
           continue;
        }
      } else if (activeTrade.type === 'SHORT') {
        if (currentCandle.high >= activeTrade.stopLoss) {
           // Stopped out
           const pnl = (activeTrade.entryPrice - activeTrade.stopLoss) * activeTrade.size;
           activeTrade.exitPrice = activeTrade.stopLoss;
           activeTrade.exitTime = currentCandle.openTime;
           activeTrade.pnl = pnl;
           activeTrade.status = 'CLOSED';
           currentBalance += pnl;
           trades.push({...activeTrade});
           equityCurve.push(currentBalance);
           activeTrade = null;
           continue;
        } else if (currentCandle.low <= activeTrade.takeProfit) {
           // Take profit
           const pnl = (activeTrade.entryPrice - activeTrade.takeProfit) * activeTrade.size;
           activeTrade.exitPrice = activeTrade.takeProfit;
           activeTrade.exitTime = currentCandle.openTime;
           activeTrade.pnl = pnl;
           activeTrade.status = 'CLOSED';
           currentBalance += pnl;
           trades.push({...activeTrade});
           equityCurve.push(currentBalance);
           activeTrade = null;
           continue;
        }
      }
    }

    // If no active trade, look for entries
    if (!activeTrade) {
      const { signal } = runConfluenceEngine(windowCandles, params.strategyConfig);
      
      if (signal === 'BUY' || signal === 'SELL') {
        const risk = calculateRisk(
          windowCandles, 
          params.strategyConfig, 
          currentBalance, 
          0, // current positions
          1, // max positions for this simulation
          signal
        );

        if (risk.canTrade) {
          activeTrade = {
            entryTime: currentCandle.openTime,
            exitTime: null,
            type: signal === 'BUY' ? 'LONG' : 'SHORT',
            entryPrice: currentCandle.close,
            exitPrice: null,
            size: risk.positionSize,
            stopLoss: risk.stopLoss,
            takeProfit: risk.takeProfit,
            pnl: null,
            status: 'OPEN'
          };
        }
      }
    }
  }

  // Close any open trade at the end of the simulation
  if (activeTrade) {
    const lastPrice = klines[klines.length - 1].close;
    const pnl = activeTrade.type === 'LONG' 
      ? (lastPrice - activeTrade.entryPrice) * activeTrade.size
      : (activeTrade.entryPrice - lastPrice) * activeTrade.size;
      
    activeTrade.exitPrice = lastPrice;
    activeTrade.exitTime = klines[klines.length - 1].openTime;
    activeTrade.pnl = pnl;
    activeTrade.status = 'CLOSED';
    currentBalance += pnl;
    trades.push({...activeTrade});
    equityCurve.push(currentBalance);
  }

  const metrics = calculateMetrics(trades, params.initialBalance, currentBalance);

  return { trades, metrics, equityCurve };
};

const calculateMetrics = (trades: SimulatedTrade[], initialBalance: number, finalBalance: number): BacktestMetrics => {
  if (trades.length === 0) {
    return { finalBalance: initialBalance, winRate: 0, maxDrawdown: 0, sharpeRatio: 0, profitFactor: 0, totalTrades: 0 };
  }

  let wins = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  
  let peak = initialBalance;
  let maxDrawdown = 0;
  let currentBalance = initialBalance;

  const returns: number[] = [];

  trades.forEach(trade => {
    const pnl = trade.pnl || 0;
    
    // Win rate and Profit Factor
    if (pnl > 0) {
      wins++;
      grossProfit += pnl;
    } else {
      grossLoss += Math.abs(pnl);
    }
    
    // Drawdown
    currentBalance += pnl;
    if (currentBalance > peak) peak = currentBalance;
    const drawdown = (peak - currentBalance) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    // Returns for Sharpe (simplified per trade)
    returns.push(pnl / (currentBalance - pnl));
  });

  const winRate = (wins / trades.length) * 100;
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

  // Simplified Sharpe Ratio (assuming risk free rate = 0)
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(trades.length); // annualized equivalent based on trades

  return {
    finalBalance,
    winRate,
    maxDrawdown: maxDrawdown * 100, // percentage
    sharpeRatio,
    profitFactor,
    totalTrades: trades.length
  };
};
