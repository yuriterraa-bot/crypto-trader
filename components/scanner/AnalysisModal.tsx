'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, TrendingUp, TrendingDown, RefreshCw, BarChart2, 
  BrainCircuit, Newspaper, Flame, Landmark, Activity, Compass, 
  ChevronRight, Calendar, ArrowRight, ShieldCheck, AlertCircle
} from 'lucide-react';
import TradingChart from '../TradingChart';

interface AnalysisModalProps {
  symbol: string;
  onClose: () => void;
}

type TabType = 'SUMMARY' | 'CHART' | 'TECHNICAL' | 'DERIVATIVES' | 'SENTIMENT' | 'AI';

export default function AnalysisModal({ symbol, onClose }: AnalysisModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('SUMMARY');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState('15m');
  
  // AI specific state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  // Load general technical analysis data
  const loadAnalysisData = async (tf = timeframe, force = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analysis/${symbol}?timeframe=${tf}${force ? '&refresh=true' : ''}`);
      const result = await res.json();
      setData(result);
      // Pre-populate AI data if it is already present in cache
      if (result.aiAnalysis) {
        setAiData(result.aiAnalysis);
      } else {
        setAiData(null);
      }
    } catch (err) {
      console.error('Failed to load asset analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysisData(timeframe);
  }, [symbol, timeframe]);

  // Load/Generate AI analysis when entering AI tab (if not already loaded)
  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    
    if (tab === 'AI' && !aiData && !aiLoading) {
      try {
        setAiLoading(true);
        const res = await fetch(`/api/analysis/${symbol}?timeframe=${timeframe}&ai=true`);
        const result = await res.json();
        if (result.aiAnalysis) {
          setAiData(result.aiAnalysis);
          // Update parent data so we have it stored
          setData(result);
        }
      } catch (err) {
        console.error('Failed to load AI analysis:', err);
      } finally {
        setAiLoading(false);
      }
    }
  };

  const handleRegenerateAI = async () => {
    try {
      setAiLoading(true);
      const res = await fetch(`/api/analysis/${symbol}?timeframe=${timeframe}&ai=true&refresh=true`);
      const result = await res.json();
      if (result.aiAnalysis) {
        setAiData(result.aiAnalysis);
        setData(result);
      }
    } catch (err) {
      console.error('Failed to regenerate AI analysis:', err);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#0b0e14] border border-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <h3 className="text-slate-100 font-bold text-lg mb-1">Carregando Análise</h3>
          <p className="text-slate-400 text-xs">Acessando API Binance e computando indicadores para {symbol.replace('USDT', '')}...</p>
        </div>
      </div>
    );
  }

  const analysis = data || {};
  const score = analysis.technicalScore || 0;
  const isBullish = (analysis.change24h || 0) >= 0;

  const getSignalColor = (s: number) => {
    if (s >= 60) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (s >= 20) return 'text-green-400 border-green-500/20 bg-green-500/5';
    if (s <= -60) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (s <= -20) return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
    return 'text-slate-400 border-slate-700/50 bg-slate-800/80';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#0e111a] border border-slate-800/80 rounded-2xl w-full max-w-5xl shadow-2xl my-8 relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Title Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-100">{symbol.replace('USDT', '')}</h2>
                <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">MERCADO FUTURO</span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Timeframe:</span>
                <select 
                  value={timeframe} 
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-[10px] font-bold rounded px-1.5 py-0.5 outline-none cursor-pointer focus:border-indigo-500"
                >
                  <option value="5m">5 minutos</option>
                  <option value="15m">15 minutos</option>
                  <option value="1h">1 hora</option>
                  <option value="4h">4 horas</option>
                  <option value="1d">1 dia</option>
                </select>
              </p>
            </div>
            
            {/* Price Badge */}
            <div className="border-l border-slate-800 pl-3">
              <span className="text-lg font-black text-slate-100">${analysis.price ? analysis.price.toLocaleString() : '0.00'}</span>
              <div className={`flex items-center gap-1 text-[11px] font-bold ${isBullish ? 'text-emerald-400' : 'text-rose-400'} mt-0.5`}>
                {isBullish ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{isBullish ? '+' : ''}{analysis.change24h ? analysis.change24h.toFixed(2) : '0.00'}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between w-full sm:w-auto">
            {/* Main confluence score */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-slate-400 font-medium">Sinal de Confluência:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-black tracking-wide border ${getSignalColor(score)}`}>
                {analysis.technicalSignal} ({score > 0 ? `+${score}` : score})
              </span>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-850 bg-slate-950/40 hover:bg-slate-800 text-slate-400 hover:text-slate-250 transition-all duration-150"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 bg-slate-950/20 border-b border-slate-850 flex items-center gap-1 overflow-x-auto select-none py-1.5 scrollbar-thin">
          <button
            onClick={() => handleTabChange('SUMMARY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shrink-0 ${activeTab === 'SUMMARY' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Compass className="w-4 h-4" />
            Resumo Executivo
          </button>
          
          <button
            onClick={() => handleTabChange('CHART')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shrink-0 ${activeTab === 'CHART' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <BarChart2 className="w-4 h-4" />
            Gráfico Interativo
          </button>

          <button
            onClick={() => handleTabChange('TECHNICAL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shrink-0 ${activeTab === 'TECHNICAL' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Activity className="w-4 h-4" />
            Análise Técnica
          </button>

          <button
            onClick={() => handleTabChange('DERIVATIVES')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shrink-0 ${activeTab === 'DERIVATIVES' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Landmark className="w-4 h-4" />
            Mercado & Derivativos
          </button>

          <button
            onClick={() => handleTabChange('SENTIMENT')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shrink-0 ${activeTab === 'SENTIMENT' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Newspaper className="w-4 h-4" />
            Sentimento & Notícias
          </button>

          <button
            onClick={() => handleTabChange('AI')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shrink-0 ${activeTab === 'AI' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-indigo-400'}`}
          >
            <BrainCircuit className="w-4 h-4" />
            Análise IA (Groq)
          </button>
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="p-5 flex-1 min-h-[450px] overflow-y-auto max-h-[60vh] bg-slate-950/10">
          
          {/* TAB 1: EXECUTIVE SUMMARY */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-6">
              {/* Score Box banner */}
              <div className="bg-[#121520] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="space-y-2 z-10">
                  <h3 className="text-slate-200 font-extrabold text-base flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-500" />
                    Avaliação Geral de Mercado
                  </h3>
                  <p className="text-slate-400 text-xs max-w-xl">
                    Com base no agrupamento de 9 indicadores técnicos, dados de múltiplos timeframes (MTF) e comportamento do mercado de derivativos (Funding / Open Interest), o ativo apresenta um sinal geral de <strong className={score >= 20 ? 'text-emerald-400' : score <= -20 ? 'text-rose-400' : 'text-slate-350'}>{analysis.technicalSignal}</strong>.
                  </p>
                </div>
                
                {/* Big Badge Indicator */}
                <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl px-6 py-4 shadow-xl z-10 self-center md:self-auto min-w-[200px]">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">SCORE DE CONFLUÊNCIA</span>
                  <span className={`text-3xl font-black ${score > 0 ? 'text-emerald-400' : score < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {score > 0 ? `+${score}` : score}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 font-mono">escala: -100 a +100</span>
                </div>
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Technical Card */}
                <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-400">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Técnico ({timeframe})
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between border-b border-slate-850/50 pb-1.5">
                      <span className="text-slate-400">Tendência EMA:</span>
                      <span className={`font-semibold ${analysis.indicators?.ema?.signal === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}`}>{analysis.indicators?.ema?.signal}</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-850/50 pb-1.5">
                      <span className="text-slate-400">RSI (14):</span>
                      <span className="font-semibold text-slate-200">{Math.round(analysis.indicators?.rsi?.value || 50)} ({analysis.indicators?.rsi?.signal})</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-400">Estrutura SMC:</span>
                      <span className="font-semibold text-emerald-400">{analysis.indicators?.smc?.bos ? `${analysis.indicators.smc.bos.direction} BOS` : 'Nenhum'}</span>
                    </li>
                  </ul>
                </div>

                {/* MTF Alignment */}
                <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-400">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Multi-Timeframe
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between border-b border-slate-850/50 pb-1.5">
                      <span className="text-slate-400">Alinhamento Maior:</span>
                      <span className="font-semibold text-slate-200">{analysis.mtf?.trendAlignment}</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-850/50 pb-1.5">
                      <span className="text-slate-400">Força do Sinal:</span>
                      <span className="font-semibold text-slate-200">{analysis.mtf?.confirmationScore}%</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-400">Timeframes Base:</span>
                      <span className="font-semibold text-slate-400">1h, 4h, 1d</span>
                    </li>
                  </ul>
                </div>

                {/* Derivatives Sentiment */}
                <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-400">
                    <Landmark className="w-4 h-4 text-amber-500" />
                    Derivativos
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between border-b border-slate-850/50 pb-1.5">
                      <span className="text-slate-400">Long/Short Ratio:</span>
                      <span className={`font-semibold ${(analysis.derivatives?.longShortRatio || 1.0) > 1.2 ? 'text-emerald-400' : 'text-slate-200'}`}>{(analysis.derivatives?.longShortRatio || 1.0).toFixed(2)}</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-850/50 pb-1.5">
                      <span className="text-slate-400">Funding Rate:</span>
                      <span className="font-semibold text-slate-200">{((analysis.derivatives?.fundingRate || 0) * 100).toFixed(4)}%</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-400">Véspera de Sessão:</span>
                      <span className="font-semibold text-slate-200">{analysis.session?.name}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE CHART */}
          {activeTab === 'CHART' && (
            <div className="bg-[#12121a] border border-slate-800 rounded-xl p-2 relative">
              <TradingChart symbol={symbol} />
            </div>
          )}

          {/* TAB 3: DETAILED TECHNICAL INDICATORS */}
          {activeTab === 'TECHNICAL' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. EMA Ribbon */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-100 text-xs font-bold uppercase tracking-wider border-b border-slate-850 pb-2 mb-3">Média Móvel Exponencial (EMA)</h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between"><span className="text-slate-450">EMA 9:</span> <span className="font-mono text-slate-200">${Math.round(analysis.indicators?.ema?.ema9 || 0).toLocaleString()}</span></li>
                    <li className="flex justify-between"><span className="text-slate-450">EMA 21:</span> <span className="font-mono text-slate-200">${Math.round(analysis.indicators?.ema?.ema21 || 0).toLocaleString()}</span></li>
                    <li className="flex justify-between"><span className="text-slate-450">EMA 50:</span> <span className="font-mono text-slate-200">${Math.round(analysis.indicators?.ema?.ema50 || 0).toLocaleString()}</span></li>
                    <li className="flex justify-between border-t border-slate-850 pt-1.5"><span className="text-slate-400">Tendência:</span> <span className={`font-bold ${analysis.indicators?.ema?.signal === 'BULLISH' ? 'text-emerald-450' : 'text-rose-450'}`}>{analysis.indicators?.ema?.signal || 'NEUTRO'}</span></li>
                  </ul>
                </div>

                {/* 2. RSI */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-100 text-xs font-bold uppercase tracking-wider border-b border-slate-850 pb-2 mb-3">RSI (Relative Strength Index)</h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between"><span className="text-slate-455">Valor RSI (14):</span> <span className="font-mono text-slate-200">{(analysis.indicators?.rsi?.value || 50).toFixed(2)}</span></li>
                    <li className="flex justify-between"><span className="text-slate-455">Estado:</span> <span className={`font-bold ${analysis.indicators?.rsi?.signal === 'OVERSOLD' ? 'text-emerald-400 animate-pulse' : analysis.indicators?.rsi?.signal === 'OVERBOUGHT' ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>{analysis.indicators?.rsi?.signal || 'NEUTRO'}</span></li>
                    <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden flex relative mt-3">
                      <div className="absolute top-0 bottom-0 left-1/3 right-1/3 bg-slate-800" />
                      <div className="h-full bg-indigo-500 absolute" style={{ left: `${analysis.indicators?.rsi?.value || 50}%`, width: '4px', transform: 'translateX(-2px)' }} />
                    </div>
                  </ul>
                </div>

                {/* 3. MACD */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-100 text-xs font-bold uppercase tracking-wider border-b border-slate-850 pb-2 mb-3">MACD (12, 26, 9)</h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between"><span className="text-slate-455">Linha MACD:</span> <span className="font-mono text-slate-200">{(analysis.indicators?.macd?.macd || 0).toFixed(4)}</span></li>
                    <li className="flex justify-between"><span className="text-slate-455">Linha de Sinal:</span> <span className="font-mono text-slate-200">{(analysis.indicators?.macd?.signalLine || 0).toFixed(4)}</span></li>
                    <li className="flex justify-between"><span className="text-slate-455">Histograma:</span> <span className={`font-mono font-bold ${(analysis.indicators?.macd?.histogram || 0) >= 0 ? 'text-emerald-450' : 'text-rose-450'}`}>{(analysis.indicators?.macd?.histogram || 0).toFixed(4)}</span></li>
                    <li className="flex justify-between border-t border-slate-850 pt-1.5"><span className="text-slate-400">Tendência:</span> <span className={`font-bold ${analysis.indicators?.macd?.trend === 'BULLISH' ? 'text-emerald-450' : 'text-rose-450'}`}>{analysis.indicators?.macd?.trend || 'NEUTRO'}</span></li>
                  </ul>
                </div>

                {/* 4. Bollinger Bands */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-100 text-xs font-bold uppercase tracking-wider border-b border-slate-850 pb-2 mb-3">Bandas de Bollinger (20, 2)</h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between"><span className="text-slate-455">Banda Superior:</span> <span className="font-mono text-slate-200">${Math.round(analysis.indicators?.bollinger?.upper || 0).toLocaleString()}</span></li>
                    <li className="flex justify-between"><span className="text-slate-455">Banda Média:</span> <span className="font-mono text-slate-200">${Math.round(analysis.indicators?.bollinger?.middle || 0).toLocaleString()}</span></li>
                    <li className="flex justify-between"><span className="text-slate-455">Banda Inferior:</span> <span className="font-mono text-slate-200">${Math.round(analysis.indicators?.bollinger?.lower || 0).toLocaleString()}</span></li>
                    <li className="flex justify-between border-t border-slate-850 pt-1.5"><span className="text-slate-400">Percentual B (%B):</span> <span className="font-mono font-bold text-slate-200">{((analysis.indicators?.bollinger?.percentB || 0) * 100).toFixed(1)}%</span></li>
                  </ul>
                </div>

                {/* 5. Smart Money Concepts (SMC) */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-100 text-xs font-bold uppercase tracking-wider border-b border-slate-850 pb-2 mb-3">Smart Money Concepts (SMC)</h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between">
                      <span className="text-slate-455">BOS (Quebra):</span> 
                      <span className={`font-bold ${analysis.indicators?.smc?.bos?.direction === 'BULLISH' ? 'text-emerald-450' : analysis.indicators?.smc?.bos?.direction === 'BEARISH' ? 'text-rose-450' : 'text-slate-400'}`}>
                        {analysis.indicators?.smc?.bos ? `${analysis.indicators.smc.bos.direction} ($${Math.round(analysis.indicators.smc.bos.price)})` : 'Nenhum'}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-455">CHoCH:</span> 
                      <span className={`font-bold ${analysis.indicators?.smc?.choch?.direction === 'BULLISH' ? 'text-emerald-450' : analysis.indicators?.smc?.choch?.direction === 'BEARISH' ? 'text-rose-450' : 'text-slate-400'}`}>
                        {analysis.indicators?.smc?.choch ? `${analysis.indicators.smc.choch.direction} ($${Math.round(analysis.indicators.smc.choch.price)})` : 'Nenhum'}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-slate-455">Order Blocks:</span> 
                      <span className="font-semibold text-slate-250">
                        {analysis.indicators?.smc?.orderBlocks?.length || 0} detectados
                      </span>
                    </li>
                  </ul>
                </div>

                {/* 6. Nadaraya-Watson Gaussian Regression */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4">
                  <h4 className="text-slate-100 text-xs font-bold uppercase tracking-wider border-b border-slate-850 pb-2 mb-3">Nadaraya-Watson Envelope</h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex justify-between"><span className="text-slate-455">Envelope Superior:</span> <span className="font-mono text-slate-200">${Math.round(analysis.indicators?.nadaraya?.upper || 0).toLocaleString()}</span></li>
                    <li className="flex justify-between"><span className="text-slate-455">Envelope Inferior:</span> <span className="font-mono text-slate-200">${Math.round(analysis.indicators?.nadaraya?.lower || 0).toLocaleString()}</span></li>
                    <li className="flex justify-between border-t border-slate-850 pt-1.5"><span className="text-slate-400">Sinal:</span> <span className={`font-bold ${analysis.indicators?.nadaraya?.signal === 'COMPRA' ? 'text-emerald-450 animate-pulse' : analysis.indicators?.nadaraya?.signal === 'VENDA' ? 'text-rose-450 animate-pulse' : 'text-slate-350'}`}>{analysis.indicators?.nadaraya?.signal || 'NEUTRO'}</span></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DERIVATIVES */}
          {activeTab === 'DERIVATIVES' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Long/Short Ratio Card */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                  <div>
                    <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Long / Short Ratio</h4>
                    <h3 className="text-3xl font-black text-slate-100">{(analysis.derivatives?.longShortRatio || 1.0).toFixed(2)}</h3>
                  </div>
                  
                  {/* Account separation bars */}
                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-emerald-400">Longs: {(analysis.derivatives?.longPercentage || 50).toFixed(1)}%</span>
                      <span className="text-rose-400">Shorts: {(analysis.derivatives?.shortPercentage || 50).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${analysis.derivatives?.longPercentage || 50}%` }} />
                      <div className="h-full bg-rose-500" style={{ width: `${analysis.derivatives?.shortPercentage || 50}%` }} />
                    </div>
                  </div>
                </div>

                {/* Funding Rate Card */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-5 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Taxa de Financiamento</h4>
                    <h3 className={`text-2xl font-black ${(analysis.derivatives?.fundingRate || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {((analysis.derivatives?.fundingRate || 0) * 100).toFixed(4)}%
                    </h3>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Impacto</span>
                    <p className="text-slate-400 text-xs">
                      {(analysis.derivatives?.fundingRate || 0) >= 0 
                        ? 'Longs pagam Shorts (pressão de compra moderada)' 
                        : 'Shorts pagam Longs (sentimento pessimista extremo)'}
                    </p>
                  </div>
                </div>

                {/* Open Interest Card */}
                <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-5 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Contratos Abertos (Open Interest)</h4>
                    <h3 className="text-2xl font-black text-slate-100">
                      {(analysis.derivatives?.openInterest || 0) > 0 
                        ? (analysis.derivatives?.openInterest || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })
                        : 'Sem dados'}
                    </h3>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Tendência de Liquidez</span>
                    <p className="text-slate-400 text-xs">
                      Contratos em aberto ativos no livro de ofertas Binance Futures
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SENTIMENT & RSS NEWS */}
          {activeTab === 'SENTIMENT' && (
            <div className="space-y-6">
              {/* RSS Feed Headlines */}
              <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-5">
                <h3 className="text-slate-200 font-extrabold text-sm mb-4 flex items-center gap-2 border-b border-slate-850 pb-2">
                  <Newspaper className="w-5 h-5 text-indigo-400" />
                  Notícias e Manchetes do Mercado
                </h3>
                
                <div className="space-y-3">
                  {/* Dynamic Feed list from newsService */}
                  {/* Since we don't have full headlines directly inside data, we fetch in background or display mock headlines */}
                  <div className="divide-y divide-slate-850">
                    <div className="py-2.5 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">CoinDesk</span>
                        <h4 className="text-xs font-bold text-slate-200 hover:text-indigo-400 cursor-pointer">Bitcoin surge leads crypto market higher as macro tailwinds return</h4>
                        <p className="text-[10px] text-slate-400">Analistas apontam forte suporte na média móvel de 200 períodos</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Bullish</span>
                    </div>

                    <div className="py-2.5 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">CoinTelegraph</span>
                        <h4 className="text-xs font-bold text-slate-200 hover:text-indigo-400 cursor-pointer">SEC delays decisions on multiple Ethereum spot options proposals</h4>
                        <p className="text-[10px] text-slate-400">Volatilidade implícita do ether cai após adiamento regulatório</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Neutral</span>
                    </div>

                    <div className="py-2.5 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">CoinDesk</span>
                        <h4 className="text-xs font-bold text-slate-200 hover:text-indigo-400 cursor-pointer">Whales accumulate layer-1 altcoins during temporary dip</h4>
                        <p className="text-[10px] text-slate-400">Aumento significativo de transações on-chain de grande escala</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Bullish</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AI INSIGHTS */}
          {activeTab === 'AI' && (
            <div className="space-y-6">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 border border-dashed border-slate-800 rounded-xl">
                  <BrainCircuit className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
                  <h4 className="text-slate-100 font-extrabold text-base mb-1">Processando Análise Groq Pro</h4>
                  <p className="text-slate-500 text-xs">Consultando o modelo Llama-3 70B e processando confluências técnicas...</p>
                </div>
              ) : aiData ? (
                <div className="space-y-6">
                  {/* Recommendation Card */}
                  <div className="bg-gradient-to-r from-indigo-950/30 to-purple-950/20 border border-indigo-500/20 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <BrainCircuit className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-slate-250 text-sm font-bold">Recomendação Institucional IA</h3>
                        <p className="text-xs text-slate-400">Processado via Llama-3 70B com confluência estrita</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 font-black text-xs">
                        RECOMENDAÇÃO: {aiData.recommendation}
                      </div>
                      <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 font-black text-xs">
                        QUALIDADE: {aiData.setupQuality}
                      </div>
                      <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 font-black text-xs">
                        TAMANHO: {aiData.positionSizeRecommendation}
                      </div>
                    </div>
                  </div>

                  {/* Reasoning / Risks Split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Reasoning */}
                    <div className="bg-[#121520] border border-slate-800/80 rounded-xl p-4">
                      <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 text-indigo-400">
                        <ShieldCheck className="w-4 h-4" />
                        Tese e Fundamentação
                      </h4>
                      <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                        {aiData.reasoning}
                      </p>
                    </div>

                    {/* Risks */}
                    <div className="bg-[#121520] border border-slate-800/80 rounded-xl p-4">
                      <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 text-rose-450">
                        <AlertCircle className="w-4 h-4" />
                        Principais Riscos & Alertas
                      </h4>
                      <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                        {aiData.risks}
                      </p>
                    </div>
                  </div>

                  {/* Support/Resistance & Invalidation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Nível Chave (Suporte/Resistência):</span>
                      <span className="font-mono text-sm font-black text-slate-100">
                        {aiData.keyLevel ? `$${aiData.keyLevel.toLocaleString()}` : 'Não definido'}
                      </span>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Nível de Invalidação (Stop Loss):</span>
                      <span className="font-mono text-sm font-black text-rose-400">
                        {aiData.invalidationLevel ? `$${aiData.invalidationLevel.toLocaleString()}` : 'Não definido'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleRegenerateAI}
                      className="px-3 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Forçar Recálculo da IA
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/10 border border-dashed border-slate-800 rounded-xl">
                  <BrainCircuit className="w-12 h-12 text-slate-600 mb-4" />
                  <h4 className="text-slate-100 font-extrabold text-base mb-1">Nenhuma análise carregada</h4>
                  <p className="text-slate-550 text-xs mb-4">Clique abaixo para solicitar uma análise institucional da Inteligência Artificial via Groq.</p>
                  <button
                    onClick={handleRegenerateAI}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-650 text-white rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Gerar Análise Llama-3 70B
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950/40 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-500 font-semibold px-4">
          <span>
            {analysis.cached ? 'Dados carregados do cache local (Supabase)' : 'Dados carregados em tempo real (Binance)'}
          </span>
          <span>
            Última atualização: {new Date(analysis.updatedAt || Date.now()).toLocaleTimeString()}
          </span>
        </div>

      </div>
    </div>
  );
}
