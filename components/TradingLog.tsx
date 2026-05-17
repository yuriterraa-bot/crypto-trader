'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Terminal, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function TradingLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const getLogColor = (signal: string) => {
    if (signal === 'BUY' || signal === 'STRONG_BUY') return 'text-green-500';
    if (signal === 'SELL' || signal === 'STRONG_SELL') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const todaySignalsCount = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  if (!mounted) return null;

  return (
    <Card className="bg-[#0a0a0f] border-border shadow-md w-full flex flex-col h-[400px]">
      <CardHeader className="pb-3 border-b border-border/50 bg-[#12121a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-gray-200">Log de Operações (Terminal)</CardTitle>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Conectado
            </div>
            <Badge variant="outline" className="font-normal text-xs bg-secondary/20 border-border">
              {todaySignalsCount} sinais hoje
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden relative bg-[#0a0a0f] font-mono text-[13px]">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
          
          <div className="text-primary mb-4 opacity-80">
            {'>'} Inicializando sistema de trading algorítmico...<br/>
            {'>'} Conectado à Binance WebSocket API.<br/>
            {'>'} Aguardando sinais da estratégia...
          </div>

          {logs.length === 0 && (
            <div className="text-muted-foreground animate-pulse">
              [SYSTEM] {format(new Date(), 'HH:mm:ss')} - Aguardando primeiros sinais do bot...
            </div>
          )}

          {logs.map((log, i) => (
            <div key={i} className="flex hover:bg-white/5 px-1 py-0.5 rounded transition-colors group">
              <span className="text-muted-foreground w-20 shrink-0 select-none">
                [{format(new Date(log.created_at), 'HH:mm:ss')}]
              </span>
              
              <span className={`w-16 shrink-0 select-none font-bold ${getLogColor(log.signal_type)}`}>
                [TRADE]
              </span>
              
              <span className="text-gray-300 ml-2">
                <span className="font-bold text-white">{log.symbol}</span>
                <span className="text-muted-foreground mx-2">|</span>
                Sinal: <span className={`font-bold ${getLogColor(log.signal_type)}`}>{log.signal_type.replace('_', ' ')}</span>
                <span className="text-muted-foreground mx-2">|</span>
                Score: <span className={log.score > 0 ? 'text-green-500' : log.score < 0 ? 'text-red-500' : 'text-gray-400'}>
                  {log.score > 0 ? '+' : ''}{parseFloat(log.score || '0').toFixed(1)}
                </span>
                <span className="text-muted-foreground mx-2">|</span>
                Estratégia: <span className="text-primary/80">{log.strategy}</span>
                <span className="text-muted-foreground mx-2">|</span>
                Preço: <span className="text-gray-400">${parseFloat(log.price || '0').toFixed(2)}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
