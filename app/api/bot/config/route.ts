import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { BotConfig } from '@/types';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('bot_config')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
      throw error;
    }

    return NextResponse.json(data || {});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: BotConfig = await request.json();
    
    // Upsert the config (assuming there's only 1 row or we just insert new)
    // For simplicity, we just delete existing and insert new to ensure we have exactly 1 config
    // or we can update the existing one if ID is provided.
    
    // First find if one exists
    const { data: existing } = await supabase
      .from('bot_config')
      .select('id')
      .limit(1)
      .single();

    let result;
    
    if (existing) {
      result = await supabase
        .from('bot_config')
        .update({
          is_running: body.is_running,
          is_paper_trade: body.is_paper_trade,
          risk_per_trade: body.risk_per_trade,
          max_positions: body.max_positions,
          strategy_config: body.strategy_config,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('bot_config')
        .insert([{
          is_running: body.is_running,
          is_paper_trade: body.is_paper_trade,
          risk_per_trade: body.risk_per_trade,
          max_positions: body.max_positions,
          strategy_config: body.strategy_config,
        }])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json(result.data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
