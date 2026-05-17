'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Power, PowerOff, Bot } from 'lucide-react';

interface HealthData {
  supabase: boolean;
  binance: boolean;
}

export default function SystemStatus() {
  const [health, setHealth] = useState<HealthData>({ supabase: false, binance: false });
  const [lastCron, setLastCron] = useState<Date | null>(null);
  const [botConfig, setBotConfig] = useState<{ is_running: boolean, is_paper_trade: boolean }>({ is_running: false, is_paper_trade: true });
  const [loading, setLoading] = useState(false);

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
    } catch (e) {}
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

  const toggleBot = async () => {
    setLoading(true);
    try {
      // Assuming a POST to /api/bot/config exists or we just toggle local state for now
      // Here we just toggle visual state as requested to keep it simple, but ideally would hit API
      setBotConfig(prev => ({ ...prev, is_running: !prev.is_running }));
    } finally {
      setLoading(false);
    }
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

  const isTestnet = process.env.NEXT_PUBLIC_TESTNET === 'true';

  return (
    <div className="w-full bg-card border-b border-border flex items-center justify-between px-4 h-16 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 mr-4">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:inline-block">CryptoBot IA</span>
        </div>
        
        <Badge className={`border-0 text-[10px] uppercase font-bold tracking-wider ${isTestnet ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}>
          {isTestnet ? '🧪 TESTNET' : '🟢 LIVE'}
        </Badge>
      </div>

      <div className="hidden md:flex items-center space-x-6 text-xs text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
        <div className="flex items-center">
          <StatusDot ok={health.supabase} />
          <span>Supabase</span>
        </div>
        
        <div className="flex items-center border-l border-border pl-6">
          <StatusDot ok={health.binance} />
          <span>Binance</span>
        </div>

        <div className="flex items-center border-l border-border pl-6">
          <span className="mr-1">Último ciclo:</span>
          <span className="font-medium text-foreground">
            {lastCron ? formatDistanceToNow(lastCron, { addSuffix: true, locale: ptBR }) : 'Aguardando'}
          </span>
        </div>

        <div className="hidden lg:flex items-center border-l border-border pl-6">
          <span className="mr-1">Próximo ciclo:</span>
          <span className="font-medium text-foreground">
            {lastCron ? 'em ' + formatDistanceToNow(addMinutes(lastCron, 15), { locale: ptBR }) : '...'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {botConfig.is_paper_trade && (
          <Badge variant="outline" className="hidden sm:flex bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase font-semibold h-8 items-center px-3">
            Modo Simulação
          </Badge>
        )}
        
        <Button 
          variant={botConfig.is_running ? 'destructive' : 'default'} 
          onClick={toggleBot}
          disabled={loading}
          size="sm"
          className={`h-8 font-semibold text-xs transition-all ${botConfig.is_running ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]'}`}
        >
          {botConfig.is_running ? (
            <>
              <PowerOff className="mr-2 h-3.5 w-3.5" /> Parar Bot
            </>
          ) : (
            <>
              <Power className="mr-2 h-3.5 w-3.5" /> Iniciar Bot
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
