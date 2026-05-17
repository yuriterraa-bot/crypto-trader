'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BrainCircuit, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

export default function AiSignalCard() {
  const [loading, setLoading] = useState(false);
  const [signals, setSignals] = useState<Record<string, any>>({});
  const [mounted, setMounted] = useState(false);
  
  const fetchLatestSignals = async () => {
    try {
      const { data } = await supabase
        .from('ai_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (data && data.length > 0) {
        const grouped: any = {};
        data.forEach(item => {
          if (!grouped[item.symbol]) {
            grouped[item.symbol] = item;
          }
        });
        setSignals(grouped);
      }
    } catch (e) {
      console.error('Failed to fetch AI signals', e);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchLatestSignals();
    const interval = setInterval(fetchLatestSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerAnalysis = async () => {
    setLoading(true);
    try {
      await axios.post('/api/bot/run'); 
      await fetchLatestSignals();
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecColor = (rec: string) => {
    switch (rec) {
      case 'STRONG_BUY': return 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]';
      case 'BUY': return 'bg-green-500/20 text-green-500 border border-green-500/50';
      case 'NEUTRAL': return 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50';
      case 'SELL': return 'bg-red-500/20 text-red-500 border border-red-500/50';
      case 'STRONG_SELL': return 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]';
      default: return 'bg-secondary/50 text-muted-foreground border border-border';
    }
  };

  const getRecLabel = (rec: string) => {
    switch (rec) {
      case 'STRONG_BUY': return 'COMPRA FORTE';
      case 'BUY': return 'COMPRAR';
      case 'NEUTRAL': return 'NEUTRO';
      case 'SELL': return 'VENDER';
      case 'STRONG_SELL': return 'VENDA FORTE';
      default: return rec;
    }
  };

  if (!mounted) return null;

  return (
    <Card className="bg-card border-border shadow-md col-span-full xl:col-span-1 flex flex-col h-full">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/10 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-lg">Inteligência Artificial LLaMA 3</CardTitle>
            <CardDescription className="text-xs">Análise técnica avançada por ativo</CardDescription>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={triggerAnalysis} disabled={loading} className="bg-background hover:bg-secondary border-border h-8">
          {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
          {loading ? 'Analisando...' : 'Atualizar'}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {['BTCUSDT', 'ETHUSDT'].map(symbol => {
          const signal = signals[symbol];
          const isBtc = symbol === 'BTCUSDT';
          
          if (!signal) {
            return (
              <div key={symbol} className="border border-border/50 rounded-xl p-8 flex flex-col items-center justify-center bg-secondary/5 text-center">
                <BrainCircuit className="h-10 w-10 text-muted mb-3 opacity-20" />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{isBtc ? 'Bitcoin' : 'Ethereum'}</p>
                <p className="text-xs text-muted-foreground mt-2">Clique em Atualizar para gerar análise...</p>
              </div>
            );
          }

          return (
            <div key={symbol} className="border border-border rounded-xl p-5 bg-secondary/10 flex flex-col gap-4 relative overflow-hidden group hover:border-primary/50 transition-colors">
              {/* Background Glow */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none ${signal.recommendation.includes('BUY') ? 'bg-green-500' : signal.recommendation.includes('SELL') ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
              
              <div className="flex justify-between items-center pb-3 border-b border-border/50 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${isBtc ? 'bg-[#F7931A]' : 'bg-[#627EEA]'}`}></div>
                  <div className="font-bold text-lg">{isBtc ? 'Bitcoin (BTC)' : 'Ethereum (ETH)'}</div>
                </div>
                <Badge className={`px-3 py-1 font-black text-[10px] tracking-wider uppercase border-0 ${getRecColor(signal.recommendation)}`}>
                  {getRecLabel(signal.recommendation)}
                </Badge>
              </div>
              
              <div className="space-y-1.5 relative z-10">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Confiança da IA</span>
                  <span className={signal.confidence >= 75 ? 'text-green-500' : signal.confidence >= 50 ? 'text-yellow-500' : 'text-red-500'}>{signal.confidence}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${signal.confidence >= 75 ? 'bg-green-500' : signal.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${signal.confidence}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-3 mt-2 relative z-10">
                <div className="bg-background/50 p-3 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Raciocínio
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {signal.reasoning}
                  </p>
                </div>
                
                {signal.risks && (
                  <div className="bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-destructive uppercase tracking-wider mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Riscos
                    </div>
                    <p className="text-xs text-destructive/90 leading-relaxed">
                      {signal.risks}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-auto pt-3 flex justify-between items-center text-[10px] text-muted-foreground font-medium relative z-10">
                <span>Algoritmo: LLaMA 3.3 Versatile</span>
                <span>Analisado há {formatDistanceToNow(new Date(signal.created_at), { locale: ptBR })}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
