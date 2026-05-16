import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
SQL Schema for Supabase Setup:

-- Create strategies table
CREATE TABLE strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  params JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create trades table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NEW', 'FILLED', 'CANCELED', 'REJECTED')),
  strategy_id UUID REFERENCES strategies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create signals table
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  strategy TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL')),
  price DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create bot_config table
CREATE TABLE bot_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_running BOOLEAN DEFAULT false,
  is_paper_trade BOOLEAN DEFAULT true,
  risk_per_trade DECIMAL DEFAULT 1.0,
  max_positions INTEGER DEFAULT 5,
  strategy_config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default bot config
INSERT INTO bot_config (is_running, risk_per_trade, max_positions) VALUES (false, 1.0, 5);

/*
CREATE TABLE ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  confidence INTEGER,
  reasoning TEXT,
  risks TEXT,
  confluence_score DECIMAL,
  news_sentiment DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE backtests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  strategy_config JSONB,
  initial_balance DECIMAL,
  final_balance DECIMAL,
  win_rate DECIMAL,
  max_drawdown DECIMAL,
  sharpe_ratio DECIMAL,
  profit_factor DECIMAL,
  total_trades INTEGER,
  equity_curve JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE cron_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  btc_signal TEXT,
  eth_signal TEXT,
  duration_ms INTEGER,
  error TEXT
);
*/
