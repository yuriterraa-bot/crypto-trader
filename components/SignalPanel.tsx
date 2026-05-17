'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, Activity, BrainCircuit, Newspaper, Zap, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export default function SignalPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/signal');
      if (res.data && res.data.success) {
        setData(res.data.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erro ao buscar sinais:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 5 * 60 * 1000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRunning(true);
    try {
      await axios.post('/api/bot/run');
      await fetchSignals();
    } catch (error) {
      console.error('Erro ao forçar atualização:', error);
    } finally {
      setRunning(false);
    }
  };

  const getRecommendationStyle = (rec: string) => {
    if (rec === 'STRONG_BUY') return { bg: 'bg-green-700', text: 'text-white', icon: <><TrendingUp className="w-5 h-5" /><TrendingUp className="w-5 h-5 -ml-2" /></>, label: 'COMPRA FORTE', glow: 'shadow-[0_0_20px_rgba(21,128,61,0.5)]' };
    if (rec === 'BUY') return { bg: 'bg-green-500', text: 'text-white', icon: <TrendingUp className="w-5 h-5" />, label: 'COMPRA', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]' };
    if (rec === 'STRONG_SELL') return { bg: 'bg-red-800', text: 'text-white', icon: <><TrendingDown className="w-5 h-5" /><TrendingDown className="w-5 h-5 -ml-2" /></>, label: 'VENDA FORTE', glow: 'shadow-[0_0_20px_rgba(153,27,27,0.5)]' };
    if (rec === 'SELL') return { bg: 'bg-red-500', text: 'text-white', icon: <TrendingDown className="w-5 h-5" />, label: 'VENDA', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]' };
    return { bg: 'bg-gray-600', text: 'text-white', icon: <Minus className="w-5 h-5" />, label: 'NEUTRO', glow: '' };
  };

  const HorizontalBar = ({ value, min = -100, max = 100 }: { value: number, min?: number, max?: number }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const clamped = Math.max(0, Math.min(100, percentage));
    
    let color = 'bg-gray-500';
    if (value > 20) color = 'bg-green-500';
    if (value > 60) color = 'bg-green-600';
    if (value < -20) color = 'bg-red-500';
    if (value < -60) color = 'bg-red-600';

    return (
      <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden relative">
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-border z-10" />
        <div 
          className={`absolute top-0 bottom-0 ${color} transition-all duration-1000 rounded-full`}
          style={{ 
            left: value < 0 ? `${clamped}%` : '50%',
            right: value > 0 ? `${100 - clamped}%` : '50%',
          }} 
        />
      </div>
    );
  };

  const renderSymbolCard = (symbol: string) => {
    if (!data || !data[symbol]) return null;
    const info = data[symbol];
    const recStyle = getRecommendationStyle(info.combined.recommendation);

    return (
      <div className="flex flex-col bg-secondary/5 rounded-xl border border-border/50 p-5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${symbol === 'BTCUSDT' ? 'bg-[#F7931A]/20 text-[#F7931A]' : 'bg-[#627EEA]/20 text-[#627EEA]'}`}>
              {symbol === 'BTCUSDT' ? '₿' : 'Ξ'}
            </div>
            <h3 className="text-xl font-black">{symbol.replace('USDT', '/USDT')}</h3>
          </div>
          <div className={`flex items-center px-4 py-2 rounded-lg font-black tracking-wider ${recStyle.bg} ${recStyle.text} ${recStyle.glow}`}>
            <div className="flex mr-2">{recStyle.icon}</div>
            {recStyle.label}
          </div>
        </div>

        {/* Score Final */}
        <div className="bg-background/50 p-4 rounded-lg border border-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center">
              <Zap className="w-4 h-4 mr-2 text-primary" /> Score Combinado (Total)
            </span>
            <span className={`text-lg font-black ${info.combined.score > 0 ? 'text-green-500' : info.combined.score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {info.combined.score > 0 ? '+' : ''}{info.combined.score.toFixed(1)}
            </span>
          </div>
          <HorizontalBar value={info.combined.score} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2 font-mono">
            <span>-100 (VENDA)</span>
            <span>0</span>
            <span>+100 (COMPRA)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Análise Técnica */}
          <div className="bg-background/40 p-4 rounded-lg border border-border flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> TÉCNICO (60%)
              </span>
              <span className={`font-mono text-sm font-bold ${info.technical.score > 0 ? 'text-green-500' : info.technical.score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {info.technical.score > 0 ? '+' : ''}{info.technical.score.toFixed(1)}
              </span>
            </div>
            <div className="space-y-2 flex-1">
              {info.technical.breakdown?.map((b: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">{b.indicator}</span>
                  <div className="flex items-center">
                    <span className={`font-mono ${b.contribution > 0 ? 'text-green-500' : b.contribution < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {b.contribution > 0 ? '+' : ''}{b.contribution}
                    </span>
                    {b.contribution > 0 ? <TrendingUp className="w-3 h-3 text-green-500 ml-1" /> : b.contribution < 0 ? <TrendingDown className="w-3 h-3 text-red-500 ml-1" /> : <Minus className="w-3 h-3 text-gray-500 ml-1" />}
                  </div>
                </div>
              ))}
              {(!info.technical.breakdown || info.technical.breakdown.length === 0) && (
                <span className="text-xs text-muted-foreground">Sem dados.</span>
              )}
            </div>
          </div>

          {/* Análise IA */}
          <div className="bg-background/40 p-4 rounded-lg border border-border flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center">
                <BrainCircuit className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> IA Groq (20%)
              </span>
              <Badge variant="outline" className={`text-[10px] ${info.ai.recommendation.includes('BUY') ? 'text-green-500 border-green-500/30' : info.ai.recommendation.includes('SELL') ? 'text-red-500 border-red-500/30' : 'text-gray-400 border-gray-500/30'}`}>
                {info.ai.recommendation}
              </Badge>
            </div>
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-muted-foreground font-medium">Confiança</span>
                <span className="font-mono text-purple-400">{info.ai.confidence}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                <div className="h-full bg-purple-500" style={{ width: `${info.ai.confidence}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed mt-2 italic border-l-2 border-purple-500/30 pl-2">
                "{info.ai.reasoning}"
              </p>
            </div>
          </div>

          {/* Notícias */}
          <div className="bg-background/40 p-4 rounded-lg border border-border flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center">
                <Newspaper className="w-3.5 h-3.5 mr-1.5 text-orange-500" /> Mercado (20%)
              </span>
              <span className={`font-mono text-sm font-bold ${info.news.score > 0 ? 'text-green-500' : info.news.score < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {info.news.score > 0 ? '+' : ''}{info.news.score.toFixed(1)}
              </span>
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">Sentimento Notícias</span>
                </div>
                <HorizontalBar value={info.news.score} />
              </div>
              <div className="flex justify-between items-center bg-secondary/20 p-2 rounded border border-border/50">
                <span className="text-xs text-muted-foreground">Fear & Greed</span>
                <span className="text-sm font-bold">{info.news.fearGreedIndex}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="col-span-full bg-card border-border shadow-md">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">Sinais em Tempo Real</CardTitle>
              <CardDescription className="text-xs">Recomendação consolidada multicritério</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdate && (
              <div className="text-xs text-muted-foreground flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                Atualizado {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}
              </div>
            )}
            <Button 
              size="sm" 
              onClick={handleRefresh} 
              disabled={running || loading}
              className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 h-8"
            >
              {(running || loading) ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              {running ? 'Analisando...' : 'Atualizar Análise'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground animate-pulse">Calculando confluências de mercado...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderSymbolCard('BTCUSDT')}
            {renderSymbolCard('ETHUSDT')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
