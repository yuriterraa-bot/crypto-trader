import { NextResponse } from 'next/server';
import { createSignature } from '@/lib/binance';
import axios from 'axios';

const BASE_URL = process.env.BINANCE_TESTNET === 'true' 
  ? 'https://demo-fapi.binance.com' 
  : 'https://fapi.binance.com';

export async function POST(request: Request) {
  try {
    const { symbol, side } = await request.json();
    const closeSide = side === 'BUY' ? 'SELL' : 'BUY';
    
    const timestamp = Date.now();
    const params = `symbol=${symbol}&side=${closeSide}&type=MARKET&reduceOnly=true&timestamp=${timestamp}`;
    const signature = createSignature(params);
    
    const response = await axios.post(
      `${BASE_URL}/fapi/v1/order`,
      `${params}&signature=${signature}`,
      { headers: { 
        'X-MBX-APIKEY': process.env.BINANCE_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }}
    );
    
    return NextResponse.json({ success: true, order: response.data });
  } catch (error: any) {
    console.error('Close position error:', error.response?.data || error.message);
    return NextResponse.json({ 
      error: error.response?.data?.msg || error.message 
    }, { status: 400 });
  }
}
