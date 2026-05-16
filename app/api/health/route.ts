import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export async function GET() {
  let supabaseOk = false;
  let binanceOk = false;

  try {
    // 1. Test Supabase
    const { count, error } = await supabase
      .from('bot_config')
      .select('*', { count: 'exact', head: true });
      
    if (!error) {
      supabaseOk = true;
    }

    // 2. Test Binance
    const res = await axios.get('https://fapi.binance.com/fapi/v1/ping', { timeout: 5000 });
    if (res.data && Object.keys(res.data).length === 0) {
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
