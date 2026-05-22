'use client';

import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, BarChart4, TrendingDown, HelpCircle, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const TOP_20_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT',
  'XRPUSDT', 'DOTUSDT', 'DOGEUSDT', 'LTCUSDT', 'LINKUSDT',
  'MATICUSDT', 'TRXUSDT', 'BCHUSDT', 'ETCUSDT', 'SHIBUSDT',
  'AVAXUSDT', 'XLMUSDT', 'ATOMUSDT', 'UNIUSDT', 'LDOUSDT'
];

interface DcaLevel {
  level: number;
  label: string;
  price: number;
  cost: number;
  qty: number;
  totalCost: number;
  totalQty: number;
  averagePrice: number;
  dropFromEntry: number;
}

export default function DCACalculator() {
  const [mounted, setMounted] = useState(false);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [searchQuery, setSearchQuery] = useState('BTCUSDT');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Inputs
  const [initialPrice, setInitialPrice] = useState(65000);
  const [firstOrderUsdt, setFirstOrderUsdt] = useState(100);
  const [levelsCount, setLevelsCount] = useState(4); // 4 levels
  const [priceStepPercent, setPriceStepPercent] = useState(3.0); // 3% drop per step
  const [sizeMultiplier, setSizeMultiplier] = useState(1.5); // 1.5x martingale
  const [fetchingPrice, setFetchingPrice] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch live price when symbol changes
  useEffect(() => {
    async function loadLivePrice() {
      if (!symbol) return;
      setFetchingPrice(true);
      try {
        const priceRes = await fetch(`/api/binance/price?symbol=${symbol}`);
        const priceData = await priceRes.json();
        if (priceData && priceData.price) {
          setInitialPrice(parseFloat(priceData.price));
        }
      } catch (e) {
        console.error('Error fetching symbol price', e);
      } finally {
        setFetchingPrice(false);
      }
    }
    loadLivePrice();
  }, [symbol]);

  // Compute DCA Grid levels
  const generateDcaLevels = (): DcaLevel[] => {
    const list: DcaLevel[] = [];
    let cumulativeCost = 0;
    let cumulativeQty = 0;

    for (let i = 0; i < levelsCount; i++) {
      const levelNum = i + 1;
      // Price drops by step percent at each level (level 1 is initial price)
      const price = initialPrice * (1 - (priceStepPercent * i) / 100);
      
      // Cost multiplies at each level (e.g. 100, 150, 225, etc.)
      const cost = firstOrderUsdt * Math.pow(sizeMultiplier, i);
      const qty = cost / price;

      cumulativeCost += cost;
      cumulativeQty += qty;
      const averagePrice = cumulativeCost / cumulativeQty;
      const dropFromEntry = ((initialPrice - averagePrice) / initialPrice) * 100;

      list.push({
        level: levelNum,
        label: i === 0 ? 'Entrada 1' : `Ordem DCA ${i}`,
        price,
        cost,
        qty,
        totalCost: cumulativeCost,
        totalQty: cumulativeQty,
        averagePrice,
        dropFromEntry
      });
    }

    return list;
  };

  const levels = generateDcaLevels();
  const finalLevel = levels[levels.length - 1] || { totalCost: 0, averagePrice: initialPrice, dropFromEntry: 0 };
  const totalCost = finalLevel.totalCost;
  const averagePrice = finalLevel.averagePrice;
  const priceImprovement = ((initialPrice - averagePrice) / initialPrice) * 100;

  // Chart Data preparation
  const chartData = levels.map((lvl) => ({
    name: lvl.label,
    'Preço da Ordem': Math.round(lvl.price),
    'Preço Médio': Math.round(lvl.averagePrice)
  }));

  const handleSelectSymbol = (s: string) => {
    setSymbol(s);
    setSearchQuery(s);
    setShowDropdown(false);
  };

  const filteredPairs = TOP_20_PAIRS.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Parameters */}
      <div className="lg:col-span-5 bg-[#0d0e15]/60 border border-slate-900 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-cyan-500/5 blur-[120px] rounded-full -mr-20 -mt-20"></div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold text-slate-200 tracking-tight">Configurar Grade DCA</h3>
          </div>
          {fetchingPrice && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Live price...
            </span>
          )}
        </div>

        <div className="space-y-5">
          {/* Pair with autocomplete */}
          <div className="relative">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Selecione o Par</label>
            <input
              type="text"
              className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value.toUpperCase());
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && filteredPairs.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-[#0a0b10] border border-slate-800 rounded-xl z-50 p-1 shadow-2xl">
                {filteredPairs.map((pair) => (
                  <button
                    key={pair}
                    className="w-full text-left px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-cyan-500/10 transition-all"
                    onClick={() => handleSelectSymbol(pair)}
                  >
                    {pair}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pricing inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Preço Inicial (USDT)</label>
              <input
                type="number"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-cyan-500/30"
                value={initialPrice}
                onChange={(e) => setInitialPrice(Math.max(0.000001, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Ordem de Entrada (USDT)</label>
              <input
                type="number"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-cyan-500/30"
                value={firstOrderUsdt}
                onChange={(e) => setFirstOrderUsdt(Math.max(1, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>

          {/* DCA Level quantity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider font-black">Níveis da Grade</span>
              <span className="text-xs font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                {levelsCount} Ordens Totais
              </span>
            </div>
            <div className="p-4 bg-[#12131b]/60 border border-slate-900 rounded-xl">
              <input
                type="range"
                min="2"
                max="8"
                className="w-full accent-cyan-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                value={levelsCount}
                onChange={(e) => setLevelsCount(parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Price Separation % */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider font-black">Espaçamento de Preço</span>
              <span className="text-xs font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                -{priceStepPercent}% por nível
              </span>
            </div>
            <div className="p-4 bg-[#12131b]/60 border border-slate-900 rounded-xl">
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                className="w-full accent-cyan-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                value={priceStepPercent}
                onChange={(e) => setPriceStepPercent(parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Scale Multiplier */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider font-black">Multiplicador de Tamanho</span>
              <span className="text-xs font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                {sizeMultiplier}x Martingale
              </span>
            </div>
            <div className="p-4 bg-[#12131b]/60 border border-slate-900 rounded-xl">
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                className="w-full accent-cyan-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                value={sizeMultiplier}
                onChange={(e) => setSizeMultiplier(parseFloat(e.target.value))}
              />
              <div className="flex justify-between text-[9px] font-bold text-slate-600 mt-2">
                <span>1.0x (Grade Plana)</span>
                <span>1.5x (Moderado)</span>
                <span>2.0x (Martingale Forte)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid result and Graph */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Metric widgets */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Custo Total da Grade</span>
            <span className="text-base font-black text-slate-200 mt-1">
              {totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          </div>
          <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Preço Médio Final</span>
            <span className="text-base font-black text-slate-200 mt-1">
              ${averagePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-4 flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Melhoria de Custo</span>
            <span className="text-base font-black text-emerald-400 mt-1">
              +{priceImprovement.toFixed(2)}%
            </span>
            <span className="text-[9px] font-black text-slate-500">Abaixo do Preço Inicial</span>
          </div>
        </div>

        {/* Recharts chart representation */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md h-[260px] flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-cyan-500/5 blur-[95px] rounded-full -mr-16 -mt-16"></div>
          
          <h3 className="text-sm font-extrabold text-slate-200 tracking-tight mb-4 flex items-center gap-1.5">
            <BarChart4 className="w-4 h-4 text-cyan-400" /> Comparativo de Preço: Grade vs Preço Médio
          </h3>
          
          <div className="flex-1 w-full min-h-[170px]">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12131a" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    domain={['auto', 'auto']} 
                    tickLine={false}
                    tickFormatter={(val) => `$${val.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'extrabold' }}
                  />
                  <ReferenceLine y={initialPrice} stroke="#64748b" strokeWidth={1} label={{ value: 'Entrada Inicial', fill: '#64748b', fontSize: 9, position: 'top' }} />
                  <Line type="monotone" dataKey="Preço da Ordem" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Preço Médio" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                Carregando gráfico...
              </div>
            )}
          </div>
        </div>

        {/* DCA levels table */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3.5 bg-slate-950/30 border-b border-slate-900">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Planilha das Ordens DCA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/20 text-slate-500 font-black border-b border-slate-900">
                  <th className="px-5 py-3">Ordem</th>
                  <th className="px-5 py-3">Preço Acionador</th>
                  <th className="px-5 py-3">Tamanho (USDT)</th>
                  <th className="px-5 py-3">Qtd Acumulada</th>
                  <th className="px-5 py-3">Preço Médio Novo</th>
                  <th className="px-5 py-3 text-right">Melhoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {levels.map((lvl) => (
                  <tr key={lvl.level} className="hover:bg-slate-900/20 font-bold text-slate-300">
                    <td className="px-5 py-3 text-slate-400 font-extrabold">{lvl.label}</td>
                    <td className="px-5 py-3">${lvl.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3">${lvl.cost.toFixed(2)}</td>
                    <td className="px-5 py-3">{lvl.totalQty.toFixed(4)}</td>
                    <td className="px-5 py-3 text-cyan-400 font-extrabold">
                      ${lvl.averagePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right text-emerald-400 font-black">
                      {lvl.dropFromEntry > 0 ? `-${lvl.dropFromEntry.toFixed(2)}%` : '0.00%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
