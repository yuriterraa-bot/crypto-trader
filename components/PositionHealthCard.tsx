'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle, CheckCircle2, 
  HelpCircle, Shield, Target, Clock, Zap, Percent, Activity, Copy, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface PositionData {
  symbol: string;
  positionAmt: number;
  isLong: boolean;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  liquidationPrice: number;
  pnl: number;
  pnlPercent: number;
  positionValue: number;
  margin: number;
  hoursOpen: number;
}

interface TechnicalContext {
  score4h: number;
  score1d: number;
  rsi4h: number;
  rsi1d: number;
  trend4h: string;
  trend1d: string;
  smcSignal: string;
  patterns: string[];
  divergences: string[];
  nearestSupport: number;
  nearestResistance: number;
  fib618: number;
  fib382: number;
  fearGreed: number;
  fundingRate: string;
}

interface AiAnalysis {
  health: 'EXCELENTE' | 'BOM' | 'NEUTRO' | 'PREOCUPANTE' | 'CRÍTICO';
  action: 'MANTER' | 'PARCIAL' | 'MOVER_STOP' | 'FECHAR' | 'ADICIONAR';
  urgency: 'baixa' | 'média' | 'alta' | 'urgente';
  stopLoss: number;
  takeProfit: number;
  stopReasoning: string;
  tpReasoning: string;
  mainRisk: string;
  opportunity: string;
  analysis: string;
  checklist: string[];
}

interface PositionHealthCardProps {
  data: {
    position: PositionData;
    technicalContext: TechnicalContext;
    aiAnalysis: AiAnalysis;
    analyzedAt: string;
  };
  onRefresh?: () => void;
}

