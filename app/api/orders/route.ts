import { NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';

const API_KEY = process.env.BINANCE_API_KEY || '';
const SECRET_KEY = process.env.BINANCE_SECRET_KEY || '';
const isTestnet = process.env.BINANCE_TESTNET === 'true';
const BASE_URL = isTestnet ? 'https://demo-fapi.binance.com' : 'https://fapi.binance.com';

const generateSignature = (queryString: string) => {
  return crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[POST /api/orders] Recebido body:', body);

    const { symbol, side, type, quantity, leverage } = body;

    // Validar campos obrigatórios
    if (!symbol || !side || !type || !quantity || !leverage) {
      console.log('[POST /api/orders] Faltando campos obrigatórios');
      return NextResponse.json({ error: 'Faltam campos obrigatórios (symbol, side, type, quantity, leverage)' }, { status: 400 });
    }

    const timestamp = Date.now();

    // Passo 1 - Definir alavancagem
    try {
      console.log(`[POST /api/orders] Passo 1: Definindo alavancagem ${leverage}x para ${symbol}`);
      const levQuery = `symbol=${symbol}&leverage=${leverage}&timestamp=${timestamp}`;
      const levSig = generateSignature(levQuery);
      
      await axios.post(`${BASE_URL}/fapi/v1/leverage?${levQuery}&signature=${levSig}`, null, {
        headers: { 'X-MBX-APIKEY': API_KEY }
      });
      console.log('[POST /api/orders] Alavancagem definida com sucesso.');
    } catch (error: any) {
      console.error('[POST /api/orders] Falha ao definir alavancagem, continuando...', error.response?.data || error.message);
    }

    // Passo 2 - Calcular quantity corretamente
    console.log(`[POST /api/orders] Passo 2: Calculando quantity (USDT amount = ${quantity})`);
    const priceRes = await axios.get(`${BASE_URL}/fapi/v1/ticker/price?symbol=${symbol}`);
    const currentPrice = parseFloat(priceRes.data.price);
    
    let calculatedQty = quantity / currentPrice;
    
    if (symbol.includes('BTC')) {
      calculatedQty = parseFloat(calculatedQty.toFixed(3));
      if (calculatedQty < 0.001) calculatedQty = 0.001; // Mínimo
    } else if (symbol.includes('ETH')) {
      calculatedQty = parseFloat(calculatedQty.toFixed(2));
      if (calculatedQty < 0.01) calculatedQty = 0.01; // Mínimo
    }
    
    console.log(`[POST /api/orders] Quantity calculada em asset: ${calculatedQty}`);

    // Passo 3 - Criar ordem
    console.log(`[POST /api/orders] Passo 3: Criando ordem na Binance...`);
    const orderTimestamp = Date.now();
    const orderQuery = `symbol=${symbol}&side=${side}&type=${type}&quantity=${calculatedQty}&timestamp=${orderTimestamp}`;
    const orderSig = generateSignature(orderQuery);

    try {
      const orderRes = await axios.post(`${BASE_URL}/fapi/v1/order?${orderQuery}&signature=${orderSig}`, null, {
        headers: { 'X-MBX-APIKEY': API_KEY }
      });
      
      console.log('[POST /api/orders] Ordem criada com sucesso:', orderRes.data.orderId);
      return NextResponse.json({ success: true, data: orderRes.data });
    } catch (error: any) {
      // Passo 4 - Se der erro da Binance
      console.error('[POST /api/orders] Erro ao criar ordem:', error.response?.data || error.message);
      return NextResponse.json({ 
        error: error.response?.data?.msg || 'Erro desconhecido da Binance', 
        details: error.response?.data 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[POST /api/orders] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno no servidor', details: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = generateSignature(queryString);

    console.log('[GET /api/orders] Buscando posição de risco...');
    const response = await axios.get(`${BASE_URL}/fapi/v2/positionRisk?${queryString}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': API_KEY }
    });

    const positions = Array.isArray(response.data) ? response.data : [];
    
    // Filtrar onde Math.abs(positionAmt) > 0
    const openPositions = positions.filter((p: any) => Math.abs(parseFloat(p.positionAmt)) > 0);
    
    console.log(`[GET /api/orders] Retornando ${openPositions.length} posições abertas.`);
    // Retornar array (nunca retornar objeto onde se espera array)
    return NextResponse.json(openPositions);
  } catch (error: any) {
    console.error('[GET /api/orders] Erro:', error.response?.data || error.message);
    return NextResponse.json([], { status: 200 }); // Sempre retornar array
  }
}
