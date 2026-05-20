'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrainCircuit, Compass, BarChart2, Activity, ShieldCheck, Flame } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [fearGreed, setFearGreed] = useState<number | null>(null);

  useEffect(() => {
    async function loadSentiment() {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        if (data && data.news) {
          setFearGreed(data.news.fearGreedIndex);
        }
      } catch (e) {
        // ignore
      }
    }
    loadSentiment();
  }, []);

  return (
    <header className="sticky top-0 z-45 bg-[#0a0a0f]/90 border-b border-slate-900/80 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-100 tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
              CryptoAnalyst <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 font-extrabold">Pro</span>
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Plataforma de Inteligência Cripto
            </span>
          </div>
        </Link>

        {/* Links Navigation */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-900">
          <Link
            href="/"
            className={`px-4 py-2 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition-all duration-200 ${
              pathname === '/' 
                ? 'bg-slate-900 text-indigo-400 border border-slate-800' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            Scanner de Mercado
          </Link>
          <Link
            href="/trade"
            className={`px-4 py-2 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition-all duration-200 ${
              pathname === '/trade' 
                ? 'bg-slate-900 text-indigo-400 border border-slate-800' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Painel Trading
          </Link>
        </nav>

        {/* Right Info Widgets */}
        <div className="hidden sm:flex items-center gap-4">
          {/* Fear & Greed */}
          {fearGreed !== null && (
            <div className="flex items-center gap-2 border border-slate-900 bg-slate-950/40 rounded-lg px-2.5 py-1 text-[11px] font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-400">Fear & Greed:</span>
              <span className={fearGreed >= 50 ? 'text-emerald-400' : 'text-rose-400'}>{fearGreed}</span>
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-2 border border-slate-900 bg-slate-950/40 rounded-lg px-2.5 py-1 text-[11px] font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400">Binance Futures:</span>
            <span className="text-emerald-400 font-extrabold">CONECTADO</span>
          </div>
        </div>

      </div>
    </header>
  );
}
