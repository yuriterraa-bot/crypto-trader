'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, ShieldAlert, Percent, Target, Activity } from 'lucide-react';

export default function RiskManagerPanel() {
  const [riskPerTrade, setRiskPerTrade] = useState(1.0);
  const [maxPositions, setMaxPositions] = useState(3);
  const [stopLossAtr, setStopLossAtr] = useState(2.0);
  const [takeProfitRatio, setTakeProfitRatio] = useState(2.0);
  const [paperTrade, setPaperTrade] = useState(true);
  const [autoSl, setAutoSl] = useState(true);
  const [autoTp, setAutoTp] = useState(true);
  const [maxDrawdown, setMaxDrawdown] = useState(15);

  const saveRiskConfig = () => {
    // Here we would save to Supabase via API
    alert('Configurações de risco salvas com sucesso!');
  };

  return (
    <Card className="bg-card border-border shadow-md overflow-hidden relative">
      {/* Simulation Banner */}
      {paperTrade && (
        <div className="absolute top-0 left-0 w-full bg-amber-500/90 text-amber-950 text-[10px] font-bold tracking-widest uppercase text-center py-0.5 z-10 shadow-sm">
          ⚠️ SIMULAÇÃO ATIVA (Paper Trade) ⚠️
        </div>
      )}

      <CardHeader className={`${paperTrade ? 'pt-8' : 'pt-6'} pb-4 border-b border-border bg-secondary/20`}>
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-6 w-6 text-amber-500" />
          <div>
            <CardTitle className="text-xl">Gestão de Risco da Conta</CardTitle>
            <CardDescription>Configure limites de proteção para o seu capital</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
          
          {/* Coluna Esquerda: Parâmetros */}
          <div className="p-6 space-y-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Parâmetros Operacionais</h3>
            
            {/* Toggles em grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors">
                <span className="text-sm font-medium">Modo Simulação</span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${paperTrade ? 'bg-primary' : 'bg-muted'}`}>
                  <input type="checkbox" className="sr-only" checked={paperTrade} onChange={(e) => setPaperTrade(e.target.checked)} />
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${paperTrade ? 'left-5' : 'left-0.5'}`}></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors">
                <span className="text-sm font-medium">Stop Automático</span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${autoSl ? 'bg-primary' : 'bg-muted'}`}>
                  <input type="checkbox" className="sr-only" checked={autoSl} onChange={(e) => setAutoSl(e.target.checked)} />
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${autoSl ? 'left-5' : 'left-0.5'}`}></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors sm:col-span-2">
                <span className="text-sm font-medium">Take Profit Automático</span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${autoTp ? 'bg-primary' : 'bg-muted'}`}>
                  <input type="checkbox" className="sr-only" checked={autoTp} onChange={(e) => setAutoTp(e.target.checked)} />
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${autoTp ? 'left-5' : 'left-0.5'}`}></div>
                </div>
              </label>
            </div>

            {/* Sliders */}
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Risco por Operação</label>
                  <span className="text-sm font-bold text-primary">{riskPerTrade.toFixed(1)}%</span>
                </div>
                <input 
                  type="range" min="0.5" max="5" step="0.1" value={riskPerTrade} onChange={(e) => setRiskPerTrade(parseFloat(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-xs text-muted-foreground">% do saldo arriscado por trade</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Máximo de Posições Simultâneas</label>
                  <span className="text-sm font-bold text-primary">{maxPositions}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1" value={maxPositions} onChange={(e) => setMaxPositions(parseInt(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-xs text-muted-foreground">Quantas posições podem estar abertas ao mesmo tempo</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Stop Loss Automático (ATR)</label>
                  <span className="text-sm font-bold text-primary">{stopLossAtr.toFixed(1)}x</span>
                </div>
                <input 
                  type="range" min="1" max="5" step="0.5" value={stopLossAtr} onChange={(e) => setStopLossAtr(parseFloat(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
                  disabled={!autoSl}
                />
                <p className="text-xs text-muted-foreground">Multiplicador do ATR para definir o stop loss</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Take Profit (Relação Risco/Retorno)</label>
                  <span className="text-sm font-bold text-primary">1:{takeProfitRatio.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="1" max="5" step="0.5" value={takeProfitRatio} onChange={(e) => setTakeProfitRatio(parseFloat(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
                  disabled={!autoTp}
                />
                <p className="text-xs text-muted-foreground">Relação entre risco assumido e retorno esperado</p>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Métricas */}
          <div className="p-6 bg-secondary/5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Métricas da Conta</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-medium">Saldo em Risco Agora</span>
                  </div>
                  <span className="text-2xl font-bold">0.0%</span>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground mb-1">
                    <Percent className="h-4 w-4" />
                    <span className="text-xs font-medium">Win Rate</span>
                  </div>
                  <span className="text-2xl font-bold">--%</span>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-xs font-medium">P&L Hoje</span>
                  </div>
                  <span className="text-2xl font-bold text-green-500">+$0.00</span>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium">Perdas Seguidas</span>
                  </div>
                  <span className="text-2xl font-bold">0</span>
                </div>
              </div>

              <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-xl mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-destructive">Drawdown Máximo Permitido</label>
                  <span className="text-sm font-bold text-destructive">{maxDrawdown}%</span>
                </div>
                <input 
                  type="range" min="5" max="50" step="1" value={maxDrawdown} onChange={(e) => setMaxDrawdown(parseInt(e.target.value))}
                  className="w-full h-2 bg-destructive/20 rounded-lg appearance-none cursor-pointer accent-destructive"
                />
                <p className="text-xs text-destructive/80 mt-2">Se o rebaixamento da conta atingir este valor, o bot será desligado imediatamente por segurança.</p>
              </div>
            </div>

            <Button 
              onClick={saveRiskConfig}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-md shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all"
            >
              <Save className="mr-2 h-5 w-5" /> Salvar Configurações de Risco
            </Button>
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
}
