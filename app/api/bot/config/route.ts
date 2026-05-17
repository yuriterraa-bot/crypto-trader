import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { BotConfig } from '@/types';

const DEFAULT_CONFIG = { 
  is_running: false, 
  risk_per_trade: 1.0, 
  max_positions: 5,
  is_paper_trade: true, 
  timeframe: '15m' 
};

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('bot_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.warn('[GET /api/bot/config] Supabase error (possibly missing column or row):', error.message);
      return NextResponse.json(DEFAULT_CONFIG);
    }

    return NextResponse.json(data || DEFAULT_CONFIG);
  } catch (error: any) {
    console.error('[GET /api/bot/config] Error:', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    
    // Tenta atualizar com os novos campos
    let updatePayload = {
      is_running: body.is_running,
      is_paper_trade: body.is_paper_trade,
      risk_per_trade: body.risk_per_trade,
      max_positions: body.max_positions,
      strategy_config: body.strategy_config,
      timeframe: body.timeframe,
      session_filter: body.session_filter,
      use_mtf: body.use_mtf,
      updated_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
      .from('bot_config')
      .select('id')
      .limit(1)
      .single();

    let result;
    
    const upsertConfig = async (payload: any) => {
      if (existing) {
        return supabase.from('bot_config').update(payload).eq('id', existing.id).select().single();
      } else {
        return supabase.from('bot_config').insert([payload]).select().single();
      }
    };

    result = await upsertConfig(updatePayload);

    // Se der erro por conta de colunas não existentes, tenta sem elas
    if (result.error && result.error.message.includes('column')) {
      console.warn('[POST /api/bot/config] Colunas faltando, atualizando com schema legado...');
      const fallbackPayload = {
        is_running: body.is_running,
        is_paper_trade: body.is_paper_trade,
        risk_per_trade: body.risk_per_trade,
        max_positions: body.max_positions,
        strategy_config: body.strategy_config,
        updated_at: new Date().toISOString()
      };
      result = await upsertConfig(fallbackPayload);
    }

    return NextResponse.json(result?.data || DEFAULT_CONFIG, { status: 200 });
  } catch (error: any) {
    console.error('[POST /api/bot/config] Error:', error);
    return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
  }
}
