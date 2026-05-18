import { NextRequest, NextResponse } from 'next/server';
import { getPositions } from '@/lib/binance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  try {
    const data = await getPositions(symbol || undefined);
    // Filtrar APENAS posições abertas reais (positionAmt != 0)
    const openPositions = Array.isArray(data)
      ? data.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0)
      : [];
    return NextResponse.json(openPositions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Positions API error:', error.response?.data || error.message);
    return NextResponse.json([], { status: 200 });
  }
}
