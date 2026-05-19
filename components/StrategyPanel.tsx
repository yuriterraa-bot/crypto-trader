'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BotConfig, StrategyConfig } from '@/types';
import { Settings2, Save, BarChart3, TrendingUp, Layers, Compass, Zap, Target } from 'lucide-react';

const defaultConfig: StrategyConfig = {
  indicators: {
    ma: { active: true, weight: 5 },
    stochastic: { active: true, weight: 3 },
    fibonacci: { active: true, weight: 4 },
    didi: { active: true, weight: 4 },
    nadaraya: { active: true, weight: 6 },
    smc: { active: true, weight: 7 },
    mtf: { active: true, weight: 5 }
  },
  thresholds: { buy: 60, sell: 60 },
  risk: { per_trade: 1, rr_ratio: 2, atr_multiplier: 2 },
};

const indIcons: Record<string, React.ReactNode> = {
  ma: <TrendingUp className="h-5 w-5" />,
  stochastic: <Activity className="h-5 w-5" />,
  fibonacci: <Layers className="h-5 w-5" />,
  didi: <Compass className="h-5 w-5" />,
  nadaraya: <BarChart3 className="h-5 w-5" />,
  smc: <Zap className="h-5 w-5" />,
};

import { Activity } from 'lucide-react';

export default function StrategyPanel() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [strategy, setStrategy] = useState<StrategyConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alwaysInMarket, setAlwaysInMarket] = useState(false);
  const [leverage, setLeverage] = useState(3);
  const [stopLoss, setStopLoss] = useState(1.0);
  const [takeProfit, setTakeProfit] = useState(2.0);
  const [maxDuration, setMaxDuration] = useState(30);
  const [noTimeout, setNoTimeout] = useState(false); // desativar timeout
  const [savingScalping, setSavingScalping] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get('/api/bot/config');
        if (data.id) {
          setConfig(data);
          if (data.strategy_config) {
            setStrategy(data.strategy_config);
          }
          if (data.always_in_market !== undefined) setAlwaysInMarket(Boolean(data.always_in_market));
          if (data.leverage) setLeverage(Number(data.leverage));
          if (data.stop_loss_percent) setStopLoss(Number(data.stop_loss_percent));
          if (data.take_profit_percent) setTakeProfit(Number(data.take_profit_percent));
          const dur = Number(data.max_trade_duration_minutes);
          if (dur === 0) {
            setNoTimeout(true);
            setMaxDuration(30); // valor padrão quando desativado
          } else if (dur > 0) {
            setNoTimeout(false);
            setMaxDuration(dur);
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
      const payload = {
        strategy_config: {
          indicators: {
            ma: strategy.indicators.ma || { active: true, weight: 5 },
            stochastic: strategy.indicators.stochastic || { active: true, weight: 3 },
            fibonacci: strategy.indicators.fibonacci || { active: true, weight: 4 },
            didi: strategy.indicators.didi || { active: true, weight: 4 },
            nadaraya: strategy.indicators.nadaraya || { active: true, weight: 6 },
            smc: strategy.indicators.smc || { active: true, weight: 7 },
            mtf: strategy.indicators.mtf || { active: true, weight: 5 }
          },
          thresholds: { 
            buy: strategy.thresholds.buy, 
            sell: Math.abs(strategy.thresholds.sell) 
          },
          risk: { 
            per_trade: strategy.risk.per_trade, 
            rr_ratio: strategy.risk.rr_ratio, 
            atr_multiplier: 2 
          }
        },
        always_in_market: alwaysInMarket,
        leverage,
        stop_loss_percent: stopLoss,
        take_profit_percent: takeProfit,
        max_trade_duration_minutes: noTimeout ? 0 : maxDuration,
      };
      
      const { data } = await axios.post('/api/bot/config', payload);
      setConfig(data);
      alert('Configuração salva!');
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

  const updateThreshold = (field: 'buy' | 'sell', value: number) => {
    setStrategy(prev => ({ ...prev, thresholds: { ...prev.thresholds, [field]: value } }));
  };

  if (loading) {
    return <Card className="bg-card border-border"><CardContent className="p-6 text-muted-foreground">Carregando configurações...</CardContent></Card>;
  }

  return (
    <Card className="bg-card border-border shadow-md w-full">
      <CardHeader className="border-b border-border/50 bg-secondary/10">
        <div className="flex items-center space-x-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Painel de Estratégias & Confluência</CardTitle>
            <CardDescription>Ative indicadores e calibre os pesos para o algoritmo de decisão.</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-8">
        
        {/* Indicadores Grid */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center">
            <Layers className="h-4 w-4 mr-2" /> Pesos dos Indicadores
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.keys(strategy.indicators).map((indKey) => {
              const ind = strategy.indicators[indKey];
              const isActive = ind.active;
              return (
                <div key={indKey} className={`relative overflow-hidden flex flex-col p-4 border rounded-xl transition-all ${isActive ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-secondary/10 border-border opacity-70'}`}>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {indIcons[indKey] || <Target className="h-5 w-5" />}
                      </div>
                      <span className={`font-bold capitalize text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {indKey === 'ma' ? 'Médias Móveis' : indKey}
                      </span>
                    </div>
                    
                    <label className="flex items-center cursor-pointer">
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? 'bg-primary' : 'bg-muted'}`}>
                        <input type="checkbox" className="sr-only" checked={isActive} onChange={(e) => updateIndicator(indKey, 'active', e.target.checked)} />
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${isActive ? 'left-5' : 'left-0.5'}`}></div>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2 mt-auto">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">Impacto (Peso)</span>
                      <span className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{ind.weight}</span>
                    </div>
                    <input 
                      type="range" min="1" max="10" step="1" 
                      value={ind.weight} 
                      onChange={(e) => updateIndicator(indKey, 'weight', parseInt(e.target.value))}
                      disabled={!isActive}
                      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isActive ? 'bg-primary/30 accent-primary' : 'bg-muted accent-muted-foreground'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thresholds */}
        <div className="pt-6 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center">
            <Target className="h-4 w-4 mr-2" /> Thresholds de Entrada (Gatilho)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 bg-green-500/5 p-5 rounded-xl border border-green-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="h-24 w-24 text-green-500" />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <label className="text-sm font-bold text-foreground">Limiar de Compra (Score)</label>
                <span className="text-lg font-black text-green-500">+{strategy.thresholds.buy}</span>
              </div>
              <input 
                type="range" min="1" max="100" step="1" 
                value={strategy.thresholds.buy} 
                onChange={(e) => updateThreshold('buy', parseInt(e.target.value))}
                className="w-full h-2 bg-green-500/20 rounded-lg appearance-none cursor-pointer accent-green-500 relative z-10"
              />
              <p className="text-xs text-muted-foreground relative z-10">O bot só compra se a soma dos pesos atingir este valor positivo.</p>
            </div>

            <div className="space-y-4 bg-red-500/5 p-5 rounded-xl border border-red-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="h-24 w-24 text-red-500 transform scale-y-[-1]" />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <label className="text-sm font-bold text-foreground">Limiar de Venda (Score)</label>
                <span className="text-lg font-black text-red-500">-{strategy.thresholds.sell}</span>
              </div>
              <input 
                type="range" min="1" max="100" step="1" 
                value={strategy.thresholds.sell} 
                onChange={(e) => updateThreshold('sell', parseInt(e.target.value))}
                className="w-full h-2 bg-red-500/20 rounded-lg appearance-none cursor-pointer accent-red-500 relative z-10"
              />
              <p className="text-xs text-muted-foreground relative z-10">O bot só opera short se a soma atingir este valor negativo.</p>
            </div>
          </div>
        </div>

        {/* Filtro de Sessão de Mercado */}
        <div className="pt-6 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center">
            <Compass className="h-4 w-4 mr-2" /> Filtro de Sessão de Mercado
          </h3>
          <div className="bg-secondary/10 p-5 rounded-xl border border-border/50">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <p className="text-xs text-muted-foreground flex-1">
                Selecione em quais sessões do mercado o bot está autorizado a operar.
              </p>
              <div className="flex space-x-4">
                {['asia', 'london', 'ny'].map((session) => (
                  <label key={session} className="flex items-center space-x-2 cursor-pointer bg-background px-3 py-2 rounded-lg border border-border">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-primary focus:ring-primary"
                      checked={(config as any)?.session_filter?.[session] ?? true}
                      onChange={(e) => setConfig((prev: any) => ({
                        ...prev,
                        session_filter: {
                          ...(prev?.session_filter || { asia: true, london: true, ny: true }),
                          [session]: e.target.checked
                        }
                      }))}
                    />
                    <span className="text-sm font-bold uppercase">{session === 'ny' ? 'Nova York' : session}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

          {/* ── ALWAYS-IN MARKET ── */}
          <div className="space-y-4 border border-orange-500/30 rounded-xl p-4 bg-orange-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Zap className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Modo Always-In Market</span>
                    {alwaysInMarket && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase font-bold">
                        Sempre Operando
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Bot sempre terá uma posição aberta (LONG ou SHORT)</p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className={`w-11 h-6 rounded-full relative transition-colors ${alwaysInMarket ? 'bg-orange-500' : 'bg-muted'}`}>
                  <input type="checkbox" className="sr-only" checked={alwaysInMarket} onChange={e => setAlwaysInMarket(e.target.checked)} />
                  <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${alwaysInMarket ? 'left-5' : 'left-0.5'}`}></div>
                </div>
              </label>
            </div>

            )}
          </div>

        {/* ── CONFIGURAÇÕES DE SCALPING ── */}
        <div className="pt-6 border-t border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6 flex items-center">
            <Target className="h-4 w-4 mr-2 text-indigo-400" /> Configurações de Scalping
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Alavancagem */}
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">Alavancagem</label>
                <span className="text-lg font-black text-orange-400">{leverage}x</span>
              </div>
              <input
                type="range" min={1} max={20} step={1}
                value={leverage}
                onChange={e => setLeverage(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-orange-500/20 accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1x</span><span>20x</span>
              </div>
              <p className="text-xs text-muted-foreground">Alavancagem aplicada ao abrir posições</p>
            </div>

            {/* Stop Loss */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">Stop Loss %</label>
                <span className="text-lg font-black text-red-400">{stopLoss.toFixed(1)}%</span>
              </div>
              <input
                type="range" min={0.1} max={5.0} step={0.1}
                value={stopLoss}
                onChange={e => setStopLoss(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-red-500/20 accent-red-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.1% (apertado)</span><span>5.0% (largo)</span>
              </div>
              <p className="text-xs text-muted-foreground">Fechar se PnL atingir -{stopLoss.toFixed(1)}%</p>
            </div>

            {/* Take Profit */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">Take Profit %</label>
                <span className="text-lg font-black text-green-400">{takeProfit.toFixed(1)}%</span>
              </div>
              <input
                type="range" min={0.1} max={10.0} step={0.1}
                value={takeProfit}
                onChange={e => setTakeProfit(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-green-500/20 accent-green-500"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.1%</span><span>10.0%</span>
              </div>
              <p className="text-xs text-muted-foreground">Fechar ao lucrar +{takeProfit.toFixed(1)}% · RR: 1:{(takeProfit / stopLoss).toFixed(1)}</p>
            </div>

            {/* Max Duration */}
            <div className={`rounded-xl p-5 space-y-3 border ${
              noTimeout
                ? 'bg-purple-500/5 border-purple-500/30'
                : 'bg-indigo-500/5 border-indigo-500/20'
            }`}>
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-foreground">Tempo máximo</label>
                <div className="flex items-center gap-2">
                  {noTimeout
                    ? <span className="text-lg font-black text-purple-400">∞</span>
                    : <span className="text-lg font-black text-indigo-400">{maxDuration}min</span>
                  }
                </div>
              </div>

              {/* Toggle sem limite */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">Sem limite de tempo</span>
                <label className="flex items-center cursor-pointer">
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${
                    noTimeout ? 'bg-purple-500' : 'bg-muted'
                  }`}>
                    <input type="checkbox" className="sr-only" checked={noTimeout}
                      onChange={e => setNoTimeout(e.target.checked)} />
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                      noTimeout ? 'left-4' : 'left-0.5'
                    }`} />
                  </div>
                </label>
              </div>

              {!noTimeout && (
                <>
                  <input
                    type="range" min={5} max={120} step={5}
                    value={maxDuration}
                    onChange={e => setMaxDuration(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-indigo-500/20 accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>5 min</span><span>120 min</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Fechar após {maxDuration} min independente de SL/TP</p>
                </>
              )}
              {noTimeout && (
                <p className="text-xs text-purple-300">Posição fechada apenas por SL ou TP</p>
              )}
            </div>
          </div>
        </div>

      </CardContent>
      <CardFooter className="flex justify-end border-t border-border/50 p-4 bg-secondary/10">
        <Button onClick={saveConfig} disabled={saving} className="bg-primary hover:bg-primary/90 text-white font-bold">
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Configuração'}
        </Button>
      </CardFooter>
    </Card>
  );
}
