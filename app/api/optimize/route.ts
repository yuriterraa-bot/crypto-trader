import { NextResponse } from 'next/server';
import { autoOptimize } from '@/lib/optimization/autoOptimize';

export async function POST(request: Request) {
  try {
    const { symbol = 'BTCUSDT', lookbackDays = 7 } = await request.json();

    const topConfigs = await autoOptimize(symbol, lookbackDays);

    return NextResponse.json({ success: true, topConfigs });
  } catch (error: any) {
    console.error('Optimize error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
