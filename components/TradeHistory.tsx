'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BinancePosition } from '@/types';
import { Briefcase, Loader2, Info } from 'lucide-react';

export default function TradeHistory() {
  const [positions, setPositions] = useState<BinancePosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const { data } = await axios.get('/api/binance/positions');
        setPositions(data || []);
      } catch (error) {
        console.error('Failed to fetch positions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-card border-border shadow-md w-full h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-lg">Posições Abertas</CardTitle>
            <CardDescription className="text-xs">Operações em andamento na Binance Futures</CardDescription>
          </div>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {loading && positions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted mb-4 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">Carregando posições da corretora...</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <Info className="h-10 w-10 text-muted mb-3 opacity-20" />
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Nenhuma posição aberta no momento</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-2">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Ativo</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Lado</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Tamanho</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Preço Entrada</TableHead>
                  <TableHead className="font-semibold uppercase tracking-wider text-[11px]">Preço Marcação</TableHead>
                  <TableHead className="text-right font-semibold uppercase tracking-wider text-[11px]">PNL (USDT)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position, idx) => {
                  const pnl = parseFloat(position.unRealizedProfit);
                  const isLong = parseFloat(position.positionAmt) > 0;
                  return (
                    <TableRow key={idx} className="border-border/30 hover:bg-secondary/20 transition-colors cursor-pointer group">
                      <TableCell className="font-bold text-sm">
                        <div className="flex items-center">
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isLong ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          {position.symbol}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isLong ? "default" : "destructive"} className={`border-0 font-black tracking-wider text-[10px] ${isLong ? 'bg-green-500/20 text-green-500 group-hover:bg-green-500/30' : 'bg-red-500/20 text-red-500 group-hover:bg-red-500/30'}`}>
                          {isLong ? 'LONG' : 'SHORT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono">{Math.abs(parseFloat(position.positionAmt))}</TableCell>
                      <TableCell className="font-mono text-xs">${parseFloat(position.entryPrice).toFixed(4)}</TableCell>
                      <TableCell className="font-mono text-xs">${parseFloat(position.markPrice).toFixed(4)}</TableCell>
                      <TableCell className={`text-right font-bold text-sm font-mono ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
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