export default function PositionHealthCard({ data, onRefresh }: PositionHealthCardProps) {
  const { position, technicalContext, aiAnalysis, analyzedAt } = data;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<'stop' | 'tp' | null>(null);

  const safeToFixed = (val: any, decimals = 2) => {
    if (val == null || isNaN(val)) return '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
    const num = Number(val);
    if (isNaN(num)) return '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
    return num.toFixed(decimals);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  // Cores de Saúde
  const healthColors = {
    EXCELENTE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
    BOM: 'bg-green-500/20 text-green-400 border-green-500/30',
    NEUTRO: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    PREOCUPANTE: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse',
    CRÍTICO: 'bg-rose-500/25 text-rose-400 border-rose-500/30 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)] border shadow-rose-500/20',
  };

  // Cores de Ação
  const actionColors = {
    MANTER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PARCIAL: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    MOVER_STOP: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    FECHAR: 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
    ADICIONAR: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  // Urgência Badges
  const urgencyColors = {
    baixa: 'bg-slate-500/10 text-slate-400 border-slate-500/10',
    média: 'bg-blue-500/10 text-blue-400 border-blue-500/10',
    alta: 'bg-orange-500/15 text-orange-400 border-orange-500/20 font-bold',
    urgente: 'bg-red-500/20 text-red-400 border-red-500/20 font-extrabold animate-bounce',
  };

  // Barra de Liquidação
  // Calcula porcentagem do preço atual em relação à entrada e liquidação
  // Para LONG: [Liquidação <-- Preço Atual <-- Entrada] ou [Liquidação <-- Entrada <-- Preço Atual]
  // Para SHORT: [Preço Atual --> Entrada --> Liquidação]
  const calculateLiquidationProximity = () => {
    const entry = position.entryPrice;
    const current = position.currentPrice;
    const liq = position.liquidationPrice;

    if (liq <= 0) return 100; // Sem risco de liquidação

    if (position.isLong) {
      if (current <= liq) return 0;
      const totalRange = entry - liq;
      const currentFromLiq = current - liq;
      const percent = (currentFromLiq / totalRange) * 100;
      return Math.min(100, Math.max(0, percent));
    } else {
      if (current >= liq) return 0;
      const totalRange = liq - entry;
      const currentFromLiq = liq - current;
      const percent = (currentFromLiq / totalRange) * 100;
      return Math.min(100, Math.max(0, percent));
    }
  };

  const liqPercentage = calculateLiquidationProximity();

  // Directional conflict alert (independent of AI)
  const isLong = position.isLong;
  const score1d = technicalContext.score1d;
  const score4h = technicalContext.score4h;
  let showDirectionalAlert = false;
  let directionalAlertMsg = '';
  if (isLong && score1d < -20) {
    showDirectionalAlert = true;
    directionalAlertMsg = `⚠️ ATENÇÃO: Posição LONG com tendência diária BEARISH (score 1D: ${score1d}). Considere fechar ou mover o stop loss para cima.`;
  } else if (!isLong && score1d > 20) {
    showDirectionalAlert = true;
    directionalAlertMsg = `⚠️ ATENÇÃO: Posição SHORT com tendência diária BULLISH (score 1D: +${score1d}). Considere fechar ou reposicionar o stop.`;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:border-white/20 hover:shadow-2xl">
      {/* Background Glow */}
      <div className={`absolute -right-24 -top-24 h-48 w-48 rounded-full filter blur-[80px] opacity-20 transition-all duration-500 ${
        position.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
      }`} />

      {/* Directional Conflict Alert */}
      {showDirectionalAlert && (
        <div className={`flex items-start gap-3 mb-4 px-4 py-3 rounded-xl border text-sm font-semibold ${
          isLong && score1d < -20
            ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{directionalAlertMsg}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4 mb-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl border ${position.isLong ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
            {position.isLong ? (
              <TrendingUp className="h-6 w-6 text-emerald-400 animate-pulse" />
            ) : (
              <TrendingDown className="h-6 w-6 text-rose-400 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">{position.symbol}</span>
              <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 border ${
                position.isLong 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {position.isLong ? 'LONG' : 'SHORT'} {position.leverage}x
              </Badge>
            </div>
            <div className="flex items-center text-xs text-slate-400 mt-1">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>Aberto há {position.hoursOpen}h</span>
              <span className="mx-2">•</span>
              <span className="text-[10px]">IA: {new Date(analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className={`text-2xl font-bold tracking-tight ${position.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {position.pnl >= 0 ? '+' : ''}${safeToFixed(position.pnl, 2)}
            </div>
            <div className={`text-xs font-semibold ${position.pnl >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
              {position.pnlPercent >= 0 ? '+' : ''}{safeToFixed(position.pnlPercent, 2)}%
            </div>
          </div>

          <Badge className={`text-xs uppercase font-extrabold px-3 py-1.5 border transition-all duration-300 ${healthColors[aiAnalysis.health]}`}>
            {aiAnalysis.health}
          </Badge>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-slate-400 hover:text-white rounded-full bg-white/5 border border-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SEÇÃO 1 - DADOS DA POSIÇÃO */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4 border-r border-white/5 pr-0 lg:pr-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <Activity className="h-3.5 w-3.5 mr-1 text-primary" /> Dados da Posição
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                <span className="text-slate-400 block mb-0.5">Preço Entrada</span>
                <span className="font-semibold text-white">${position.entryPrice.toLocaleString()}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                <span className="text-slate-400 block mb-0.5">Preço Atual</span>
                <span className="font-semibold text-white">${position.currentPrice.toLocaleString()}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                <span className="text-slate-400 block mb-0.5">Tamanho</span>
                <span className="font-semibold text-white">${safeToFixed(position.positionValue, 1)} USDT</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                <span className="text-slate-400 block mb-0.5">Margem</span>
                <span className="font-semibold text-white">${safeToFixed(position.margin, 1)} USDT</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-3 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Preço de Liquidação</span>
                <span className="font-bold text-rose-400">${position.liquidationPrice > 0 ? position.liquidationPrice.toLocaleString() : 'N/A'}</span>
              </div>
              
              {/* Barra de Liquidação */}
              {position.liquidationPrice > 0 && (
                <div className="space-y-1">
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden flex">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        liqPercentage > 50 
                          ? 'bg-emerald-500' 
                          : liqPercentage > 25 
                            ? 'bg-amber-500' 
                            : 'bg-rose-500 animate-pulse'
                      }`}
                      style={{ width: `${liqPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>LIQ</span>
                    <span className="font-semibold text-slate-400">{safeToFixed(liqPercentage, 0)}% de Distância</span>
                    <span>ENTRADA</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEÇÃO 2 - RECOMENDAÇÃO DA IA */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 px-0 lg:px-2">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                <Zap className="h-3.5 w-3.5 mr-1 text-amber-400" /> Recomendação do Risco (IA)
              </h3>
              <Badge className={`text-[10px] uppercase font-extrabold ${urgencyColors[aiAnalysis.urgency]}`}>
                Urgência {aiAnalysis.urgency}
              </Badge>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Ação Recomendada:</span>
                <Badge className={`text-xs uppercase font-extrabold border ${actionColors[aiAnalysis.action]}`}>
                  {aiAnalysis.action === 'PARCIAL' ? '💲 PARCIAL (50%)' : aiAnalysis.action}
                </Badge>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic bg-black/20 p-2.5 rounded-lg border border-white/5">
                "{aiAnalysis.analysis}"
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px]">
                <div className="p-2 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                  <span className="text-rose-400 font-semibold block mb-0.5">Principal Risco</span>
                  <span className="text-slate-300">{aiAnalysis.mainRisk}</span>
                </div>
                <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                  <span className="text-emerald-400 font-semibold block mb-0.5">Melhor Cenário</span>
                  <span className="text-slate-300">{aiAnalysis.opportunity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4 & 5 - CHECKLIST & SCORES */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-4 border-l border-white/5 pl-0 lg:pl-6">
          <div className="space-y-4">
            
            {/* SCORES POR TIMEFRAME */}
            <div className="space-y-2 bg-white/5 rounded-xl p-3 border border-white/5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confluências</h4>
              
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between items-center mb-1 text-slate-300">
                    <span>TF 4 Horas</span>
                    <span className={`font-bold ${
                      technicalContext.score4h >= 30 
                        ? 'text-emerald-400' 
                        : technicalContext.score4h <= -30 
                          ? 'text-rose-400' 
                          : 'text-slate-400'
                    }`}>
                      {technicalContext.score4h > 0 ? '+' : ''}{technicalContext.score4h} ({technicalContext.trend4h})
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1">
                    <div 
                      className={`h-full rounded-full ${technicalContext.score4h >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.abs(technicalContext.score4h)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 text-slate-300">
                    <span>TF Diário (1D)</span>
                    <span className={`font-bold ${
                      technicalContext.score1d >= 30 
                        ? 'text-emerald-400' 
                        : technicalContext.score1d <= -30 
                          ? 'text-rose-400' 
                          : 'text-slate-400'
                    }`}>
                      {technicalContext.score1d > 0 ? '+' : ''}{technicalContext.score1d} ({technicalContext.trend1d})
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1">
                    <div 
                      className={`h-full rounded-full ${technicalContext.score1d >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.abs(technicalContext.score1d)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CHECKLIST */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pontos Importantes</h4>
              <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                {aiAnalysis.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-[11px] text-slate-300">
                    {idx % 2 === 0 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                    )}
                    <span className="leading-tight">{item}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* SEÇÃO 3 - STOP/TP RECOMENDADOS & BOTÕES DE AÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-t border-white/5 mt-5 pt-4 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* STOP LOSS */}
          <div className="relative">
            <div 
              className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 flex items-center space-x-3 cursor-pointer hover:bg-rose-500/15 transition-all duration-200"
              onMouseEnter={() => setActiveTooltip('stop')}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <Shield className="h-5 w-5 text-rose-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stop Loss Sugerido</span>
                <span className="text-sm font-bold text-rose-400">${aiAnalysis.stopLoss.toLocaleString()}</span>
              </div>
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
            </div>

            {activeTooltip === 'stop' && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-950 border border-rose-500/20 text-white rounded-xl p-3 text-xs shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="font-bold text-rose-400 mb-1">Raciocínio do Stop Loss:</div>
                <div className="text-slate-300 text-[11px] leading-relaxed">{aiAnalysis.stopReasoning}</div>
              </div>
            )}
          </div>

          {/* TAKE PROFIT */}
          <div className="relative">
            <div 
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center space-x-3 cursor-pointer hover:bg-emerald-500/15 transition-all duration-200"
              onMouseEnter={() => setActiveTooltip('tp')}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <Target className="h-5 w-5 text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Take Profit Sugerido</span>
                <span className="text-sm font-bold text-emerald-400">${aiAnalysis.takeProfit.toLocaleString()}</span>
              </div>
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
            </div>

            {activeTooltip === 'tp' && (
              <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-950 border border-emerald-500/20 text-white rounded-xl p-3 text-xs shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="font-bold text-emerald-400 mb-1">Raciocínio do Take Profit:</div>
                <div className="text-slate-300 text-[11px] leading-relaxed">{aiAnalysis.tpReasoning}</div>
              </div>
            )}
          </div>
        </div>

        {/* BOTÕES DE AÇÃO - APENAS LEITURA / ANÁLISE */}
        <div className="flex items-center space-x-3 self-end sm:self-center">
          <Button 
            size="sm" 
            variant="outline"
            className="text-xs bg-slate-900 border-white/10 hover:bg-slate-800 text-white font-medium rounded-lg h-9 px-4 transition-all flex items-center gap-1.5"
            onClick={() => {
              const text = `📊 *ANÁLISE DE SAÚDE IA - CRYPTO ANALYST PRO* 📊\n--------------------------------------------------\n🪙 *Ativo*: ${position.symbol} (${position.isLong ? '🚀 LONG' : '📉 SHORT'} ${position.leverage}x)\n💵 *Preço de Entrada*: $${position.entryPrice.toLocaleString()}\n💲 *Preço Atual*: $${position.currentPrice.toLocaleString()}\n📈 *PnL Realizado*: $${safeToFixed(position.pnl, 2)} (${position.pnlPercent >= 0 ? '+' : ''}${safeToFixed(position.pnlPercent, 2)}%)\n🏥 *Saúde da Posição*: ${aiAnalysis.health}\n🚨 *Ação Recomendada*: ${aiAnalysis.action} (Urgência: ${aiAnalysis.urgency.toUpperCase()})\n\n--------------------------------------------------\n💡 *Raciocínio IA*:\n"${aiAnalysis.analysis}"\n\n🛡️ *Stop Loss Sugerido*: $${aiAnalysis.stopLoss.toLocaleString()}\n🎯 *Take Profit Sugerido*: $${aiAnalysis.takeProfit.toLocaleString()}\n\n⚠️ *Principal Risco*: ${aiAnalysis.mainRisk}\n🍀 *Melhor Cenário*: ${aiAnalysis.opportunity}\n--------------------------------------------------\n_Gerado automaticamente pelo painel analítico CryptoAnalyst Pro_`;
              navigator.clipboard.writeText(text);
              alert('📋 Análise copiada com sucesso para a área de transferência!');
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar Análise
          </Button>
          <a
            href={`https://www.binance.com/pt-BR/futures/${position.symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-xs bg-[#2962FF] hover:bg-[#1b4cc9] text-white font-semibold rounded-lg h-9 px-4 transition-all shadow-[0_4px_12px_rgba(41,98,255,0.3)] hover:shadow-[0_4px_16px_rgba(41,98,255,0.4)] gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver na Binance
          </a>
        </div>
      </div>
    </div>
  );
}
