'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Flame, AlertCircle, Activity, Gauge } from 'lucide-react';

interface NewsData {
  fearGreedIndex: number;
  fearGreedLabel: string;
  fearGreedSentiment: number;
  trending: { btc: boolean; eth: boolean };
  headlines: { title: string; source: string; sentiment: 'positive' | 'negative' | 'neutral' }[];
  finalSentiment: { btc: number; eth: number };
}

export default function NewsPanel() {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setError(null);
        const res = await axios.get('/api/news');
        if (res.data && res.data.news) {
          setData(res.data.news);
        } else {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
        setError('Não foi possível carregar os dados de mercado.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 5 * 60 * 1000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const translateFGLable = (label: string) => {
    if (label.toLowerCase().includes('extreme fear')) return 'Medo Extremo';
    if (label.toLowerCase().includes('fear')) return 'Medo';
    if (label.toLowerCase().includes('neutral')) return 'Neutro';
    if (label.toLowerCase().includes('extreme greed')) return 'Ganância Extrema';
    if (label.toLowerCase().includes('greed')) return 'Ganância';
    return label;
  };

  const getFGCfg = (index: number) => {
    if (index <= 25) return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' };
    if (index <= 45) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]' };
    if (index <= 55) return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.2)]' };
    if (index <= 75) return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.2)]' };
    return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' };
  };

  const GaugeBar = ({ label, value }: { label: string; value: number }) => {
    const percentage = ((value + 1) / 2) * 100;
    let color = 'bg-muted-foreground';
    if (value > 0.1) color = 'bg-green-500';
    if (value < -0.1) color = 'bg-red-500';

    return (
      <div className="flex flex-col space-y-1 w-full bg-secondary/10 p-3 rounded-lg border border-border">
        <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
          <span>{label}</span>
          <span className={color.replace('bg-', 'text-')}>
            {value > 0 ? '+' : ''}{value.toFixed(2)}
          </span>
        </div>
        <div className="relative h-2.5 w-full bg-secondary rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 w-[2px] bg-border z-10" />
          <div 
            className={`absolute top-0 bottom-0 ${color} transition-all duration-1000 rounded-full`}
            style={{ 
              left: value < 0 ? `${percentage}%` : '50%',
              right: value > 0 ? `${100 - percentage}%` : '50%',
            }} 
          />
        </div>
      </div>
    );
  };

  const sentimentMap: Record<string, { label: string, color: string }> = {
    positive: { label: 'Positivo', color: 'bg-green-500/20 text-green-500' },
    negative: { label: 'Negativo', color: 'bg-red-500/20 text-red-500' },
    neutral: { label: 'Neutro', color: 'bg-secondary text-muted-foreground' }
  };

  return (
    <Card className="bg-card border-border shadow-md w-full h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-primary" />
          <div className="flex-1 flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Pulso do Mercado</CardTitle>
              <CardDescription className="text-xs">Métricas globais e sentimento</CardDescription>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-destructive/50 mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : !data && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <Gauge className="h-10 w-10 text-muted mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">Nenhum dado de mercado disponível.</p>
          </div>
        ) : data ? (
          <>
            <div className="p-6 space-y-6 border-b border-border/50">
              {/* Fear & Greed com design aprimorado */}
              <div className={`relative overflow-hidden p-6 rounded-2xl border flex flex-col items-center justify-center ${getFGCfg(data.fearGreedIndex).bg} ${getFGCfg(data.fearGreedIndex).border} ${getFGCfg(data.fearGreedIndex).glow}`}>
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Gauge className="h-24 w-24" />
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">Índice Fear & Greed</div>
                <div className={`text-5xl font-black mb-1 relative z-10 ${getFGCfg(data.fearGreedIndex).text}`}>{data.fearGreedIndex}</div>
                <div className={`text-sm font-bold uppercase tracking-wider relative z-10 ${getFGCfg(data.fearGreedIndex).text}`}>
                  {translateFGLable(data.fearGreedLabel)}
                </div>
              </div>

              {/* Trending & Sentiment */}
              <div className="space-y-4">
                {(data.trending?.btc || data.trending?.eth) && (
                  <div className="flex gap-2 justify-center">
                    {data.trending?.btc && (
                      <Badge className="bg-[#F7931A]/10 text-[#F7931A] hover:bg-[#F7931A]/20 border border-[#F7931A]/30 text-xs py-1">
                        <Flame className="w-3.5 h-3.5 mr-1.5" /> BTC em alta
                      </Badge>
                    )}
                    {data.trending?.eth && (
                      <Badge className="bg-[#627EEA]/10 text-[#627EEA] hover:bg-[#627EEA]/20 border border-[#627EEA]/30 text-xs py-1">
                        <Flame className="w-3.5 h-3.5 mr-1.5" /> ETH em alta
                      </Badge>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <GaugeBar label="Score Social BTC" value={data.finalSentiment?.btc || 0} />
                  <GaugeBar label="Score Social ETH" value={data.finalSentiment?.eth || 0} />
                </div>
              </div>
            </div>

            {/* Headlines */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Últimas Notícias</div>
                {data.headlines?.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 p-3 mx-2 rounded-lg hover:bg-secondary/20 transition-colors border border-transparent hover:border-border/50">
                    <p className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground/90">
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-1.5"></div>
                        {item.source}
                      </span>
                      <Badge className={`text-[9px] h-4 px-2 uppercase tracking-wider font-bold border-0 ${sentimentMap[item.sentiment]?.color || sentimentMap['neutral'].color}`}>
                        {sentimentMap[item.sentiment]?.label || 'Neutro'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
