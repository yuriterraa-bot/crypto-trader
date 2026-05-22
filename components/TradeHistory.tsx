'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, Loader2, Info, TrendingUp, TrendingDown } from 'lucide-react';

interface ConsolidatedTrade {
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

interface TradeHistoryMetrics {
  winRate: number;
  totalRealizedPnl: number;
  profitFactor: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<ConsolidatedTrade[]>([]);
  const [metrics, setMetrics] = useState<TradeHistoryMetrics>({
    winRate: 0,
    totalRealizedPnl: 0,
    profitFactor: 0,
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get('/api/account/history');
        if (data) {
          setTrades(data.trades || []);
          if (data.metrics) {
            setMetrics(data.metrics);
          }
        }
      } catch (error) {
        console.error('Failed to fetch trade history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-card border-border shadow-md w-full h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-lg">Histórico de Negociações</CardTitle>
            <CardDescription className="text-xs">Resultados consolidados dos últimos 7 dias na Binance Futures</CardDescription>
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </CardHeader>

      {/* Metrics Header Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-border/30 bg-secondary/5">
        <div className="bg-[#0b0e14]/60 p-3 rounded-lg border border-slate-900">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Win Rate</span>
          <div className="text-lg font-black text-indigo-400">{metrics.winRate}%</div>
          <div className="text-[9px] text-slate-500">{metrics.winTrades} W - {metrics.lossTrades} L</div>
        </div>
        <div className="bg-[#0b0e14]/60 p-3 rounded-lg border border-slate-900">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">P&L Realizado</span>
          <div className={`text-lg font-black ${metrics.totalRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.totalRealizedPnl >= 0 ? '+' : ''}{metrics.totalRealizedPnl.toFixed(2)} USDT
          </div>
          <div className="text-[9px] text-slate-500">Últimos 7 dias</div>
        </div>
        <div className="bg-[#0b0e14]/60 p-3 rounded-lg border border-slate-900">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fator de Lucro</span>
          <div className="text-lg font-black text-slate-200">{metrics.profitFactor || '—'}</div>
          <div className="text-[9px] text-slate-500">Ganhos / Perdas</div>
        </div>
        <div className="bg-[#0b0e14]/60 p-3 rounded-lg border border-slate-900">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Trades</span>
          <div className="text-lg font-black text-slate-200">{metrics.totalTrades}</div>
          <div className="text-[9px] text-slate-500">Operações finalizadas</div>
        </div>
      </div>
      
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {loading && trades.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted mb-4 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">Carregando histórico de negociações...</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Info className="h-10 w-10 text-muted mb-3 opacity-20" />
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Nenhum trade realizado nos últimos 7 dias</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-2">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Data/Hora</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Ativo</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Direção</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Tamanho</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Preço Entrada</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Preço Saída</TableHead>
                  <TableHead className="text-right font-semibold uppercase tracking-wider text-[11px]">PNL Realizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade, idx) => {
                  const isLong = trade.direction === 'LONG';
                  const dateStr = new Date(trade.time).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <TableRow key={idx} className="border-border/30 hover:bg-secondary/20 transition-colors cursor-pointer group">
                      <TableCell className="font-mono text-xs text-slate-400">
                        {dateStr}
                      </TableCell>
                      <TableCell className="font-bold text-sm">
                        {trade.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit ${isLong
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {trade.direction}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 font-mono text-xs">{trade.qty}</TableCell>
                      <TableCell className="font-mono text-xs">${trade.entryPrice.toFixed(4)}</TableCell>
                      <TableCell className="font-mono text-xs">${trade.exitPrice.toFixed(4)}</TableCell>
                      <TableCell className={`text-right font-bold text-sm font-mono ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <div>{trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)} USDT</div>
                        <div className="text-[10px] opacity-70">{trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
