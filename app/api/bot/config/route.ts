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
    const { data, error } = await supabase
      .from('bot_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('[GET /api/bot/config] Supabase error:', error.message);
    }

    if (!data) {
      // Faz insert do default se não existe nenhum registro
      const { data: insertedData, error: insertError } = await supabase
        .from('bot_config')
        .insert([DEFAULT_CONFIG])
        .select()
        .single();
        
      if (!insertError && insertedData) return NextResponse.json(insertedData);
      return NextResponse.json(DEFAULT_CONFIG);
    }

    // Se existe mas strategy_config está vazio
    if (!data.strategy_config || Object.keys(data.strategy_config).length === 0) {
      const { data: updatedData, error: updateError } = await supabase
        .from('bot_config')
        .update({ strategy_config: DEFAULT_CONFIG.strategy_config })
        .eq('id', data.id)
        .select()
        .single();
        
      if (!updateError && updatedData) return NextResponse.json(updatedData);
      return NextResponse.json({ ...data, strategy_config: DEFAULT_CONFIG.strategy_config });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[GET /api/bot/config] Error:', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    
    const { data: existing } = await supabase
      .from('bot_config')
      .select('*')
      .limit(1)
      .single();

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

      result = await supabase.from('bot_config').update(updatePayload).eq('id', existing.id).select().single();
      
      // Fallback sem colunas novas se falhar
      if (result.error && result.error.message.includes('column')) {
        console.warn('[POST /api/bot/config] Colunas faltando, tentando sem novos campos');
        delete updatePayload.timeframe;
        delete updatePayload.session_filter;
        delete updatePayload.use_mtf;
        result = await supabase.from('bot_config').update(updatePayload).eq('id', existing.id).select().single();
      }
    } else {
      const insertPayload = { ...DEFAULT_CONFIG, ...body };
      result = await supabase.from('bot_config').insert([insertPayload]).select().single();
    }

    return NextResponse.json(result?.data || { ...existing, ...body }, { status: 200 });
  } catch (error: any) {
    console.error('[POST /api/bot/config] Error:', error);
    return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
  }
}
