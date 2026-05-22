'use client';

import React, { useState } from 'react';
import { Percent, TrendingUp, ShieldAlert, Sparkles, Scale, Info } from 'lucide-react';

export default function PositionSizing() {
  const [balance, setBalance] = useState(10000);
  const [winRate, setWinRate] = useState(55); // 55% Win Rate
  const [rrRatio, setRrRatio] = useState(2.0); // 2:1 Reward to Risk
  const [fixedRiskPercent, setFixedRiskPercent] = useState(1.5); // 1.5% Risk

  // Kelly Criterion Calculation:
  // f* = (p * b - q) / b
  // where:
  // p = winRate (as decimal)
  // b = rrRatio (Reward to Risk ratio)
  // q = 1 - p (lossRate as decimal)
  const p = winRate / 100;
  const b = rrRatio;
  const q = 1 - p;
  
  const rawKelly = b > 0 ? (p * b - q) / b : 0;
  const kellyPercent = Math.max(0, rawKelly * 100);
  const kellySizeUsdt = (balance * kellyPercent) / 100;

  // Fractional Kelly (Half Kelly - 50% of kelly recommended for safer portfolio growth)
  const halfKellyPercent = kellyPercent / 2;
  const halfKellySizeUsdt = (balance * halfKellyPercent) / 100;

  // Fixed Sizing
  const fixedRiskUsdt = (balance * fixedRiskPercent) / 100;
  // If stop loss is e.g. 5% of price, leverage 10x, then risk per trade is leveraged size * stop% / 100
  // Position size recommended = FixedRiskUsdt / (Stop Loss % / 100)
  const defaultStopPercent = 3.0; // Assume a generic 3% stop loss for standard sizing
  const recommendedFixedSize = fixedRiskUsdt / (defaultStopPercent / 100);

  // Consecutive Loss Probabilities: P(N) = (1 - p) ^ N
  const consecutiveLosses = Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    const probability = Math.pow(1 - p, n) * 100;
    return {
      count: n,
      probability: probability
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Parameters */}
      <div className="lg:col-span-6 bg-[#0d0e15]/60 border border-slate-900 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-emerald-500/5 blur-[120px] rounded-full -mr-20 -mt-20"></div>

        <div className="flex items-center gap-2 mb-6">
          <Scale className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-extrabold text-slate-200 tracking-tight">Métricas de Probabilidade</h3>
        </div>

        <div className="space-y-6">
          {/* Account Balance input */}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Banca Total (USDT)</label>
            <input
              type="number"
              className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              value={balance}
              onChange={(e) => setBalance(Math.max(1, parseFloat(e.target.value) || 0))}
            />
          </div>

          {/* Win Rate Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider font-black">Taxa de Acerto Esperada</span>
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md">
                {winRate}%
              </span>
            </div>
            <div className="p-4 bg-[#12131b]/60 border border-slate-900 rounded-xl space-y-2">
              <input
                type="range"
                min="10"
                max="90"
                className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                value={winRate}
                onChange={(e) => setWinRate(parseInt(e.target.value))}
              />
              <div className="flex justify-between text-[9px] font-bold text-slate-600">
                <span>10% (Fraco)</span>
                <span>50% (Equilibrado)</span>
                <span>90% (Excelente)</span>
              </div>
            </div>
          </div>

          {/* RRatio Input */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Média Win/Loss Ratio</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-emerald-500/30"
                value={rrRatio}
                onChange={(e) => setRrRatio(Math.max(0.1, parseFloat(e.target.value) || 0))}
              />
              <span className="text-[10px] text-slate-600 font-bold block mt-1">Ex: 2.0 = Ganhos são 2x as perdas</span>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Risco Fixo por Trade (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-emerald-500/30"
                value={fixedRiskPercent}
                onChange={(e) => setFixedRiskPercent(Math.max(0.01, parseFloat(e.target.value) || 0))}
              />
              <span className="text-[10px] text-slate-600 font-bold block mt-1">Geralmente recomendado: 1% a 2%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results and Probability Matrix */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        {/* Sizing Recommendations */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-emerald-500/5 blur-[95px] rounded-full -mr-16 -mt-16"></div>

          <h3 className="text-base font-extrabold text-slate-200 tracking-tight mb-4 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" /> Dimensionamento Técnico
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Half Kelly - Standard professional size */}
            <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl relative">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded absolute top-3 right-3">Recomendado</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Meio-Kelly (Conservador)</span>
              <div className="text-lg font-black text-slate-100 mt-1">
                {halfKellySizeUsdt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
              <span className="text-[10px] text-slate-500 font-bold">({halfKellyPercent.toFixed(2)}% do Capital)</span>
            </div>

            {/* Fixed Risk Sizing */}
            <div className="p-4 bg-indigo-500/[0.02] border border-slate-900 rounded-xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Risco Fixo ({fixedRiskPercent}%)</span>
              <div className="text-lg font-black text-slate-100 mt-1">
                {fixedRiskUsdt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>
              <span className="text-[10px] text-slate-500 font-bold">Risco Máximo Permitido</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold">Kelly Pleno (100% Kelly):</span>
              <span className="text-slate-300 font-black">
                {kellyPercent > 0 
                  ? `${kellyPercent.toFixed(1)}% (${kellySizeUsdt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})`
                  : 'Matematicamente Inviável (Esperança P&L Negativa)'
                }
              </span>
            </div>
            {kellyPercent === 0 && (
              <div className="flex gap-2 p-2 rounded bg-rose-500/5 border border-rose-500/10 text-[11px] font-bold text-rose-400 leading-normal mt-2">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>
                  A combinação de Taxa de Acerto e Relação Win/Loss resulta em valor esperado negativo. Não é seguro operar esse setup!
                </span>
              </div>
            )}
            <div className="flex gap-1.5 items-start text-[10px] text-slate-500 font-bold mt-2 pt-2 border-t border-slate-900/60 leading-normal">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>
                O **Meio-Kelly** reduz a volatilidade do portfólio em 50% enquanto preserva aproximadamente 75% da taxa máxima de crescimento geométrico do seu capital.
              </span>
            </div>
          </div>
        </div>

        {/* Consecutive Loss Probability */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex-1">
          <h3 className="text-base font-extrabold text-slate-200 tracking-tight mb-4">
            Probabilidade de Perdas Consecutivas
          </h3>
          <p className="text-[11px] font-bold text-slate-500 mb-4 leading-normal">
            Com base em estatística pura, abaixo está a chance matemática de você sofrer X perdas consecutivas operando este setup ao longo do tempo.
          </p>

          <div className="space-y-2.5">
            {consecutiveLosses.map((item) => {
              // Color spectrum from green to red based on count
              const barColor = item.probability < 1 
                ? 'bg-emerald-500' 
                : item.probability < 5 
                ? 'bg-amber-500' 
                : 'bg-rose-500';

              return (
                <div key={item.count} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">{item.count} Perda{item.count > 1 ? 's' : ''} Consecutiva{item.count > 1 ? 's' : ''}:</span>
                    <span className={`font-black ${item.probability < 1 ? 'text-emerald-400' : item.probability < 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {item.probability.toFixed(3)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#12131b] h-1.5 rounded-full overflow-hidden border border-slate-950">
                    <div 
                      className={`${barColor} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, item.probability)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
