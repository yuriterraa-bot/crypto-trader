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
      ? positionsData.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0.0001)
      : [];

    const managed: any[] = [];

    for (const pos of openPositions) {
      const symbol = pos.symbol;
      const posAmt = parseFloat(pos.positionAmt);
      const qty = Math.abs(posAmt);
      const currentSide = posAmt > 0 ? 'LONG' : 'SHORT';
      const closeSide: 'BUY' | 'SELL' = currentSide === 'LONG' ? 'SELL' : 'BUY';
      const entryPrice = parseFloat(pos.entryPrice || '0');
      const currentPrice = parseFloat(pos.markPrice || pos.entryPrice || '0');
      const pnlUSDT = parseFloat(pos.unRealizedProfit || pos.unrealizedProfit || '0');
      // Use leverage from Binance position, not config
      const leverage = parseFloat(pos.leverage) || config.leverage || 3;

      const pnlPercent = currentSide === 'LONG'
        ? (currentPrice - entryPrice) / entryPrice * 100 * leverage
        : (entryPrice - currentPrice) / entryPrice * 100 * leverage;

      // Duration: use Supabase trade first, then Binance updateTime, then 0
      const { data: openTrade } = await supabase
        .from('trades')
        .select('*')
        .eq('symbol', symbol)
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false })
        .limit(1);

      const trade = openTrade?.[0];

      // Fallback to Binance updateTime if no Supabase record
      const openTimeMs = trade?.open_time
        ? new Date(trade.open_time).getTime()
        : pos.updateTime
          ? parseInt(pos.updateTime)
          : null;

      const durationMinutes = openTimeMs
        ? (Date.now() - openTimeMs) / 60000
        : 0;

      const sl = parseFloat(config.stop_loss_percent) || 1.0;
      const tp = parseFloat(config.take_profit_percent) || 2.0;
      const maxDur = config.max_trade_duration_minutes; // 0 = sem timeout (fechar só por SL/TP)

      let closeReason: 'WIN' | 'LOSS' | 'TIMEOUT' | null = null;

      if (pnlPercent >= tp) closeReason = 'WIN';
      else if (pnlPercent <= -sl) closeReason = 'LOSS';
      else if (maxDur > 0 && durationMinutes >= maxDur) closeReason = 'TIMEOUT'; // 0 = desativado


      console.log(`[MANAGE] ${symbol} | side:${currentSide} | pnl%:${pnlPercent.toFixed(2)} | sl:${-sl} tp:${tp} | dur:${durationMinutes.toFixed(1)}min | reason:${closeReason || 'HOLD'}`);

      if (closeReason) {
        let closeError: string | null = null;

        if (!config.is_paper_trade) {
          try {
            await closePosition(symbol, closeSide, qty);
            console.log(`[MANAGE] ✓ ${symbol} closed ${closeSide} qty:${qty}`);
          } catch (e: any) {
            closeError = e.response?.data?.msg || e.message;
            console.error(`[MANAGE] ✗ ${symbol} close FAILED:`, closeError);
          }
        }

        // Update Supabase record (best-effort)
        if (trade?.id) {
          try {
            await supabase.from('trades').update({
              status: closeReason,
              exit_price: currentPrice,
              pnl: pnlUSDT,
              closed_at: new Date().toISOString(),
            }).eq('id', trade.id);
          } catch { /* best-effort, ignore failures */ }
        }

        managed.push({
          symbol,
          action: `CLOSE_${closeReason}`,
          pnlPercent: pnlPercent.toFixed(2),
          pnlUSDT: pnlUSDT.toFixed(4),
          durationMinutes: durationMinutes.toFixed(1),
          qty,
          closeError,
        });
      } else {
        managed.push({
          symbol,
          action: 'HOLD',
          currentSide,
          entryPrice,
          currentPrice,
          pnlPercent: pnlPercent.toFixed(2),
          pnlUSDT: pnlUSDT.toFixed(4),
          durationMinutes: durationMinutes.toFixed(1),
          qty,
          sl: -sl, tp, maxDur,
        });
      }
    }

    return NextResponse.json({ status: 'ok', managed }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('[MANAGE] Fatal error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
