'use client';

import { useState, useEffect } from 'react';
import { 
  Award, TrendingUp, AlertOctagon, RefreshCw, FileText, CheckCircle2, 
  XCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, Target, 
  HelpCircle, Sparkles, MessageSquare, Lightbulb, PieChart, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';

interface Stats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  avgDuration: number;
  wins: number;
  losses: number;
  avgLoss: number;
  avgWin: number;
  maxLossStreak: number;
  maxWinStreak: number;
  earlyExits: number;
}

interface Patterns {
  bestHour: string;
  worstHour: string;
  bestPair: string;
  worstPair: string;
  bestStrategy: string;
}

interface ChartItem {
  hour?: string;
  month?: string;
  name?: string;
  pnl: number;
}

interface ActionItem {
  priority: number;
  action: string;
  why: string;
}

interface CoachData {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string[];
  weaknesses: string[];
  patterns: string[];
  actions: ActionItem[];
  realisticGoal: string;
  coachMessage: string;
  keyInsight: string;
}

interface AnalysisData {
  stats: Stats;
  patterns: Patterns;
  charts: {
    pnlByHour: ChartItem[];
    pnlByPair: ChartItem[];
    pnlByMonth: ChartItem[];
  };
  coach: CoachData;
  analyzedAt: string;
}

