'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import LeverageCalculator from '@/components/tools/LeverageCalculator';
import PositionSizing from '@/components/tools/PositionSizing';
import BreakEvenCalculator from '@/components/tools/BreakEvenCalculator';
import DCACalculator from '@/components/tools/DCACalculator';
import TradingJournal from '@/components/tools/TradingJournal';
import PerformanceDashboard from '@/components/tools/PerformanceDashboard';
import AlertsManager from '@/components/tools/AlertsManager';
import PerformanceCoach from '@/components/PerformanceCoach';
import { Sliders, BookOpen, BarChart3, Bell, Calculator, Sparkles } from 'lucide-react';

type TabType = 'calculators' | 'journal' | 'performance' | 'alerts' | 'coach';
type CalcSubTab = 'leverage' | 'sizing' | 'breakeven' | 'dca';

interface JournalEntry {
  id: string;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number;
  quantity: number;
  leverage: number;
  pnl_usdt: number;
  pnl_percent: number;
  strategy: string;
  setup?: string;
  emotions?: string;
  mistakes?: string;
  lessons?: string;
  tags?: string[];
  created_at?: string;
}

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('calculators');
  const [calcSubTab, setCalcSubTab] = useState<CalcSubTab>('leverage');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  return (
    <main className="min-h-screen bg-[#07070a] text-slate-100 flex flex-col pb-12">
      {/* Premium Navbar */}
      <Navbar />

      <div className="max-w-[1600px] w-full mx-auto px-4 md:px-6 mt-8 flex-1 flex flex-col gap-6">
        {/* Title Section */}
        <div className="flex flex-col gap-1.5 border-b border-slate-900/60 pb-6">
          <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight leading-none">
            🛠️ Suite de Gestão & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 font-extrabold">Melhoria de Performance</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
            Ferramentas profissionais de controle de risco, probabilidade matemática, diário e alertas integrados.
          </p>
        </div>

        {/* Tab Switcher Headers */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/60 border border-slate-900 rounded-xl max-w-fit">
          <button
            onClick={() => setActiveTab('calculators')}
            className={`px-4 py-2.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              activeTab === 'calculators'
                ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calculadoras
          </button>
          
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              activeTab === 'journal'
                ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Diário de Trading
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              activeTab === 'performance'
                ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Performance
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              activeTab === 'alerts'
                ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            Alertas Técnicos
          </button>

          <button
            onClick={() => setActiveTab('coach')}
            className={`px-4 py-2.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              activeTab === 'coach'
                ? 'bg-slate-900 text-indigo-400 border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Coach IA
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 mt-2">
          
          {/* CALCULATORS TAB */}
          {activeTab === 'calculators' && (
            <div className="space-y-6">
              {/* Calculators Sub Tabs switcher */}
              <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3">
                <button
                  onClick={() => setCalcSubTab('leverage')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                    calcSubTab === 'leverage'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  ⚖️ Calculadora de Alavancagem
                </button>
                <button
                  onClick={() => setCalcSubTab('sizing')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                    calcSubTab === 'sizing'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  🎯 Dimensionamento Kelly
                </button>
                <button
                  onClick={() => setCalcSubTab('breakeven')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                    calcSubTab === 'breakeven'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  📊 Equilíbrio (Break-Even)
                </button>
                <button
                  onClick={() => setCalcSubTab('dca')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                    calcSubTab === 'dca'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  🥞 Grade DCA (Preço Médio)
                </button>
              </div>

              {/* Sub tab renders */}
              <div className="pt-2 animate-in fade-in duration-200">
                {calcSubTab === 'leverage' && <LeverageCalculator />}
                {calcSubTab === 'sizing' && <PositionSizing />}
                {calcSubTab === 'breakeven' && <BreakEvenCalculator />}
                {calcSubTab === 'dca' && <DCACalculator />}
              </div>
            </div>
          )}

          {/* JOURNAL TAB */}
          {activeTab === 'journal' && (
            <div className="animate-in fade-in duration-200">
              <TradingJournal onEntriesChange={setJournalEntries} />
            </div>
          )}

          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
            <div className="animate-in fade-in duration-200">
              <PerformanceDashboard entries={journalEntries} />
            </div>
          )}

          {/* ALERTS TAB */}
          {activeTab === 'alerts' && (
            <div className="animate-in fade-in duration-200">
              <AlertsManager />
            </div>
          )}

          {/* COACH TAB */}
          {activeTab === 'coach' && (
            <div className="animate-in fade-in duration-200">
              <PerformanceCoach />
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
