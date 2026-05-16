'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface HealthData {
  supabase: boolean;
  binance: boolean;
}

export default function SystemStatus() {
  const [health, setHealth] = useState<HealthData>({ supabase: false, binance: false });
  const [lastCron, setLastCron] = useState<Date | null>(null);
  const [botConfig, setBotConfig] = useState<{ is_running: boolean, is_paper_trade: boolean }>({ is_running: false, is_paper_trade: true });

  const fetchHealth = async () => {
    try {
      const { data } = await axios.get('/api/health');
      setHealth({ supabase: data.supabase, binance: data.binance });
    } catch (e) {
      setHealth({ supabase: false, binance: false });
    }
  };

  const fetchCron = async () => {
    try {
      const { data, error } = await supabase
        .from('cron_logs')
        .select('executed_at')
        .order('executed_at', { ascending: false })
        .limit(1)
        .single();
        
      if (data && !error) {
        setLastCron(new Date(data.executed_at));
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchConfig = async () => {
    try {
      const { data } = await axios.get('/api/bot/config');
      if (data) {
        setBotConfig({
          is_running: data.is_running,
          is_paper_trade: data.is_paper_trade
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchHealth();
    fetchCron();
    fetchConfig();
    
    const interval = setInterval(() => {
      fetchHealth();
      fetchCron();
      fetchConfig();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const StatusDot = ({ ok }: { ok: boolean }) => (
    <span className="relative flex h-2.5 w-2.5 mr-2">
      {ok && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${ok ? 'bg-green-500' : 'bg-red-500'}`}></span>
    </span>
  );

  return (
    <div className="w-full bg-secondary/30 border-b flex items-center px-4 h-10 text-[11px] md:text-xs text-muted-foreground justify-between overflow-hidden">
      <div className="flex items-center space-x-4 md:space-x-6">
        <div className="flex items-center">
          <StatusDot ok={health.supabase} />
          <span className="hidden sm:inline">Supabase: </span>
          <span className={`ml-1 font-semibold ${health.supabase ? 'text-primary' : 'text-red-500'}`}>
            {health.supabase ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex items-center border-l border-border pl-4 md:pl-6">
          <StatusDot ok={health.binance} />
          <span className="hidden sm:inline">Binance: </span>
          <span className={`ml-1 font-semibold ${health.binance ? 'text-primary' : 'text-red-500'}`}>
            {health.binance ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="hidden md:flex items-center border-l border-border pl-6">
          <span className="mr-1">Último ciclo:</span>
          <span className="font-semibold text-primary">
            {lastCron ? formatDistanceToNow(lastCron, { addSuffix: true, locale: ptBR }) : 'Aguardando'}
          </span>
        </div>

        <div className="hidden lg:flex items-center border-l border-border pl-6">
          <span className="mr-1">Próximo ciclo:</span>
          <span className="font-semibold text-primary">
            {lastCron ? 'em ' + formatDistanceToNow(addMinutes(lastCron, 15), { locale: ptBR }) : '...'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {process.env.NEXT_PUBLIC_TESTNET === 'true' && (
          <Badge className="bg-orange-500 text-white hover:bg-orange-600 border-0 text-[9px] uppercase h-5 font-bold">
            🧪 TESTNET
          </Badge>
        )}
        {botConfig.is_paper_trade && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[9px] uppercase h-5">
            Paper Trade
          </Badge>
        )}
        {botConfig.is_running ? (
          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-0 text-[9px] uppercase h-5 animate-pulse">
            Bot Ativo
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground border-border text-[9px] uppercase h-5">
            Bot Pausado
          </Badge>
        )}
      </div>
    </div>
  );
}
