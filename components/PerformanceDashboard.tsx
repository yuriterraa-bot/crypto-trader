'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, BarChart2, Target, Percent, Wifi, Trophy, Clock, Zap } from 'lucide-react';
import { format, startOfDay, subDays } from 'date-fns';

export default function PerformanceDashboard() {
  const [trades, setTrades] = useState<any[]>([]);
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);
  const [openPositionsCount, setOpenPositionsCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setTrades(data);
    } catch { } finally { setLoading(false); }
  }, []);

  const fetchRealPnl = useCallback(async () => {
    try {
      const res = await fetch('/api/binance/positions', { cache: 'no-store' });
      const positions = await res.json();
      const open = Array.isArray(positions)
        ? positions.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0)
        : [];
      const total = open.reduce(
        (sum: number, p: any) => sum + parseFloat(p.unrealizedProfit || p.unRealizedProfit || '0'), 0
      );
      setUnrealizedPnl(total);
      setOpenPositionsCount(open.length);
    } catch { }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchTrades();
    fetchRealPnl();
    const t1 = setInterval(fetchTrades, 30000);
    const t2 = setInterval(fetchRealPnl, 15000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchTrades, fetchRealPnl]);

  // ── Métricas de Scalping ───────────────────────────────────────────
  const closedTrades = trades.filter(t => ['WIN', 'LOSS', 'TIMEOUT'].includes(t.status));
  const wins = closedTrades.filter(t => t.status === 'WIN');
  const losses = closedTrades.filter(t => t.status === 'LOSS');
  const timeouts = closedTrades.filter(t => t.status === 'TIMEOUT');
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  const realizedPnl = closedTrades.reduce((sum, t) => sum + (parseFloat(t.pnl || '0')), 0);
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / losses.length : 0;

  // Tempo médio de posição
  const tradesWithDuration = closedTrades.filter(t => t.open_time && t.closed_at);
  const avgDurationMin = tradesWithDuration.length > 0
    ? tradesWithDuration.reduce((sum, t) => {
        const dur = (new Date(t.closed_at).getTime() - new Date(t.open_time).getTime()) / 60000;
        return sum + dur;
      }, 0) / tradesWithDuration.length
    : 0;

  // Sequência atual
  let currentStreak = 0;
  let streakType = '';
  for (let i = 0; i < closedTrades.length; i++) {
    const status = closedTrades[i].status;
    if (i === 0) { streakType = status; currentStreak = 1; }
    else if (status === streakType) currentStreak++;
    else break;
  }

  // P&L do dia
  const today = startOfDay(new Date());
  const todayTrades = closedTrades.filter(t => new Date(t.closed_at || t.created_at) >= today);
  const pnlToday = todayTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0);

  // Equity curve
  let cumulative = 0;
  const equityData = [...closedTrades].reverse().map((t, i) => {
    cumulative += parseFloat(t.pnl || '0');
    return { index: i + 1, equity: parseFloat(cumulative.toFixed(2)), date: format(new Date(t.closed_at || t.created_at), 'dd/MM HH:mm') };
  });

  if (loading) return <div className="p-4 text-muted-foreground animate-pulse">Carregando performance...</div>;
  if (!mounted) return null;

  const streakColor = streakType === 'WIN' ? 'text-green-400' : streakType === 'LOSS' ? 'text-red-400' : 'text-muted-foreground';

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Activity className="w-8 h-8 text-indigo-500" />
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider">Scalping Analytics</h2>
          <p className="text-sm text-muted-foreground">Métricas reais · {closedTrades.length} trades fechados</p>
        </div>
      </div>

      {/* Row 1: Métricas chave */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* P&L Aberto Live */}
        <div className="col-span-2 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex flex-col justify-between h-[100px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">P&amp;L Aberto</span>
            <Wifi className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div className={`text-xl font-black font-mono ${unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
          </div>
        </div>

        {/* P&L Realizado */}
        <div className="col-span-2 bg-secondary/10 border border-border p-4 rounded-xl flex flex-col justify-between h-[100px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">P&amp;L Realizado</span>
            <Target className="w-4 h-4 text-muted-foreground/50" />
          </div>
          <div className={`text-xl font-black font-mono ${realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toFixed(2)}
          </div>
        </div>

        <MetricCard title="Win Rate" value={`${winRate.toFixed(1)}%`} icon={<Percent className="w-4 h-4" />}
          valueClass={winRate >= 50 ? 'text-green-400' : 'text-red-400'} />
        <MetricCard title="P&L Hoje" value={`${pnlToday >= 0 ? '+' : ''}$${pnlToday.toFixed(2)}`}
          icon={<Activity className="w-4 h-4" />} valueClass={pnlToday >= 0 ? 'text-green-400' : 'text-red-400'} />
        <MetricCard title="Média Win" value={`+$${avgWin.toFixed(2)}`} icon={<TrendingUp className="w-4 h-4" />} valueClass="text-green-400" />
        <MetricCard title="Média Loss" value={`$${avgLoss.toFixed(2)}`} icon={<TrendingUp className="w-4 h-4 scale-y-[-1]" />} valueClass="text-red-400" />
      </div>

      {/* Row 1b: Info secundária */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Wins / Losses" value={`${wins.length}W · ${losses.length}L · ${timeouts.length}T`} icon={<Trophy className="w-4 h-4" />} />
        <MetricCard title="Sequência Atual" value={`${currentStreak}x ${streakType}`} icon={<Zap className="w-4 h-4" />} valueClass={streakColor} />
        <MetricCard title="Duração Média" value={`${avgDurationMin.toFixed(1)} min`} icon={<Clock className="w-4 h-4" />} />
        <MetricCard title="Posições Abertas" value={openPositionsCount} icon={<BarChart2 className="w-4 h-4" />}
          valueClass={openPositionsCount > 0 ? 'text-green-400' : 'text-foreground'} />
      </div>

      {/* Row 2: Chart + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card border-border shadow-md">
          <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" /> Curva de Capital (P&amp;L Realizado)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-[280px]">
            {mounted && equityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="date" className="text-xs" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v}`} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    formatter={(v: any) => [`$${v}`, 'P&L']}
                  />
                  <Line type="monotone" dataKey="equity" stroke="#6366f1" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhum trade fechado ainda — dados aparecerão aqui após o primeiro WIN/LOSS
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo P&L */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Resumo Scalping</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {[
              { label: 'P&L Aberto', value: `${unrealizedPnl >= 0 ? '+' : ''}$${unrealizedPnl.toFixed(2)}`, cls: unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500' },
              { label: 'P&L Realizado', value: `${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)}`, cls: realizedPnl >= 0 ? 'text-green-500' : 'text-red-500' },
              { label: 'P&L Total', value: `${(unrealizedPnl + realizedPnl) >= 0 ? '+' : ''}$${(unrealizedPnl + realizedPnl).toFixed(2)}`, cls: (unrealizedPnl + realizedPnl) >= 0 ? 'text-green-500' : 'text-red-500' },
              { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, cls: winRate >= 50 ? 'text-green-500' : 'text-red-500' },
              { label: 'Trades Hoje', value: `${todayTrades.length}`, cls: 'text-foreground' },
              { label: 'Total Trades', value: `${closedTrades.length}`, cls: 'text-foreground' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center border-b border-border/30 pb-2">
                <span className="text-muted-foreground font-bold text-sm">{item.label}</span>
                <span className={`font-mono font-black ${item.cls}`}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Trade History */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Histórico de Trades (Scalping)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="border-border">
                <TableHead>Data</TableHead>
                <TableHead>Par</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">P&amp;L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.slice(0, 50).map((t: any) => {
                const dur = t.open_time && t.closed_at
                  ? ((new Date(t.closed_at).getTime() - new Date(t.open_time).getTime()) / 60000).toFixed(1)
                  : null;
                const pnl = parseFloat(t.pnl || '0');
                const statusColor = t.status === 'WIN' ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : t.status === 'LOSS' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : t.status === 'OPEN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-muted text-muted-foreground border-border';
                return (
                  <TableRow key={t.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {format(new Date(t.created_at), 'dd/MM HH:mm')}
                    </TableCell>
                    <TableCell className="font-bold">{t.symbol}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        t.direction === 'LONG' || t.side === 'BUY'
                          ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {t.direction || (t.side === 'BUY' ? 'LONG' : 'SHORT')}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.entry_price ? `$${parseFloat(t.entry_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.exit_price ? `$${parseFloat(t.exit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {dur ? `${dur}m` : t.status === 'OPEN' ? '⏳' : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${statusColor}`}>
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {t.status === 'OPEN' ? '—' : `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                );
              })}
              {trades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum trade registrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon, valueClass = 'text-foreground' }: {
  title: string; value: string | number; icon: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="bg-secondary/10 p-4 rounded-xl border border-border flex flex-col justify-between h-[100px]">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className="text-muted-foreground/50">{icon}</div>
      </div>
      <div className={`text-xl font-black font-mono truncate ${valueClass}`}>{value}</div>
    </div>
  );
}
