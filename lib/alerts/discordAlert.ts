export interface DiscordAlertPayload {
  symbol: string;
  condition: string;
  threshold: number;
  currentValue: number;
  currentPrice: number;
  technicalSignal?: string;
  technicalScore?: number;
}

export const sendDiscordAlert = async (webhookUrl: string, payload: DiscordAlertPayload): Promise<boolean> => {
  try {
    const { symbol, condition, threshold, currentValue, currentPrice, technicalSignal, technicalScore } = payload;
    
    // Choose embed color based on condition or signal
    // Green (3066993) for Bullish signals / cross above, Red (15158332) for Bearish / cross below
    const isBullish = condition.includes('>') || (technicalSignal && (technicalSignal.includes('COMPRA')));
    const color = isBullish ? 3066993 : 15158332;

    const embed = {
      username: 'CryptoAnalyst Pro',
      avatar_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
      embeds: [
        {
          title: `🚨 Alerta Técnico Acionado: ${symbol}`,
          description: `Uma das suas condições de monitoramento foi atingida no mercado de derivativos.`,
          color: color,
          fields: [
            {
              name: '🔑 Condição Configurada',
              value: `\`${condition} ${threshold}\``,
              inline: true
            },
            {
              name: '📈 Valor Atualizado',
              value: `\`${currentValue.toFixed(2)}\``,
              inline: true
            },
            {
              name: '💰 Preço Atual',
              value: `\`$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\``,
              inline: true
            },
            {
              name: '🤖 Sinal da IA / Técnico',
              value: `**${technicalSignal || 'NEUTRO'}** (Score: ${technicalScore !== undefined ? technicalScore : 'N/A'})`,
              inline: false
            }
          ],
          footer: {
            text: 'CryptoAnalyst Pro • Monitoramento em Tempo Real',
            icon_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embed),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord returned status ${response.status}: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('[Discord Webhook Error]:', error);
    return false;
  }
};
