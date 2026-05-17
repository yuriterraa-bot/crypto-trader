import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[GET /api/bot/config] Supabase error:', error.message);
    }

    return NextResponse.json({ debug: true, rows: configRows || [], error });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: any = await request.json();
    console.log('Updating bot config:', JSON.stringify(body));
    
    const { data: existingRows } = await supabase
      .from('bot_config')
      .select('*')
      .limit(1);

    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
    console.log('Existing config:', JSON.stringify(existing));

    let result;

    if (existing) {
      // Remove campos indefinidos para não sobrescrever com null
      const updatePayload: any = { updated_at: new Date().toISOString() };
      
      const allowedKeys = ['is_running', 'is_paper_trade', 'risk_per_trade', 'max_positions', 'strategy_config', 'timeframe', 'session_filter', 'use_mtf'];
      allowedKeys.forEach(key => {
        if (body[key] !== undefined) {
          if (key === 'is_running' || key === 'is_paper_trade') {
            updatePayload[key] = Boolean(body[key]);
          } else {
            updatePayload[key] = body[key];
          }
        }
      });

      result = await supabase.from('bot_config').update(updatePayload).eq('id', existing.id).select().single();
      console.log('Update payload:', JSON.stringify(updatePayload));
      
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
    
    console.log('Final Supabase Result Data:', JSON.stringify(result.data), 'Error:', JSON.stringify(result.error));

    const returnData = result?.data ? (Array.isArray(result.data) ? result.data[0] : result.data) : { ...existing, ...body };
    return NextResponse.json(returnData, { status: 200 });
  } catch (error: any) {
    console.error('[POST /api/bot/config] Error:', error);
    return NextResponse.json(DEFAULT_CONFIG, { status: 200 });
  }
}
