'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BinancePosition } from '@/types';

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
    <Card className="col-span-1 md:col-span-2 lg:col-span-4">
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading positions...</p>
        ) : positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open positions.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Mark Price</TableHead>
                  <TableHead className="text-right">PNL (USDT)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position, idx) => {
                  const pnl = parseFloat(position.unRealizedProfit);
                  const isLong = parseFloat(position.positionAmt) > 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{position.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={isLong ? "default" : "destructive"} className={isLong ? "bg-green-500 hover:bg-green-600" : ""}>
                          {isLong ? 'LONG' : 'SHORT'}
                        </Badge>
                      </TableCell>
                      <TableCell>{Math.abs(parseFloat(position.positionAmt))}</TableCell>
                      <TableCell>${parseFloat(position.entryPrice).toFixed(4)}</TableCell>
                      <TableCell>${parseFloat(position.markPrice).toFixed(4)}</TableCell>
                      <TableCell className={`text-right font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
