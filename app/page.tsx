'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import MarketOverview from '@/components/scanner/MarketOverview';
import MarketScanner from '@/components/scanner/MarketScanner';
import AnalysisModal from '@/components/scanner/AnalysisModal';
import { RefreshCw, Play } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('15m');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadScannerData = async (tf = timeframe, force = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/scanner?timeframe=${tf}${force ? '&refresh=true' : ''}`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Failed to load scanner data:', err);
      setError('Não foi possível carregar os dados de mercado. Verifique sua conexão ou tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScannerData(timeframe);

    // Auto polling every 45s to keep prices fresh
    const interval = setInterval(() => {
      loadScannerData(timeframe, false);
    }, 45000);

    return () => clearInterval(interval);
  }, [timeframe]);

  return (
    <div className="min-h-screen bg-[#06080c] text-slate-100 flex flex-col font-sans">
      {/* Shared Navigation Header */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-grow max-w-[1600px] w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        
        {/* Intro Hero banner */}
        <div className="bg-gradient-to-r from-indigo-950/20 via-purple-950/15 to-transparent border border-slate-900 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
              Scanner de Mercado em Tempo Real
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Monitore a confluência técnica de indicadores institucionais, SMC (Smart Money Concepts), níveis de Fibonacci e fluxos de derivativos. Selecione qualquer ativo da lista para abrir a análise profunda da nossa inteligência artificial.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto justify-between sm:justify-start">
            {/* Quick Timeframe Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-900">
              <button 
                onClick={() => setTimeframe('5m')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${timeframe === '5m' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                5m
              </button>
              <button 
                onClick={() => setTimeframe('15m')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${timeframe === '15m' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                15m
              </button>
              <button 
                onClick={() => setTimeframe('1h')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${timeframe === '1h' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                1h
              </button>
              <button 
                onClick={() => setTimeframe('4h')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${timeframe === '4h' ? 'bg-[#2962FF] text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                4h
              </button>
            </div>

            {/* Refresh & Manual buttons */}
            <button
              onClick={() => loadScannerData(timeframe, true)}
              disabled={isLoading}
              className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-250 transition-all flex items-center justify-center disabled:opacity-50"
              title="Forçar recarga completa"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/trade"
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-[#2962FF] hover:from-indigo-650 hover:to-[#1b4cc9] rounded-lg text-xs font-bold transition-all text-white flex items-center gap-1.5 shadow shadow-indigo-500/10"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Painel Trade
            </Link>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-450 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Market Overview Header Widgets */}
        <MarketOverview results={results} isLoading={isLoading} />

        {/* Main Table Scanner list */}
        <MarketScanner 
          results={results} 
          isLoading={isLoading} 
          onSelectAsset={(symbol) => setSelectedSymbol(symbol)} 
        />

      </main>

      {/* Popup detailed asset modal */}
      {selectedSymbol && (
        <AnalysisModal 
          symbol={selectedSymbol} 
          onClose={() => setSelectedSymbol(null)} 
        />
      )}
    </div>
  );
}