export default function PerformanceCoach() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/performance/analysis', { cache: 'no-store' });
      const json = await res.json();
      if (json && !json.error) {
        setData(json);
      }
    } catch (e) {
      console.error('Error fetching performance analysis:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const handleRecalculate = async () => {
    setRefreshing(true);
    await fetchAnalysis();
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-slate-400 font-medium">Carregando diagnóstico do Coach IA...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500" />
        <span className="text-sm font-medium">Erro ao carregar análise de performance. Verifique as configurações de rede.</span>
        <Button onClick={fetchAnalysis} size="sm" variant="outline">Tentar Novamente</Button>
      </div>
    );
  }

  const { stats, patterns: pNames, charts, coach, analyzedAt } = data;

  // Grade Colors
  const gradeColors = {
    A: 'from-emerald-400 to-teal-500 text-slate-950 border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    B: 'from-green-400 to-emerald-500 text-slate-950 border-green-400/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
    C: 'from-amber-400 to-yellow-500 text-slate-950 border-amber-400/40',
    D: 'from-orange-400 to-amber-500 text-slate-950 border-orange-400/40 animate-pulse',
    F: 'from-rose-500 to-red-600 text-white border-rose-500/40 animate-pulse shadow-[0_0_25px_rgba(244,63,94,0.4)]',
  };

  // Win Rate Zone Color
  const getWinRateColor = (wr: number) => {
    if (wr >= 60) return 'text-emerald-400';
    if (wr >= 45) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:p-0 print:bg-white print:text-black">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-400" /> Diagnóstico de Performance do Coach IA
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Análise comportamental, psicológica e técnica detalhada baseada nos seus últimos 90 dias de trading.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <Button 
            onClick={handleRecalculate} 
            disabled={refreshing}
            variant="outline" 
            className="text-xs bg-slate-900 border-white/10 text-white hover:bg-slate-800 flex items-center gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Gerar Nova Análise
          </Button>

          <Button 
            onClick={handleExportPDF}
            className="text-xs bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 h-9 font-semibold shadow-lg shadow-primary/20"
          >
            <FileText className="h-3.5 w-3.5" />
            Exportar Relatório PDF
          </Button>
        </div>
      </div>

      {/* OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">P&L Líquido 90D</span>
          <div className={`text-xl font-extrabold flex items-center ${stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.totalPnl >= 0 ? <ArrowUpRight className="h-5 w-5 mr-0.5" /> : <ArrowDownRight className="h-5 w-5 mr-0.5" />}
            ${stats.totalPnl.toLocaleString()} USDT
          </div>
          <span className="text-[10px] text-slate-500 block">Win Rate: {stats.winRate}%</span>
        </div>

        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fator de Lucro</span>
          <div className="text-xl font-extrabold text-white">
            {stats.profitFactor}
          </div>
          <span className={`text-[10px] font-semibold block ${stats.profitFactor >= 1.5 ? 'text-emerald-400' : stats.profitFactor >= 1.0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {stats.profitFactor >= 1.5 ? 'Excelente' : stats.profitFactor >= 1.0 ? 'Aceitável' : 'Inconsistente'}
          </span>
        </div>

        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Relação W/L Média</span>
          <div className="text-xl font-extrabold text-white">
            ${stats.avgWin} / ${stats.avgLoss}
          </div>
          <span className="text-[10px] text-slate-500 block">Gain Médio vs Loss Médio</span>
        </div>

        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Drawdown Máximo</span>
          <div className="text-xl font-extrabold text-rose-400">
            {stats.maxDrawdown}%
          </div>
          <span className="text-[10px] text-slate-500 block">Risco de Ruína Controlado</span>
        </div>

      </div>

      {/* CORE COACH DIAGNOSTIC (TWO COLUMN SECTION) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DIAGNOSTIC & PSYCHOLOGY */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* COACH MESSAGE & INSIGHT */}
          <div className="relative overflow-hidden bg-slate-950/60 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="absolute -left-20 -bottom-20 h-40 w-40 bg-primary/10 rounded-full filter blur-3xl" />
            
            <div className="flex items-start gap-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center shrink-0 border bg-gradient-to-br font-black text-2xl ${gradeColors[coach.grade]}`}>
                {coach.grade}
              </div>
              <div className="space-y-1.5">
                <Badge className="bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Nota Global do Coach
                </Badge>
                <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-primary" /> Análise Geral do Especialista
                </h2>
                <p className="text-sm text-slate-300 italic leading-relaxed">
                  "{coach.coachMessage}"
                </p>
              </div>
            </div>

            {/* KEY INSIGHT BOX */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3 mt-2">
              <Lightbulb className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold uppercase text-amber-400 tracking-wider block mb-0.5">Insight Chave da Performance</span>
                <span className="text-xs text-slate-200 leading-relaxed font-medium">{coach.keyInsight}</span>
              </div>
            </div>
          </div>

          {/* FORÇAS, FRAQUEZAS E PADRÕES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* STRENGTHS */}
            <div className="bg-slate-950/40 border border-emerald-500/10 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Pontos Fortes
              </h3>
              <ul className="space-y-2.5">
                {coach.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* WEAKNESSES */}
            <div className="bg-slate-950/40 border border-rose-500/10 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <XCircle className="h-4 w-4" /> Pontos a Corrigir
              </h3>
              <ul className="space-y-2.5">
                {coach.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="text-rose-400 shrink-0 mt-0.5">✗</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* IDENTIFIED BEHAVIOR PATTERNS */}
            <div className="bg-slate-950/40 border border-amber-500/10 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Padrões Comportamentais
              </h3>
              <ul className="space-y-2.5">
                {coach.patterns.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="text-amber-400 shrink-0 mt-0.5">⚠️</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* PLANO DE AÇÃO NUMERADO (5 AÇÕES) */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-primary" /> Plano de Ação Recomendado (Priorizado)
            </h3>
            
            <div className="space-y-4">
              {coach.actions.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all duration-200">
                  <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-sm shrink-0">
                    {item.priority}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white leading-snug">{item.action}</div>
                    <div className="text-xs text-slate-400 leading-relaxed"><span className="font-semibold text-slate-300">Por que:</span> {item.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ADVANCED METRICS & VISUALS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* WIN RATE GAUGE CARD */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4 flex flex-col items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 self-start flex items-center gap-1.5">
              <Target className="h-4 w-4 text-rose-400" /> Zona de Win Rate
            </h3>

            <div className="relative flex items-center justify-center h-32 w-32 mt-2">
              {/* Circular Gauge */}
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="64" cy="64" r="50" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="8" 
                  fill="transparent" 
                />
                <circle 
                  cx="64" cy="64" r="50" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={314}
                  strokeDashoffset={314 - (314 * stats.winRate) / 100}
                  className={`transition-all duration-1000 ${getWinRateColor(stats.winRate)}`}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-white">{stats.winRate}%</span>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Taxa de Acerto</span>
              </div>
            </div>

            <div className="w-full text-xs space-y-2 bg-slate-950 rounded-xl p-3 border border-white/5">
              <div className="flex justify-between text-slate-400">
                <span>Trades Lucrativos</span>
                <span className="font-semibold text-emerald-400">{stats.wins}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Trades com Perda</span>
                <span className="font-semibold text-rose-400">{stats.losses}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2 text-slate-300 font-medium">
                <span>Meta Sugerida</span>
                <span className="font-bold text-primary">{coach.realisticGoal}</span>
              </div>
            </div>
          </div>

          {/* MONTHLY P&L BAR CHART */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> P&L Acumulado por Mês
            </h3>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.pnlByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {charts.pnlByMonth.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* HOURLY PERFORMANCE HEATMAP */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-400" /> Desempenho por Hora (Heatmap)
            </h3>
            
            <div className="grid grid-cols-6 gap-2 text-center text-[10px]">
              {charts.pnlByHour.slice(0, 12).map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all duration-200 hover:scale-105 ${
                    item.pnl > 0 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : item.pnl < 0 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                        : 'bg-white/5 border-white/5 text-slate-400'
                  }`}
                >
                  <span className="font-bold block mb-1 text-slate-400">{item.hour}</span>
                  <span className="font-extrabold text-[11px]">${item.pnl.toFixed(0)}</span>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between text-[9px] text-slate-500 pt-1">
              <span>Melhor: {pNames.bestHour}</span>
              <span>Pior: {pNames.worstHour}</span>
            </div>
          </div>

          {/* TOP 5 PAIRS TABLE */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <PieChart className="h-4 w-4 text-purple-400" /> Rendimento por Par
            </h3>

            <div className="space-y-2">
              {charts.pnlByPair.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-white/5 border border-white/5 rounded-xl text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{item.name}</span>
                  </div>
                  <span className={`font-extrabold ${item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.pnl >= 0 ? '+' : ''}${item.pnl.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
