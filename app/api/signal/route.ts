import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    // Buscar último sinal de cada par
    const { data: btcSignal } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', 'BTCUSDT')
      .order('created_at', { ascending: false })
      .limit(1);
      
    const { data: ethSignal } = await supabase
      .from('signals')
      .select('*')
      .eq('symbol', 'ETHUSDT')
      .order('created_at', { ascending: false })
      .limit(1);

    // Buscar última análise IA
    const { data: btcAI } = await supabase
      .from('ai_analysis')
      .select('*')
      .eq('symbol', 'BTCUSDT')
      .order('created_at', { ascending: false })
      .limit(1);
      
    const { data: ethAI } = await supabase
      .from('ai_analysis')
      .select('*')
      .eq('symbol', 'ETHUSDT')
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      btc: {
        signal: btcSignal?.[0] || null,
        ai: btcAI?.[0] || null
      },
      eth: {
        signal: ethSignal?.[0] || null,
        ai: ethAI?.[0] || null
      }
    });
  } catch (error: any) {
    return NextResponse.json({ btc: null, eth: null });
  }
}
