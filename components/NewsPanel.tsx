'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Flame, AlertCircle } from 'lucide-react';

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
        // app/api/news/route.ts wraps the return in { news, sentiment }
        if (res.data && res.data.news) {
          setData(res.data.news);
        } else {
          // Fallback if the endpoint was changed to return flat data
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

  const getFGCfg = (index: number) => {
    if (index <= 25) return { bg: 'bg-red-900', text: 'text-red-100', border: 'border-red-800' };
    if (index <= 45) return { bg: 'bg-orange-600', text: 'text-orange-100', border: 'border-orange-500' };
    if (index <= 55) return { bg: 'bg-yellow-600', text: 'text-yellow-100', border: 'border-yellow-500' };
    if (index <= 75) return { bg: 'bg-emerald-500', text: 'text-emerald-50', border: 'border-emerald-400' };
    return { bg: 'bg-green-700', text: 'text-green-50', border: 'border-green-600' };
  };

  const GaugeBar = ({ label, value }: { label: string; value: number }) => {
    const percentage = ((value + 1) / 2) * 100;
    let color = 'bg-gray-500';
    if (value > 0.1) color = 'bg-green-500';
    if (value < -0.1) color = 'bg-red-500';

    return (
      <div className="flex flex-col space-y-1 w-full">
        <div className="flex justify-between text-xs font-bold text-muted-foreground">
          <span>{label}</span>
          <span className={color.replace('bg-', 'text-')}>
            {value > 0 ? '+' : ''}{value.toFixed(2)}
          </span>
        </div>
        <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 w-[2px] bg-border z-10" />
          <div 
            className={`absolute top-0 bottom-0 ${color} transition-all duration-500 rounded-full`}
            style={{ 
              left: value < 0 ? `${percentage}%` : '50%',
              right: value > 0 ? `${100 - percentage}%` : '50%',
            }} 
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="col-span-1 md:col-span-1 lg:col-span-1 flex flex-col h-[400px]">
      <CardHeader className="pb-3 border-b bg-card/50">
        <CardTitle className="flex justify-between items-center text-lg">
          Market Pulse
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col bg-background/50">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-red-500/50 mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : !data && !loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
          </div>
        ) : data ? (
          <>
            <div className="p-4 space-y-4 border-b">
              {/* Fear & Greed */}
              <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${getFGCfg(data.fearGreedIndex).bg} ${getFGCfg(data.fearGreedIndex).text} ${getFGCfg(data.fearGreedIndex).border}`}>
                <div className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">Fear & Greed Index</div>
                <div className="text-3xl font-black">{data.fearGreedIndex}</div>
                <div className="text-sm font-semibold">{data.fearGreedLabel}</div>
              </div>

              {/* Trending & Sentiment */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  {data.trending?.btc && (
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                      <Flame className="w-3 h-3 mr-1" /> BTC em alta
                    </Badge>
                  )}
                  {data.trending?.eth && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                      <Flame className="w-3 h-3 mr-1" /> ETH em alta
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <GaugeBar label="BTC Score" value={data.finalSentiment?.btc || 0} />
                  <GaugeBar label="ETH Score" value={data.finalSentiment?.eth || 0} />
                </div>
              </div>
            </div>

            {/* Headlines */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {data.headlines?.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0">
                    <p className="text-[13px] font-medium leading-snug line-clamp-2">
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {item.source}
                      </span>
                      <Badge className={`text-[9px] h-4 px-1.5 border-0 ${
                        item.sentiment === 'positive' ? 'bg-green-500/20 text-green-500' :
                        item.sentiment === 'negative' ? 'bg-red-500/20 text-red-500' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.sentiment}
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
