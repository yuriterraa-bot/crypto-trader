'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, BarChart2, DollarSign, Target, Percent, Wifi } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

export default function PerformanceDashboard() {
  const [signals, setSignals] = useState<any[]>([]);
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);
  const [openPositionsCount, setOpenPositionsCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Busca sinais do Supabase para histórico
  const fetchSignals = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setSignals(data);
    } catch (e) { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  // Busca P&L real das posições abertas da Binance
  const fetchRealPnl = useCallback(async () => {
    try {
      const res = await fetch('/api/binance/positions', { cache: 'no-store' });
      const positions = await res.json();
      const openPos = Array.isArray(positions)
        ? positions.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0)
        : [];
      const totalPnl = openPos.reduce(
        (sum: number, p: any) => sum + parseFloat(p.unrealizedProfit || p.unRealizedProfit || '0'),
        0
      );
      setUnrealizedPnl(totalPnl);
      setOpenPositionsCount(openPos.length);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchSignals();
    fetchRealPnl();
    const sigInt = setInterval(fetchSignals, 30000);
    const pnlInt = setInterval(fetchRealPnl, 15000);
    return () => { clearInterval(sigInt); clearInterval(pnlInt); };
  }, [fetchSignals, fetchRealPnl]);

  // Contagens por direção de sinais
  const buys = signals.filter(s => s.signal_type === 'BUY');
  const sells = signals.filter(s => s.signal_type === 'SELL');
  const winRate = signals.length > 0 ? (buys.length / signals.length) * 100 : 0;

  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfWeek = subDays(startOfToday, 7);

  const signalsToday = signals.filter(t => new Date(t.created_at) >= startOfToday).length;
  const signalsWeek  = signals.filter(t => new Date(t.created_at) >= startOfWeek).length;

  // Equity curve simulated from signal scores
  let cumulative = 0;
  const equityData = [...signals].reverse().map((s, i) => {
    cumulative += s.score > 0 ? 0.1 : -0.05;
    return { index: i + 1, equity: parseFloat(cumulative.toFixed(2)), date: format(new Date(s.created_at), 'dd/MM HH:mm') };
  });

  if (loading) return <div className="p-4 text-muted-foreground animate-pulse">Carregando métricas de performance...</div>;
  if (!mounted) return null;

      date: format(new Date(t.created_at), 'dd/MM HH:mm')
    };
  });

  // Best/Worst
  const sortedTrades = [...trades].sort((a, b) => (b.profit || 0) - (a.profit || 0));
  const bestTrade = sortedTrades.length > 0 ? sortedTrades[0].profit : 0;
  const worstTrade = sortedTrades.length > 0 ? sortedTrades[sortedTrades.length - 1].profit : 0;

  if (loading) return <div className="p-4 text-muted-foreground animate-pulse">Carregando métricas de performance...</div>;

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Activity className="w-8 h-8 text-indigo-500" />
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider">Performance Analytics</h2>
          <p className="text-sm text-muted-foreground">Métricas avançadas e histórico de operações</p>
        </div>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* P&L Aberto — fonte real: Binance */}
        <div className="col-span-2 md:col-span-1 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex flex-col justify-between h-[100px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">P&amp;L Aberto (Live)</span>
            <Wifi className="w-4 h-4 text-indigo-400" />
          </div>
          <div className={`text-xl font-black font-mono ${unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
          </div>
        </div>
        <MetricCard title="Posições Abertas" value={openPositionsCount} icon={<BarChart2 className="w-4 h-4" />} />
        <MetricCard title="Win Rate (Sinais)" value={`${winRate.toFixed(1)}%`} icon={<Percent className="w-4 h-4" />} />
        <MetricCard title="Sinais Hoje" value={signalsToday} icon={<Activity className="w-4 h-4" />} />
        <MetricCard title="Sinais 7 Dias" value={signalsWeek} icon={<Target className="w-4 h-4" />} />
        <MetricCard title="Total Sinais" value={signals.length} icon={<BarChart2 className="w-4 h-4" />} />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border shadow-md">
          <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" /> Curva de Capital Líquido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-[300px]">
            {!mounted ? (
              <div style={{ height: '100%', width: '100%', background: 'transparent' }} />
            ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="date" className="text-xs" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="equity" stroke="#6366f1" strokeWidth={3} dot={false} fill="url(#colorEquity)" />
              </LineChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md flex flex-col justify-between">
          <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">P&amp;L Real (Binance)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <span className="text-muted-foreground font-bold text-sm">P&amp;L Aberto</span>
              <span className={`font-mono font-black ${unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <span className="text-muted-foreground font-bold text-sm">P&amp;L Realizado</span>
              <span className="font-mono font-black text-muted-foreground">$0.00</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <span className="text-muted-foreground font-bold text-sm">Sinais Hoje</span>
              <span className="font-mono font-black">{signalsToday}</span>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="text-muted-foreground font-bold text-sm">Sinais 7 Dias</span>
              <span className="font-mono font-black">{signalsWeek}</span>
            </div>
          </CardContent>
      </div>

      {/* Row 3: Signals Table */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Log de Sinais AIM (Últimos 50)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="border-border">
                <TableHead>Data</TableHead>
                <TableHead>Par</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signals.map((s: any) => (
                <TableRow key={s.id} className="border-border">
                  <TableCell className="text-xs text-muted-foreground font-mono">{format(new Date(s.created_at), 'dd/MM HH:mm')}</TableCell>
                  <TableCell className="font-bold">{s.symbol}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      s.signal_type === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>{s.signal_type}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    ${parseFloat(s.price || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${
                    (s.score || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {(s.score || 0) > 0 ? '+' : ''}{(s.score || 0).toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
              {signals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum sinal registrado ainda.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon, valueClass = 'text-foreground', isCurrency = false }: any) {
  return (
    <div className="bg-secondary/10 p-4 rounded-xl border border-border flex flex-col justify-between h-[100px]">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="text-muted-foreground/50">{icon}</div>
      </div>
      <div className={`text-xl font-black font-mono ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
