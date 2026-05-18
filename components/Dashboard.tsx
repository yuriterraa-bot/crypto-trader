'use client';

import { useEffect, useRef } from 'react';
import MetricCards from './MetricCards';
import SignalPanel from './SignalPanel';
import OrderTicket from './OrderTicket';
import PriceChart from './PriceChart';
import StrategyPanel from './StrategyPanel';
import TradeHistory from './TradeHistory';
import NewsPanel from './NewsPanel';
import BacktestPanel from './BacktestPanel';
import AiSignalCard from './AiSignalCard';
import SystemStatus from './SystemStatus';
import TradingLog from './TradingLog';
import RiskManagerPanel from './RiskManagerPanel';
import TimeframeSelector from './TimeframeSelector';
import PerformanceDashboard from './PerformanceDashboard';
import OpenPositions from './OpenPositions';
import BotAnalysisPanel from './BotAnalysisPanel';

export default function Dashboard() {
  const manageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling do manage route a cada 60s para verificar SL/TP
  useEffect(() => {
    const runManage = async () => {
      try {
        const cfgRes = await fetch('/api/bot/config', { cache: 'no-store' });
        const cfg = await cfgRes.json();
        if (!cfg.is_running) return;
        const res = await fetch('/api/bot/manage', { cache: 'no-store' });
        const data = await res.json();
        if (data.managed?.some((m: any) => m.action?.startsWith('CLOSE_'))) {
          // Forçar refresh dos componentes via evento
          window.dispatchEvent(new Event('bot-status-changed'));
        }
      } catch { /* ignore */ }
    };

    runManage(); // imediato
    manageIntervalRef.current = setInterval(runManage, 60000);
    return () => { if (manageIntervalRef.current) clearInterval(manageIntervalRef.current); };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SystemStatus />
      
      <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
        <TimeframeSelector />

        {/* Linha 1: Métricas */}
        <MetricCards />

        {/* Linha 2: Sinais em Tempo Real */}
        <div className="grid gap-6 grid-cols-1">
          <SignalPanel />
        </div>

        {/* Linha Análise Bot: Always-In Market + Breakdown */}
        <div className="grid gap-6 grid-cols-1">
          <BotAnalysisPanel />
        </div>

        {/* Linha 2b: Performance Analytics */}
        <div className="grid gap-6 grid-cols-1 pt-4 pb-2">
          <PerformanceDashboard />
        </div>

        {/* Posições Abertas */}
        <div className="grid gap-6 grid-cols-1">
          <OpenPositions />
        </div>

        {/* Linha 3: Boleta de Ordens Manual */}
        <div className="grid gap-6 grid-cols-1">
          <OrderTicket />
        </div>

        {/* Linha 4: Gestão de Risco */}
        <RiskManagerPanel />

        {/* Linha 5: Gráfico */}
        <div className="grid gap-6 grid-cols-1">
          <PriceChart />
        </div>

        {/* Linha 6: Painel de Estratégias */}
        <div className="grid gap-6 grid-cols-1">
          <StrategyPanel />
        </div>

        {/* Linha 7: IA e Mercado */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <AiSignalCard />
          <NewsPanel />
        </div>

        {/* Linha 8: Log Ao Vivo */}
        <div className="grid gap-6 grid-cols-1">
          <TradingLog />
        </div>

        {/* Linha 9: Backtest e Histórico */}
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
          <BacktestPanel />
          <TradeHistory />
        </div>
      </div>
    </div>
  );
}
