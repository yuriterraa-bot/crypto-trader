import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';

export async function GET() {
  const start = Date.now();
  
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine the host URL so we can make internal fetch calls
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Run BTC
    const resBtc = await fetch(`${baseUrl}/api/bot/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'BTCUSDT' })
    });
    const btcData = await resBtc.json();

    // Run ETH
    const resEth = await fetch(`${baseUrl}/api/bot/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'ETHUSDT' })
    });
    const ethData = await resEth.json();

    const duration_ms = Date.now() - start;

    // Log to Supabase
    await supabase.from('cron_logs').insert([{
      btc_signal: JSON.stringify(btcData),
      eth_signal: JSON.stringify(ethData),
      duration_ms,
      error: null
    }]);

    return NextResponse.json({ 
      success: true, 
      btc_signal: btcData, 
      eth_signal: ethData, 
      duration_ms 
    });

  } catch (error: any) {
    const duration_ms = Date.now() - start;
    
    // Log error to Supabase
    await supabase.from('cron_logs').insert([{
      duration_ms,
      error: error.message
    }]);
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
