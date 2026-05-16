'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BotConfig, StrategyConfig } from '@/types';

const defaultConfig: StrategyConfig = {
  indicators: {
    ma: { active: true, weight: 1 },
    stochastic: { active: true, weight: 1 },
    fibonacci: { active: true, weight: 2 },
    didi: { active: true, weight: 3 },
    nadaraya: { active: true, weight: 3 },
    smc: { active: true, weight: 4 },
  },
  thresholds: { buy: 60, sell: 60 },
  risk: { per_trade: 1, rr_ratio: 2, atr_multiplier: 1.5 },
};

export default function StrategyPanel() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [strategy, setStrategy] = useState<StrategyConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get('/api/bot/config');
        if (data.id) {
          setConfig(data);
          if (data.strategy_config) {
            setStrategy(data.strategy_config);
          }
        }
      } catch (error) {
        console.error('Failed to fetch bot config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const payload: BotConfig = {
        ...(config || { is_running: false, max_positions: 5 }),
        is_paper_trade: config?.is_paper_trade ?? true,
        risk_per_trade: strategy.risk.per_trade,
        strategy_config: strategy
      };
      
      const { data } = await axios.post('/api/bot/config', payload);
      setConfig(data);
      alert('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Erro ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  };

  const updateIndicator = (key: string, field: 'active' | 'weight', value: boolean | number) => {
    setStrategy(prev => ({
      ...prev,
      indicators: {
        ...prev.indicators,
        [key]: {
          ...prev.indicators[key],
          [field]: value
        }
      }
    }));
  };

  const updateRisk = (field: keyof StrategyConfig['risk'], value: number) => {
    setStrategy(prev => ({ ...prev, risk: { ...prev.risk, [field]: value } }));
  };

  const updateThreshold = (field: 'buy' | 'sell', value: number) => {
    setStrategy(prev => ({ ...prev, thresholds: { ...prev.thresholds, [field]: value } }));
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading settings...</CardContent></Card>;
  }

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Strategy & Risk Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Indicators Weights & Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(strategy.indicators).map((indKey) => {
              const ind = strategy.indicators[indKey];
              return (
                <div key={indKey} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={ind.active} 
                      onCheckedChange={(v) => updateIndicator(indKey, 'active', v)}
                    />
                    <Label className="capitalize font-semibold">{indKey}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-xs text-muted-foreground">Weight: {ind.weight}</Label>
                    <input 
                      type="range" min="1" max="10" step="1" 
                      value={ind.weight} 
                      onChange={(e) => updateIndicator(indKey, 'weight', parseInt(e.target.value))}
                      className="w-24"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Confluence Thresholds</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Buy Threshold (Score)</Label>
                <span className="text-sm font-bold text-green-500">+{strategy.thresholds.buy}</span>
              </div>
              <input 
                type="range" min="1" max="100" step="1" 
                value={strategy.thresholds.buy} 
                onChange={(e) => updateThreshold('buy', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Sell Threshold (Score)</Label>
                <span className="text-sm font-bold text-red-500">-{strategy.thresholds.sell}</span>
              </div>
              <input 
                type="range" min="1" max="100" step="1" 
                value={strategy.thresholds.sell} 
                onChange={(e) => updateThreshold('sell', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Risk Management</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Risk per Trade (%)</Label>
                <span className="text-sm">{strategy.risk.per_trade}%</span>
              </div>
              <input 
                type="range" min="0.5" max="5" step="0.5" 
                value={strategy.risk.per_trade} 
                onChange={(e) => updateRisk('per_trade', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Risk/Reward Ratio (1:X)</Label>
                <span className="text-sm">1:{strategy.risk.rr_ratio}</span>
              </div>
              <input 
                type="range" min="1" max="5" step="0.5" 
                value={strategy.risk.rr_ratio} 
                onChange={(e) => updateRisk('rr_ratio', parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch 
                checked={config?.is_paper_trade ?? true} 
                onCheckedChange={(v) => setConfig(prev => ({ ...prev!, is_paper_trade: v }))}
              />
              <Label className="font-semibold text-primary">Paper Trading Mode (Simulação)</Label>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end border-t p-4">
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardFooter>
    </Card>
  );
}
