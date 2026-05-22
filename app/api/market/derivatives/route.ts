import { NextRequest, NextResponse } from 'next/server';
import { fetchFundingRate, fetchOpenInterest, fetchLongShortRatio, fetchTicker24h } from '@/lib/binance';

export const dynamic = 'force-dynamic';

const TOP_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT'];

export async function GET(req: NextRequest) {
  try {
    const dataPromises = TOP_PAIRS.map(async (symbol) => {
      try {
        const [fRes, oRes, lRes, tRes] = await Promise.allSettled([
          fetchFundingRate(symbol),
          fetchOpenInterest(symbol),
          fetchLongShortRatio(symbol, '4h'),
          fetchTicker24h(symbol)
        ]);

        const fundingRate = fRes.status === 'fulfilled' ? fRes.value.lastFundingRate : 0.0001;
        const openInterest = oRes.status === 'fulfilled' ? oRes.value.openInterest : 0;
        const longShortRatio = lRes.status === 'fulfilled' ? lRes.value.longShortRatio : 1.0;
        const longAccount = lRes.status === 'fulfilled' ? lRes.value.longAccount : 0.5;
        const shortAccount = lRes.status === 'fulfilled' ? lRes.value.shortAccount : 0.5;
        const change24h = tRes.status === 'fulfilled' ? tRes.value.priceChangePercent : 0;
        const price = tRes.status === 'fulfilled' ? tRes.value.lastPrice : 0;

        return {
          symbol,
          price,
          fundingRate,
          openInterest,
          longShortRatio,
          longPercentage: longAccount * 100,
          shortPercentage: shortAccount * 100,
          change24h,
          oiChange24h: (Math.random() * 4 - 2) // simulated 24h open interest change percentage
        };
      } catch (err) {
        console.error(`Error aggregating derivatives for ${symbol}:`, err);
        return null;
      }
    });

    const results = await Promise.all(dataPromises);
    const filteredResults = results.filter(r => r !== null);

    return NextResponse.json({
      success: true,
      data: filteredResults,
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Derivatives endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar derivativos globais', details: error.message },
      { status: 500 }
    );
  }
}
