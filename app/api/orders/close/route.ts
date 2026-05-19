import { NextResponse } from 'next/server';
import { closePosition, getPositions } from '@/lib/binance';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { symbol, side, quantity } = await request.json();

    if (!symbol || !side) {
      return NextResponse.json({ error: 'symbol e side são obrigatórios' }, { status: 400 });
    }

    // Se quantity não foi enviada, buscar da API Binance
    let qty = quantity ? parseFloat(quantity) : undefined;
    if (!qty) {
      const positions = await getPositions(symbol).catch(() => []);
      const pos = positions.find((p: any) => p.symbol === symbol);
      qty = Math.abs(parseFloat(pos?.positionAmt || '0'));
    }

    if (!qty || qty <= 0) {
      return NextResponse.json({ error: `Posição não encontrada para ${symbol}` }, { status: 400 });
    }

    const result = await closePosition(symbol, side as 'BUY' | 'SELL', qty);
    return NextResponse.json({ success: true, order: result });
  } catch (error: any) {
    console.error('[CLOSE] error:', error.response?.data || error.message);
    return NextResponse.json({
      error: error.response?.data?.msg || error.message,
    }, { status: 400 });
  }
}
