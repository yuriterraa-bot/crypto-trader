'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, RefreshCw, Activity, Clock, Zap, Target, BarChart3, AlertTriangle } from 'lucide-react';
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

interface BreakdownItem {
  indicator: string;
  contribution: number;
  signal: string;
}

interface BotResult {
  symbol: string;
  score: number;
  techSignal: string;
  finalRecommendation: string;
  action: string;
  breakdown: BreakdownItem[];
  aim?: AIMResult;
}

interface SignalLog {
  id: string;
  symbol: string;
  strategy: string;
  signal_type: string;
  price: number;
  score: number;
  created_at: string;
  breakdown?: BreakdownItem[];
}

interface BotConfig {
  is_running: boolean;
  is_paper_trade: boolean;
  always_in_market: boolean;
  leverage: number;
}

export default function BotAnalysisPanel() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveResult, setLiveResult] = useState<BotResult | null>(null);
  const [signals, setSignals] = useState<SignalLog[]>([]);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/config', { cache: 'no-store' });
      const data = await res.json();
      setBotConfig(data);
    } catch (e) { /* ignore */ }
  }, []);

  const fetchSignals = useCallback(async () => {
    const { data } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setSignals(data);
  }, []);

  const fetchLiveAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bot/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'BTCUSDT' }),
      });
      const data = await res.json();
      if (data.results?.[0]) {
        setLiveResult(data.results[0]);
      }
      setLastUpdated(new Date());
      setTimeLeft(60);
    } catch (e) {
      console.error('BotAnalysisPanel fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchConfig();
    fetchSignals();
    // NÃO dispara fetchLiveAnalysis automaticamente — apenas ao clicar ou via intervalo manual
    // para não sobrecarregar a API
    fetchSignals();

    // Polling de sinais a cada 15s (leve)
    const sigInterval = setInterval(fetchSignals, 15000);

    // Countdown
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Buscar análise ao vivo quando countdown zera
          fetchLiveAnalysis();
          fetchSignals();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(sigInterval);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchConfig, fetchSignals, fetchLiveAnalysis]);

  if (!mounted) return null;

  const isPaperTrade = botConfig?.is_paper_trade ?? true;
  const isAIMActive = botConfig?.always_in_market ?? false;
  const isRunning = botConfig?.is_running ?? false;

  const getSignalBadge = (sig: string) => {
    if (sig === 'BUY' || sig === 'LONG') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (sig === 'SELL' || sig === 'SHORT') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getActionLabel = (action?: string) => {
    if (action === 'open') return { label: '🟢 ABRIR', cls: 'bg-green-500/20 text-green-400' };
    if (action === 'reverse') return { label: '🔄 REVERTER', cls: 'bg-orange-500/20 text-orange-400' };
    return { label: '🔵 MANTER', cls: 'bg-blue-500/20 text-blue-400' };
  };

  const aim = liveResult?.aim;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <Activity className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black uppercase tracking-wider">Análise do Bot</h2>
              {isPaperTrade && (
                <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 uppercase font-bold">
                  Simulação
                </Badge>
              )}
              {isAIMActive && (
                <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase font-bold">
                  Always-In
                </Badge>
              )}
              {!isAIMActive && (
                <Badge className="text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/30 uppercase">
                  AIM Inativo
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastUpdated
                ? `Atualizado ${formatDistanceToNowStrict(lastUpdated, { locale: ptBR, addSuffix: true })}`
                : 'Clique em Atualizar para analisar'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full border border-border/50">
            <Clock className="h-3 w-3" />
            <span>Auto em {timeLeft}s</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => { fetchLiveAnalysis(); fetchSignals(); }} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Analisar Agora
          </Button>
        </div>
      </div>

      {/* Alert se AIM inativo */}
      {!isAIMActive && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Always-In Market está desativado.</strong> Vá em{' '}
            <strong>Painel de Estratégias</strong>, ative o toggle e clique{' '}
            <strong>Salvar Configuração</strong>.
          </span>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* SEÇÃO 1 — Análise AIM ao vivo */}
        <Card className="lg:col-span-1 bg-card border-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Direção Always-In — BTC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-6 text-center">
                <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto animate-spin" />
                <p className="text-xs text-muted-foreground mt-2">Analisando...</p>
              </div>
            ) : aim ? (
              <>
                {/* Direção */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center gap-2">
                    {aim.direction === 'LONG'
                      ? <TrendingUp className="h-8 w-8 text-green-400" />
                      : <TrendingDown className="h-8 w-8 text-red-400" />}
                    <div>
                      <p className={`text-2xl font-black ${aim.direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
                        {aim.direction}
                      </p>
                      <p className="text-xs text-muted-foreground">Sinal AIM</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{aim.score > 0 ? '+' : ''}{aim.score}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </div>

                {/* Confiança */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Confiança</span>
                    <span className="font-bold">{aim.confidence}%</span>
                  </div>
                  <div className="w-full bg-secondary/50 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${aim.direction === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${aim.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Ação */}
                {aim.action && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ação executada</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${getActionLabel(aim.action).cls}`}>
                      {getActionLabel(aim.action).label}
                    </span>
                  </div>
                )}

                {/* Razões */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fatores</p>
                  {aim.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-foreground/80 py-0.5">{r}</p>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-6 text-center space-y-2">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {isAIMActive
                    ? 'Clique em "Analisar Agora" para ver a direção'
                    : 'Ative o Always-In Market para ver análise'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 2 — Breakdown Indicadores */}
        <Card className="lg:col-span-1 bg-card border-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              Breakdown — Confluência
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveResult?.breakdown && liveResult.breakdown.length > 0 ? (
              <div className="space-y-2">
                {liveResult.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-xs font-medium truncate flex-1 mr-2">{item.indicator}</span>
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
                <div className="pt-2 flex justify-between text-sm font-bold border-t border-border/30">
                  <span>Score Confluência</span>
                  <span className={liveResult.score > 0 ? 'text-green-400' : liveResult.score < 0 ? 'text-red-400' : 'text-gray-400'}>
                    {liveResult.score > 0 ? '+' : ''}{liveResult.score.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Recomendação final</span>
                  <Badge className={`text-[10px] border ${getSignalBadge(liveResult.finalRecommendation)}`}>
                    {liveResult.finalRecommendation}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Calculando indicadores...' : 'Clique em "Analisar Agora"'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 3+4 — Log de Sinais */}
        <Card className="lg:col-span-1 bg-card border-border shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-400" />
              Log de Sinais
              {isPaperTrade && (
                <Badge className="text-[9px] ml-auto bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 uppercase">
                  Simulação
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Posição atual AIM */}
            {aim?.currentSide !== undefined && (
              <div className={`mb-3 p-2.5 rounded-lg text-xs border ${
                aim.currentSide
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-secondary/30 border-border/50 text-muted-foreground'
              }`}>
                {aim.currentSide
                  ? `📌 Posição aberta: ${aim.currentSide} ${isPaperTrade ? '(PAPER)' : ''}`
                  : `⚪ Sem posição${isAIMActive ? ' — abrindo na próxima análise' : ''}`}
              </div>
            )}

            <div className="space-y-1.5">
              {signals.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    {isAIMActive
                      ? 'Nenhum sinal registrado ainda. Execute uma análise.'
                      : 'Ative o Always-In Market para registrar sinais.'}
                  </p>
                </div>
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
