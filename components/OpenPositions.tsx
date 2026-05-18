'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, XCircle, LayoutDashboard } from 'lucide-react';

export default function OpenPositions() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingMap, setClosingMap] = useState<Record<string, boolean>>({});

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/binance/positions', { cache: 'no-store' });
      const data = await res.json();
      const active = Array.isArray(data)
        ? data.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0)
        : [];
      setPositions(active);
    } catch (e) {
      console.error('Fetch positions error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = async (symbol: string, positionAmt: string) => {
    try {
      setClosingMap(prev => ({ ...prev, [symbol]: true }));
      const side = parseFloat(positionAmt) > 0 ? 'BUY' : 'SELL';
      
      const res = await axios.post('/api/orders/close', {
        symbol,
        side
      });
      
      if (res.data.success) {
        await fetchPositions();
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao fechar posição');
    } finally {
      setClosingMap(prev => ({ ...prev, [symbol]: false }));
    }
  };

  return (
    <Card className="col-span-full bg-card border-border shadow-md">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="h-5 w-5 text-indigo-500" />
            <div>
              <CardTitle className="text-lg">Posições Abertas</CardTitle>
              <CardDescription className="text-xs">Gerenciamento ao vivo da Binance</CardDescription>
            </div>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {positions.length === 0 && !loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm font-medium">
            Nenhuma posição aberta no momento
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow className="border-border">
                <TableHead>Par</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Preço Atual</TableHead>
                <TableHead className="text-right">PnL (USDT)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p: any) => {
                const isLong = parseFloat(p.positionAmt) > 0;
                const pnl = parseFloat(p.unrealizedProfit || p.unRealizedProfit || '0');
                return (
                  <TableRow key={p.symbol} className="border-border">
                    <TableCell className="font-bold">{p.symbol}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${isLong ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        {isLong ? 'LONG' : 'SHORT'} {p.leverage}x
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{Math.abs(parseFloat(p.positionAmt))}</TableCell>
                    <TableCell className="font-mono text-xs">${parseFloat(p.entryPrice).toFixed(4)}</TableCell>
                    <TableCell className="font-mono text-xs">${parseFloat(p.markPrice).toFixed(4)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20"
                        onClick={() => handleClose(p.symbol, p.positionAmt)}
                        disabled={closingMap[p.symbol]}
                      >
                        {closingMap[p.symbol] ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                        Fechar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
