import { Candle } from '@/types';

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
}

export interface AIAnalysisResult {
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  setupQuality: 'A+' | 'A' | 'B' | 'C';
  positionSizeRecommendation: 'FULL' | 'HALF' | 'QUARTER';
  confidence: number;
  reasoning: string;
  risks: string;
  keyLevel: number | null;
  invalidationLevel: number | null;
}

export const analyzeMarket = async (params: AIAnalysisParams): Promise<AIAnalysisResult> => {
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set, skipping AI analysis');
    return { recommendation: 'NEUTRAL', setupQuality: 'C', positionSizeRecommendation: 'QUARTER', confidence: 0, reasoning: 'API Key missing', risks: 'Unknown', keyLevel: null, invalidationLevel: null };
  }

  const prompt = `
You are an expert institutional crypto trader and AI analyst. Analyze the following market data for ${params.symbol} and provide a trading recommendation.

Context:
- Current Timeframe: ${params.timeframe}
- Current Price: $${params.currentPrice}
- MTF Alignment: ${params.mtfAlignment}
- Current Market Session: ${params.session}
- VWAP Bias: ${params.vwapBias}
- Volume Profile: POC=${params.volumeProfile?.poc}, VAH=${params.volumeProfile?.vah}, VAL=${params.volumeProfile?.val}

Indicators & Sentiment:
- Technical Confluence Score: ${params.confluenceScore} (Range: -100 to +100)
- Individual Indicators: ${JSON.stringify(params.technicalSignals)}
- News Sentiment: ${params.newsSentiment} (Range: -1.0 to +1.0)
- Fear & Greed Index: ${params.fearAndGreed}

History:
- Last 3 Trades Performance: ${JSON.stringify(params.lastTrades)}
- Recent Price Action (Last 10 candles):
${JSON.stringify(params.recentCandles.map(c => ({ open: c.open, high: c.high, low: c.low, close: c.close })))}

Task:
1. Evaluate alignment between timeframes.
2. Identify nearest support/resistance level.
3. Evaluate setup quality (A+, A, B, C).
4. Recommend position size (FULL, HALF, QUARTER).
5. Provide a final recommendation: STRONG_BUY, BUY, NEUTRAL, SELL, or STRONG_SELL.
6. Provide reasoning and risks in Portuguese (pt-br).

Return ONLY a valid JSON object:
{
  "recommendation": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "setupQuality": "A+" | "A" | "B" | "C",
  "positionSizeRecommendation": "FULL" | "HALF" | "QUARTER",
  "confidence": <number 0-100>,
  "reasoning": "<string em português>",
  "risks": "<string em português>",
  "keyLevel": <number>,
  "invalidationLevel": <number>
}
`;

  try {
    const fetchPromise = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.3
      })
    });

    const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Groq API Timeout')), 12000));
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    try {
      const json = JSON.parse(jsonString);
      return {
        recommendation: json.recommendation || 'NEUTRAL',
        setupQuality: json.setupQuality || 'C',
        positionSizeRecommendation: json.positionSizeRecommendation || 'QUARTER',
        confidence: json.confidence || 0,
        reasoning: json.reasoning || 'Análise concluída.',
        risks: json.risks || 'Nenhum risco detectado.',
        keyLevel: json.keyLevel || null,
        invalidationLevel: json.invalidationLevel || null
      };
    } catch (e) {
      console.error('Failed to parse Groq JSON:', text);
      return { recommendation: 'NEUTRAL', setupQuality: 'C', positionSizeRecommendation: 'QUARTER', confidence: 0, reasoning: 'Erro ao analisar JSON', risks: 'Unknown', keyLevel: null, invalidationLevel: null };
    }
  } catch (error) {
    console.error('AI Analyst Error:', error);
    return { recommendation: 'NEUTRAL', setupQuality: 'C', positionSizeRecommendation: 'QUARTER', confidence: 0, reasoning: 'Timeout ou Erro na API', risks: '', keyLevel: null, invalidationLevel: null };
  }
};
