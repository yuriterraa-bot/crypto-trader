import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.BINANCE_TESTNET === 'true'
  ? 'https://demo-fapi.binance.com'
  : 'https://fapi.binance.com';

export async function GET() {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac('sha256', process.env.BINANCE_SECRET_KEY!)
      .update(queryString)
      .digest('hex');

    const response = await axios.get(
      `${BASE_URL}/fapi/v2/positionRisk?${queryString}&signature=${signature}`,
      {
        headers: { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY! },
        timeout: 8000,
      }
    );

    // Filtrar RIGOROSAMENTE apenas posições com quantidade real
    const openPositions = (response.data || []).filter((p: any) => {
      const amt = parseFloat(p.positionAmt || '0');
      return Math.abs(amt) > 0.0001;
    });

    console.log('[POSITIONS] Abertas reais:', openPositions.length);
    if (openPositions.length > 0) {
      openPositions.forEach((p: any) =>
        console.log(`  ${p.symbol}: amt=${p.positionAmt} entry=${p.entryPrice} pnl=${p.unrealizedProfit}`)
      );
    }

    return NextResponse.json(openPositions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('[POSITIONS] Error:', error.response?.data || error.message);
    return NextResponse.json([], { status: 200 });
  }
}
