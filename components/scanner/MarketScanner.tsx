'use client';

import React, { useState } from 'react';
import { Search, Sparkles, SlidersHorizontal, TrendingUp, TrendingDown, ArrowUpDown, BrainCircuit } from 'lucide-react';

interface MarketScannerProps {
  results: any[];
  isLoading: boolean;
  onSelectAsset: (symbol: string) => void;
}

type FilterTab = 'ALL' | 'BUY' | 'SELL' | 'NEUTRAL';
type SortField = 'symbol' | 'price' | 'change24h' | 'technicalScore';

export default function MarketScanner({ results, isLoading, onSelectAsset }: MarketScannerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [sortField, setSortField] = useState<SortField>('technicalScore');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter logic
  const filteredResults = results.filter(item => {
    // Search filter
    const matchesSearch = item.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Tab filter
    if (!matchesSearch) return false;
    if (activeTab === 'ALL') return true;
    if (activeTab === 'BUY') return item.technicalScore >= 20;
    if (activeTab === 'SELL') return item.technicalScore <= -20;
    if (activeTab === 'NEUTRAL') return item.technicalScore > -20 && item.technicalScore < 20;
    return true;
  });

  // Sort logic
  const sortedResults = [...filteredResults].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    // Handle string comparison for symbol
    if (sortField === 'symbol') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    // Default numeric sort
    valA = valA || 0;
    valB = valB || 0;
    
    // If sorting by score, sort by absolute value of score by default if they are equal, or standard numeric
    return sortAsc ? valA - valB : valB - valA;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSignalBadgeClass = (score: number) => {
    if (score >= 60) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse';
    if (score >= 20) return 'bg-green-500/5 text-green-400 border border-green-500/20';
    if (score <= -60) return 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse';
    if (score <= -20) return 'bg-rose-500/5 text-rose-400 border border-rose-500/20';
    return 'bg-slate-800/80 text-slate-400 border border-slate-700/50';
  };

  const getSignalLabel = (score: number) => {
    if (score >= 60) return 'FORTE COMPRA';
    if (score >= 20) return 'COMPRA';
    if (score <= -60) return 'FORTE VENDA';
    if (score <= -20) return 'VENDA';
    return 'NEUTRO';
  };

  const getMtfBadgeClass = (alignment: string) => {
    if (alignment === 'BULLISH') return 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40';
    if (alignment === 'BEARISH') return 'bg-rose-950/30 text-rose-400 border border-rose-900/40';
    return 'bg-slate-800/40 text-slate-400 border border-slate-800/60';
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  };

  const formatFunding = (rate: number) => {
    const pct = rate * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(4)}%`;
  };

  return (
    <div className="bg-[#131722]/80 border border-slate-800/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
      {/* 1. Header controls */}
      <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800/50 self-start">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'ALL' ? 'bg-[#2962FF] text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setActiveTab('BUY')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-emerald-400'}`}
          >
            Sinal Compra
          </button>
          <button
            onClick={() => setActiveTab('SELL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'SELL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'}`}
          >
            Sinal Venda
          </button>
          <button
            onClick={() => setActiveTab('NEUTRAL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${activeTab === 'NEUTRAL' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Neutro
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 w-full md:w-80">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar par (ex: BTC, SOL)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-colors"
            />
          </div>
          <button className="p-2 border border-slate-800 bg-slate-950/40 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-850 bg-slate-950/20 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th onClick={() => handleSort('symbol')} className="py-3 px-4 cursor-pointer hover:text-slate-350 select-none">
                <div className="flex items-center gap-1.5">
                  Ativo <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th onClick={() => handleSort('price')} className="py-3 px-4 cursor-pointer hover:text-slate-350 select-none text-right">
                <div className="flex items-center justify-end gap-1.5">
                  Preço <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th onClick={() => handleSort('change24h')} className="py-3 px-4 cursor-pointer hover:text-slate-350 select-none text-right">
                <div className="flex items-center justify-end gap-1.5">
                  24h% <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th onClick={() => handleSort('technicalScore')} className="py-3 px-4 cursor-pointer hover:text-slate-350 select-none text-center">
                <div className="flex items-center justify-center gap-1.5">
                  Score Técnico <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Sinal</th>
              <th className="py-3 px-4 text-center">Técnico Principal</th>
              <th className="py-3 px-4 text-center">MTF Alinhamento</th>
              <th className="py-3 px-4 text-right">Funding Rate</th>
              <th className="py-3 px-4 text-right">Long/Short Ratio</th>
              <th className="py-3 px-4 text-center">IA</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-850">
            {isLoading ? (
              // Table skeleton
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-5 w-20 bg-slate-850 rounded" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-5 w-16 bg-slate-850 rounded ml-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-5 w-12 bg-slate-850 rounded ml-auto" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-850 rounded mx-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-6 w-20 bg-slate-850 rounded-full mx-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-5 w-24 bg-slate-850 rounded mx-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-6 w-16 bg-slate-850 rounded-full mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-5 w-14 bg-slate-850 rounded ml-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-5 w-12 bg-slate-850 rounded ml-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-5 w-5 bg-slate-850 rounded mx-auto" /></td>
                </tr>
              ))
            ) : sortedResults.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500 text-sm">
                  Nenhum ativo encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              sortedResults.map((item) => {
                const isBullish = item.change24h >= 0;
                const score = item.technicalScore || 0;
                
                // Calculate percentage score visual placement
                // score is from -100 to +100
                const scorePct = ((score + 100) / 200) * 100;
                
                return (
                  <tr
                    key={item.symbol}
                    onClick={() => onSelectAsset(item.symbol)}
                    className="group border-b border-slate-900 hover:bg-slate-800/20 cursor-pointer transition-all duration-200"
                  >
                    {/* Symbol */}
                    <td className="py-3.5 px-4 font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold tracking-tight">{item.symbol.replace('USDT', '')}</span>
                        <span className="text-[10px] text-slate-500 font-normal">USDT Futures</span>
                      </div>
                    </td>
                    
                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-mono text-sm font-semibold text-slate-200">
                      ${formatPrice(item.price)}
                    </td>
                    
                    {/* 24h Change */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold">
                      <div className={`flex items-center justify-end gap-1 ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isBullish ? '+' : ''}{item.change24h.toFixed(2)}%</span>
                      </div>
                    </td>
                    
                    {/* Technical Score (visual balance bar) */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col items-center gap-1 w-32 mx-auto">
                        <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          {/* Centered zero indicator */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-600 z-10" />
                          
                          {/* Value Fill */}
                          <div 
                            className={`absolute top-0 bottom-0 transition-all duration-500 ${score >= 0 ? 'left-1/2 bg-emerald-500' : 'right-1/2 bg-rose-500'}`}
                            style={{ 
                              width: `${Math.abs(score) / 2}%`,
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-mono font-bold ${score > 0 ? 'text-emerald-400' : score < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {score > 0 ? `+${score}` : score}
                        </span>
                      </div>
                    </td>
                    
                    {/* Signal */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide border ${getSignalBadgeClass(score)}`}>
                        {getSignalLabel(score)}
                      </span>
                    </td>

                    {/* Technical Confluence Summary */}
                    <td className="py-3.5 px-4 text-center text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">RSI: </span>
                      <span className={item.indicators.rsi.value > 60 ? 'text-emerald-400' : item.indicators.rsi.value < 40 ? 'text-rose-400' : 'text-slate-400'}>
                        {Math.round(item.indicators.rsi.value)}
                      </span>
                      <span className="mx-1 text-slate-600">|</span>
                      <span className="font-semibold text-slate-300">MACD: </span>
                      <span className={item.indicators.macd.trend === 'BULLISH' ? 'text-emerald-400' : item.indicators.macd.trend === 'BEARISH' ? 'text-rose-400' : 'text-slate-400'}>
                        {item.indicators.macd.trend === 'BULLISH' ? 'Alta' : item.indicators.macd.trend === 'BEARISH' ? 'Baixa' : 'Neutro'}
                      </span>
                    </td>

                    {/* MTF Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getMtfBadgeClass(item.mtf?.trendAlignment || 'MIXED')}`}>
                        {item.mtf?.trendAlignment === 'BULLISH' ? 'ALTA' : item.mtf?.trendAlignment === 'BEARISH' ? 'BAIXA' : 'MISTO'}
                      </span>
                    </td>

                    {/* Funding Rate */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs">
                      <span className={item.derivatives.fundingRate > 0 ? 'text-emerald-400/90' : item.derivatives.fundingRate < 0 ? 'text-rose-400/90' : 'text-slate-400'}>
                        {formatFunding(item.derivatives.fundingRate)}
                      </span>
                    </td>

                    {/* Long/Short Ratio */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold">
                      <span className={item.derivatives.longShortRatio > 1.1 ? 'text-emerald-400' : item.derivatives.longShortRatio < 0.9 ? 'text-rose-400' : 'text-slate-300'}>
                        {item.derivatives.longShortRatio.toFixed(2)}
                      </span>
                    </td>

                    {/* AI Indicator */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <span className="p-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* 3. Footer */}
      <div className="p-3 bg-slate-950/20 border-t border-slate-900 text-center flex flex-col sm:flex-row justify-between items-center gap-2">
        <span className="text-[10px] text-slate-500">
          Mostrando {filteredResults.length} de {results.length} ativos monitorados em tempo real
        </span>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sinais Fortes &gt;= 60</span>
          <span>·</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Sinais Fortes &lt;= -60</span>
        </div>
      </div>
    </div>
  );
}
