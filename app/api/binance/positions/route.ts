import { NextRequest, NextResponse } from 'next/server';
import { getPositions } from '@/lib/binance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  try {
    const data = await getPositions(symbol || undefined);
    // Retornar TODAS as posições (incluindo zero) — o client filtra
    return NextResponse.json(Array.isArray(data) ? data : [], {
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
