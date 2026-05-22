import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPositions, fetchCandles } from '@/lib/binance';
import { analyzeAsset } from '@/lib/analysis/marketAnalyzer';
import { fetchGroqWithFallback } from '@/lib/ai/groq';
import axios from 'axios';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Fetch current mode from DB config
    const { data: configs } = await supabase
      .from('bot_config')
      .select('binance_mode')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    const mode = configs && configs.length > 0 ? configs[0].binance_mode || 'demo' : 'demo';

    // 2. Fetch positions from Binance using dynamic credentials
    const positions = await getPositions(undefined, mode).catch(() => []);
    
    // Filter active open positions (where size !== 0)
    const openPositions = positions.filter((p: any) => parseFloat(p.positionAmt || '0') !== 0);

    if (openPositions.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch Fear & Greed index
    let fearGreed = 50;
    try {
      const fngRes = await axios.get('https://api.alternative.me/fng/?limit=1');
      fearGreed = parseInt(fngRes.data.data[0].value, 10);
    } catch (e) {
      console.warn('Could not fetch Fear & Greed, using fallback 50');
    }

    const results = [];

    // Analyze each position
    for (const pos of openPositions) {
      const symbol = pos.symbol;
      const positionAmt = parseFloat(pos.positionAmt);
      const isLong = positionAmt > 0;
      const leverage = parseInt(pos.leverage, 10);
      const entryPrice = parseFloat(pos.entryPrice);
      const liquidationPrice = parseFloat(pos.liquidationPrice);
      const unrealizedProfit = parseFloat(pos.unrealizedProfit || pos.unRealizedProfit || '0');
      
      const currentPrice = parseFloat(pos.markPrice || pos.entryPrice);
      const positionValue = Math.abs(positionAmt) * currentPrice;
      const margin = positionValue / leverage;
      const pnl = unrealizedProfit;
      const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;

      // 3. Fetch Technical analysis in 4H and 1D in parallel (handling failures gracefully)
      let analysis4h: any = null;
      let analysis1d: any = null;

      try {
        const [a4h, a1d] = await Promise.allSettled([
          analyzeAsset(symbol, '4h'),
          analyzeAsset(symbol, '1d')
        ]);
        
        if (a4h.status === 'fulfilled') analysis4h = a4h.value;
        if (a1d.status === 'fulfilled') analysis1d = a1d.value;
      } catch (err) {
        console.error(`Error analyzing asset technicals for ${symbol}:`, err);
      }

      // Default technical indicators fallback if analysis failed
      const score4h = analysis4h ? analysis4h.technicalScore : 0;
      const score1d = analysis1d ? analysis1d.technicalScore : 0;
      const rsi4h = analysis4h ? parseFloat(analysis4h.indicators.rsi.value.toFixed(1)) : 50.0;
      const rsi1d = analysis1d ? parseFloat(analysis1d.indicators.rsi.value.toFixed(1)) : 50.0;
      const trend4h = analysis4h ? analysis4h.indicators.ema.signal : 'NEUTRO';
      const trend1d = analysis1d ? analysis1d.indicators.ema.signal : 'NEUTRO';
      
      let smcSignal = 'Sem sinal claro';
      if (analysis4h?.indicators?.smc) {
        const smc = analysis4h.indicators.smc;
        if (smc.choch) smcSignal = `CHoCH ${smc.choch.direction}`;
        else if (smc.bos) smcSignal = `BOS ${smc.bos.direction}`;
      }

      const patterns = analysis4h ? analysis4h.indicators.patterns.map((p: any) => p.name) : [];
      const divergences = analysis4h ? analysis4h.indicators.divergences.map((d: any) => d.description) : [];

      // Calculate support and resistance from Bollinger or Fibonacci
      let fib618 = currentPrice * 0.95;
      let fib382 = currentPrice * 1.05;
      let nearestSupport = currentPrice * 0.97;
      let nearestResistance = currentPrice * 1.03;

      if (analysis4h?.indicators?.fibonacci?.levels) {
        const levels = analysis4h.indicators.fibonacci.levels;
        const fib618Level = levels.find((l: any) => Math.abs(l.ratio - 0.618) < 0.05);
        const fib382Level = levels.find((l: any) => Math.abs(l.ratio - 0.382) < 0.05);
        if (fib618Level) fib618 = fib618Level.price;
        if (fib382Level) fib382 = fib382Level.price;

        const sorted = [...levels].sort((a, b) => a.price - b.price);
        const supports = sorted.filter((l: any) => l.price < currentPrice);
        const resistances = sorted.filter((l: any) => l.price > currentPrice);
        if (supports.length > 0) nearestSupport = supports[supports.length - 1].price;
        if (resistances.length > 0) nearestResistance = resistances[0].price;
      }

      const fundingRate = analysis4h ? (analysis4h.derivatives.fundingRate * 100).toFixed(4) : '0.0100';

      // 4. Fetch trade open time from journal entries
      const { data: journalRows } = await supabase
        .from('journal_entries')
        .select('created_at')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1);

      let hoursOpen = 12;
      if (journalRows && journalRows.length > 0) {
        const openTime = new Date(journalRows[0].created_at).getTime();
        hoursOpen = Math.max(1, Math.round((Date.now() - openTime) / (1000 * 60 * 60)));
      }

      // 5. Structure prompt and call Groq
      const prompt = `Você é um gestor de risco experiente analisando uma posição aberta de futuros de criptomoedas.
Seja direto, objetivo e profissional.

=== POSIÇÃO ABERTA ===
Par: ${symbol}
Direção: ${isLong ? 'LONG (comprado)' : 'SHORT (vendido)'}
Alavancagem: ${leverage}x
Preço de entrada: $${entryPrice}
Preço atual: $${currentPrice}
P&L atual: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} USDT (${pnlPercent.toFixed(2)}%)
Tamanho da posição: $${positionValue.toFixed(2)} USDT
Preço de liquidação: $${liquidationPrice}
Tempo aberto: ${hoursOpen} horas

=== CONTEXTO TÉCNICO ATUAL ===
Timeframe 4H - Score: ${score4h}/100
Timeframe 1D - Score: ${score1d}/100
RSI(14) no 4H: ${rsi4h}
RSI(14) no 1D: ${rsi1d}
Tendência 4H: ${trend4h}
Tendência 1D: ${trend1d}
SMC: ${smcSignal}
Padrões detectados: ${patterns.join(', ') || 'nenhum'}
Divergências: ${divergences.join(', ') || 'nenhuma'}

=== NÍVEIS IMPORTANTES ===
Suporte mais próximo: $${nearestSupport}
Resistência mais próximo: $${nearestResistance}
Fibonacci 0.618: $${fib618}
Fibonacci 0.382: $${fib382}

=== SENTIMENTO ===
Fear & Greed: ${fearGreed}/100
Funding Rate: ${fundingRate}%

REGRA CRÍTICA DE DIREÇÃO:
- Se a posição é LONG e o score do timeframe diário é NEGATIVO (< -20), defina urgency como 'alta' ou 'urgente' e action como 'FECHAR' ou 'MOVER_STOP'. Não recomende MANTER posições longas com tendência diária bearish forte.
- Se a posição é SHORT e o score do timeframe diário é POSITIVO (> 20), defina urgency como 'alta' ou 'urgente' e action como 'FECHAR' ou 'MOVER_STOP'. Não recomende MANTER posições short com tendência diária bullish forte.

Responda APENAS com este JSON (sem markdown, sem texto extra):
{
  "health": "EXCELENTE|BOM|NEUTRO|PREOCUPANTE|CRÍTICO",
  "action": "MANTER|PARCIAL|MOVER_STOP|FECHAR|ADICIONAR",
  "urgency": "baixa|média|alta|urgente",
  "stopLoss": preço_recomendado_para_stop,
  "takeProfit": preço_recomendado_para_tp,
  "stopReasoning": "por que colocar stop nesse nível",
  "tpReasoning": "por que esse take profit",
  "mainRisk": "maior risco desta posição agora",
  "opportunity": "melhor cenário para esta posição",
  "analysis": "análise completa em 4-5 frases sobre o estado da posição, o que o mercado está dizendo e o que fazer",
  "checklist": [
    "ponto importante 1",
    "ponto importante 2",
    "ponto importante 3"
  ]
}`;

      let aiResult: any = {
        health: 'NEUTRO',
        action: 'MANTER',
        urgency: 'baixa',
        stopLoss: isLong ? entryPrice * 0.95 : entryPrice * 1.05,
        takeProfit: isLong ? entryPrice * 1.10 : entryPrice * 0.90,
        stopReasoning: 'Nível de stop de segurança padrão baseado em volatilidade.',
        tpReasoning: 'Nível de take profit de segurança padrão baseado em volatilidade.',
        mainRisk: 'Ausência de análise de IA em tempo real.',
        opportunity: 'Melhora de confluência técnica geral.',
        analysis: 'A análise da inteligência artificial está indisponível no momento. Exibindo dados de segurança padrões.',
        checklist: ['Verificar se há notícias de alto impacto programadas', 'Monitorar proximidade do preço de liquidação', 'Manter a gestão de risco e stop operacionais']
      };

      console.log('GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);
      console.log(`GROQ_API_KEY info: length=${process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0}, startsWithGsk=${process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.startsWith('gsk_') : false}, valueIsQuote=${process.env.GROQ_API_KEY === '""' || process.env.GROQ_API_KEY === "''"}`);
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== '""' && process.env.GROQ_API_KEY !== "''") {
        try {
          const { content } = await fetchGroqWithFallback(
            [{ role: 'user', content: prompt }],
            800,
            0.3
          );

          console.log('Groq fallback success, content length:', content.length);

          // Extract JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              const normalized: any = {};
              Object.keys(parsed).forEach(k => {
                normalized[k.replace(/['"]/g, '')] = parsed[k];
              });

              aiResult = {
                health: normalized.health || 'NEUTRO',
                action: normalized.action || 'MANTER',
                urgency: normalized.urgency || 'baixa',
                stopLoss: Number(normalized.stopLoss) || (isLong ? entryPrice * 0.95 : entryPrice * 1.05),
                takeProfit: Number(normalized.takeProfit) || (isLong ? entryPrice * 1.10 : entryPrice * 0.90),
                stopReasoning: normalized.stopReasoning || 'Recomendado por confluência.',
                tpReasoning: normalized.tpReasoning || 'Recomendado por confluência.',
                mainRisk: normalized.mainRisk || 'Volatilidade do mercado.',
                opportunity: normalized.opportunity || 'Movimento direcional favorável.',
                analysis: normalized.analysis || 'Análise executada com sucesso.',
                checklist: Array.isArray(normalized.checklist) ? normalized.checklist : []
              };
            } catch (parseErr) {
              console.error('Failed to parse Groq JSON output:', parseErr, content);
            }
          } else {
            console.error('No JSON found in Groq response:', content);
          }
        } catch (groqErr) {
          console.error('Groq AI request error after all fallbacks:', groqErr);
        }
      }

      results.push({
        position: {
          symbol,
          positionAmt,
          isLong,
          leverage,
          entryPrice,
          currentPrice,
          liquidationPrice,
          pnl,
          pnlPercent,
          positionValue,
          margin,
          hoursOpen
        },
        technicalContext: {
          score4h,
          score1d,
          rsi4h,
          rsi1d,
          trend4h,
          trend1d,
          smcSignal,
          patterns,
          divergences,
          nearestSupport,
          nearestResistance,
          fib618,
          fib382,
          fearGreed,
          fundingRate
        },
        aiAnalysis: aiResult,
        analyzedAt: new Date().toISOString()
      });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[GET /api/position/health] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
