import { NextResponse } from 'next/server';
import { getPositions } from '@/lib/binance';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reqSymbol = searchParams.get('symbol') || undefined;

    // Buscar o modo configurado (demo ou real)
    const { data: configRows } = await supabase
      .from('bot_config')
      .select('binance_mode')
      .order('updated_at', { ascending: false })
      .limit(1);

    const mode = configRows?.[0]?.binance_mode || 'demo';

    console.log(`[GET /api/orders] Buscando posições. Modo: ${mode}, Par: ${reqSymbol || 'Todos'}`);
    const response = await getPositions(reqSymbol, mode);

    const positions = Array.isArray(response) ? response : [];
    
    // Filtrar onde Math.abs(positionAmt) > 0
    const openPositions = positions.filter((p: any) => Math.abs(parseFloat(p.positionAmt)) > 0.0001);
    
    console.log(`[GET /api/orders] Retornando ${openPositions.length} posições abertas.`);
    return NextResponse.json(openPositions);
  } catch (error: any) {
    console.error('[GET /api/orders] Erro:', error.response?.data || error.message);
    return NextResponse.json([], { status: 200 }); // Sempre retornar array
  }
}
