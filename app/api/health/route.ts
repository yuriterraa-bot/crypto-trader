import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export async function GET(request: Request) {
  let supabaseOk = false;
  let binanceOk = false;

  try {
    // 1. Test Supabase
    const { data: configRows, error } = await supabase
      .from('bot_config')
      .select('id')
      .limit(1);
      
    if (!error) {
      supabaseOk = true;
    }

    // 2. Test Binance
    const url = new URL('/api/binance/price?symbol=BTCUSDT', request.url);
    const res = await axios.get(url.toString(), { timeout: 3000 });
    if (res.status === 200) {
      binanceOk = true;
    }
  } catch (error) {
    console.error('Health check partial failure:', error);
  }

  return NextResponse.json({
    status: (supabaseOk && binanceOk) ? "ok" : "degraded",
    supabase: supabaseOk,
    binance: binanceOk,
    timestamp: new Date().toISOString(),
    uptime_check: true
  });
}
