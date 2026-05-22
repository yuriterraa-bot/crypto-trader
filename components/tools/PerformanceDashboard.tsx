'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Activity, Award, BarChart, PieChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, Cell, PieChart as RechartsPieChart, Pie } from 'recharts';

interface JournalEntry {
  id: string;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number;
  quantity: number;
  leverage: number;
  pnl_usdt: number;
  pnl_percent: number;
  strategy: string;
  setup?: string;
  emotions?: string;
  mistakes?: string;
  lessons?: string;
  tags?: string[];
  created_at?: string;
}

export default function PerformanceDashboard({ entries = [] }: { entries: JournalEntry[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalTrades = entries.length;
  const wins = entries.filter((e) => e.pnl_usdt > 0);
  const losses = entries.filter((e) => e.pnl_usdt <= 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

  const totalGains = wins.reduce((acc, e) => acc + e.pnl_usdt, 0);
  const totalLosses = Math.abs(losses.reduce((acc, e) => acc + e.pnl_usdt, 0));
  const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? 99.9 : 0;
  const netProfit = totalGains - totalLosses;

  // Average ROI
  const averageRoi = totalTrades > 0 
    ? entries.reduce((acc, e) => acc + e.pnl_percent, 0) / totalTrades 
    : 0;

  // Sharpe Ratio (simplified approximation: average pnl percent / standard deviation of pnl percent)
  let sharpeRatio = 0;
  if (totalTrades > 1) {
    const returns = entries.map((e) => e.pnl_percent);
    const avg = returns.reduce((sum, val) => sum + val, 0) / totalTrades;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (totalTrades - 1);
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? (avg / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  // Mathematically precise Max Drawdown (%) calculation
  // First, sort entries chronologically (oldest to newest)
  const chronological = [...entries].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const startingBalance = 10000;
  let runningBalance = startingBalance;
  let peak = startingBalance;
  let maxDd = 0;
  
  // Track equity curve data for the graph
  const equityCurveData = [{ trade: 0, Saldo: Math.round(startingBalance) }];

  chronological.forEach((trade, index) => {
    runningBalance += trade.pnl_usdt;
    
    if (runningBalance > peak) {
      peak = runningBalance;
    }
    const drawdown = peak > 0 ? ((peak - runningBalance) / peak) * 100 : 0;
    if (drawdown > maxDd) {
      maxDd = drawdown;
    }

    equityCurveData.push({
      trade: index + 1,
      Saldo: Math.round(runningBalance)
    });
  });

  // KPI for Pie Chart: Win vs Loss
  const pieData = [
    { name: 'Vitórias', value: wins.length, color: '#10b981' },
    { name: 'Derrotas', value: losses.length, color: '#ef4444' }
  ];

  // KPI for Bar Chart: PnL distribution by strategy
  const strategyMap: { [key: string]: number } = {};
  entries.forEach((e) => {
    strategyMap[e.strategy] = (strategyMap[e.strategy] || 0) + e.pnl_usdt;
  });
  const strategyData = Object.keys(strategyMap).map((strat) => ({
    name: strat.split(' ').slice(0, 2).join(' '), // Shorten label
    Resultado: Math.round(strategyMap[strat])
  }));

  // PnL distribution histograms (bins of return sizes)
  const pnlHistogram = [
    { range: '< -$500', count: entries.filter(e => e.pnl_usdt <= -500).length, fill: '#f43f5e' },
    { range: '-$500 a -$100', count: entries.filter(e => e.pnl_usdt > -500 && e.pnl_usdt <= -100).length, fill: '#fb7185' },
    { range: '-$100 a $0', count: entries.filter(e => e.pnl_usdt > -100 && e.pnl_usdt <= 0).length, fill: '#fda4af' },
    { range: '$0 a $100', count: entries.filter(e => e.pnl_usdt > 0 && e.pnl_usdt <= 100).length, fill: '#a7f3d0' },
    { range: '$100 a $500', count: entries.filter(e => e.pnl_usdt > 100 && e.pnl_usdt < 500).length, fill: '#34d399' },
    { range: '> $500', count: entries.filter(e => e.pnl_usdt >= 500).length, fill: '#059669' },
  ];

  if (totalTrades === 0) {
    return (
      <div className="bg-[#0d0e15]/60 border border-slate-900 rounded-2xl p-12 text-center backdrop-blur-md shadow-2xl">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4 animate-pulse" />
        <h4 className="text-base font-extrabold text-slate-300">Nenhuma Métrica de Performance Disponível</h4>
        <p className="text-xs font-bold text-slate-500 max-w-md mx-auto mt-2 leading-normal">
          Por favor, adicione registros no diário de trading para que possamos compilar e desenhar as curvas de capital e KPIs institucionais.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Net profit */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Lucro Líquido</span>
          <span className={`text-base font-black mt-1 ${netProfit > 0 ? 'text-emerald-400' : netProfit < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {netProfit > 0 ? '+' : ''}${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[9px] text-slate-500 font-bold mt-1">Capital Acumulado</span>
        </div>

        {/* Win Rate */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Taxa de Acerto</span>
          <span className="text-base font-black mt-1 text-slate-200">{winRate.toFixed(1)}%</span>
          <span className="text-[9px] text-slate-500 font-bold mt-1">{wins.length}W / {losses.length}L</span>
        </div>

        {/* Profit Factor */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Fator de Lucro</span>
          <span className={`text-base font-black mt-1 ${profitFactor >= 1.5 ? 'text-emerald-400' : profitFactor >= 1.0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {profitFactor.toFixed(2)}
          </span>
          <span className="text-[9px] text-slate-500 font-bold mt-1">Target Ideal &gt; 1.5</span>
        </div>

        {/* Avg ROI */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Retorno Médio (ROI)</span>
          <span className={`text-base font-black mt-1 ${averageRoi > 0 ? 'text-emerald-400' : averageRoi < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {averageRoi > 0 ? '+' : ''}{averageRoi.toFixed(2)}%
          </span>
          <span className="text-[9px] text-slate-500 font-bold mt-1">Retorno por Margem</span>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Sharpe Ratio</span>
          <span className={`text-base font-black mt-1 ${sharpeRatio >= 2 ? 'text-emerald-400' : sharpeRatio >= 1 ? 'text-amber-400' : 'text-slate-400'}`}>
            {sharpeRatio > 0 ? sharpeRatio.toFixed(2) : 'N/A'}
          </span>
          <span className="text-[9px] text-slate-500 font-bold mt-1">Consistência Volátil</span>
        </div>

        {/* Drawdown */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Max Drawdown</span>
          <span className={`text-base font-black mt-1 ${maxDd < 5 ? 'text-emerald-400' : maxDd < 15 ? 'text-amber-400' : 'text-rose-400'}`}>
            -{maxDd.toFixed(2)}%
          </span>
          <span className="text-[9px] text-slate-500 font-bold mt-1">Rebaixamento Máximo</span>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Equity Curve (Area Chart) */}
        <div className="lg:col-span-8 bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md min-h-[300px] flex flex-col">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-400" /> Curva de Patrimônio Líquido (Equity Curve)
          </h4>
          <div className="flex-1 w-full min-h-[220px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurveData}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
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
                  <Area type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEquity)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                Processando curva...
              </div>
            )}
          </div>
        </div>

        {/* Win vs Loss (Pie Chart) */}
        <div className="lg:col-span-4 bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col items-center">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 self-start flex items-center gap-1.5">
            <PieChart className="w-4 h-4 text-emerald-400" /> Distribuição de Resultados
          </h4>
          <div className="w-full h-[180px] relative">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : null}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <span className="text-xl font-black text-slate-100">{winRate.toFixed(0)}%</span>
              <span className="text-[9px] text-slate-500 font-black block uppercase mt-0.5">Win Rate</span>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-bold mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-400">{wins.length} Vitórias</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-400">{losses.length} Derrotas</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Performance by Strategy (Bar Chart) */}
        <div className="lg:col-span-6 bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md min-h-[260px] flex flex-col">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart className="w-4 h-4 text-indigo-400" /> PnL por Estratégia de Trading
          </h4>
          <div className="flex-1 w-full min-h-[180px]">
            {mounted && strategyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={strategyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12131a" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'extrabold' }}
                  />
                  <Bar dataKey="Resultado">
                    {strategyData.map((entry, index) => {
                      const isPositive = entry.Resultado >= 0;
                      return <Cell key={`cell-${index}`} fill={isPositive ? '#10b981' : '#ef4444'} />;
                    })}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                Processando estratégias...
              </div>
            )}
          </div>
        </div>

        {/* PnL Histogram Distribution (Bar Chart) */}
        <div className="lg:col-span-6 bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md min-h-[260px] flex flex-col">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-400" /> Distribuição de Frequência do PnL
          </h4>
          <div className="flex-1 w-full min-h-[180px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={pnlHistogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12131a" vertical={false} />
                  <XAxis dataKey="range" stroke="#475569" fontSize={8} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'extrabold' }}
                  />
                  <Bar dataKey="count">
                    {pnlHistogram.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
