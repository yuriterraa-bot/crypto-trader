import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

function createSignature(queryString: string) {
  return crypto
    .createHmac('sha256', process.env.BINANCE_SECRET_KEY || '')
    .update(queryString)
    .digest('hex');
}

const BASE_URL = process.env.BINANCE_TESTNET === 'true' 
  ? 'https://testnet.binancefuture.com' 
  : 'https://fapi.binance.com';

export async function GET() {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = createSignature(queryString);
    
    const response = await axios.get(
      `${BASE_URL}/fapi/v2/balance?${queryString}&signature=${signature}`,
      { headers: { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY } }
    );
    
    const assets = response.data;
    console.log('Balance raw:', JSON.stringify(assets.slice(0,3)));
    
    // Tentar todos os campos possíveis
    const usdt = assets.find((a: any) => a.asset === 'USDT');
    console.log('USDT asset:', JSON.stringify(usdt));
    
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
    console.error('Balance error:', error.response?.data || error.message);
    return NextResponse.json({ balance: '0', total: '0' }, { status: 200 });
  }
}
