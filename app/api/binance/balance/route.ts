import { NextResponse } from 'next/server';
import { getBalance } from '@/lib/binance';

export async function GET() {
  try {
    const data = await getBalance();
    
    // Logar no console o retorno bruto
    console.log('[GET /api/binance/balance] Retorno bruto da Binance:', JSON.stringify(data).substring(0, 200) + '...');
    
    const assets = Array.isArray(data) ? data : [];
    const usdt = assets.find((a: any) => a.asset === 'USDT');
    
    const balance = usdt?.availableBalance ?? usdt?.walletBalance ?? usdt?.balance ?? '0';
    
    return NextResponse.json([{ asset: 'USDT', balance, availableBalance: balance }]);
  } catch (error: any) {
    console.error('[GET /api/binance/balance] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
