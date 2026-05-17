'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Activity, BarChart2, DollarSign, Target, Percent } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export default function PerformanceDashboard() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const { data } = await supabase.from('trades').select('*').order('created_at', { ascending: true });
      if (data) setTrades(data.filter(t => t.status === 'CLOSED' || t.status === 'FILLED'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation
  const totalPnl = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const wins = trades.filter(t => (t.profit || 0) > 0);
  const losses = trades.filter(t => (t.profit || 0) <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  
  const grossProfit = wins.reduce((sum, t) => sum + (t.profit || 0), 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.profit || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99 : 0);

  // Time-based P&L
  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfWeek = subDays(startOfToday, 7);
  const startOfMonth = subDays(startOfToday, 30);

  const pnlToday = trades.filter(t => new Date(t.created_at) >= startOfToday).reduce((sum, t) => sum + (t.profit || 0), 0);
  const pnlWeek = trades.filter(t => new Date(t.created_at) >= startOfWeek).reduce((sum, t) => sum + (t.profit || 0), 0);
  const pnlMonth = trades.filter(t => new Date(t.created_at) >= startOfMonth).reduce((sum, t) => sum + (t.profit || 0), 0);

  // Equity Curve
  let cumulative = 0;
  let maxEquity = 0;
  let currentDrawdown = 0;
  let maxDrawdown = 0;

  const equityData = trades.map((t, index) => {
    cumulative += (t.profit || 0);
    if (cumulative > maxEquity) maxEquity = cumulative;
    currentDrawdown = maxEquity - cumulative;
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;
    
    return {
      index: index + 1,
      equity: cumulative,
      date: format(new Date(t.created_at), 'dd/MM HH:mm')
    };
  });

  // Best/Worst
  const sortedTrades = [...trades].sort((a, b) => (b.profit || 0) - (a.profit || 0));
  const bestTrade = sortedTrades.length > 0 ? sortedTrades[0].profit : 0;
  const worstTrade = sortedTrades.length > 0 ? sortedTrades[sortedTrades.length - 1].profit : 0;

  if (loading) return <div className="p-4 text-muted-foreground animate-pulse">Carregando métricas de performance...</div>;

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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard title="P&L Total" value={`$${totalPnl.toFixed(2)}`} icon={<DollarSign className="w-4 h-4" />} isCurrency valueClass={totalPnl >= 0 ? 'text-green-500' : 'text-red-500'} />
        <MetricCard title="Win Rate" value={`${winRate.toFixed(1)}%`} icon={<Percent className="w-4 h-4" />} />
        <MetricCard title="Profit Factor" value={profitFactor.toFixed(2)} icon={<Target className="w-4 h-4" />} />
        <MetricCard title="P&L Hoje" value={`$${pnlToday.toFixed(2)}`} icon={<Activity className="w-4 h-4" />} isCurrency valueClass={pnlToday >= 0 ? 'text-green-500' : 'text-red-500'} />
        <MetricCard title="Drawdown Máx" value={`$${maxDrawdown.toFixed(2)}`} icon={<TrendingUp className="w-4 h-4 transform scale-y-[-1]" />} valueClass="text-red-500" />
        <MetricCard title="Total Trades" value={trades.length} icon={<BarChart2 className="w-4 h-4" />} />
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
            <ResponsiveContainer width="100%" height="100%">
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
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md flex flex-col justify-between">
          <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Resumo de Períodos</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <span className="text-muted-foreground font-bold">Hoje</span>
              <span className={`font-mono font-black ${pnlToday >= 0 ? 'text-green-500' : 'text-red-500'}`}>${pnlToday.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <span className="text-muted-foreground font-bold">7 Dias</span>
              <span className={`font-mono font-black ${pnlWeek >= 0 ? 'text-green-500' : 'text-red-500'}`}>${pnlWeek.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <span className="text-muted-foreground font-bold">30 Dias</span>
              <span className={`font-mono font-black ${pnlMonth >= 0 ? 'text-green-500' : 'text-red-500'}`}>${pnlMonth.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-green-500/10 p-3 rounded-lg text-center border border-green-500/20">
                <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Melhor Trade</div>
                <div className="text-green-500 font-mono font-black">+${bestTrade.toFixed(2)}</div>
              </div>
              <div className="bg-red-500/10 p-3 rounded-lg text-center border border-red-500/20">
                <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Pior Trade</div>
                <div className="text-red-500 font-mono font-black">-${Math.abs(worstTrade).toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Trades Table */}
      <Card className="bg-card border-border shadow-md">
        <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Histórico de Operações (Últimas 50)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="border-border">
                <TableHead>Data</TableHead>
                <TableHead>Par</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Preço Entry/Exit</TableHead>
                <TableHead className="text-right">P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.slice(-50).reverse().map((t: any) => (
                <TableRow key={t.id} className="border-border">
                  <TableCell className="text-xs text-muted-foreground font-mono">{format(new Date(t.created_at), 'dd/MM HH:mm')}</TableCell>
                  <TableCell className="font-bold">{t.symbol}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${t.side === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {t.side}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    ${parseFloat(t.price).toFixed(2)} <span className="text-muted-foreground">→</span> ?
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${(t.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(t.profit || 0) > 0 ? '+' : ''}{(t.profit || 0).toFixed(2)} USDT
                  </TableCell>
                </TableRow>
              ))}
              {trades.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum trade registrado ainda.</TableCell>
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
