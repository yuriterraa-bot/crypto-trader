'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function TradingLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchInitialLogs = async () => {
    const { data } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (data) {
      setLogs(data.reverse()); // reverse so newest is at the bottom
    }
  };

  useEffect(() => {
    fetchInitialLogs();

    const channel = supabase
      .channel('signals_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, (payload) => {
        setLogs((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getRowClass = (signal: string) => {
    if (signal === 'BUY' || signal === 'STRONG_BUY') return 'bg-green-500/5 hover:bg-green-500/10';
    if (signal === 'SELL' || signal === 'STRONG_SELL') return 'bg-red-500/5 hover:bg-red-500/10';
    return 'bg-secondary/10 hover:bg-secondary/20';
  };

  const getBadgeClass = (signal: string) => {
    if (signal === 'BUY' || signal === 'STRONG_BUY') return 'bg-green-500/20 text-green-500 border-green-500/30';
    if (signal === 'SELL' || signal === 'STRONG_SELL') return 'bg-red-500/20 text-red-500 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const todaySignalsCount = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <Card className="col-span-full flex flex-col h-[400px]">
      <CardHeader className="pb-2 border-b flex flex-row items-center justify-between bg-card/50">
        <CardTitle>Live Trading Log</CardTitle>
        <Badge variant="outline" className="font-normal text-xs bg-secondary/50">
          {todaySignalsCount} sinais hoje
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <div ref={scrollRef} className="h-full overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b">
              <TableRow>
                <TableHead className="w-[100px]">Hora</TableHead>
                <TableHead>Símbolo</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Sinal</TableHead>
                <TableHead>Estratégia</TableHead>
                <TableHead className="text-right">Preço (USDT)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                    Aguardando primeiros sinais do bot...
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log, i) => (
                <TableRow key={i} className={getRowClass(log.signal_type)}>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-bold">{log.symbol}</TableCell>
                  <TableCell>
                    <span className={`font-mono text-xs ${log.score > 0 ? 'text-green-500' : log.score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {log.score > 0 ? '+' : ''}{parseFloat(log.score || '0').toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${getBadgeClass(log.signal_type)}`}>
                      {log.signal_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.strategy}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    ${parseFloat(log.price || '0').toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
