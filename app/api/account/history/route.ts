import { NextResponse } from 'next/server';
import { fetchTradeHistory, fetchIncomeHistory } from '@/lib/binance';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'MATICUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT'
];

export async function GET() {
  try {
    // 1. Obter modo dinâmico
    const { data: configRows } = await supabase
      .from('bot_config')
      .select('binance_mode')
      .order('updated_at', { ascending: false })
      .limit(1);

    const dbMode = configRows?.[0]?.binance_mode || 'demo';
    const effectiveMode = process.env.BINANCE_MODE === 'real' ? 'real' : dbMode;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    console.log(`[GET /api/account/history] Buscando histórico de trades de 7 dias. Modo: ${effectiveMode}`);

    // 2. Buscar fills de todos os símbolos em paralelo
    const promises = DEFAULT_PAIRS.map(symbol => 
      fetchTradeHistory(symbol, sevenDaysAgo, effectiveMode).catch((err) => {
        console.warn(`[GET /api/account/history] Falha ao buscar histórico de ${symbol}:`, err.message);
        return [];
      })
    );

    const outcomes = await Promise.allSettled(promises);
    
    let allFills: any[] = [];
    outcomes.forEach((outcome) => {
      if (outcome.status === 'fulfilled' && Array.isArray(outcome.value)) {
        allFills.push(...outcome.value);
      }
    });

    console.log(`[GET /api/account/history] Total de execuções (fills) retornados: ${allFills.length}`);

    // 3. Se não há fills, tentar fetchIncomeHistory com REALIZED_PNL como fallback
    let incomeHistory: any[] = [];
    if (allFills.length === 0) {
      try {
        incomeHistory = await fetchIncomeHistory(sevenDaysAgo, effectiveMode);
        console.log('Income history result (REALIZED_PNL):', JSON.stringify(incomeHistory?.slice(0, 3)));
        // Filtrar apenas PnL realizado
        incomeHistory = (incomeHistory || []).filter((item: any) => item.incomeType === 'REALIZED_PNL' && parseFloat(item.income) !== 0);
        console.log(`[GET /api/account/history] Fallback income entries: ${incomeHistory.length}`);
      } catch (incomeErr: any) {
        console.warn('[GET /api/account/history] fetchIncomeHistory error:', incomeErr.message);
      }
    }

    // 3. Agrupar fills por símbolo
    const fillsBySymbol: Record<string, any[]> = {};
    allFills.forEach((fill: any) => {
      if (!fillsBySymbol[fill.symbol]) {
        fillsBySymbol[fill.symbol] = [];
      }
      fillsBySymbol[fill.symbol].push(fill);
    });

    const consolidatedTrades: any[] = [];

    // 4. Lógica de Reconciliação FIFO/Matemática para Consolidação de Trades
    Object.keys(fillsBySymbol).forEach(symbol => {
      const fills = fillsBySymbol[symbol].sort((a, b) => a.time - b.time);
      
      let entryAccumulator: any[] = [];
      let currentQty = 0; // Tamanho acumulado
      
      fills.forEach(fill => {
        const qty = parseFloat(fill.qty);
        const price = parseFloat(fill.price);
        const realizedPnl = parseFloat(fill.realizedPnl);
        const isBuyer = fill.side === 'BUY';
        
        // Se realizedPnl é 0, é uma abertura ou adição de posição
        if (Math.abs(realizedPnl) < 0.0001) {
          entryAccumulator.push({ qty, price, time: fill.time, side: fill.side });
          currentQty += isBuyer ? qty : -qty;
        } else {
          // É uma execução de fechamento (gerou P&L realizado)
          const direction = isBuyer ? 'SHORT' : 'LONG';
          
          let avgEntryPrice = 0;
          if (entryAccumulator.length > 0) {
            // Temos a abertura registrada no período dos 7 dias
            const totalEntryQty = entryAccumulator.reduce((sum, e) => sum + e.qty, 0);
            avgEntryPrice = entryAccumulator.reduce((sum, e) => sum + e.price * e.qty, 0) / totalEntryQty;
            
            // Consome entradas (limpa buffer)
            entryAccumulator = [];
          } else {
            // Abertura ocorreu fora da janela de 7 dias. Reconstrói matematicamente
            if (direction === 'LONG') {
              avgEntryPrice = price - (realizedPnl / qty);
            } else {
              avgEntryPrice = price + (realizedPnl / qty);
            }
          }
          
          consolidatedTrades.push({
            symbol,
            direction,
            entryPrice: parseFloat(avgEntryPrice.toFixed(4)),
            exitPrice: price,
            qty,
            pnl: parseFloat(realizedPnl.toFixed(2)),
            pnlPercent: parseFloat((avgEntryPrice > 0 ? (realizedPnl / (avgEntryPrice * qty)) * 100 : 0).toFixed(2)),
            status: realizedPnl >= 0 ? 'WIN' : 'LOSS',
            time: fill.time
          });
          
          currentQty += isBuyer ? qty : -qty;
        }
      });
    });

    // 5. Calcular Métricas Consolidadas
    const totalTrades = consolidatedTrades.length;
    const winTrades = consolidatedTrades.filter(t => t.pnl > 0).length;
    const winRate = totalTrades > 0 ? parseFloat(((winTrades / totalTrades) * 100).toFixed(1)) : 0;
    
    const totalRealizedPnl = consolidatedTrades.reduce((sum, t) => sum + t.pnl, 0);
    
    const grossProfits = consolidatedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLosses = Math.abs(consolidatedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    
    let profitFactor = 0;
    if (grossLosses > 0) {
      profitFactor = parseFloat((grossProfits / grossLosses).toFixed(2));
    } else if (grossProfits > 0) {
      profitFactor = parseFloat(grossProfits.toFixed(2)); // Se não houver perdas, o próprio lucro bruto é o fator
    }

    // Ordenar trades consolidados do mais recente para o mais antigo
    consolidatedTrades.sort((a, b) => b.time - a.time);

    // If no consolidated trades from fills, build a simpler summary from income history
    const finalTrades = consolidatedTrades.length > 0 ? consolidatedTrades : incomeHistory.map((item: any) => ({
      symbol: item.symbol,
      direction: parseFloat(item.income) >= 0 ? 'LONG' : 'SHORT',
      entryPrice: 0,
      exitPrice: 0,
      qty: 0,
      pnl: parseFloat(parseFloat(item.income).toFixed(2)),
      pnlPercent: 0,
      status: parseFloat(item.income) >= 0 ? 'WIN' : 'LOSS',
      time: parseInt(item.time)
    }));

    const result = {
      metrics: {
        winRate,
        totalRealizedPnl: parseFloat(totalRealizedPnl.toFixed(2)),
        profitFactor,
        totalTrades,
        winTrades,
        lossTrades: totalTrades - winTrades
      },
      trades: finalTrades
    };

    console.log(`[GET /api/account/history] Processado. Total de trades consolidados: ${totalTrades}, Win Rate: ${winRate}%`);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error('[GET /api/account/history] Erro geral:', error.message);
    return NextResponse.json(
      { error: 'Erro interno ao obter histórico de conta', details: error.message },
      { status: 500 }
    );
  }
}
