import { NextRequest, NextResponse } from 'next/server';
import { getPositions } from '@/lib/binance';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  try {
    const data = await getPositions(symbol || undefined);
    // Filter out empty positions
    const activePositions = data.filter((pos: any) => parseFloat(pos.positionAmt) !== 0);
    return NextResponse.json(activePositions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
