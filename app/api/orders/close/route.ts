import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Use sua conta Binance para executar ordens. Esta plataforma é somente análise.' 
    }, 
    { status: 400 }
  );
}
