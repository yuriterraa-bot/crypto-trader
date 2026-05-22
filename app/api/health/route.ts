import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import crypto from 'crypto-js';

export const dynamic = 'force-dynamic';

const generateSignature = (queryString: string, secretKey: string) => {
  return crypto.HmacSHA256(queryString, secretKey).toString(crypto.enc.Hex);
};

export async function GET() {
  let supabaseOk = false;
  let binanceOk = false;
  let diagnostics: any = {};

  try {
    // 1. Test Supabase
    const { data: dbConfig, error } = await supabase
      .from('bot_config')
      .select('id, binance_mode')
      .limit(1);
      
    if (!error) {
      supabaseOk = true;
      diagnostics.supabaseMode = dbConfig?.[0]?.binance_mode || 'none';
    } else {
      diagnostics.supabaseError = error.message;
    }

    // 2. Test Binance public endpoint directly
    const res = await axios.get('https://fapi.binance.com/fapi/v1/time', { timeout: 3000 });
    if (res.status === 200) {
      binanceOk = true;
    }
  } catch (error: any) {
    console.error('Health check partial failure:', error);
    diagnostics.publicApiError = error.message;
  }

  // 3. Environment variables diagnostics
  diagnostics.env = {
    BINANCE_MODE: process.env.BINANCE_MODE || 'not_set',
    hasDemoApiKey: !!process.env.BINANCE_API_KEY,
    demoApiKeyLength: process.env.BINANCE_API_KEY?.length || 0,
    demoApiKeyPrefix: process.env.BINANCE_API_KEY ? process.env.BINANCE_API_KEY.substring(0, 6) : '',
    hasDemoSecretKey: !!process.env.BINANCE_SECRET_KEY,
    demoSecretKeyLength: process.env.BINANCE_SECRET_KEY?.length || 0,
    hasRealApiKey: !!process.env.BINANCE_REAL_API_KEY,
    realApiKeyLength: process.env.BINANCE_REAL_API_KEY?.length || 0,
    realApiKeyPrefix: process.env.BINANCE_REAL_API_KEY ? process.env.BINANCE_REAL_API_KEY.substring(0, 6) : '',
    hasRealSecretKey: !!process.env.BINANCE_REAL_SECRET_KEY,
    realSecretKeyLength: process.env.BINANCE_REAL_SECRET_KEY?.length || 0,
  };

  // 4. Test connection using REAL keys
  if (process.env.BINANCE_REAL_API_KEY && process.env.BINANCE_REAL_SECRET_KEY) {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = generateSignature(queryString, process.env.BINANCE_REAL_SECRET_KEY);
      const testRes = await axios.get(`https://fapi.binance.com/fapi/v2/balance?${queryString}&signature=${signature}`, {
        headers: { 'X-MBX-APIKEY': process.env.BINANCE_REAL_API_KEY },
        timeout: 4000
      });
      diagnostics.realApiTest = {
        status: 'success',
        dataLength: Array.isArray(testRes.data) ? testRes.data.length : typeof testRes.data,
        usdtBalance: testRes.data.find?.((a: any) => a.asset === 'USDT') || 'not_found'
      };
    } catch (err: any) {
      diagnostics.realApiTest = {
        status: 'error',
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data
        } : 'no_response'
      };
    }
  } else {
    diagnostics.realApiTest = { status: 'missing_keys' };
  }

  // 5. Test connection using DEMO keys
  if (process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY) {
    try {
      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = generateSignature(queryString, process.env.BINANCE_SECRET_KEY);
      const testRes = await axios.get(`https://demo-fapi.binance.com/fapi/v2/balance?${queryString}&signature=${signature}`, {
        headers: { 'X-MBX-APIKEY': process.env.BINANCE_API_KEY },
        timeout: 4000
      });
      diagnostics.demoApiTest = {
        status: 'success',
        dataLength: Array.isArray(testRes.data) ? testRes.data.length : typeof testRes.data,
        usdtBalance: testRes.data.find?.((a: any) => a.asset === 'USDT') || 'not_found'
      };
    } catch (err: any) {
      diagnostics.demoApiTest = {
        status: 'error',
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data
        } : 'no_response'
      };
    }
  } else {
    diagnostics.demoApiTest = { status: 'missing_keys' };
  }

  return NextResponse.json({
    status: (supabaseOk && binanceOk) ? "ok" : "degraded",
    supabase: supabaseOk,
    binance: binanceOk,
    timestamp: new Date().toISOString(),
    uptime_check: true,
    diagnostics
  });
}

