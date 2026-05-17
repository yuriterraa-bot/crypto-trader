'use client';

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

export default function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <SystemStatus />
      
      <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
        {/* Linha 1: Métricas */}
        <MetricCards />

        {/* Linha 2: Sinais em Tempo Real (Destaque) */}
        <div className="grid gap-6 grid-cols-1">
          <SignalPanel />
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


