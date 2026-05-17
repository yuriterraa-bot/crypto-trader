'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Loader2 } from 'lucide-react';
import axios from 'axios';

const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'];

export default function TimeframeSelector() {
  const [activeTf, setActiveTf] = useState('15m');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data: configRows, error } = await supabase.from('bot_config').select('timeframe').limit(1);
      if (!error && configRows && configRows.length > 0 && configRows[0].timeframe) {
        setActiveTf(configRows[0].timeframe);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (tf: string) => {
    if (tf === activeTf) return;
    try {
      setSaving(true);
      setActiveTf(tf);
      
      const { data: idRows } = await supabase.from('bot_config').select('id').limit(1);
      if (idRows && idRows.length > 0) {
        await supabase.from('bot_config').update({ timeframe: tf }).eq('id', idRows[0].id);
      } else {
        await supabase.from('bot_config').insert({ timeframe: tf, is_running: false, risk_per_trade: 1.0, max_positions: 5 });
      }

      // Trigger re-analysis immediately
      await axios.post('/api/bot/run');
      
    } catch (e) {
      console.error('Error updating timeframe', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border shadow-md overflow-hidden">
      <CardContent className="p-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Clock className="w-4 h-4 mr-2 text-indigo-500" />
            Timeframe Global
          </div>
          
          <div className="flex flex-wrap gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => handleSelect(tf)}
                disabled={loading || saving}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  activeTf === tf 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {tf}
              </button>
            ))}
            {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin text-indigo-500 self-center" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
