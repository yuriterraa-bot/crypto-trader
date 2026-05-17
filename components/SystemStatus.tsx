'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Power, PowerOff, Bot } from 'lucide-react';
import BotStatusButton from './BotStatusButton';

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
      const res = await fetch('/api/bot/config', { cache: 'no-store' });
      const data = await res.json();
      if (data) {
        setBotConfig({
          is_running: data.is_running === true,
          is_paper_trade: data.is_paper_trade
        });
      }
    } catch (e) {
      console.error('Status fetch error:', e);
    }
  };

  const toggleBot = async () => {
    try {
      setLoading(true);
      const newState = !botConfig.is_running;
      const res = await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_running: newState })
      });
      
      if (res.ok) {
        setBotConfig(prev => ({ ...prev, is_running: newState }));
        if (newState) {
          fetch('/api/bot/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'BTCUSDT' })
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Toggle error:', error);
    } finally {
      setLoading(false);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchHealth();
    fetchCron();
    fetchConfig();
    
    const interval = setInterval(() => {
      fetchHealth();
      fetchCron();
      fetchConfig();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

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
        
        <BotStatusButton />
      </div>
    </div>
  );
}
