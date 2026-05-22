import { NextResponse } from 'next/server';
import { getPositions } from '@/lib/binance';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Obter o modo configurado (demo ou real)
    const { data: configRows } = await supabase
      .from('bot_config')
      .select('binance_mode')
      .order('updated_at', { ascending: false })
      .limit(1);

    const dbMode = configRows?.[0]?.binance_mode || 'demo';
    const mode = process.env.BINANCE_MODE === 'real' ? 'real' : dbMode;

    console.log(`[GET /api/binance/positions] Buscando posições. Modo: ${mode}`);

    const positionsData = await getPositions(undefined, mode);

    // Filtrar RIGOROSAMENTE apenas posições com quantidade real
    const openPositions = (positionsData || []).filter((p: any) => {
      const amt = parseFloat(p.positionAmt || '0');
      return Math.abs(amt) > 0.0001;
    });

    console.log('[POSITIONS] Abertas reais:', openPositions.length);
    if (openPositions.length > 0) {
      openPositions.forEach((p: any) =>
        console.log(`  ${p.symbol}: amt=${p.positionAmt} entry=${p.entryPrice} pnl=${p.unRealizedProfit} mark=${p.markPrice}`)
      );
    }

    return NextResponse.json(openPositions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('[POSITIONS] Error:', error.response?.data || error.message);
    return NextResponse.json([], { status: 200 });
  }
}
