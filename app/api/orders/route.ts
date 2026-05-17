import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { setLeverage, createRawOrder, getPositions } from '@/lib/binance';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, side, type, quantity, price, stopPrice, leverage, stopLoss, takeProfit } = body;

    // 1. Set leverage
    if (leverage) {
      await setLeverage(symbol, leverage);
    }

    // 2. Create main order
    const orderParams: any = {
      symbol,
      side,
      type,
      quantity: quantity.toString(),
    };

    if (type === 'LIMIT') {
      orderParams.price = price.toString();
      orderParams.timeInForce = 'GTC';
    } else if (type === 'STOP_LIMIT') {
      orderParams.price = price.toString();
      orderParams.stopPrice = stopPrice.toString();
      orderParams.timeInForce = 'GTC';
    }

    const mainOrder = await createRawOrder(orderParams);

    // 3. Create Stop Loss if defined
    if (stopLoss) {
      const slSide = side === 'BUY' ? 'SELL' : 'BUY';
      await createRawOrder({
        symbol,
        side: slSide,
        type: 'STOP_MARKET',
        stopPrice: stopLoss.toString(),
        closePosition: 'true',
        timeInForce: 'GTC',
      });
    }

    // 4. Create Take Profit if defined
    if (takeProfit) {
      const tpSide = side === 'BUY' ? 'SELL' : 'BUY';
      await createRawOrder({
        symbol,
        side: tpSide,
        type: 'TAKE_PROFIT_MARKET',
        stopPrice: takeProfit.toString(),
        closePosition: 'true',
        timeInForce: 'GTC',
      });
    }

    // 5. Save to Supabase trades
    await supabase.from('trades').insert({
      id: crypto.randomUUID(),
      symbol,
      side,
      quantity,
      price: price || 0,
      status: 'FILLED', // Simplified for this demo
      strategy_id: 'MANUAL',
    });

    return NextResponse.json({ success: true, orderId: mainOrder.orderId, details: mainOrder });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    const positions = await getPositions(symbol || undefined);
    
    // Filter only open positions
    const openPositions = positions.filter((p: any) => parseFloat(p.positionAmt) !== 0);
    
    return NextResponse.json({ success: true, data: openPositions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
