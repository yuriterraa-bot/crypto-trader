export interface Strategy {
  id: string;
  name: string;
  params: any;
  is_active: boolean;
  created_at: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  status: 'NEW' | 'FILLED' | 'CANCELED' | 'REJECTED';
  strategy_id: string;
  created_at: string;
}

export interface Signal {
  id?: string;
  symbol: string;
  strategy?: string;
  signal_type?: 'BUY' | 'SELL';
  signal?: 'BUY' | 'SELL' | 'NEUTRAL';
  price?: number;
  score?: number;
  breakdown?: { indicator: string; contribution: number; signal: string }[];
  timestamp?: number;
  created_at?: string;
}

export interface StrategyConfig {
  indicators: Record<string, { active: boolean; weight: number }>;
  thresholds: { buy: number; sell: number };
  risk: { per_trade: number; rr_ratio: number; atr_multiplier: number };
}

export interface BotConfig {
  id?: string;
  is_running: boolean;
  is_paper_trade?: boolean;
  risk_per_trade: number;
  max_positions: number;
  strategy_config?: StrategyConfig;
  updated_at?: string;
}

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  high: number;
  low: number;
  price: number;
  timestamp: number;
}

export interface FVG {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  timestamp: number;
  filled: boolean;
}

export interface BOS {
  direction: 'bullish' | 'bearish';
  price: number;
  timestamp: number;
}

export interface CHoCH {
  direction: 'bullish' | 'bearish';
  price: number;
  timestamp: number;
}

export interface BinanceBalance {
  asset: string;
  balance: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
}

export interface BinancePosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: string;
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
}

export interface BinancePrice {
  symbol: string;
  price: string;
  time: number;
}

export interface NewsItem {
  id: number;
  title: string;
  domain: string;
  url: string;
  published_at: string;
  currencies: { code: string }[];
  votes: { positive: number; negative: number; important: number; liked: number; disliked: number; lol: number; toxic: number; saved: number; comments: number };
}

export interface SimulatedTrade {
  entryTime: number;
  exitTime: number | null;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number | null;
  size: number;
  pnl: number | null;
  status: 'OPEN' | 'CLOSED';
}

export interface BacktestParams {
  symbol: string;
  startDate: number;
  endDate: number;
  strategyConfig: StrategyConfig;
  initialBalance: number;
}

export interface BacktestMetrics {
  finalBalance: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  totalTrades: number;
}
