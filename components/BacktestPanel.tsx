'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BacktestMetrics } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Play, History, TrendingUp, BarChart2 } from 'lucide-react';

export default function BacktestPanel() {
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [days, setDays] = useState(15);
  const [initialBalance, setInitialBalance] = useState(1000);
  
  const [metrics, setMetrics] = useState<BacktestMetrics | null>(null);
  const [equityData, setEquityData] = useState<{trade: number, balance: number}[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [topConfigs, setTopConfigs] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get('/api/backtest');
      setHistory(data || []);
    } catch (error) {
      console.error('Failed to fetch backtest history', error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const runBacktest = async () => {
    setLoading(true);
    setMetrics(null);
    setEquityData([]);
    
    try {
      const endDate = Date.now();
      const startDate = endDate - (days * 24 * 60 * 60 * 1000);
      
      const configRes = await axios.get('/api/bot/config');
      const strategyConfig = configRes.data?.strategy_config;

      if (!strategyConfig) {
        alert("Por favor, salve a configuração da estratégia primeiro.");
        setLoading(false);
        return;
      }

      const res = await axios.post('/api/backtest', {
        symbol,
        startDate,
        endDate,
        strategyConfig,
        initialBalance
      });

      setMetrics(res.data.metrics);
      
      const chartData = res.data.equityCurve.map((balance: number, index: number) => ({
        trade: index,
        balance: parseFloat(balance.toFixed(2))
      }));
      setEquityData(chartData);
      
      fetchHistory();

    } catch (error: any) {
      console.error('Backtest error:', error);
      alert('Erro ao executar backtest: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <Card className="bg-card border-border shadow-md w-full h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center space-x-2">
          <History className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-lg">Laboratório de Backtest</CardTitle>
            <CardDescription className="text-xs">Teste sua estratégia com dados históricos</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-secondary/5 p-5 rounded-xl border border-border/50">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ativo</Label>
            <Select value={symbol} onValueChange={(val) => val && setSymbol(val)}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione o ativo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTCUSDT">Bitcoin (BTC/USDT)</SelectItem>
                <SelectItem value="ETHUSDT">Ethereum (ETH/USDT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período (Dias)</Label>
            <Input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value))} min={1} max={30} className="bg-background border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Banca Inicial ($)</Label>
            <Input type="number" value={initialBalance} onChange={(e) => setInitialBalance(parseFloat(e.target.value))} className="bg-background border-border" />
          </div>
          <div className="flex flex-col space-y-2 justify-end">
            <Button onClick={runBacktest} disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              {loading && !metrics ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {loading && !metrics ? 'Simulando...' : 'Executar Backtest'}
            </Button>
          </div>
          <div className="flex flex-col space-y-2 justify-end">
            <Button onClick={async () => {
              setLoading(true);
              setTopConfigs([]);
              try {
                const res = await axios.post('/api/optimize', { symbol, lookbackDays: days });
                setTopConfigs(res.data.topConfigs);
              } catch (e) {
                alert('Erro ao otimizar');
              } finally {
                setLoading(false);
              }
            }} disabled={loading} variant="outline" className="w-full h-10 border-primary text-primary hover:bg-primary/10">
              {loading && topConfigs.length === 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
              {loading && topConfigs.length === 0 ? 'Otimizando...' : 'Auto-Otimizar'}
            </Button>
          </div>
        </div>

        {topConfigs.length > 0 && (
          <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <h3 className="font-bold mb-4 text-primary">Top 5 Configurações Encontradas</h3>
            <div className="space-y-2">
              {topConfigs.map((cfg: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-2 bg-background border rounded">
                  <div className="text-xs font-mono">
                    WinRate: {cfg.metrics.winRate.toFixed(1)}% | Sharpe: {cfg.metrics.sharpeRatio.toFixed(2)} | TF: {cfg.config.t} | Buy: {cfg.config.buy}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => alert('Para aplicar, altere os parâmetros manualmente no Painel de Estratégias')}>
                    Aplicar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics && (
          <div className="space-y-8 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-secondary/10 rounded-xl border border-border flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Banca Final</div>
                <div className={`text-2xl font-black ${metrics.finalBalance > initialBalance ? 'text-green-500' : 'text-red-500'}`}>
                  ${metrics.finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-secondary/10 rounded-xl border border-border flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Win Rate</div>
                <div className="text-2xl font-black text-foreground">{metrics.winRate.toFixed(1)}%</div>
              </div>
              <div className="p-4 bg-secondary/10 rounded-xl border border-border flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Operações</div>
                <div className="text-2xl font-black text-foreground">{metrics.totalTrades}</div>
              </div>
              <div className="p-4 bg-secondary/10 rounded-xl border border-border flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Profit Factor</div>
                <div className="text-2xl font-black text-foreground">{metrics.profitFactor.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold text-destructive uppercase tracking-wider mb-2">Max Drawdown</div>
                <div className="text-2xl font-black text-destructive">{metrics.maxDrawdown.toFixed(2)}%</div>
              </div>
              <div className="p-4 bg-secondary/10 rounded-xl border border-border flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sharpe Ratio</div>
                <div className="text-2xl font-black text-foreground">{metrics.sharpeRatio.toFixed(2)}</div>
              </div>
            </div>

            <div className="h-[350px] w-full border border-border rounded-xl p-6 bg-secondary/5">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" /> Curva de Capital (Equity)
              </h4>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={equityData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="trade" className="text-xs" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} className="text-xs" stroke="hsl(var(--muted-foreground))" tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  />
                  <Line type="stepAfter" dataKey="balance" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name="Saldo" animationDuration={1000} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8 border-t border-border/50 pt-8">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center">
              <BarChart2 className="h-4 w-4 mr-2" /> Histórico de Testes
            </h3>
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow className="border-border">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Ativo</TableHead>
                    <TableHead className="font-semibold">Operações</TableHead>
                    <TableHead className="font-semibold">Win Rate</TableHead>
                    <TableHead className="text-right font-semibold">Lucro Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const profit = item.final_balance - item.initial_balance;
                    return (
                      <TableRow key={item.id} className="border-border hover:bg-secondary/10 transition-colors">
                        <TableCell className="text-muted-foreground">{format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell className="font-bold">{item.symbol}</TableCell>
                        <TableCell>{item.total_trades}</TableCell>
                        <TableCell>{parseFloat(item.win_rate).toFixed(1)}%</TableCell>
                        <TableCell className={`text-right font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {profit > 0 ? '+' : ''}${Math.abs(profit).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
