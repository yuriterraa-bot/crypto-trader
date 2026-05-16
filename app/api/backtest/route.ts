import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runBacktest } from '@/lib/backtesting/backtest';
import { BacktestParams } from '@/types';

export async function POST(request: Request) {
  try {
    const params: BacktestParams = await request.json();
    
    // Run backtest
    const { trades, metrics, equityCurve } = await runBacktest(params);

    // Save to Supabase
    const { data, error } = await supabase.from('backtests').insert([{
      symbol: params.symbol,
      start_date: new Date(params.startDate).toISOString(),
      end_date: new Date(params.endDate).toISOString(),
      strategy_config: params.strategyConfig,
      initial_balance: params.initialBalance,
      final_balance: metrics.finalBalance,
      win_rate: metrics.winRate,
      max_drawdown: metrics.maxDrawdown,
      sharpe_ratio: metrics.sharpeRatio,
      profit_factor: metrics.profitFactor,
      total_trades: metrics.totalTrades,
      equity_curve: equityCurve
    }]).select().single();

    if (error) throw error;

    return NextResponse.json({ trades, metrics, equityCurve, id: data.id });
  } catch (error: any) {
    console.error('Backtest error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('backtests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
