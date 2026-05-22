import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { analyzeAsset } from '@/lib/analysis/marketAnalyzer';
import { sendDiscordAlert } from '@/lib/alerts/discordAlert';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch active alerts from Supabase
    const { data: activeAlerts, error } = await supabase
      .from('alert_configs')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.warn('[Alert Check] Database query failed or table not found:', error.message);
      return NextResponse.json({ 
        success: false, 
        message: 'Database not accessible. Skipping cron check.',
        details: error.message 
      });
    }

    if (!activeAlerts || activeAlerts.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum alerta ativo encontrado.' });
    }

    const results = [];
    const now = new Date();

    // 2. Iterate through active alerts and evaluate
    for (const alert of activeAlerts) {
      try {
        // Cooldown check: 15 minutes (900000 ms) to avoid spamming Discord
        if (alert.last_triggered) {
          const lastTrig = new Date(alert.last_triggered);
          if (now.getTime() - lastTrig.getTime() < 15 * 60 * 1000) {
            results.push({ id: alert.id, symbol: alert.symbol, status: 'cooldown', message: 'Em intervalo de resfriamento (15m)' });
            continue;
          }
        }

        // Run technical analysis
        const analysis = await analyzeAsset(alert.symbol);
        
        let currentValue = 0;
        let isTriggered = false;

        // Evaluate conditions
        switch (alert.condition) {
          case 'score >':
            currentValue = analysis.technicalScore;
            isTriggered = currentValue > alert.threshold;
            break;
          case 'score <':
            currentValue = analysis.technicalScore;
            isTriggered = currentValue < alert.threshold;
            break;
          case 'rsi >':
            currentValue = analysis.indicators.rsi.value;
            isTriggered = currentValue > alert.threshold;
            break;
          case 'rsi <':
            currentValue = analysis.indicators.rsi.value;
            isTriggered = currentValue < alert.threshold;
            break;
          case 'price >':
            currentValue = analysis.price;
            isTriggered = currentValue > alert.threshold;
            break;
          case 'price <':
            currentValue = analysis.price;
            isTriggered = currentValue < alert.threshold;
            break;
          default:
            console.warn(`[Alert Check] Condição desconhecida: ${alert.condition}`);
        }

        if (isTriggered) {
          let discordSent = false;
          
          if (alert.discord_webhook) {
            discordSent = await sendDiscordAlert(alert.discord_webhook, {
              symbol: alert.symbol,
              condition: alert.condition,
              threshold: alert.threshold,
              currentValue: currentValue,
              currentPrice: analysis.price,
              technicalSignal: analysis.technicalSignal,
              technicalScore: analysis.technicalScore
            });
          }

          // Update trigger in DB
          await supabase
            .from('alert_configs')
            .update({ last_triggered: now.toISOString() })
            .eq('id', alert.id);

          results.push({
            id: alert.id,
            symbol: alert.symbol,
            triggered: true,
            currentValue,
            discordSent,
            message: `Alerta disparado! Condição ${alert.condition} ${alert.threshold} atingida (valor: ${currentValue})`
          });
        } else {
          results.push({
            id: alert.id,
            symbol: alert.symbol,
            triggered: false,
            currentValue,
            message: `Condição ${alert.condition} ${alert.threshold} não atingida (valor atual: ${currentValue})`
          });
        }
      } catch (err: any) {
        console.error(`Erro ao processar alerta ID ${alert.id} (${alert.symbol}):`, err);
        results.push({ id: alert.id, symbol: alert.symbol, error: err.message, status: 'error' });
      }
    }

    return NextResponse.json({ success: true, checked: activeAlerts.length, results });
  } catch (error: any) {
    console.error('Error running alerts check cron:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao executar verificação de alertas', details: error.message },
      { status: 500 }
    );
  }
}
