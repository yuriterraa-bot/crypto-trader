'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import TradingChart from '@/components/TradingChart';
import OrderTicket from '@/components/OrderTicket';
import OpenPositions from '@/components/OpenPositions';
import TradeHistory from '@/components/TradeHistory';
import { Landmark, ArrowUpDown, ChevronRight, Settings } from 'lucide-react';

const COMMON_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT'
];

export default function TradePage() {
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');
  const [activeSubTab, setActiveSubTab] = useState<'POSITIONS' | 'HISTORY'>('POSITIONS');

  return (
    <div className="min-h-screen bg-[#06080c] text-slate-100 flex flex-col font-sans">
      {/* Shared Navigation Header */}
      <Navbar />

      {/* Main Terminal Area */}
      <main className="flex-grow max-w-[1600px] w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        
        {/* Sub Header / Symbol bar Selector */}
        <div className="bg-[#0b0e14] border border-slate-900 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ativo Ativo:</span>
            </div>

            {/* Quick selectors list */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {COMMON_SYMBOLS.map(symbol => (
                <button
                  key={symbol}
                  onClick={() => setActiveSymbol(symbol)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    activeSymbol === symbol
                      ? 'bg-indigo-500/10 text-indigo-450 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-transparent'
                  }`}
                >
                  {symbol.replace('USDT', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="bg-slate-950 border border-slate-900 rounded px-2 py-0.5">Binance Futures Testnet</span>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            <span className="text-slate-500 font-bold uppercase tracking-wider">{activeSymbol}</span>
          </div>
        </div>

        {/* Professional 2-Column layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* LEFT: Trading Chart and Positions (col-span 3) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Interactive chart */}
            <div className="bg-[#131722]/80 border border-slate-900 rounded-xl overflow-hidden shadow-xl p-2 relative">
              <div className="absolute top-4 left-4 z-10 bg-slate-950/80 border border-slate-850/80 rounded px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-400">
                {activeSymbol} · Gráfico em Tempo Real
              </div>
              <TradingChart symbol={activeSymbol} />
            </div>

            {/* Sub Tabs: Open Positions / Trade History */}
            <div className="bg-[#131722]/80 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
              <div className="px-4 py-2 border-b border-slate-850 flex items-center justify-between bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSubTab('POSITIONS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      activeSubTab === 'POSITIONS'
                        ? 'bg-slate-800/80 text-indigo-400 border border-slate-700/50'
                        : 'text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    Posições Abertas
                  </button>
                  <button
                    onClick={() => setActiveSubTab('HISTORY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      activeSubTab === 'HISTORY'
                        ? 'bg-slate-800/80 text-indigo-400 border border-slate-700/50'
                        : 'text-slate-400 hover:text-slate-250'
                    }`}
                  >
                    Histórico de Negociações
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Sincronização Ativa</span>
                </div>
              </div>

              <div className="p-4">
                {activeSubTab === 'POSITIONS' ? (
                  <OpenPositions />
                ) : (
                  <TradeHistory />
                )}
              </div>
            </div>

          </div>

          {/* RIGHT: Order Ticket sidebar (col-span 1) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-[#131722]/80 border border-slate-900 rounded-xl shadow-xl overflow-hidden p-1.5">
              <div className="px-3 py-2 border-b border-slate-850/80 flex justify-between items-center bg-slate-950/20 rounded-t-lg">
                <span className="text-xs font-black text-slate-200 tracking-wider uppercase">Boleta de Operação</span>
                <Settings className="w-4 h-4 text-slate-500 cursor-pointer hover:text-slate-350" />
              </div>
              <OrderTicket activeSymbol={activeSymbol} />
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
