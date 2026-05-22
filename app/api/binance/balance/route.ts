import { NextResponse } from 'next/server';
import { getBalance } from '@/lib/binance';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Obter o modo configurado (demo ou real)
    const { data: configRows } = await supabase
      .from('bot_config')
      .select('binance_mode')
      .order('updated_at', { ascending: false })
      .limit(1);

    const dbMode = configRows?.[0]?.binance_mode || 'demo';
    const mode = process.env.BINANCE_MODE === 'real' ? 'real' : dbMode;

    console.log(`[GET /api/binance/balance] Buscando saldo. Modo: ${mode}`);

    const balanceData = await getBalance(mode);

    // Encontrar ativo USDT
    const usdt = Array.isArray(balanceData) 
      ? balanceData.find((a: any) => a.asset === 'USDT') 
      : null;
    
    console.log('[GET /api/binance/balance] USDT asset:', JSON.stringify(usdt));
    
    const balance = parseFloat(
      usdt?.walletBalance ||       // Saldo total da conta (Binance "Wallet Balance")
      usdt?.crossWalletBalance ||  // Cross margin wallet
      usdt?.availableBalance ||    // Disponível (descontando margem usada)
      usdt?.balance || '0'
    );
    
    return NextResponse.json(
      { 
        balance: balance.toFixed(2), 
        total: balance.toFixed(2),
        available: parseFloat(usdt?.availableBalance || '0').toFixed(2),
        raw: usdt 
      },
      { 
        status: 200,
        headers: { 
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        } 
      }
    );
  } catch (error: any) {
    console.error('[GET /api/binance/balance] Error:', error.response?.data || error.message);
    return NextResponse.json({ balance: '0', total: '0' }, { status: 200 });
  }
}
