import { NextResponse } from 'next/server';
import { getBalance } from '@/lib/binance';

export async function GET() {
  try {
    const data = await getBalance();
    const usdtBalance = data.find((b: any) => b.asset === 'USDT');
    return NextResponse.json(usdtBalance || { asset: 'USDT', balance: '0', availableBalance: '0' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
