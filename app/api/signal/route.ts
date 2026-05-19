import { NextResponse } from 'next/server';
import { fetchCandles } from '@/lib/binance';
import { confluenceStrategy } from '@/lib/strategies/confluenceStrategy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol   = searchParams.get('symbol')   || 'BTCUSDT';
    const interval = searchParams.get('interval') || '15m';
    const limit    = parseInt(searchParams.get('limit') || '200');

    const candles = await fetchCandles(symbol, interval, limit);
    if (!candles || candles.length < 50) {
      return NextResponse.json({ error: 'Candles insuficientes' }, { status: 400 });
    }

    const result = confluenceStrategy(candles);

    return NextResponse.json({
      symbol, interval,
      direction:  result.direction,
      score:      result.score,
      threshold:  result.threshold,
      confidence: result.confidence,
      signals:    result.signals,
      details:    result.details,
      timestamp:  new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[/api/signal] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
