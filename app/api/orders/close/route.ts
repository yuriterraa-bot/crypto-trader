import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createRawOrder, getPositions } from '@/lib/binance';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, positionSide } = body;

    // 1. Get current position size
    const positions = await getPositions(symbol);
    const position = positions.find((p: any) => p.symbol === symbol && parseFloat(p.positionAmt) !== 0 && (positionSide ? p.positionSide === positionSide : true));

    if (!position) {
      return NextResponse.json({ success: false, error: 'Posição não encontrada' }, { status: 404 });
    }

    const positionAmt = parseFloat(position.positionAmt);
    const side = positionAmt > 0 ? 'SELL' : 'BUY';
    const quantity = Math.abs(positionAmt);

    // 2. Create market order to close
    const closeOrder = await createRawOrder({
      symbol,
      side,
      type: 'MARKET',
      quantity: quantity.toString(),
      reduceOnly: 'true',
    });

    // 3. Save to Supabase trades
    await supabase.from('trades').insert({
      id: crypto.randomUUID(),
      symbol,
      side,
      quantity,
      price: 0, // Market
      status: 'FILLED',
      strategy_id: 'MANUAL_CLOSE',
    });

    return NextResponse.json({ success: true, orderId: closeOrder.orderId });
  } catch (error: any) {
    console.error('Error closing position:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
