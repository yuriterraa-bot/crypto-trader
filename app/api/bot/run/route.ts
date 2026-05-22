import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchCandles } from '@/lib/binance';
import { confluenceStrategy } from '@/lib/strategies/confluenceStrategy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let reqSymbol: string | null = null;
    try { 
      const b = await request.json(); 
      if (b?.symbol) reqSymbol = b.symbol; 
    } catch {}

    // Configurações do robô no Supabase
    const { data: configRows } = await supabase
      .from('bot_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    const cfg = configRows?.[0] || {};
    const isRunning = cfg.is_running !== false;
    const timeframe = cfg.timeframe || '15m';

    console.log(`=== BOT RUN (ANALYSIS ONLY) === isRunning:${isRunning} timeframe:${timeframe}`);

    if (!isRunning) {
      return NextResponse.json({ status: 'stopped', message: 'O robô está desativado.' });
    }

    const symbols = reqSymbol ? [reqSymbol] : ['BTCUSDT', 'ETHUSDT'];
    const results: any[] = [];

    for (const symbol of symbols) {
      try {
        console.log(`[BOT RUN] Analisando ${symbol}...`);
        const klines = await fetchCandles(symbol, timeframe, 150);
        
        if (!klines || klines.length === 0) {
          throw new Error('Nenhum candle retornado da API.');
        }

        const currentPrice = parseFloat(klines[klines.length - 1].close);
        const confluence = confluenceStrategy(klines);

        console.log(`[BOT RUN] [${symbol}] Preço: ${currentPrice} Score: ${confluence.score} Direção: ${confluence.direction}`);

        // Registrar o sinal gerado na tabela 'signals' do Supabase para acompanhamento analítico
        const { error: insertError } = await supabase
          .from('signals')
          .insert([{
            symbol,
            score: confluence.score,
            signal_type: confluence.direction,
            breakdown: confluence.signals,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error(`[BOT RUN] Erro ao registrar sinal de ${symbol} no Supabase:`, insertError.message);
        } else {
          console.log(`[BOT RUN] Sinal de ${symbol} registrado com sucesso no Supabase.`);
        }

        results.push({
          symbol,
          action: 'ANALYZED',
          price: currentPrice,
          score: confluence.score,
          direction: confluence.direction,
          signals: confluence.signals
        });

      } catch (symErr: any) {
        console.error(`[BOT RUN] Erro ao analisar ${symbol}:`, symErr.message);
        results.push({ symbol, action: 'ERROR', error: symErr.message });
      }
    }

    return NextResponse.json({ status: 'success', results });
  } catch (error: any) {
    console.error('[BOT RUN ERROR]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
