import { StrategyConfig, Candle } from '@/types';
import { ATR } from 'technicalindicators';

export const calculateRisk = (
  candles: Candle[],
  config: StrategyConfig,
  accountBalance: number, // Total USDT balance
  currentPositionsCount: number,
  maxPositions: number,
  signal: 'BUY' | 'SELL' | 'NEUTRAL'
) => {
  if (signal === 'NEUTRAL') {
    return { canTrade: false, reason: 'No signal' };
  }

  if (currentPositionsCount >= maxPositions) {
    return { canTrade: false, reason: 'Max positions reached' };
  }

  const currentPrice = candles[candles.length - 1].close;
  
  // Calculate ATR for stop loss
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const close = candles.map(c => c.close);
  
  const atrValues = ATR.calculate({ high, low, close, period: 14 });
  const currentAtr = atrValues.length > 0 ? atrValues[atrValues.length - 1] : currentPrice * 0.02; // fallback 2%
  
  const atrDistance = currentAtr * config.risk.atr_multiplier;
  
  // Stop Loss Price
  const stopLossPrice = signal === 'BUY' 
    ? currentPrice - atrDistance
    : currentPrice + atrDistance;

  // Take Profit Price (Risk/Reward Ratio)
  const takeProfitDistance = atrDistance * config.risk.rr_ratio;
  const takeProfitPrice = signal === 'BUY'
    ? currentPrice + takeProfitDistance
    : currentPrice - takeProfitDistance;

  // Position Sizing
  // Risk Amount = Account Balance * Risk Per Trade (%)
  const riskAmount = accountBalance * (config.risk.per_trade / 100);
  
  // Size = Risk Amount / Stop Loss Distance (in price)
  const stopLossDistance = Math.abs(currentPrice - stopLossPrice);
  
  // Size in Asset (e.g. BTC)
  let positionSizeAsset = stopLossDistance > 0 ? riskAmount / stopLossDistance : 0;
  
  // Convert to USDT notional value
  const notionalValue = positionSizeAsset * currentPrice;

  // Minimum notional value for Binance Futures is usually 5 USDT
  if (notionalValue < 5) {
    return { canTrade: false, reason: 'Calculated size is below Binance minimum notional value (5 USDT)' };
  }

  // Cap position size to max 20x leverage equivalent just as a safety net
  if (notionalValue > accountBalance * 20) {
    positionSizeAsset = (accountBalance * 20) / currentPrice;
  }

  return {
    canTrade: true,
    reason: 'Risk checks passed',
    positionSize: positionSizeAsset,
    notionalValue,
    stopLoss: stopLossPrice,
    takeProfit: takeProfitPrice,
    riskAmount
  };
};

export const trailingStop = (originalSL: number, currentPrice: number, side: 'BUY' | 'SELL', trailPercent: number) => {
  const pct = trailPercent / 100;
  if (side === 'BUY') {
    const trailingLevel = currentPrice * (1 - pct);
    return Math.max(originalSL, trailingLevel);
  } else {
    const trailingLevel = currentPrice * (1 + pct);
    return Math.min(originalSL, trailingLevel);
  }
};

export const breakEven = (entryPrice: number, currentPrice: number, side: 'BUY' | 'SELL', triggerRR: number, stopLossPrice: number) => {
  const riskAmount = Math.abs(entryPrice - stopLossPrice);
  
  if (side === 'BUY') {
    if (currentPrice >= entryPrice + (riskAmount * triggerRR)) {
      return entryPrice; // Move SL to entry
    }
  } else {
    if (currentPrice <= entryPrice - (riskAmount * triggerRR)) {
      return entryPrice; // Move SL to entry
    }
  }
  return stopLossPrice; // Don't move
};

export const partialClose = (positionSize: number, levels: { rr: number, percent: number }[], currentRR: number) => {
  // Find highest level crossed
  const passedLevels = levels.filter(l => currentRR >= l.rr).sort((a, b) => b.rr - a.rr);
  
  if (passedLevels.length > 0) {
    const targetLevel = passedLevels[0];
    return { 
      closeNow: true, 
      percentToClose: targetLevel.percent 
    };
  }
  return { closeNow: false, percentToClose: 0 };
};

export const dailyLossLimit = (todayPnl: number, accountBalance: number, limitPercent: number) => {
  const todayPnlPercent = (todayPnl / accountBalance) * 100;
  // If pnl is negative and exceeds limit
  const shouldStop = todayPnlPercent <= -limitPercent;
  
  return {
    shouldStop,
    todayPnlPercent
  };
};
