'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, RefreshCw, Activity, Clock, Zap, Target, BarChart3 } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AIMResult {
  direction: 'LONG' | 'SHORT';
  confidence: number;
  score: number;
  reasons: string[];
  action?: 'open' | 'reverse' | 'hold';
  currentSide?: string | null;
}

interface BotResult {
  symbol: string;
  score: number;
  techSignal: string;
  finalRecommendation: string;
  action: string;
  breakdown: { indicator: string; contribution: number; signal: string }[];
  aim?: AIMResult;
}

interface BotRunResponse {
  status: string;
  results?: BotResult[];
}

interface SignalLog {
  id: string;
  symbol: string;
  strategy: string;
  signal_type: string;
  price: number;
  score: number;
  created_at: string;
}

export default function BotAnalysisPanel() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [botData, setBotData] = useState<BotRunResponse | null>(null);
  const [signals, setSignals] = useState<SignalLog[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bot/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'BTCUSDT' }),
      });
      const data = await res.json();
      setBotData(data);
      setLastUpdated(new Date());
      setTimeLeft(60);
    } catch (e) {
      console.error('BotAnalysisPanel fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSignals = useCallback(async () => {
    const { data } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setSignals(data);
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchAnalysis();
    fetchSignals();

    intervalRef.current = setInterval(() => {
      fetchAnalysis();
      fetchSignals();
    }, 60000);

    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 60 : prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchAnalysis, fetchSignals]);

  if (!mounted) return null;

  const btcResult = botData?.results?.find(r => r.symbol === 'BTCUSDT');

  const getDirectionColor = (dir?: string) =>
    dir === 'LONG' ? 'text-green-400' : dir === 'SHORT' ? 'text-red-400' : 'text-gray-400';

  const getSignalBadge = (sig: string) => {
    if (sig === 'BUY' || sig === 'LONG') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (sig === 'SELL' || sig === 'SHORT') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getActionBadge = (action?: string) => {
    if (action === 'open') return 'bg-green-500/20 text-green-400';
    if (action === 'reverse') return 'bg-orange-500/20 text-orange-400';
    if (action === 'hold') return 'bg-blue-500/20 text-blue-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <Activity className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider">Análise do Bot</h2>
            <p className="text-xs text-muted-foreground">
              {lastUpdated ? `Atualizado ${formatDistanceToNowStrict(lastUpdated, { locale: ptBR, addSuffix: true })}` : 'Aguardando...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
            <Clock className="h-3 w-3" />
            <span>Próxima em {timeLeft}s</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => { fetchAnalysis(); fetchSignals(); }} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* SEÇÃO 1 - Análise Atual BTC */}
        <Card className="lg:col-span-1 bg-card border-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Análise Atual — BTC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {btcResult?.aim ? (
              <>
                {/* Direção */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    {btcResult.aim.direction === 'LONG'
                      ? <TrendingUp className="h-8 w-8 text-green-400" />
                      : <TrendingDown className="h-8 w-8 text-red-400" />
                    }
                    <div>
                      <p className={`text-2xl font-black ${getDirectionColor(btcResult.aim.direction)}`}>
                        {btcResult.aim.direction}
                      </p>
                      <p className="text-xs text-muted-foreground">Direção AIM</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{btcResult.aim.score > 0 ? '+' : ''}{btcResult.aim.score}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </div>

                {/* Confiança */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Confiança</span>
                    <span className="font-bold">{btcResult.aim.confidence}%</span>
                  </div>
                  <div className="w-full bg-secondary/50 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${btcResult.aim.direction === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${btcResult.aim.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Ação AIM */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Ação</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${getActionBadge(btcResult.aim.action)}`}>
                    {btcResult.aim.action === 'open' ? '🟢 ABRIR' :
                     btcResult.aim.action === 'reverse' ? '🔄 REVERTER' :
                     '🔵 MANTER'}
                  </span>
                </div>

                {/* Razões */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fatores</p>
                  {btcResult.aim.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-foreground/80 py-0.5">{r}</p>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-6 text-center space-y-2">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Analisando...' : 'Always-In Market não ativado'}
                </p>
                <p className="text-xs text-muted-foreground">Ative em Configurações de Estratégia</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 2 - Breakdown Indicadores */}
        <Card className="lg:col-span-1 bg-card border-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              Breakdown — Indicadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {btcResult?.breakdown && btcResult.breakdown.length > 0 ? (
              <div className="space-y-2">
                {btcResult.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-medium truncate">{item.indicator}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${item.contribution > 0 ? 'text-green-400' : item.contribution < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {item.contribution > 0 ? '+' : ''}{item.contribution.toFixed(1)}
                      </span>
                      <Badge className={`text-[10px] px-1.5 py-0 h-5 border ${getSignalBadge(item.signal)}`}>
                        {item.signal}
                      </Badge>
                    </div>
                  </div>
                ))}
                <div className="pt-2 flex justify-between text-sm font-bold">
                  <span>Score Total</span>
                  <span className={btcResult.score > 0 ? 'text-green-400' : btcResult.score < 0 ? 'text-red-400' : 'text-gray-400'}>
                    {btcResult.score > 0 ? '+' : ''}{btcResult.score.toFixed(0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Calculando indicadores...' : 'Sem dados de breakdown'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 3+4 - Posição Atual + Log */}
        <Card className="lg:col-span-1 bg-card border-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-400" />
              Log de Análises
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Posição AIM */}
            {btcResult?.aim?.currentSide !== undefined && (
              <div className={`mb-3 p-2.5 rounded-lg text-xs border ${btcResult.aim.currentSide ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-secondary/30 border-border/50 text-muted-foreground'}`}>
                {btcResult.aim.currentSide
                  ? `📌 Posição aberta: ${btcResult.aim.currentSide}`
                  : '⚪ Sem posição — bot vai abrir na próxima análise'}
              </div>
            )}

            {/* Signals log */}
            <div className="space-y-1.5">
              {signals.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sem sinais registrados</p>
              ) : (
                signals.map(sig => (
                  <div key={sig.id} className="flex items-start justify-between py-1.5 border-b border-border/20 last:border-0 gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={`text-[9px] px-1 py-0 h-4 border ${getSignalBadge(sig.signal_type)}`}>
                          {sig.signal_type}
                        </Badge>
                        <span className="text-[10px] font-semibold">{sig.symbol}</span>
                        <span className="text-[9px] text-muted-foreground truncate">{sig.strategy}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ${Number(sig.price).toLocaleString('en-US', { minimumFractionDigits: 2 })} · Score: {sig.score > 0 ? '+' : ''}{sig.score}
                      </p>
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5">
                      {format(new Date(sig.created_at), 'HH:mm')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
