'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Bitcoin, Activity, TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function MetricCards() {
  const [balance, setBalance] = useState<number>(0);
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [btcChange, setBtcChange] = useState<number>(0);
  const [ethChange, setEthChange] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const [todayOps, setTodayOps] = useState(0);
  const [openPositions, setOpenPositions] = useState(0);
  const [startTime] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  // ── Saldo USDT ─────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/binance/balance', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      const bal = parseFloat(data.balance || data.total || '0');
      if (!isNaN(bal)) setBalance(bal);
    } catch (e) {
      console.error('Balance fetch error:', e);
    }
  }, []);

  // ── Preços BTC / ETH ───────────────────────────────────
  const fetchPrices = useCallback(async () => {
    try {
      const [btcRes, ethRes] = await Promise.all([
        fetch('/api/binance/price?symbol=BTCUSDT', { cache: 'no-store' }),
        fetch('/api/binance/price?symbol=ETHUSDT', { cache: 'no-store' }),
      ]);
      const btcData = await btcRes.json();
      const ethData = await ethRes.json();
      setBtcPrice(Number(btcData.price));
      setEthPrice(Number(ethData.price));
      if (btcData.priceChangePercent !== undefined) setBtcChange(Number(btcData.priceChangePercent));
      if (ethData.priceChangePercent !== undefined) setEthChange(Number(ethData.priceChangePercent));
    } catch (e) {
      // manter preços anteriores silenciosamente
    }
  }, []);

  // ── Config do bot (is_running) ─────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/config', { cache: 'no-store' });
      const data = await res.json();
      setIsRunning(data.is_running === true);
    } catch (e) { /* ignore */ }
  }, []);

  // ── Operações hoje (signals) ───────────────────────────
  const fetchTodayOps = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      setTodayOps(count || 0);
    } catch (e) { /* ignore */ }
  }, []);

  // ── Posições abertas ───────────────────────────────────
  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch('/api/binance/positions', { cache: 'no-store' });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.positions || []);
      const open = arr.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0);
      setOpenPositions(open.length);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    setMounted(true);

    // Busca imediata de tudo
    fetchBalance();
    fetchPrices();
    fetchConfig();
    fetchTodayOps();
    fetchPositions();

    // Intervalos individuais por frequência
    const balInterval   = setInterval(fetchBalance,   10000); // 10s
    const priceInterval = setInterval(fetchPrices,    10000); // 10s
    const posInterval   = setInterval(fetchPositions, 15000); // 15s
    const configInterval= setInterval(fetchConfig,    10000); // 10s
    const opsInterval   = setInterval(fetchTodayOps,  30000); // 30s

    // Evento global de toggle do bot
    const onBotToggle = () => { fetchConfig(); fetchTodayOps(); fetchPositions(); };
    window.addEventListener('bot-status-changed', onBotToggle);

    return () => {
      clearInterval(balInterval);
      clearInterval(priceInterval);
      clearInterval(posInterval);
      clearInterval(configInterval);
      clearInterval(opsInterval);
      window.removeEventListener('bot-status-changed', onBotToggle);
    };
  }, [fetchBalance, fetchPrices, fetchConfig, fetchTodayOps, fetchPositions]);

  if (!mounted) return null;

  const fmtUSD = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const ChangeTag = ({ pct }: { pct: number }) =>
    pct >= 0 ? (
      <div className="flex items-center text-xs text-green-500 font-medium">
        <TrendingUp className="h-3 w-3 mr-1" />
        <span>+{pct.toFixed(2)}% 24h</span>
      </div>
    ) : (
      <div className="flex items-center text-xs text-red-500 font-medium">
        <TrendingDown className="h-3 w-3 mr-1" />
        <span>{pct.toFixed(2)}% 24h</span>
      </div>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

      {/* Card 1 - Saldo */}
      <Card className="bg-card border-border shadow-md hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Saldo Disponível
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  ${fmtUSD(balance)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Total em USDT na conta</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 - BTC */}
      <Card className="bg-card border-border shadow-md hover:shadow-lg transition-all relative overflow-hidden">
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Bitcoin className="h-5 w-5 text-[#F7931A]" />
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bitcoin (BTC)</p>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  ${fmtUSD(btcPrice)}
                </span>
              </div>
              <ChangeTag pct={btcChange} />
            </div>
          </div>
        </CardContent>
        <svg className="absolute bottom-0 left-0 w-full h-16 opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0,100 L0,50 Q10,20 20,40 T40,60 T60,30 T80,50 T100,10 L100,100 Z" fill="#22c55e" />
          <path d="M0,50 Q10,20 20,40 T40,60 T60,30 T80,50 T100,10" fill="none" stroke="#22c55e" strokeWidth="2" />
        </svg>
      </Card>

      {/* Card 3 - ETH */}
      <Card className="bg-card border-border shadow-md hover:shadow-lg transition-all relative overflow-hidden">
        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-[#627EEA]" />
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ethereum (ETH)</p>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  ${fmtUSD(ethPrice)}
                </span>
              </div>
              <ChangeTag pct={ethChange} />
            </div>
          </div>
        </CardContent>
        <svg className="absolute bottom-0 left-0 w-full h-16 opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0,100 L0,20 Q10,40 20,30 T40,50 T60,20 T80,60 T100,80 L100,100 Z" fill="#ef4444" />
          <path d="M0,20 Q10,40 20,30 T40,50 T60,20 T80,60 T100,80" fill="none" stroke="#ef4444" strokeWidth="2" />
        </svg>
      </Card>

      {/* Card 4 - Status do Bot */}
      <Card className="bg-card border-border shadow-md hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status do Bot</p>
            <span className="flex h-2.5 w-2.5 relative">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Estado</span>
              <span className={`font-semibold ${isRunning ? 'text-green-500' : 'text-red-500'}`}>
                {isRunning ? 'Bot Ativo' : 'Bot Pausado'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Operações hoje</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-primary" />
                {todayOps}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Posições abertas</span>
              <span className={`font-bold ${openPositions > 0 ? 'text-green-400' : 'text-foreground'}`}>
                {openPositions}
              </span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              <Clock className="h-3 w-3 mr-1" />
              <span>Uptime: {formatDistanceToNow(startTime, { locale: ptBR })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
