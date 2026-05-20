'use client';

import React, { useEffect, useState } from 'react';
import { Compass, TrendingUp, TrendingDown, DollarSign, Activity, Flame, RefreshCw } from 'lucide-react';

interface MarketOverviewProps {
  results: any[];
  isLoading: boolean;
}

export default function MarketOverview({ results, isLoading }: MarketOverviewProps) {
  const [fearGreed, setFearGreed] = useState<{ index: number; label: string; sentiment: number } | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      try {
        setNewsLoading(true);
        const res = await fetch('/api/news');
        const data = await res.json();
        if (data && data.news) {
          setFearGreed({
            index: data.news.fearGreedIndex || 50,
            label: data.news.fearGreedLabel || 'Neutral',
            sentiment: data.news.fearGreedSentiment || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load news for Fear & Greed index:', err);
      } finally {
        setNewsLoading(false);
      }
    }
    loadNews();
  }, []);

  // Compute stats from scanner results
  const totalVolume = results.reduce((acc, curr) => acc + (curr.volume24h || 0), 0);
  
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  let totalScoreSum = 0;

  results.forEach(item => {
    totalScoreSum += item.technicalScore || 0;
    if (item.technicalScore >= 20) bullishCount++;
    else if (item.technicalScore <= -20) bearishCount++;
    else neutralCount++;
  });

  const avgScore = results.length > 0 ? Math.round(totalScoreSum / results.length) : 0;
  
  // Sort to find top gainer and top loser
  const sortedByChange = [...results].sort((a, b) => (b.change24h || 0) - (a.change24h || 0));
  const topGainer = sortedByChange[0];
  const topLoser = sortedByChange[sortedByChange.length - 1];

  const bullishPercent = results.length > 0 ? Math.round((bullishCount / results.length) * 100) : 50;
  const bearishPercent = results.length > 0 ? Math.round((bearishCount / results.length) * 100) : 50;

  // Format volume in a readable way
  const formatVolume = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const getFearGreedColor = (index: number) => {
    if (index >= 75) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
    if (index >= 55) return 'text-green-400 border-green-500/30 bg-green-500/5';
    if (index >= 45) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
    if (index >= 25) return 'text-orange-400 border-orange-500/30 bg-orange-500/5';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/5';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {/* 1. Fear & Greed Card */}
      <div className="bg-[#131722]/80 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Índice Fear & Greed</span>
          <Compass className="w-5 h-5 text-indigo-400" />
        </div>
        
        {newsLoading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
            <span className="text-slate-500 text-xs">Carregando dados...</span>
          </div>
        ) : fearGreed ? (
          <div className="flex items-center gap-4 py-1">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-slate-800">
              <span className="text-2xl font-bold text-slate-100">{fearGreed.index}</span>
              {/* Simple segment border highlight */}
              <div 
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 transition-all duration-500" 
                style={{ transform: `rotate(${(fearGreed.index / 100) * 360}deg)` }}
              />
            </div>
            <div>
              <div className={`px-2 py-0.5 rounded text-xs font-semibold border ${getFearGreedColor(fearGreed.index)} inline-block mb-1`}>
                {fearGreed.label}
              </div>
              <p className="text-slate-400 text-xs">Sentimento do varejo cripto atualizado</p>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-sm py-4">Indisponível</div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />
      </div>

      {/* 2. Market Sentiment Gauge */}
      <div className="bg-[#131722]/80 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Confluência do Mercado</span>
          <Flame className="w-5 h-5 text-amber-500" />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mb-2" />
            <span className="text-slate-500 text-xs">Analisando confluências...</span>
          </div>
        ) : (
          <div className="py-1">
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-emerald-400">{bullishPercent}% Alta</span>
              <span className="text-slate-400">Score Médio: <strong className={avgScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{avgScore > 0 ? `+${avgScore}` : avgScore}</strong></span>
              <span className="text-rose-400">{bearishPercent}% Baixa</span>
            </div>
            
            {/* Bidirectional bar */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex mb-2">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${bullishPercent}%` }} />
              <div className="h-full bg-slate-700 transition-all duration-500" style={{ width: `${100 - bullishPercent - bearishPercent}%` }} />
              <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${bearishPercent}%` }} />
            </div>
            
            <p className="text-slate-400 text-xs text-center">
              {bullishCount} ativos em alta · {neutralCount} neutros · {bearishCount} em baixa
            </p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 opacity-20" />
      </div>

      {/* 3. Top Gainer / Top Loser Card */}
      <div className="bg-[#131722]/80 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Top Movimentações (24h)</span>
          <Activity className="w-5 h-5 text-emerald-400" />
        </div>

        {isLoading || !topGainer ? (
          <div className="flex flex-col items-center justify-center py-4">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
            <span className="text-slate-500 text-xs">Carregando variações...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-200 text-sm font-bold">{topGainer.symbol.replace('USDT', '')}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{topGainer.change24h.toFixed(2)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-200 text-sm font-bold">{topLoser.symbol.replace('USDT', '')}</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400 text-xs font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{topLoser.change24h.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 opacity-20" />
      </div>

      {/* 4. Total Volume Card */}
      <div className="bg-[#131722]/80 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:border-slate-700">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Volume Total do Scanner</span>
          <DollarSign className="w-5 h-5 text-indigo-400" />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
            <span className="text-slate-500 text-xs">Totalizando volumes...</span>
          </div>
        ) : (
          <div className="py-1">
            <h3 className="text-2xl font-black text-slate-100 mb-0.5">{formatVolume(totalVolume)}</h3>
            <p className="text-slate-400 text-xs">
              Somatório das últimas 24h dos {results.length} ativos monitorados
            </p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 opacity-20" />
      </div>
    </div>
  );
}
