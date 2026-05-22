'use client';

import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, TrendingDown, Percent, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function BreakEvenCalculator() {
  const [mounted, setMounted] = useState(false);
  
  // Input parameters
  const [balance, setBalance] = useState(10000);
  const [winRate, setWinRate] = useState(50); // 50%
  const [avgWin, setAvgWin] = useState(300); // Average win amount in USDT
  const [avgLoss, setAvgLoss] = useState(150); // Average loss amount in USDT
  const [totalTrades, setTotalTrades] = useState(30);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mathematical outputs
  const rrRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '0';
  const breakEvenWinRate = avgWin + avgLoss > 0 ? (avgLoss / (avgWin + avgLoss)) * 100 : 0;
  
  const p = winRate / 100;
  const expectedPayoff = (p * avgWin) - ((1 - p) * avgLoss);
  const totalNetProfit = expectedPayoff * totalTrades;
  const finalExpectedBalance = balance + totalNetProfit;

  // Generate simulated equity curve over N trades
  // We'll generate 3 curves:
  // 1. Expected: using winRate
  // 2. Optimistic: winRate + 10%
  // 3. Pessimistic: winRate - 10%
  const generateSimulatedData = () => {
    const data = [];
    let expectedBal = balance;
    let optBal = balance;
    let pesBal = balance;

    const optP = Math.min(0.95, p + 0.1);
    const pesP = Math.max(0.05, p - 0.1);

    data.push({
      trade: 0,
      'Esperado': Math.round(expectedBal),
      'Otimista': Math.round(optBal),
      'Pessimista': Math.round(pesBal)
    });

    for (let i = 1; i <= totalTrades; i++) {
      // Statistical progression: instead of random walk which fluctuates, 
      // we generate the expected value curve to show smooth mathematical progression,
      // representing the steady state growth rate.
      expectedBal += expectedPayoff;
      optBal += (optP * avgWin) - ((1 - optP) * avgLoss);
      pesBal += (pesP * avgWin) - ((1 - pesP) * avgLoss);

      data.push({
        trade: i,
        'Esperado': Math.round(expectedBal),
        'Otimista': Math.round(optBal),
        'Pessimista': Math.round(pesBal)
      });
    }
    return data;
  };

  const chartData = generateSimulatedData();
  const isProfitable = expectedPayoff > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Parameters config */}
      <div className="lg:col-span-5 bg-[#0d0e15]/60 border border-slate-900 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/5 blur-[120px] rounded-full -mr-20 -mt-20"></div>

        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-extrabold text-slate-200 tracking-tight">Equilíbrio (Break-Even)</h3>
        </div>

        <div className="space-y-6">
          {/* Capital */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Capital Inicial (USDT)</label>
            <input
              type="number"
              className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-purple-500/50"
              value={balance}
              onChange={(e) => setBalance(Math.max(1, parseFloat(e.target.value) || 0))}
            />
          </div>

          {/* Win Rate Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider font-black">Sua Taxa de Acerto</span>
              <span className="text-xs font-extrabold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-md">
                {winRate}%
              </span>
            </div>
            <div className="p-4 bg-[#12131b]/60 border border-slate-900 rounded-xl space-y-2">
              <input
                type="range"
                min="5"
                max="95"
                className="w-full accent-purple-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                value={winRate}
                onChange={(e) => setWinRate(parseInt(e.target.value))}
              />
              <div className="flex justify-between text-[9px] font-bold text-slate-600">
                <span>5%</span>
                <span>Break-Even: {breakEvenWinRate.toFixed(1)}%</span>
                <span>95%</span>
              </div>
            </div>
          </div>

          {/* Avg Win & Loss */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Média Ganhos (USDT)</label>
              <input
                type="number"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-purple-500/30"
                value={avgWin}
                onChange={(e) => setAvgWin(Math.max(1, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Média Perdas (USDT)</label>
              <input
                type="number"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-purple-500/30"
                value={avgLoss}
                onChange={(e) => setAvgLoss(Math.max(1, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>

          {/* Quantity of trades */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Número de Operações Simuladas</label>
            <input
              type="number"
              className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-purple-500/30"
              value={totalTrades}
              onChange={(e) => setTotalTrades(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
            />
          </div>
        </div>
      </div>

      {/* Analytics & Graph */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Math indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Break-Even Rate */}
          <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Break-Even Necessário</span>
            <span className="text-lg font-black text-slate-200 mt-1">{breakEvenWinRate.toFixed(2)}%</span>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Com R:R Ratio de 1:{rrRatio}</span>
          </div>

          {/* Expected Payoff */}
          <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Expectativa Matemática</span>
            <span className={`text-lg font-black mt-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfitable ? '+' : ''}{expectedPayoff.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Por Operação Executada</span>
          </div>

          {/* Projected PnL */}
          <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Resultado Projetado ({totalTrades} Trades)</span>
            <span className={`text-lg font-black mt-1 ${totalNetProfit > 0 ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`}>
              {totalNetProfit > 0 ? '+' : ''}{totalNetProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
            <span className="text-[10px] text-slate-500 font-bold mt-1">Banca Final: {finalExpectedBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
          </div>
        </div>

        {/* Recharts equity curves */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex-1 min-h-[300px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-200 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" /> Curva de Capital Projetada
            </h3>
            <span className="text-[10px] font-black text-slate-500 bg-slate-950/60 border border-slate-900 px-2 py-0.5 rounded">
              Estatística Linear
            </span>
          </div>

          <div className="flex-1 w-full min-h-[220px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOpt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorPes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12131a" vertical={false} />
                  <XAxis dataKey="trade" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    domain={['auto', 'auto']} 
                    tickLine={false} 
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'extrabold' }}
                    formatter={(value) => [`$${value != null ? Number(value).toLocaleString() : '0'}`]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Otimista" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOpt)" />
                  <Area type="monotone" dataKey="Esperado" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
                  <Area type="monotone" dataKey="Pessimista" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorPes)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                Carregando projeção...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
