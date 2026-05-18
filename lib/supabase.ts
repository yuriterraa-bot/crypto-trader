import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

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

/*
-- Executar no Supabase SQL Editor:
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON cron_logs
  USING (true) WITH CHECK (true);

ALTER TABLE bot_config 
ADD COLUMN IF NOT EXISTS timeframe TEXT DEFAULT '15m',
ADD COLUMN IF NOT EXISTS use_mtf BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS session_filter JSONB DEFAULT '{"asia":true,"london":true,"ny":true}'::jsonb,
ADD COLUMN IF NOT EXISTS trailing_stop_percent DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS use_trailing_stop BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS use_break_even BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS break_even_rr DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS daily_loss_limit_percent DECIMAL DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS partial_close_levels JSONB DEFAULT '[{"rr":1,"percent":30},{"rr":2,"percent":40}]'::jsonb,
ADD COLUMN IF NOT EXISTS always_in_market BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS leverage INTEGER DEFAULT 3;


ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Allow all for service role" ON ai_analysis
  USING (true) WITH CHECK (true);

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for anon" ON signals
  FOR SELECT USING (true);
CREATE POLICY "Allow insert for service role" ON signals
  FOR INSERT WITH CHECK (true);
*/
