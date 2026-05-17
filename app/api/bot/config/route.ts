import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_CONFIG = {
  is_running: false,
  is_paper_trade: true,
  risk_per_trade: 1.0,
  max_positions: 3,
  timeframe: '15m',
  strategy_config: {
    indicators: {
      ma: { active: true, weight: 5 },
      stochastic: { active: true, weight: 3 },
      fibonacci: { active: true, weight: 4 },
      didi: { active: true, weight: 4 },
      nadaraya: { active: true, weight: 6 },
      smc: { active: true, weight: 7 },
      mtf: { active: true, weight: 5 }
    },
    thresholds: { buy: 60, sell: 60 },
    risk: { per_trade: 1.0, rr_ratio: 2, atr_multiplier: 2 }
  }
};

export async function GET() {
  try {
    const { data: configRows, error } = await supabase
      .from('bot_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[GET /api/bot/config] Supabase error:', error.message);
    }

    const data = (configRows && configRows.length > 0) ? configRows[0] : null;

    if (!data) {
      // Faz insert do default se não existe nenhum registro
      const { data: insertedRows, error: insertError } = await supabase
        .from('bot_config')
        .insert([DEFAULT_CONFIG])
        .select()
        .limit(1);
        
      if (!insertError && insertedRows && insertedRows.length > 0) return NextResponse.json(insertedRows[0]);
      return NextResponse.json(DEFAULT_CONFIG);
    }

    // Se existe mas strategy_config está vazio
    if (!data.strategy_config || Object.keys(data.strategy_config).length === 0) {
      data.strategy_config = DEFAULT_CONFIG.strategy_config;
      const { data: updatedRows, error: updateError } = await supabase
        .from('bot_config')
        .update({ strategy_config: DEFAULT_CONFIG.strategy_config })
        .eq('id', data.id)
        .select()
        .limit(1);
        
      if (!updateError && updatedRows && updatedRows.length > 0) {
        updatedRows[0].timeframe = updatedRows[0].timeframe || '15m';
        return NextResponse.json(updatedRows[0]);
      }
      data.timeframe = data.timeframe || '15m';
      return NextResponse.json(data);
    }

    data.timeframe = data.timeframe || '15m';
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[GET /api/bot/config] Error:', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    
    const { data: existingRows } = await supabase
      .from('bot_config')
      .select('*')
      .limit(1);

    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    let result;

    if (existing) {
      // Remove campos indefinidos para não sobrescrever com null
      const updatePayload: any = { updated_at: new Date().toISOString() };
      
      const allowedKeys = ['is_running', 'is_paper_trade', 'risk_per_trade', 'max_positions', 'strategy_config', 'timeframe', 'session_filter', 'use_mtf'];
      allowedKeys.forEach(key => {
        if (body[key] !== undefined) {
          updatePayload[key] = body[key];
        }
      });

      result = await supabase.from('bot_config').update(updatePayload).eq('id', existing.id).select().limit(1);
      
      // Fallback sem colunas novas se falhar
      if (result.error && result.error.message.includes('column')) {
        console.warn('[POST /api/bot/config] Colunas faltando, tentando sem novos campos');
        delete updatePayload.timeframe;
        delete updatePayload.session_filter;
        delete updatePayload.use_mtf;
        result = await supabase.from('bot_config').update(updatePayload).eq('id', existing.id).select().limit(1);
      }
    } else {
      const insertPayload = { ...DEFAULT_CONFIG, ...body };
      result = await supabase.from('bot_config').insert([insertPayload]).select().limit(1);
    }

    const returnData = (result?.data && result.data.length > 0) ? result.data[0] : { ...existing, ...body };
    return NextResponse.json(returnData, { status: 200 });
  } catch (error: any) {
    console.error('[POST /api/bot/config] Error:', error);
    return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
  }
}
