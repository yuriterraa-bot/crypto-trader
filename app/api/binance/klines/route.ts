import { NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.BINANCE_TESTNET === 'true'
  ? 'https://demo-fapi.binance.com'
  : 'https://fapi.binance.com';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '15m';
    const limit = parseInt(searchParams.get('limit') || '200');

    const response = await axios.get(`${BASE_URL}/fapi/v1/klines`, {
      params: { symbol, interval, limit: Math.min(limit, 500) },
      timeout: 8000,
    });

    const candles = response.data.map((k: any[]) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
    }));

    return NextResponse.json(candles, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('[KLINES]', error.response?.data || error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
