'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BacktestMetrics, StrategyConfig } from '@/types';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function BacktestPanel() {
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [days, setDays] = useState(15);
  const [initialBalance, setInitialBalance] = useState(1000);
  
  const [metrics, setMetrics] = useState<BacktestMetrics | null>(null);
  const [equityData, setEquityData] = useState<{trade: number, balance: number}[]>([]);
  const [history, setHistory] = useState<any[]>([]);

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
        alert("Please save a strategy configuration first.");
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
      
      fetchHistory(); // refresh history table

    } catch (error: any) {
      console.error('Backtest error:', error);
      alert('Error running backtest: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4 mt-4">
      <CardHeader>
        <CardTitle>Strategy Backtesting</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-secondary/30 p-4 rounded-lg border">
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Select value={symbol} onValueChange={(val) => val && setSymbol(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Symbol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Days to look back (Max ~15)</Label>
            <Input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value))} min={1} max={15} />
          </div>
          <div className="space-y-2">
            <Label>Initial Balance (USDT)</Label>
            <Input type="number" value={initialBalance} onChange={(e) => setInitialBalance(parseFloat(e.target.value))} />
          </div>
          <div className="flex items-end">
            <Button onClick={runBacktest} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Processing...' : 'Run Backtest'}
            </Button>
          </div>
        </div>

        {metrics && (
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-secondary/50 rounded-lg border text-center">
                <div className="text-xs text-muted-foreground mb-1">Final Balance</div>
                <div className={`text-xl font-bold ${metrics.finalBalance > initialBalance ? 'text-green-500' : 'text-red-500'}`}>
                  ${metrics.finalBalance.toFixed(2)}
                </div>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg border text-center">
                <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                <div className="text-xl font-bold">{metrics.winRate.toFixed(1)}%</div>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg border text-center">
                <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
                <div className="text-xl font-bold">{metrics.totalTrades}</div>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg border text-center">
                <div className="text-xs text-muted-foreground mb-1">Profit Factor</div>
                <div className="text-xl font-bold">{metrics.profitFactor.toFixed(2)}</div>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg border text-center">
                <div className="text-xs text-muted-foreground mb-1">Max Drawdown</div>
                <div className="text-xl font-bold text-red-500">{metrics.maxDrawdown.toFixed(2)}%</div>
              </div>
              <div className="p-4 bg-secondary/50 rounded-lg border text-center">
                <div className="text-xs text-muted-foreground mb-1">Sharpe Ratio</div>
                <div className="text-xl font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
              </div>
            </div>

            <div className="h-[300px] w-full border rounded-lg p-4 bg-card">
              <h4 className="text-sm font-medium mb-4 text-center">Equity Curve</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="trade" className="text-xs" />
                  <YAxis domain={['auto', 'auto']} className="text-xs" tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line type="stepAfter" dataKey="balance" stroke="#10b981" strokeWidth={2} dot={false} name="Equity" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Last 10 Backtests</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead className="text-right">Result (USDT)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => {
                    const profit = item.final_balance - item.initial_balance;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-medium">{item.symbol}</TableCell>
                        <TableCell>{item.total_trades}</TableCell>
                        <TableCell>{parseFloat(item.win_rate).toFixed(1)}%</TableCell>
                        <TableCell className={`text-right font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {profit > 0 ? '+' : ''}{profit.toFixed(2)}
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
