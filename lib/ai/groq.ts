export interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function fetchGroqWithFallback(
  messages: GroqMessage[],
  maxTokens: number = 800,
  temperature: number = 0.3
): Promise<{ content: string; model: string }> {
  const models = [
    'llama-3.3-70b-versatile',
    'mixtral-8x7b-32768',
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
  ];

  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[Groq Helper] Attempting call with model: ${model}`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature
        })
      });

      console.log(`[Groq Helper] Response status for ${model}: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        if (content) {
          console.log(`[Groq Helper] Success with model: ${model}`);
          return { content, model };
        }
      } else {
        const errText = await response.text();
        console.warn(`[Groq Helper] Model ${model} failed. Status: ${response.status}`, errText);
        lastError = new Error(`Status ${response.status}: ${errText}`);
        
        // If unauthorized (invalid API Key), don't waste time on other models
        if (response.status === 401) {
          break;
        }
      }
    } catch (err: any) {
      console.error(`[Groq Helper] Exception with model ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Groq models failed or rate-limited.');
}
