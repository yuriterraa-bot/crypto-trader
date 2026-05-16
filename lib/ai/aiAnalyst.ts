import { Candle } from '@/types';

export interface AIAnalysisParams {
  symbol: string;
  currentPrice: number;
  recentCandles: Candle[];
  confluenceScore: number;
  technicalSignals: any[];
  newsSentiment: number;
}

export interface AIAnalysisResult {
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  reasoning: string;
  risks: string;
}

export const analyzeMarket = async (params: AIAnalysisParams): Promise<AIAnalysisResult> => {
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set, skipping AI analysis');
    return { recommendation: 'NEUTRAL', confidence: 0, reasoning: 'API Key missing', risks: 'Unknown' };
  }

  const prompt = `
You are an expert institutional crypto trader and AI analyst. Analyze the following market data for ${params.symbol} and provide a trading recommendation.

Current Price: $${params.currentPrice}
Technical Confluence Score: ${params.confluenceScore} (Range: -100 to +100)
Recent Technical Signals: ${JSON.stringify(params.technicalSignals)}
News Sentiment: ${params.newsSentiment} (Range: -1.0 to +1.0)
Recent Price Action (Last 10 15m candles):
${JSON.stringify(params.recentCandles.map(c => ({ open: c.open, high: c.high, low: c.low, close: c.close })))}

Task:
1. Evaluate if the technical signals align with the macro news sentiment.
2. Provide a final recommendation: STRONG_BUY, BUY, NEUTRAL, SELL, or STRONG_SELL.
3. Provide a brief reasoning (max 2 sentences in Portuguese).
4. Identify key risks to this trade (max 1 sentence in Portuguese).

Return ONLY a valid JSON object, no markdown blocks, no extra text:
{
  "recommendation": "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL",
  "confidence": <number 0-100>,
  "reasoning": "<string in pt-br>",
  "risks": "<string in pt-br>"
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
        max_tokens: 300,
        temperature: 0.3
      })
    });

    // Timeout of 8 seconds
    const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Groq API Timeout')), 8000));
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    
    // Extract JSON from response (in case the model wraps it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    try {
      const json = JSON.parse(jsonString);
      return {
        recommendation: json.recommendation || 'NEUTRAL',
        confidence: json.confidence || 0,
        reasoning: json.reasoning || 'Análise concluída.',
        risks: json.risks || 'Nenhum risco detectado na resposta.'
      };
    } catch (e) {
      console.error('Failed to parse Groq JSON:', text);
      return { recommendation: 'NEUTRAL', confidence: 0, reasoning: 'Erro ao analisar JSON', risks: 'Unknown' };
    }
  } catch (error) {
    console.error('AI Analyst Error:', error);
    return { recommendation: 'NEUTRAL', confidence: 0, reasoning: 'Timeout ou Erro na API', risks: '' };
  }
};
