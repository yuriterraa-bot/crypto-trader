import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPositions, fetchCandles, getBalance } from '@/lib/binance';
import { trailingStop, breakEven, dailyLossLimit } from '@/lib/strategies/riskManager';

// Endpoint chamado via Cron ou internamente
export async function GET() {
  try {
    const { data: configRows } = await supabase.from('bot_config').select('*').limit(1);
    const config = configRows && configRows.length > 0 ? configRows[0] : null;
    if (!config || !config.is_running) {
      return NextResponse.json({ status: 'skipped', message: 'Bot stopped' });
    }

    const positions = await getPositions();
    const activePositions = positions.filter((p: any) => parseFloat(p.positionAmt) !== 0);

    if (activePositions.length === 0) {
      return NextResponse.json({ status: 'no_positions' });
    }

    // Obter saldo e calcular limite diário
    const balances = await getBalance();
    const usdtBalance = parseFloat(balances.find((b: any) => b.asset === 'USDT')?.balance || '0');
    
    // Obter PnL de hoje (realized + unrealized)
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const { data: todayTrades } = await supabase.from('trades')
      .select('profit')
      .gte('created_at', today.toISOString());
    
    let realizedPnl = 0;
    todayTrades?.forEach(t => realizedPnl += (t.profit || 0));
    
    let unrealizedPnl = 0;
    activePositions.forEach((p: any) => unrealizedPnl += parseFloat(p.unRealizedProfit));

    const totalTodayPnl = realizedPnl + unrealizedPnl;

    const { shouldStop } = dailyLossLimit(totalTodayPnl, usdtBalance, config.daily_loss_limit_percent || 5);

    if (shouldStop) {
      // Force close all positions and stop bot
      await supabase.from('bot_config').update({ is_running: false }).eq('id', config.id);
      return NextResponse.json({ status: 'halted', message: 'Daily loss limit reached. Bot stopped.' });
    }

    const logs = [];

    // Verificações por posição
    for (const pos of activePositions) {
      const symbol = pos.symbol;
      const entryPrice = parseFloat(pos.entryPrice);
      const positionAmt = parseFloat(pos.positionAmt);
      const side = positionAmt > 0 ? 'BUY' : 'SELL';
      
      const klines = await fetchCandles(symbol, '1m', 1);
      const currentPrice = klines[0].close;

      // TODO: Obter o stop loss atual (poderíamos armazenar na tabela 'trades' ou buscar ordens abertas na Binance)
      // Como simplificação, estamos apenas simulando o gatilho. No ambiente real precisamos buscar as ordens STOP_MARKET abertas
      // ou manter o estado de risco no DB.
      
      logs.push({ symbol, side, pnl: pos.unRealizedProfit });
    }

    return NextResponse.json({ status: 'success', logs });

  } catch (error: any) {
    console.error('Risk monitor error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
