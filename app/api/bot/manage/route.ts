import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPositions, closePosition } from '@/lib/binance';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: configRows } = await supabase
      .from('bot_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    const config = configRows?.[0] || {
      is_running: true, is_paper_trade: false, leverage: 3,
      stop_loss_percent: 1.0, take_profit_percent: 2.0,
      max_trade_duration_minutes: 30,
    };

    if (!config.is_running) {
      return NextResponse.json({ status: 'stopped', managed: [] });
    }

    const positionsData = await getPositions().catch(() => []);
    const openPositions = Array.isArray(positionsData)
      ? positionsData.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0)
      : [];

    const managed: any[] = [];

    for (const pos of openPositions) {
      const symbol = pos.symbol;
      const posAmt = parseFloat(pos.positionAmt);
      const currentSide = posAmt > 0 ? 'LONG' : 'SHORT';
      const entryPrice = parseFloat(pos.entryPrice || pos.avgCost || '0');
      const currentPrice = parseFloat(pos.markPrice || pos.entryPrice || '0');
      const pnlUSDT = parseFloat(pos.unrealizedProfit || pos.unRealizedProfit || '0');
      const leverage = config.leverage || 3;

      const pnlPercent = currentSide === 'LONG'
        ? (currentPrice - entryPrice) / entryPrice * 100 * leverage
        : (entryPrice - currentPrice) / entryPrice * 100 * leverage;

      // Buscar trade aberto no Supabase
      const { data: openTrade } = await supabase
        .from('trades')
        .select('*')
        .eq('symbol', symbol)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false })
        .limit(1);

      const trade = openTrade?.[0];
      const openTime = trade?.open_time ? new Date(trade.open_time).getTime() : Date.now();
      const durationMinutes = (Date.now() - openTime) / 60000;

      const sl = config.stop_loss_percent || 1.0;
      const tp = config.take_profit_percent || 2.0;
      const maxDur = config.max_trade_duration_minutes || 30;

      let closeReason: 'WIN' | 'LOSS' | 'TIMEOUT' | null = null;

      if (pnlPercent >= tp) closeReason = 'WIN';
      else if (pnlPercent <= -sl) closeReason = 'LOSS';
      else if (durationMinutes >= maxDur) closeReason = 'TIMEOUT';

      if (closeReason) {
        const closeSide: 'BUY' | 'SELL' = currentSide === 'LONG' ? 'SELL' : 'BUY';

        if (!config.is_paper_trade) {
          await closePosition(symbol, closeSide)
            .catch((e: any) => console.error('[MANAGE] closePosition error:', e.response?.data || e.message));
        }

        if (trade?.id) {
          await supabase.from('trades').update({
            status: closeReason,
            exit_price: currentPrice,
            pnl: pnlUSDT,
            closed_at: new Date().toISOString(),
          }).eq('id', trade.id);
        }

        console.log(`[MANAGE] ${symbol} closed: ${closeReason} | PnL: ${pnlPercent.toFixed(2)}%`);
        managed.push({ symbol, action: `CLOSE_${closeReason}`, pnlPercent: pnlPercent.toFixed(2), pnlUSDT, durationMinutes: durationMinutes.toFixed(1) });
      } else {
        managed.push({
          symbol, action: 'HOLD', currentSide,
          entryPrice, currentPrice,
          pnlPercent: pnlPercent.toFixed(2),
          pnlUSDT,
          durationMinutes: durationMinutes.toFixed(1),
          sl, tp, maxDur,
          slPrice: trade?.stop_loss || null,
          tpPrice: trade?.take_profit || null,
        });
      }
    }

    return NextResponse.json({ status: 'ok', managed }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('[MANAGE] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
