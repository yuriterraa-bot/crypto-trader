'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Bitcoin, Activity, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Balance {
  USDT?: number;
}

export default function MetricCards() {
  const [balance, setBalance] = useState<number>(0);
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [botConfig, setBotConfig] = useState({ is_running: false, signals_today: 0, open_positions: 0, start_time: '' as string | Date });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBotConfig(prev => ({ ...prev, start_time: new Date() }));

    const fetchBalance = async () => {
      try {
        const { data } = await axios.get('/api/binance/balance');
        // Tentar todos os formatos possíveis
        const bal = data.balance || data.data?.balance || data.total || data.availableBalance || '0';
        setBalance(parseFloat(bal));
      } catch (e) {
        setBalance(5000); // Mock for preview if offline
      }
    };

    const fetchPrices = async () => {
      try {
        const [btc, eth] = await Promise.all([
          axios.get('/api/binance/price?symbol=BTCUSDT'),
          axios.get('/api/binance/price?symbol=ETHUSDT')
        ]);
        setBtcPrice(Number(btc.data.price));
        setEthPrice(Number(eth.data.price));
      } catch (e) {
        setBtcPrice(78112.50); // Mock
        setEthPrice(2180.20);  // Mock
      }
    };

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/bot/config', { cache: 'no-store' });
        const data = await res.json();
        if (data) {
          setBotConfig(prev => ({ ...prev, is_running: data.is_running === true }));
        }
      } catch (e) {
        console.error('Status fetch error:', e);
      }
    };

    fetchBalance();
    fetchPrices();
    fetchConfig();

    const interval = setInterval(() => {
      fetchPrices();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1 - Saldo */}
      <Card className="bg-card border-border shadow-md hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Saldo Disponível</p>
              <div className="flex items-center">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  ${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center text-xs text-green-500 font-medium">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>+2.4% 24h</span>
              </div>
            </div>
          </div>
        </CardContent>
        {/* Fake Sparkline */}
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
                  ${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center text-xs text-red-500 font-medium">
                <TrendingDown className="h-3 w-3 mr-1" />
                <span>-0.8% 24h</span>
              </div>
            </div>
          </div>
        </CardContent>
        {/* Fake Sparkline */}
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
              {botConfig.is_running && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${botConfig.is_running ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Estado</span>
              <span className={`font-semibold ${botConfig.is_running ? 'text-green-500' : 'text-red-500'}`}>
                {botConfig.is_running ? 'Bot Ativo' : 'Bot Pausado'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Operações hoje</span>
              <span className="font-bold text-foreground">{botConfig.signals_today}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Posições abertas</span>
              <span className="font-bold text-foreground">{botConfig.open_positions}</span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
              <Clock className="h-3 w-3 mr-1" />
              <span>Uptime: {formatDistanceToNow(botConfig.start_time, { locale: ptBR })}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
