import { NextRequest, NextResponse } from 'next/server';
import { getPrice, getPrices } from '@/lib/binance';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  try {
    if (symbol) {
      const data = await getPrice(symbol);
      return NextResponse.json(data);
    } else {
      const data = await getPrices();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
