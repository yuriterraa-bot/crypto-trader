'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BrainCircuit, AlertTriangle, TrendingUp } from 'lucide-react';
import { AIAnalysisResult } from '@/lib/ai/aiAnalyst';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

export default function AiSignalCard() {
  const [loading, setLoading] = useState(false);
  const [signals, setSignals] = useState<Record<string, any>>({});
  
  const fetchLatestSignals = async () => {
    try {
      const { data } = await supabase
        .from('ai_analysis')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (data && data.length > 0) {
        // Group by symbol to get the latest for each
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
    fetchLatestSignals();
    const interval = setInterval(fetchLatestSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerAnalysis = async () => {
    setLoading(true);
    try {
      // In a real app, this button could trigger the bot run or a specific analysis route
      await axios.post('/api/bot/run'); // We trigger the whole bot cycle which includes AI
      await fetchLatestSignals();
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecColor = (rec: string) => {
    switch (rec) {
      case 'STRONG_BUY': return 'bg-green-600 text-white border-green-700';
      case 'BUY': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'NEUTRAL': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      case 'SELL': return 'bg-red-500/20 text-red-500 border-red-500/50';
      case 'STRONG_SELL': return 'bg-red-600 text-white border-red-700';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRecLabel = (rec: string) => {
    return rec.replace('_', ' ');
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col">
      <CardHeader className="pb-2 border-b flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Groq AI Market Analysis
        </CardTitle>
        <Button size="sm" variant="outline" onClick={triggerAnalysis} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {loading ? 'Analyzing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {['BTCUSDT', 'ETHUSDT'].map(symbol => {
          const signal = signals[symbol];
          
          if (!signal) {
            return (
              <div key={symbol} className="border rounded-lg p-4 flex items-center justify-center bg-secondary/20">
                <p className="text-sm text-muted-foreground">No recent analysis for {symbol}</p>
              </div>
            );
          }

          return (
            <div key={symbol} className="border rounded-lg p-4 bg-secondary/10 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="font-bold text-lg">{symbol}</div>
                <Badge variant="outline" className={`px-2 py-1 ${getRecColor(signal.recommendation)}`}>
                  {getRecLabel(signal.recommendation)}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Confidence</span>
                  <span>{signal.confidence}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${signal.confidence > 70 ? 'bg-green-500' : signal.confidence > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${signal.confidence}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary mb-1">
                    <TrendingUp className="h-3 w-3" /> Reasoning
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {signal.reasoning}
                  </p>
                </div>
                
                {signal.risks && (
                  <div className="pt-2">
                    <div className="flex items-center gap-1 text-xs font-semibold text-amber-500 mb-1">
                      <AlertTriangle className="h-3 w-3" /> Risks
                    </div>
                    <p className="text-xs text-muted-foreground/80 leading-snug">
                      {signal.risks}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-auto pt-2 text-[10px] text-right text-muted-foreground/50">
                Updated {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
