import { Candle } from '@/types';
import { fetchGroqWithFallback } from './groq';

export interface AIAnalysisParams {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  recentCandles: Candle[];
  confluenceScore: number;
  technicalSignals: any[];
  newsSentiment: number;
  fearAndGreed: number;
  mtfAlignment: string;
  session: string;
  vwapBias: string;
  volumeProfile: any;
  lastTrades: any[];
  
  // NEW parameters:
  patterns?: any[];
  divergences?: any[];
  derivatives?: {
    fundingRate: number;
    openInterest: number;
    longShortRatio: number;
    longPercentage?: number;
    shortPercentage?: number;
    oiChange24h?: number;
  };
  headlines?: any[];
}

export interface AIAnalysisResult {
  recommendation: 'FORTE COMPRA' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'FORTE VENDA';
  confidence: number;
  reasoning: string;
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  risks: string;
  opportunities: string;
  timeframe: string;
  bias: string;
}

export const analyzeMarket = async (params: AIAnalysisParams): Promise<AIAnalysisResult> => {
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set, skipping AI analysis');
    return {
      recommendation: 'NEUTRO',
      confidence: 50,
      reasoning: 'API Key do Groq ausente nas configurações locais.',
      keyLevels: { support: [params.currentPrice * 0.98], resistance: [params.currentPrice * 1.02] },
      risks: 'Chave de API não configurada.',
      opportunities: 'Verificar variáveis de ambiente.',
      timeframe: 'N/A',
      bias: 'NEUTRO'
    };
  }

  // Formatting parameters for the prompt
  const price = params.currentPrice;
  const symbol = params.symbol;
  const timeframe = params.timeframe;
  const change24h = params.volumeProfile?.change24h || 0; // fallback or pass
  const volume24h = params.volumeProfile?.volume24h || 0; 
  const technicalScore = params.confluenceScore;
  const emaSignal = params.vwapBias;
  const rsiValue = params.technicalSignals.find(s => s.includes('RSI'))?.match(/\d+(\.\d+)?/)?.[0] || '50';
  const rsiSignal = params.technicalSignals.find(s => s.includes('RSI')) || 'NEUTRO';
  const macdTrend = params.technicalSignals.find(s => s.includes('MACD')) || 'NEUTRO';
  const bbPosition = params.technicalSignals.find(s => s.includes('Bollinger')) || 'NEUTRO';
  const stochSignal = 'NEUTRO'; // Default fallback
  const nadarayaTrend = 'NEUTRO';
  const didiSignal = 'NEUTRO';
  const bos = params.technicalSignals.find(s => s.includes('SMC')) || 'None';
  const choch = 'None';
  const fvgCount = 0;
  const fibLevel = 'N/A';
  const fibTrend = 'SIDEWAYS';

  const mtf1h = params.mtfAlignment;
  const mtf4h = params.mtfAlignment;
  const mtf1d = params.mtfAlignment;
  const mtfAlignment = params.mtfAlignment;

  const fundingRate = params.derivatives?.fundingRate || 0.0001;
  const openInterest = params.derivatives?.openInterest || 0;
  const longShortRatio = params.derivatives?.longShortRatio || 1;
  const oiChange = params.derivatives?.oiChange24h || 0;

  const fearGreed = params.fearAndGreed;
  const fearGreedLabel = fearGreed >= 75 ? 'Ganância Extrema' : fearGreed >= 55 ? 'Ganância' : fearGreed >= 45 ? 'Neutro' : fearGreed >= 25 ? 'Medo' : 'Medo Extremo';
  const newsScore = params.newsSentiment;

  const patterns = params.patterns || [];
  const divergences = params.divergences || [];
  const headlines = params.headlines || [];

  const prompt = `Você é um analista sênior de criptomoedas com 10 anos de experiência em análise técnica e mercados de derivativos. Analise ${symbol} com os dados abaixo e forneça uma análise OBJETIVA e ACIONÁVEL em português brasileiro. Seja direto e preciso.

=== DADOS DE MERCADO ===
Par: ${symbol} | Preço: $${price} | Var 24h: ${change24h}%
Volume 24h: $${volume24h}M | Timeframe: ${timeframe}

=== ANÁLISE TÉCNICA (Score: ${technicalScore}/100) ===
EMA: ${emaSignal}
RSI(14): ${rsiValue} → ${rsiSignal}
MACD: ${macdTrend}
Bollinger Bands: ${bbPosition}
Estocástico: ${stochSignal}
Nadaraya-Watson: ${nadarayaTrend}
Didi Index: ${didiSignal}
SMC: BOS=${bos}, CHoCH=${choch}, FVGs abertos=${fvgCount}
Fibonacci: ${fibLevel} (${fibTrend})

=== PADRÕES DE CANDLE DETECTADOS ===
${patterns.map(p => `- ${p.name} (${p.type}): ${p.description}`).join('\n') || 'Nenhum padrão relevante'}

=== DIVERGÊNCIAS ===
${divergences.map(d => `- ${d.description}`).join('\n') || 'Sem divergências detectadas'}

=== MULTI-TIMEFRAME ===
1H: ${mtf1h} | 4H: ${mtf4h} | 1D: ${mtf1d}
Alinhamento: ${mtfAlignment}

=== DERIVATIVOS ===
Funding Rate: ${fundingRate}% (${fundingRate > 0 ? 'longs pagando shorts' : 'shorts pagando longs'})
Open Interest: ${openInterest} (${oiChange > 0 ? 'crescendo' : 'caindo'})
Long/Short Ratio: ${longShortRatio} (${longShortRatio > 1 ? 'maioria long' : 'maioria short'})

=== SENTIMENTO ===
Fear & Greed: ${fearGreed}/100 (${fearGreedLabel})
Sentimento notícias: ${newsScore > 0 ? 'positivo' : newsScore < 0 ? 'negativo' : 'neutro'}
Headlines relevantes: ${headlines.slice(0, 3).map(h => h.title || h).join(' | ')}

Retorne APENAS este JSON (sem markdown, sem texto extra, sem bloco de código, apenas chaves e conteúdo):
{
  "recommendation": "FORTE COMPRA|COMPRA|NEUTRO|VENDA|FORTE VENDA",
  "confidence": 0-100,
  "reasoning": "análise completa em 4-5 frases cobrindo técnico, derivativos e sentimento",
  "keyLevels": {
    "support": [preço1, preço2, preço3],
    "resistance": [preço1, preço2, preço3]
  },
  "risks": "riscos específicos em 2 frases",
  "opportunities": "oportunidades específicas em 2 frases",
  "timeframe": "horizonte recomendado",
  "bias": "viés direcional em uma palavra"
}
`;

  try {
    const fetchPromise = fetchGroqWithFallback(
      [{ role: 'user', content: prompt }],
      450,
      0.25
    );

    const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Groq API Timeout')), 12000));
    const { content: text } = await Promise.race([fetchPromise, timeoutPromise]);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    try {
      const json = JSON.parse(jsonString);
      return {
        recommendation: json.recommendation || 'NEUTRO',
        confidence: json.confidence || 50,
        reasoning: json.reasoning || 'Análise técnica e de derivativos compilada com sucesso.',
        keyLevels: json.keyLevels || {
          support: [price * 0.97, price * 0.95],
          resistance: [price * 1.03, price * 1.05]
        },
        risks: json.risks || 'Gestão de risco estrita recomendada devido à volatilidade.',
        opportunities: json.opportunities || 'Aguardar gatilhos operacionais nos níveis sugeridos.',
        timeframe: json.timeframe || 'Curto Prazo',
        bias: json.bias || 'NEUTRO'
      };
    } catch (e) {
      console.error('Failed to parse Groq JSON, text:', text);
      return {
        recommendation: 'NEUTRO',
        confidence: 50,
        reasoning: 'Erro ao decodificar a resposta da inteligência artificial. Análise de fallback ativa.',
        keyLevels: { support: [price * 0.98], resistance: [price * 1.02] },
        risks: 'Dados de risco corrompidos.',
        opportunities: 'Consultar indicadores técnicos abaixo.',
        timeframe: 'N/A',
        bias: 'NEUTRO'
      };
    }
  } catch (error) {
    console.error('AI Analyst Error:', error);
    return {
      recommendation: 'NEUTRO',
      confidence: 50,
      reasoning: 'Não foi possível se comunicar com o servidor da inteligência artificial.',
      keyLevels: { support: [price * 0.98], resistance: [price * 1.02] },
      risks: 'Erro na API do Groq.',
      opportunities: 'Aguardar restabelecimento ou verificar chave de API.',
      timeframe: 'N/A',
      bias: 'NEUTRO'
    };
  }
};
