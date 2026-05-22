'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Percent, 
  Activity, 
  RefreshCw,
  Zap,
  BarChart3,
  Flame
} from 'lucide-react';

interface OverviewData {
  walletBalance: number;
  availableBalance: number;
  marginInUse: number;
  unrealizedPnl: number;
  openPositionsCount: number;
  mode: 'demo' | 'real';
}

interface Trade {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  pnlPercent: number;
  status: 'WIN' | 'LOSS';
  time: number;
}

interface HistoryData {
  metrics: {
    winRate: number;
    totalRealizedPnl: number;
    profitFactor: number;
    totalTrades: number;
    winTrades: number;
    lossTrades: number;
  };
  trades: Trade[];
}

export default function AccountDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [overRes, histRes] = await Promise.all([
        axios.get('/api/account/overview'),
        axios.get('/api/account/history')
      ]);
      
      if (overRes.data) setOverview(overRes.data);
      if (histRes.data) setHistory(histRes.data);
    } catch (e) {
      console.error('Error fetching account dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="w-full bg-[#06080c] border border-slate-900 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 min-h-[250px]">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400 font-bold tracking-wide uppercase animate-pulse">Carregando painel de portfólio...</p>
      </div>
    );
  }

  // Safe toFixed helper to prevent crashes if a numeric value is null or undefined
  const safeToFixed = (val: any, decimals = 2) => {
    if (val == null || isNaN(val)) return '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
    const num = Number(val);
    if (isNaN(num)) return '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
    return num.toFixed(decimals);
  };

  // --- Calculations for Chart & Top Pairs ---
  const trades = history?.trades || [];
  
  // 1. Generate 7 Days Accumulation Curve
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse(); // [day-6, day-5, ..., today]

  const dailyPnlMap: Record<string, number> = {};
  days.forEach(day => { dailyPnlMap[day] = 0; });

  trades.forEach((t) => {
    const dateStr = new Date(t.time).toISOString().split('T')[0];
    if (dateStr in dailyPnlMap) {
      dailyPnlMap[dateStr] += t.pnl;
    }
  });

  let accum = 0;
  const chartData = days.map(day => {
    accum += dailyPnlMap[day];
    const [, m, d] = day.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const displayDate = `${d}/${months[parseInt(m) - 1]}`;
    return {
      name: displayDate,
      PnL: parseFloat(safeToFixed(accum, 2)),
    };
  });

  // 2. Top 3 Profitable Pairs
  const pnlPerSymbol: Record<string, number> = {};
  trades.forEach((t) => {
    pnlPerSymbol[t.symbol] = (pnlPerSymbol[t.symbol] || 0) + t.pnl;
  });

  const topPairs = Object.entries(pnlPerSymbol)
    .map(([symbol, pnl]) => ({ symbol, pnl: parseFloat(safeToFixed(pnl, 2)) }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 3)
    .filter(item => item.pnl > 0);

  // Formatting utility
  const formatUSD = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
  };

  const modeBadge = overview?.mode === 'real' ? (
    <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase animate-pulse">🔴 Conta Real</span>
  ) : (
    <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase">🟡 Demo Simulador</span>
  );

  return (
    <div className="w-full bg-[#0b0e14]/40 border border-slate-900 rounded-2xl p-5 md:p-6 space-y-6 shadow-xl backdrop-blur-md">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900/50 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-black text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-500" />
              Painel de Desempenho Institucional
            </h2>
            {modeBadge}
          </div>
          <p className="text-[11px] text-slate-450 leading-relaxed max-w-3xl">
            Visão geral analítica da sua conta Binance. Métricas consolidadas em tempo real sobre a eficácia da estratégia, crescimento patrimonial e alocação de margem de segurança.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Sincronizar</span>
        </button>
      </div>

      {/* Grid of Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Total Capital */}
        <Card className="bg-[#0b0e14] border-slate-900 shadow-md">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[9px] font-bold uppercase tracking-wider">Saldo Total (Futures)</span>
              <Wallet className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-base md:text-lg font-mono font-black text-slate-100 truncate">
              {formatUSD(overview?.walletBalance || 0)}
            </div>
            <div className="text-[10px] text-slate-450 flex items-center gap-1">
              <span>Alocação Futuros</span>
            </div>
          </CardContent>
        </Card>

        {/* Available Capital */}
        <Card className="bg-[#0b0e14] border-slate-900 shadow-md">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[9px] font-bold uppercase tracking-wider">Saldo Disponível</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-base md:text-lg font-mono font-black text-slate-100 truncate">
              {formatUSD(overview?.availableBalance || 0)}
            </div>
            <div className="text-[10px] text-slate-450">
              Pronto para alocação
            </div>
          </CardContent>
        </Card>

        {/* Realized PnL (7d) */}
        <Card className="bg-[#0b0e14] border-slate-900 shadow-md">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[9px] font-bold uppercase tracking-wider">PnL Realizado (7d)</span>
              {history?.metrics?.totalRealizedPnl && history.metrics.totalRealizedPnl >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-550" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <div className={`text-base md:text-lg font-mono font-black truncate ${
              (history?.metrics?.totalRealizedPnl || 0) >= 0 ? 'text-emerald-450' : 'text-rose-450'
            }`}>
              {(history?.metrics?.totalRealizedPnl || 0) >= 0 ? '+' : ''}
              {formatUSD(history?.metrics?.totalRealizedPnl || 0)}
            </div>
            <div className="text-[10px] text-slate-450">
              Lucro consolidado
            </div>
          </CardContent>
        </Card>

        {/* Unrealized PnL */}
        <Card className="bg-[#0b0e14] border-slate-900 shadow-md">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[9px] font-bold uppercase tracking-wider">PnL Não Realizado</span>
              <span className="text-[8px] bg-slate-900 text-slate-400 px-1 py-0.2 rounded font-mono font-black">{overview?.openPositionsCount || 0} pos</span>
            </div>
            <div className={`text-base md:text-lg font-mono font-black truncate ${
              (overview?.unrealizedPnl || 0) >= 0 ? 'text-emerald-450' : 'text-rose-450'
            }`}>
              {(overview?.unrealizedPnl || 0) >= 0 ? '+' : ''}
              {formatUSD(overview?.unrealizedPnl || 0)}
            </div>
            <div className="text-[10px] text-slate-450 flex justify-between">
              <span>Margem em uso:</span>
              <span className="font-bold text-slate-300">${safeToFixed(overview?.marginInUse, 1)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className="bg-[#0b0e14] border-slate-900 shadow-md">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[9px] font-bold uppercase tracking-wider">Win Rate (7d)</span>
              <Percent className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-base md:text-lg font-mono font-black text-slate-100">
              {history?.metrics?.winRate || 0}%
            </div>
            <div className="text-[10px] text-slate-450 flex justify-between">
              <span>Wins / Total:</span>
              <span className="font-bold text-slate-350">{history?.metrics?.winTrades || 0} / {history?.metrics?.totalTrades || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Profit Factor */}
        <Card className="bg-[#0b0e14] border-slate-900 shadow-md">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[9px] font-bold uppercase tracking-wider">Fator de Lucro</span>
              <Award className="w-4 h-4 text-indigo-455" />
            </div>
            <div className="text-base md:text-lg font-mono font-black text-slate-100">
              {safeToFixed(history?.metrics?.profitFactor, 2)}
            </div>
            <div className="text-[10px] text-slate-450 flex justify-between">
              <span>Eficiência operacional</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Chart and Top Pairs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left and Middle: 7-Day Accumulated PnL Curve */}
        <div className="lg:col-span-2 bg-[#0b0e14] border border-slate-900 rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Crescimento Patrimonial (PnL Diário Acumulado 7d)
              </h3>
              <p className="text-[10px] text-slate-500 leading-none">Curva acumulada de lucros/perdas em dólares (USDT).</p>
            </div>
          </div>

          <div className="w-full h-[220px]">
            {!mounted || trades.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 border border-dashed border-slate-900 rounded-xl">
                <span>📊</span>
                <p className="text-xs italic">
                  {!mounted ? 'Carregando gráfico...' : 'Nenhum dado de trade disponível nos últimos 7 dias para plotar a curva.'}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#121620" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#475569" 
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${typeof v === 'number' ? v.toFixed(0) : v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#070a10', 
                      borderColor: '#1e293b', 
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#f8fafc'
                    }}
                    formatter={(value: any) => [`$${value}`, 'PnL Acumulado']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="PnL" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5}
                    dot={{ stroke: '#6366f1', strokeWidth: 1, r: 3, fill: '#0b0e14' }}
                    activeDot={{ r: 5, stroke: '#818cf8', strokeWidth: 2 }}
                    animationDuration={1500}
                    isAnimationActive={mounted}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Column: Top 3 Profitable Pairs */}
        <div className="lg:col-span-1 bg-[#0b0e14] border border-slate-900 rounded-2xl p-4 md:p-5 space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              Top 3 Ativos Lucrativos (7d)
            </h3>
            <p className="text-[10px] text-slate-500 leading-none">Moedas que mais geraram retorno no período.</p>
          </div>

          <div className="space-y-3 pt-1">
            {topPairs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-550 border border-dashed border-slate-900 rounded-xl flex flex-col items-center justify-center space-y-1.5 italic">
                <span>🔥</span>
                <span>Sem dados de lucro suficientes para elencar os top pares.</span>
              </div>
            ) : (
              topPairs.map((pair, index) => {
                const rankColors = [
                  'bg-orange-500/15 text-orange-400 border border-orange-500/35',
                  'bg-indigo-500/15 text-indigo-400 border border-indigo-500/35',
                  'bg-slate-500/15 text-slate-400 border border-slate-500/35'
                ];
                return (
                  <div 
                    key={pair.symbol} 
                    className="bg-slate-950/40 border border-slate-900 hover:border-slate-850 p-3.5 rounded-xl flex justify-between items-center transition-all hover:translate-x-1 duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${rankColors[index]}`}>
                        #{index + 1}
                      </span>
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-200 font-mono tracking-wider">{pair.symbol}</span>
                        <span className="block text-[9px] text-slate-500 font-bold uppercase">Futures</span>
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="block text-xs font-mono font-black text-emerald-450">+{formatUSD(pair.pnl)}</span>
                      <span className="block text-[9px] text-slate-500 font-bold">Retorno Líquido</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="text-[10px] bg-slate-950/30 p-2.5 rounded border border-slate-900/60 text-slate-450 leading-relaxed font-sans mt-2">
            💡 *Conselho do Tutor:* O Fator de Lucro ideal é acima de *1.5*. Se o seu win rate estiver menor que *50%*, ajuste o Simulador de Risco para uma relação R:R de pelo menos *1:2*.
          </div>
        </div>

      </div>

    </div>
  );
}
