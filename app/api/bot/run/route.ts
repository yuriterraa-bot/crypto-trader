import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  fetchCandles, getBalance, getPositions,
  openPosition, closePosition, calculateQuantity,
  setLeverage, createRawOrder
} from '@/lib/binance';
import { confluenceStrategy } from '@/lib/strategies/confluenceStrategy';

export async function POST(request: Request) {
  try {
    let reqSymbol: string | null = null;
    try {
      const body = await request.json();
      if (body?.symbol) reqSymbol = body.symbol;
    } catch {}

    // ── 1. Carregar config ──────────────────────────────────────────
    const { data: configRows } = await supabase
      .from('bot_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    const config = (configRows && configRows.length > 0) ? configRows[0] : {
      is_running: true, is_paper_trade: false, leverage: 3,
      stop_loss_percent: 1.0, take_profit_percent: 2.0,
      max_trade_duration_minutes: 30, always_in_market: true,
    };

    console.log('=== SCALPING BOT CONFIG ===');
    console.log('is_running:', config.is_running, '| paper:', config.is_paper_trade);
    console.log('SL:', config.stop_loss_percent, '% | TP:', config.take_profit_percent, '% | MaxDur:', config.max_trade_duration_minutes, 'min');

    if (!config.is_running) {
      return NextResponse.json({ status: 'stopped', message: 'Bot pausado.' });
    }

    const symbols = reqSymbol ? [reqSymbol] : ['BTCUSDT', 'ETHUSDT'];
    const results: any[] = [];

    // ── 2. Buscar saldo e posições atuais ───────────────────────────
    let usdtBalance = 1000;
    let positionsData: any[] = [];
    try {
      const balData = await getBalance();
      const usdt = Array.isArray(balData) ? balData.find((a: any) => a.asset === 'USDT') : null;
      usdtBalance = parseFloat(usdt?.availableBalance || usdt?.walletBalance || '1000');
    } catch (e: any) { console.error('[BOT] balance error:', e.message); }

    try {
      positionsData = await getPositions();
    } catch (e: any) { console.error('[BOT] positions error:', e.message); }

    for (const symbol of symbols) {
      // ── 3. Buscar candles para análise ────────────────────────────
      let klines: any[] = [];
      try {
        klines = await fetchCandles(symbol, config.timeframe || '5m', 100);
      } catch (e: any) {
        console.error(`[BOT] fetchCandles(${symbol}) error:`, e.message);
        results.push({ symbol, action: 'ERROR', error: e.message });
        continue;
      }

      const currentPrice = parseFloat(klines[klines.length - 1].close);

      // ── 4. Verificar posição aberta e checar SL/TP/Timeout ────────
      const openPos = positionsData.find(
        (p: any) => p.symbol === symbol && Math.abs(parseFloat(p.positionAmt || '0')) > 0
      );

      if (openPos) {
        const posAmt = parseFloat(openPos.positionAmt);
        const currentSide = posAmt > 0 ? 'LONG' : 'SHORT';
        const entryPrice = parseFloat(openPos.entryPrice || openPos.avgCost || '0');
        const leverage = config.leverage || 3;

        // PnL em %
        const pnlPercent = currentSide === 'LONG'
          ? (currentPrice - entryPrice) / entryPrice * 100 * leverage
          : (entryPrice - currentPrice) / entryPrice * 100 * leverage;

        const pnlUSDT = parseFloat(openPos.unrealizedProfit || openPos.unRealizedProfit || '0');

        console.log(`[SCALPING] ${symbol} ${currentSide} | entry:${entryPrice} | price:${currentPrice} | PnL:${pnlPercent.toFixed(2)}%`);

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
        const maxDur = config.max_trade_duration_minutes; // 0 = sem timeout

        let closeReason: 'WIN' | 'LOSS' | 'TIMEOUT' | null = null;

        if (pnlPercent >= tp) {
          closeReason = 'WIN';
          console.log(`[SCALPING] TP atingido: +${pnlPercent.toFixed(2)}% | ${symbol}`);
        } else if (pnlPercent <= -sl) {
          closeReason = 'LOSS';
          console.log(`[SCALPING] SL atingido: ${pnlPercent.toFixed(2)}% | ${symbol}`);
        } else if (maxDur > 0 && durationMinutes >= maxDur) {
          closeReason = 'TIMEOUT';
          console.log(`[SCALPING] Timeout: ${durationMinutes.toFixed(1)} min | ${symbol}`);
        }


        if (closeReason) {
          // Fechar posição
          const closeSide: 'BUY' | 'SELL' = currentSide === 'LONG' ? 'SELL' : 'BUY';
          let closeResult = null;
          if (!config.is_paper_trade) {
            try {
              closeResult = await closePosition(symbol, closeSide);
              console.log('[SCALPING] Posição fechada:', JSON.stringify(closeResult));
            } catch (e: any) {
              console.error('[SCALPING] Erro ao fechar:', e.response?.data || e.message);
            }
          }

          // Atualizar trade no Supabase
          if (trade?.id) {
            await supabase.from('trades').update({
              status: closeReason,
              exit_price: currentPrice,
              pnl: pnlUSDT,
              closed_at: new Date().toISOString(),
            }).eq('id', trade.id);
          }

          results.push({
            symbol, action: `CLOSE_${closeReason}`,
            pnlPercent: pnlPercent.toFixed(2),
            pnlUSDT: pnlUSDT.toFixed(4),
            currentSide, entryPrice, currentPrice, durationMinutes: durationMinutes.toFixed(1),
          });
          continue; // Após fechar, não abre nova posição no mesmo ciclo
        }

        // Posição em andamento — HOLD
        results.push({
          symbol, action: 'HOLD',
          currentSide, entryPrice, currentPrice,
          pnlPercent: pnlPercent.toFixed(2),
          pnlUSDT: pnlUSDT.toFixed(4),
          durationMinutes: durationMinutes.toFixed(1),
          sl, tp, maxDur,
        });
        continue;
      }

      // ── 5. Sem posição aberta: analisar e abrir nova ───────────────
      const confluence = confluenceStrategy(klines);
      const threshold = parseFloat(config.confluence_threshold) || 4;
      confluence.threshold = threshold;

      console.log(`[CONFLUENCE] ${symbol} score:${confluence.score} dir:${confluence.direction}`);
      confluence.signals.forEach(s =>
        console.log(`  ${s.name}: ${s.signal} (${s.score > 0 ? '+' : ''}${s.score})${s.value ? ' val:' + s.value : ''}`)
      );

      // Se score não atingiu threshold → NEUTRAL, não abre
      if (confluence.direction === 'NEUTRAL') {
        results.push({
          symbol, action: 'NEUTRAL',
          score: confluence.score,
          threshold,
          signals: confluence.signals,
        });
        continue;
      }

      const side: 'BUY' | 'SELL' = confluence.direction === 'LONG' ? 'BUY' : 'SELL';
      const qty = calculateQuantity(usdtBalance * 0.95, currentPrice, symbol);
      const lev = config.leverage || 3;
      const sl = config.stop_loss_percent || 1.0;
      const tp = config.take_profit_percent || 2.0;

      const slPrice = side === 'BUY'
        ? currentPrice * (1 - sl / 100 / lev)
        : currentPrice * (1 + sl / 100 / lev);
      const tpPrice = side === 'BUY'
        ? currentPrice * (1 + tp / 100 / lev)
        : currentPrice * (1 - tp / 100 / lev);

      console.log(`[SCALPING] Abrindo ${side} ${qty} ${symbol} | score:${confluence.score} | SL:${slPrice.toFixed(2)} | TP:${tpPrice.toFixed(2)}`);

      let orderResult = null;
      let openError = null;

      if (!config.is_paper_trade) {
        try {
          await setLeverage(symbol, lev).catch(() => {});
          orderResult = await openPosition(symbol, side, qty, lev);
          await new Promise(r => setTimeout(r, 800));

          const slSide: 'BUY' | 'SELL' = side === 'BUY' ? 'SELL' : 'BUY';
          await createRawOrder({
            symbol, side: slSide, type: 'STOP_MARKET',
            stopPrice: parseFloat(slPrice.toFixed(2)),
            closePosition: 'true', timeInForce: 'GTE_GTC', workingType: 'MARK_PRICE',
          }).catch((e: any) => console.error('[SCALPING] SL error:', e.response?.data || e.message));

          await createRawOrder({
            symbol, side: slSide, type: 'TAKE_PROFIT_MARKET',
            stopPrice: parseFloat(tpPrice.toFixed(2)),
            closePosition: 'true', timeInForce: 'GTE_GTC', workingType: 'MARK_PRICE',
          }).catch((e: any) => console.error('[SCALPING] TP error:', e.response?.data || e.message));
        } catch (e: any) {
          openError = e.response?.data || e.message;
          console.error('[SCALPING] Erro ao abrir:', openError);
        }
      }

      if (!openError) {
        await supabase.from('trades').insert([{
          symbol, side, direction: confluence.direction, quantity: qty,
          price: currentPrice, entry_price: currentPrice,
          stop_loss: parseFloat(slPrice.toFixed(2)),
          take_profit: parseFloat(tpPrice.toFixed(2)),
          status: 'OPEN', open_time: new Date().toISOString(), created_at: new Date().toISOString(),
        }]).catch((e: any) => console.error('[SCALPING] Supabase insert:', e.message));

        await supabase.from('signals').insert([{
          symbol, strategy: 'Confluence-v2', signal_type: side,
          price: currentPrice, score: confluence.score,
          breakdown: confluence.signals,
        }]).catch(() => {});
      }

      results.push({
        symbol, action: openError ? 'OPEN_ERROR' : 'OPEN',
        side, direction: confluence.direction,
        score: confluence.score, confidence: confluence.confidence,
        signals: confluence.signals,
        qty, entryPrice: currentPrice,
        slPrice: parseFloat(slPrice.toFixed(2)),
        tpPrice: parseFloat(tpPrice.toFixed(2)),
        error: openError || null,
      });
    }

    return NextResponse.json({ status: 'success', results });
  } catch (error: any) {
    console.error('=== BOT RUN ERROR ===', error.message, error.stack);
    return NextResponse.json({
      error: error.message,
      details: error.response?.data || null,
    }, { status: 500 });
  }
}
