import { NextResponse } from 'next/server';
import { getBalance, getPositions } from '@/lib/binance';
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

    const mode = configRows?.[0]?.binance_mode || 'demo';

    console.log(`[GET /api/account/overview] Buscando métricas de saldo e posições. Modo: ${mode}`);

    // 2. Buscar saldo e posições da Binance em paralelo
    const [balanceData, positionsData] = await Promise.all([
      getBalance(mode).catch((err) => {
        console.error('[GET /api/account/overview] Erro ao buscar saldo:', err.message);
        return [];
      }),
      getPositions(undefined, mode).catch((err) => {
        console.error('[GET /api/account/overview] Erro ao buscar posições:', err.message);
        return [];
      })
    ]);

    // 3. Encontrar ativo USDT
    const usdtAsset = Array.isArray(balanceData) 
      ? balanceData.find((a: any) => a.asset === 'USDT') 
      : null;

    const walletBalance = parseFloat(
      usdtAsset?.walletBalance || 
      usdtAsset?.balance || 
      usdtAsset?.crossWalletBalance || '0'
    );

    const availableBalance = parseFloat(
      usdtAsset?.availableBalance || 
      usdtAsset?.withdrawAvailable || '0'
    );

    // 4. Filtrar posições ativas e calcular margem em uso
    const openPositions = Array.isArray(positionsData)
      ? positionsData.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0.0001)
      : [];

    // Margem em uso (somatório da margem inicial das posições ativas)
    const marginInUse = openPositions.reduce(
      (sum: number, p: any) => sum + parseFloat(p.positionInitialMargin || '0'), 
      0
    );

    // P&L não realizado total das posições abertas
    const unrealizedPnl = openPositions.reduce(
      (sum: number, p: any) => sum + parseFloat(p.unRealizedProfit || p.unrealizedProfit || '0'), 
      0
    );

    const result = {
      walletBalance,
      availableBalance,
      marginInUse,
      unrealizedPnl,
      openPositionsCount: openPositions.length,
      mode: process.env.BINANCE_MODE === 'real' ? 'real' : mode
    };

    console.log('[GET /api/account/overview] Sucesso:', JSON.stringify(result));

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error: any) {
    console.error('[GET /api/account/overview] Erro geral:', error.message);
    return NextResponse.json(
      { error: 'Erro interno ao obter resumo da conta', details: error.message },
      { status: 500 }
    );
  }
}
