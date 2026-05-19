import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  fetchCandles, getBalance, getPositions,
  openPosition, closePosition, calculateQuantity,
  setLeverage, createRawOrder,
} from '@/lib/binance';
import { confluenceStrategy } from '@/lib/strategies/confluenceStrategy';

export const dynamic = 'force-dynamic';

// ──────────────────────────────────────────────────────────────
// ALWAYS-IN-MARKET SCALPING BOT
// Sempre tem posição aberta. Usa confluência para direção.
// DCA automático em posições perdedoras.
// Flip automático quando TP é atingido.
// ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    let reqSymbol: string | null = null;
    try { const b = await request.json(); if (b?.symbol) reqSymbol = b.symbol; } catch {}

    // ── Config ───────────────────────────────────────────────
    const { data: configRows } = await supabase
      .from('bot_config').select('*')
      .order('updated_at', { ascending: false }).limit(1);

    const cfg = configRows?.[0] || {};
    const isRunning    = cfg.is_running !== false;
    const isPaper      = cfg.is_paper_trade === true;
    const lev          = parseInt(cfg.leverage)              || 3;
    const sl           = parseFloat(cfg.stop_loss_percent)   || 1.0;
    const tp           = parseFloat(cfg.take_profit_percent) || 2.0;
    const maxDur       = cfg.max_trade_duration_minutes;        // 0 = sem timeout
    const dcaEnabled   = cfg.dca_enabled !== false;            // default true
    const dcaStep      = parseFloat(cfg.dca_step_percent)    || 0.8; // add at -0.8% against
    const dcaMaxLevels = parseInt(cfg.dca_max_levels)        || 2;
    const dcaMult      = parseFloat(cfg.dca_multiplier)      || 1.5; // 1.5x size each level

    console.log(`=== BOT === lev:${lev}x sl:${sl}% tp:${tp}% dca:${dcaEnabled} step:${dcaStep}% maxL:${dcaMaxLevels}`);

    if (!isRunning) return NextResponse.json({ status: 'stopped' });

    const symbols = reqSymbol ? [reqSymbol] : ['BTCUSDT', 'ETHUSDT'];
    const results: any[] = [];

    let usdtBalance = 500;
    try {
      const bal = await getBalance();
      const usdt = Array.isArray(bal) ? bal.find((a: any) => a.asset === 'USDT') : null;
      usdtBalance = parseFloat(usdt?.availableBalance || usdt?.walletBalance || '500');
    } catch (e: any) { console.error('[BOT] balance err:', e.message); }

    let positionsData: any[] = [];
    try { positionsData = await getPositions(); }
    catch (e: any) { console.error('[BOT] positions err:', e.message); }

    for (const symbol of symbols) {
      try {
        // ── Candles & análise ─────────────────────────────────
        const klines = await fetchCandles(symbol, cfg.timeframe || '5m', 150);
        const currentPrice = parseFloat(klines[klines.length - 1].close);
        const confluence   = confluenceStrategy(klines);

        console.log(`[${symbol}] price:${currentPrice} score:${confluence.score} dir:${confluence.direction}`);

        // ── Posição aberta? ───────────────────────────────────
        const openPos = positionsData.find(
          (p: any) => p.symbol === symbol && Math.abs(parseFloat(p.positionAmt || '0')) > 0.0001
        );

        if (openPos) {
          // ── Gerenciar posição existente ─────────────────────
          const posAmt     = parseFloat(openPos.positionAmt);
          const qty        = Math.abs(posAmt);
          const currentSide = posAmt > 0 ? 'LONG' : 'SHORT';
          const entry      = parseFloat(openPos.entryPrice || '0');
          const posLev     = parseFloat(openPos.leverage) || lev;
          const pnlUSDT    = parseFloat(openPos.unRealizedProfit || '0');

          const pnlPct = currentSide === 'LONG'
            ? (currentPrice - entry) / entry * 100 * posLev
            : (entry - currentPrice) / entry * 100 * posLev;

          // Buscar trade Supabase para DCA state
          const { data: tradeRows } = await supabase.from('trades')
            .select('*').eq('symbol', symbol).eq('status', 'OPEN')
            .order('created_at', { ascending: false }).limit(1);
          const trade = tradeRows?.[0];
          const dcaCount = trade?.dca_count || 0;

          // Duration check
          const openTimeMs = trade?.open_time
            ? new Date(trade.open_time).getTime()
            : (openPos.updateTime ? parseInt(openPos.updateTime) : Date.now());
          const durMin = (Date.now() - openTimeMs) / 60000;

          console.log(`[${symbol}] ${currentSide} entry:${entry} pnl%:${pnlPct.toFixed(2)} dur:${durMin.toFixed(0)}min dcaLv:${dcaCount}`);

          // ── TAKE PROFIT → Fechar + Flip ─────────────────────
          if (pnlPct >= tp) {
            console.log(`[${symbol}] ✅ TP! Fechando e flipando...`);
            const closeSide: 'BUY' | 'SELL' = currentSide === 'LONG' ? 'SELL' : 'BUY';
            if (!isPaper) await closePosition(symbol, closeSide, qty).catch((e: any) => console.error('[TP close]', e.message));

            if (trade?.id) {
              await supabase.from('trades').update({
                status: 'WIN', exit_price: currentPrice, pnl: pnlUSDT,
                closed_at: new Date().toISOString(),
              }).eq('id', trade.id);
            }

            // Flip: analisa confluência para nova direção
            // Se estava LONG e TP hit → SHORT (fade the move) OR follow confluence
            const newDir = confluence.score < 0 ? 'SHORT' : 'LONG';
            const newSide: 'BUY' | 'SELL' = newDir === 'LONG' ? 'BUY' : 'SELL';
            const newQty = calculateQuantity(usdtBalance * 0.45 / symbols.length, currentPrice, symbol);

            if (!isPaper && newQty > 0) {
              await setLeverage(symbol, lev).catch(() => {});
              await new Promise(r => setTimeout(r, 500));
              const flipOrder = await openPosition(symbol, newSide, newQty, lev).catch((e: any) => {
                console.error('[FLIP open]', e.message); return null;
              });
              if (flipOrder) {
                await registerTrade(supabase, symbol, newSide, newDir, newQty, currentPrice, lev, sl, tp);
                results.push({ symbol, action: 'TP_FLIP', pnlPct: pnlPct.toFixed(2), newDir });
                continue;
              }
            }
            results.push({ symbol, action: 'TP_CLOSE', pnlPct: pnlPct.toFixed(2) });
            continue;
          }

          // ── DCA: preço foi contra → adicionar à posição ─────
          const dcaTrigger = -(dcaStep * (dcaCount + 1)); // -0.8%, -1.6%, etc.
          if (dcaEnabled && dcaCount < dcaMaxLevels && pnlPct <= dcaTrigger) {
            const dcaSide: 'BUY' | 'SELL' = currentSide === 'LONG' ? 'BUY' : 'SELL';
            const baseQty = trade?.quantity || calculateQuantity(usdtBalance * 0.45 / symbols.length, entry, symbol);
            const addQty  = parseFloat((baseQty * Math.pow(dcaMult, dcaCount + 1)).toFixed(
              symbol.includes('BTC') ? 3 : symbol.includes('ETH') ? 2 : 1
            ));
            console.log(`[${symbol}] 📉 DCA lv${dcaCount + 1}: adicionando ${addQty} ${dcaSide}`);
            if (!isPaper && addQty > 0) {
              await openPosition(symbol, dcaSide, addQty, lev).catch((e: any) =>
                console.error('[DCA add]', e.message)
              );
            }
            if (trade?.id) {
              await supabase.from('trades').update({ dca_count: dcaCount + 1 }).eq('id', trade.id);
            }
            results.push({ symbol, action: `DCA_L${dcaCount + 1}`, addQty, pnlPct: pnlPct.toFixed(2) });
            continue;
          }

          // ── STOP LOSS (após DCA máximo) ──────────────────────
          if (pnlPct <= -(sl) && (!dcaEnabled || dcaCount >= dcaMaxLevels)) {
            console.log(`[${symbol}] ❌ SL após ${dcaCount} DCAs. Fechando...`);
            const closeSide: 'BUY' | 'SELL' = currentSide === 'LONG' ? 'SELL' : 'BUY';
            if (!isPaper) await closePosition(symbol, closeSide, qty).catch((e: any) => console.error('[SL close]', e.message));
            if (trade?.id) {
              await supabase.from('trades').update({
                status: 'LOSS', exit_price: currentPrice, pnl: pnlUSDT,
                closed_at: new Date().toISOString(),
              }).eq('id', trade.id);
            }
            results.push({ symbol, action: 'SL_CLOSE', pnlPct: pnlPct.toFixed(2), dcaCount });
            // Não abre imediatamente após SL — espera próximo ciclo para re-analisar
            continue;
          }

          // ── TIMEOUT ──────────────────────────────────────────
          if (maxDur > 0 && durMin >= maxDur) {
            console.log(`[${symbol}] ⏰ Timeout após ${durMin.toFixed(0)} min`);
            const closeSide: 'BUY' | 'SELL' = currentSide === 'LONG' ? 'SELL' : 'BUY';
            if (!isPaper) await closePosition(symbol, closeSide, qty).catch(() => {});
            if (trade?.id) {
              await supabase.from('trades').update({
                status: pnlUSDT >= 0 ? 'WIN' : 'LOSS', exit_price: currentPrice,
                pnl: pnlUSDT, closed_at: new Date().toISOString(),
              }).eq('id', trade.id);
            }
            results.push({ symbol, action: 'TIMEOUT', pnlPct: pnlPct.toFixed(2), durMin: durMin.toFixed(0) });
            continue;
          }

          // ── HOLD ─────────────────────────────────────────────
          results.push({
            symbol, action: 'HOLD', currentSide,
            pnlPct: pnlPct.toFixed(2), pnlUSDT: pnlUSDT.toFixed(2),
            durMin: durMin.toFixed(0), dcaCount,
            score: confluence.score,
          });
          continue;
        }

        // ── Sem posição → SEMPRE ABRIR ──────────────────────────
        // Direção: sempre segue a confluência. Se score=0 → usa EMA cross (EMA13 vs EMA30)
        let direction: 'LONG' | 'SHORT';
        if (confluence.score > 0) direction = 'LONG';
        else if (confluence.score < 0) direction = 'SHORT';
        else {
          // Desempate: EMA13 vs EMA30
          const emaSig = confluence.signals.find(s => s.name === 'EMA 13/30');
          direction = (emaSig?.signal === 'BULLISH' || emaSig?.signal === 'GOLDEN_CROSS') ? 'LONG' : 'SHORT';
        }

        const side: 'BUY' | 'SELL' = direction === 'LONG' ? 'BUY' : 'SELL';
        const qty = calculateQuantity(usdtBalance * 0.45 / symbols.length, currentPrice, symbol);

        console.log(`[${symbol}] 🟢 ABRINDO ${direction} qty:${qty} score:${confluence.score}`);

        if (!isPaper && qty > 0) {
          await setLeverage(symbol, lev).catch(() => {});
          const order = await openPosition(symbol, side, qty, lev).catch((e: any) => {
            console.error('[OPEN]', e.message); return null;
          });

          if (order) {
            // SL/TP orders na Binance
            const slSide: 'BUY' | 'SELL' = side === 'BUY' ? 'SELL' : 'BUY';
            const slPrice = side === 'BUY' ? currentPrice * (1 - sl / 100 / lev) : currentPrice * (1 + sl / 100 / lev);
            const tpPrice = side === 'BUY' ? currentPrice * (1 + tp / 100 / lev) : currentPrice * (1 - tp / 100 / lev);

            await createRawOrder({
              symbol, side: slSide, type: 'STOP_MARKET',
              stopPrice: parseFloat(slPrice.toFixed(2)),
              closePosition: 'true', timeInForce: 'GTE_GTC', workingType: 'MARK_PRICE',
            }).catch((e: any) => console.error('[SL order]', e.response?.data || e.message));

            await createRawOrder({
              symbol, side: slSide, type: 'TAKE_PROFIT_MARKET',
              stopPrice: parseFloat(tpPrice.toFixed(2)),
              closePosition: 'true', timeInForce: 'GTE_GTC', workingType: 'MARK_PRICE',
            }).catch((e: any) => console.error('[TP order]', e.response?.data || e.message));

            await registerTrade(supabase, symbol, side, direction, qty, currentPrice, lev, sl, tp);
            results.push({ symbol, action: 'OPEN', direction, qty, price: currentPrice, score: confluence.score });
            continue;
          }
        }

        // Paper mode ou order falhou
        if (isPaper) {
          await registerTrade(supabase, symbol, side, direction, qty, currentPrice, lev, sl, tp);
          results.push({ symbol, action: 'OPEN_PAPER', direction, qty, price: currentPrice, score: confluence.score });
        } else {
          results.push({ symbol, action: 'OPEN_FAILED', direction, score: confluence.score });
        }
      } catch (symErr: any) {
        console.error(`[${symbol}] error:`, symErr.message);
        results.push({ symbol, action: 'ERROR', error: symErr.message });
      }
    }

    return NextResponse.json({ status: 'success', results });
  } catch (error: any) {
    console.error('[BOT RUN ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: registrar trade no Supabase ──────────────────────────
async function registerTrade(
  sb: any, symbol: string, side: string, direction: string,
  qty: number, price: number, lev: number, sl: number, tp: number
) {
  const slMult = side === 'BUY' ? (1 - sl / 100 / lev) : (1 + sl / 100 / lev);
  const tpMult = side === 'BUY' ? (1 + tp / 100 / lev) : (1 - tp / 100 / lev);
  await sb.from('trades').insert([{
    symbol, side, direction, quantity: qty,
    price, entry_price: price,
    stop_loss:   parseFloat((price * slMult).toFixed(2)),
    take_profit: parseFloat((price * tpMult).toFixed(2)),
    dca_count: 0,
    status: 'OPEN',
    open_time:   new Date().toISOString(),
    created_at:  new Date().toISOString(),
  }]).catch((e: any) => console.error('[registerTrade]', e.message));
}
