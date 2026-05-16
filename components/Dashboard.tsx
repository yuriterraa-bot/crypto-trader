'use client';

import { useState } from 'react';
import BalanceCard from './BalanceCard';
import PriceChart from './PriceChart';
import StrategyPanel from './StrategyPanel';
import TradeHistory from './TradeHistory';
import NewsPanel from './NewsPanel';
import BacktestPanel from './BacktestPanel';
import AiSignalCard from './AiSignalCard';
import SystemStatus from './SystemStatus';
import TradingLog from './TradingLog';
import { Button } from '@/components/ui/button';
import { Activity, Power, PowerOff } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
  const [botRunning, setBotRunning] = useState(false);

  const toggleBot = () => {
    setBotRunning(!botRunning);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <SystemStatus />
      
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between space-y-2 mb-6">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant={botRunning ? 'destructive' : 'default'} 
              onClick={toggleBot}
              className={botRunning ? '' : 'bg-green-600 hover:bg-green-700'}
            >
              {botRunning ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" /> Stop Bot
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" /> Start Bot
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Linha 1 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BalanceCard />
          <AiSignalCard />
        </div>

        {/* Linha 2 */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
          <PriceChart />
        </div>

        {/* Linha 3 */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <StrategyPanel />
          <NewsPanel />
        </div>

        {/* Linha 4 */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
          <TradeHistory />
          <BacktestPanel />
        </div>

        {/* Linha 5 */}
        <div className="grid gap-4 grid-cols-1 mt-4">
          <TradingLog />
        </div>
      </div>
    </div>
  );
}


