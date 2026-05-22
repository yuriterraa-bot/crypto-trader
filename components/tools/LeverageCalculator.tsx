'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, RefreshCw, Sparkles } from 'lucide-react';

const TOP_20_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT',
  'XRPUSDT', 'DOTUSDT', 'DOGEUSDT', 'LTCUSDT', 'LINKUSDT',
  'MATICUSDT', 'TRXUSDT', 'BCHUSDT', 'ETCUSDT', 'SHIBUSDT',
  'AVAXUSDT', 'XLMUSDT', 'ATOMUSDT', 'UNIUSDT', 'LDOUSDT'
];

export default function LeverageCalculator() {
  const router = useRouter();
  
  // Input states
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [searchQuery, setSearchQuery] = useState('BTCUSDT');
  const [showDropdown, setShowDropdown] = useState(false);
  const [balance, setBalance] = useState(10000); // Default fallback
  const [balancePercent, setBalancePercent] = useState(10); // Default 10%
  const [leverage, setLeverage] = useState(10); // Default 10x
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState(65000);
  const [stopLossPercent, setStopLossPercent] = useState(2);
  const [takeProfitPercent, setTakeProfitPercent] = useState(6);
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Fetch account balance and live price
  useEffect(() => {
    async function loadAccountData() {
      try {
        const balRes = await fetch('/api/binance/balance');
        const balData = await balRes.json();
        const balVal = balData.balance || balData.data?.balance || balData.total || balData.availableBalance;
        if (balVal) setBalance(Math.max(10, parseFloat(balVal)));
      } catch (e) {
        console.warn('Could not fetch Binance balance, using mock:', e);
      }
    }
    loadAccountData();
  }, []);

  useEffect(() => {
    async function loadLivePrice() {
      if (!symbol) return;
      setFetchingPrice(true);
      try {
        const priceRes = await fetch(`/api/binance/price?symbol=${symbol}`);
        const priceData = await priceRes.json();
        if (priceData && priceData.price) {
          const p = parseFloat(priceData.price);
          setEntryPrice(p);
        }
      } catch (e) {
        console.error('Error fetching symbol price', e);
      } finally {
        setFetchingPrice(false);
      }
    }
    loadLivePrice();
  }, [symbol]);

  // Derived calculations
  const positionUsdt = (balance * balancePercent) / 100;
  const leveragedSizeUsdt = positionUsdt * leverage;
  const requiredMargin = positionUsdt; // Leveraged Size / Leverage
  const positionQty = leveragedSizeUsdt / entryPrice;

  // Stop loss and take profit prices
  const stopLossPrice = direction === 'LONG'
    ? entryPrice * (1 - stopLossPercent / 100)
    : entryPrice * (1 + stopLossPercent / 100);

  const takeProfitPrice = direction === 'LONG'
    ? entryPrice * (1 + takeProfitPercent / 100)
    : entryPrice * (1 - takeProfitPercent / 100);

  // Liquidation Price
  // Long: price * (1 - 1/leverage)
  // Short: price * (1 + 1/leverage)
  const liquidationPrice = direction === 'LONG'
    ? entryPrice * (1 - 1 / leverage)
    : entryPrice * (1 + 1 / leverage);

  const totalRiskUsdt = (leveragedSizeUsdt * stopLossPercent) / 100;
  const totalProfitUsdt = (leveragedSizeUsdt * takeProfitPercent) / 100;
  const riskRewardRatio = stopLossPercent > 0 ? (takeProfitPercent / stopLossPercent).toFixed(2) : '0';

  // Warnings
  const isLeverageWarning = leverage > 10;
  const isLeverageDanger = leverage > 50;
  const isLossWarning = totalRiskUsdt > balance * 0.1; // Risking > 10% of total balance
  
  // Liquidation before Stop Loss risk check
  const isLiqBeforeSl = direction === 'LONG' 
    ? liquidationPrice > stopLossPrice 
    : liquidationPrice < stopLossPrice;

  // New contextual alerts
  const isLowBalanceHighLev = balance < 50 && leverage > 10;
  const marginPercent = balance > 0 ? (requiredMargin / balance) * 100 : 0;
  const isHighMarginUsage = marginPercent > 20;

  const distToLiq = direction === 'LONG'
    ? entryPrice > 0 ? (entryPrice - liquidationPrice) / entryPrice * 100 : 100
    : entryPrice > 0 ? (liquidationPrice - entryPrice) / entryPrice * 100 : 100;
  const isLiqVeryClose = distToLiq < 5;
  const isLiqClose = distToLiq >= 5 && distToLiq < 10;

  const handleSelectSymbol = (s: string) => {
    setSymbol(s);
    setSearchQuery(s);
    setShowDropdown(false);
  };

  const handleUseInOrderTicket = () => {
    const payload = {
      symbol,
      leverage,
      direction,
      entryPrice,
      sizeUSDT: leveragedSizeUsdt.toFixed(2),
      stopLossPercent,
      takeProfitPercent,
      slPrice: stopLossPrice.toFixed(2),
      tpPrice: takeProfitPrice.toFixed(2),
      timestamp: Date.now()
    };
    localStorage.setItem('pending_leverage_calc', JSON.stringify(payload));
    router.push('/trade');
  };

  const filteredPairs = TOP_20_PAIRS.filter(p => p.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration Card */}
      <div className="lg:col-span-7 bg-[#0d0e15]/60 border border-slate-900 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 blur-[120px] rounded-full -mr-20 -mt-20"></div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
            <h3 className="text-base font-extrabold text-slate-200 tracking-tight">Parâmetros de Operação</h3>
          </div>
          {fetchingPrice && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
              <RefreshCw className="w-3 h-3 animate-spin" /> Atualizando preço...
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Pair Input with autocomplete */}
          <div className="relative">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Par Cripto (Top 20)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value.toUpperCase());
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              <button 
                onClick={() => setSymbol(searchQuery)}
                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 rounded-xl text-xs font-black hover:bg-indigo-500/20 transition-all"
              >
                Carregar
              </button>
            </div>
            {showDropdown && filteredPairs.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 max-h-56 overflow-y-auto bg-[#0a0b10] border border-slate-800 rounded-xl z-50 p-1 shadow-2xl">
                {filteredPairs.map((pair) => (
                  <button
                    key={pair}
                    className="w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-indigo-500/10 transition-all flex items-center justify-between"
                    onClick={() => handleSelectSymbol(pair)}
                  >
                    <span>{pair}</span>
                    <span className="text-[10px] text-slate-600">Futures</span>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && filteredPairs.length === 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-[#0a0b10] border border-slate-850 rounded-xl z-50 p-4 text-center text-xs font-bold text-slate-500">
                Nenhum par correspondente.
              </div>
            )}
          </div>

          {/* Direction and Entry Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Direção</label>
              <div className="grid grid-cols-2 p-1 bg-[#12131b] border border-slate-900/80 rounded-xl">
                <button
                  onClick={() => setDirection('LONG')}
                  className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> BUY
                </button>
                <button
                  onClick={() => setDirection('SHORT')}
                  className={`py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${direction === 'SHORT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <TrendingDown className="w-3.5 h-3.5" /> SELL
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Preço de Entrada (USDT)</label>
              <input
                type="number"
                step="any"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Math.max(0.000001, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>

          {/* Available balance and % slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider font-black">Saldo Disponível</span>
              <span className="text-indigo-400 font-extrabold">{balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
            </div>
            <div className="p-4 bg-[#12131b]/60 border border-slate-900 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Margem de Operação</span>
                <span className="text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                  {balancePercent}% ({positionUsdt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                value={balancePercent}
                onChange={(e) => setBalancePercent(parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Leverage slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400 uppercase tracking-wider font-black">Alavancagem</span>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md ${isLeverageDanger ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : isLeverageWarning ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {leverage}x
              </span>
            </div>
            <div className="p-4 bg-[#12131b]/60 border border-slate-900 rounded-xl space-y-3">
              <input
                type="range"
                min="1"
                max="125"
                className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
              />
              <div className="flex justify-between text-[9px] font-bold text-slate-600">
                <span>1x (Conservador)</span>
                <span>20x (Moderado)</span>
                <span>50x (Alto Risco)</span>
                <span>125x (Extremo)</span>
              </div>
            </div>
          </div>

          {/* SL & TP target settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Stop Loss (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-red-500/30 focus:ring-1 focus:ring-red-500/20"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(Math.max(0.01, parseFloat(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Take Profit (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-100 focus:outline-none focus:border-emerald-500/30 focus:ring-1 focus:ring-emerald-500/20"
                value={takeProfitPercent}
                onChange={(e) => setTakeProfitPercent(Math.max(0.01, parseFloat(e.target.value) || 0))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Real Time Output Card */}
        <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/5 blur-[90px] rounded-full -mr-16 -mt-16"></div>
          
          <h3 className="text-base font-extrabold text-slate-200 tracking-tight mb-5 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Prospecção da Operação
          </h3>

          <div className="space-y-4">
            {/* Real Size */}
            <div className="p-4 bg-indigo-500/[0.02] border border-slate-900 rounded-xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tamanho Real da Posição</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-extrabold text-slate-100">
                  {leveragedSizeUsdt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  ~{positionQty.toFixed(4)} {symbol.replace('USDT', '')}
                </span>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 px-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Margem Necessária:</span>
                <span className="text-slate-200 font-black">
                  {requiredMargin.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Relação Risco/Retorno:</span>
                <span className="text-indigo-400 font-black">1 : {riskRewardRatio}</span>
              </div>
              
              <div className="border-t border-slate-900/60 my-2"></div>

              {/* Take Profit Target */}
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold flex items-center gap-1">Alvo Take Profit:</span>
                <span className="text-emerald-400 font-black">
                  ${takeProfitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px] ml-4">Retorno Esperado:</span>
                <span className="text-emerald-500/80 text-[11px] font-bold">
                  +{totalProfitUsdt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
              </div>

              {/* Stop Loss Target */}
              <div className="flex justify-between mt-1">
                <span className="text-slate-400 font-bold">Limite Stop Loss:</span>
                <span className="text-rose-400 font-black">
                  ${stopLossPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px] ml-4">Risco Total da Posição:</span>
                <span className="text-rose-500/80 text-[11px] font-bold">
                  -{totalRiskUsdt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
              </div>

              {/* Liquidation Price */}
              <div className="flex justify-between mt-1">
                <span className="text-slate-400 font-bold">Preço de Liquidação:</span>
                <span className="text-amber-500 font-black">
                  ${liquidationPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Warnings Alert Section */}
            <div className="space-y-2 mt-4">
              {isLeverageDanger && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs font-bold leading-normal animate-pulse">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <span className="font-extrabold text-rose-300">Risco Extremo Detectado:</span> Alavancagem acima de 50x possui altíssimo risco de liquidação por ruído de preço.
                  </div>
                </div>
              )}

              {isLeverageWarning && !isLeverageDanger && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs font-bold leading-normal">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="font-extrabold text-amber-300">Atenção Médio Risco:</span> Operar acima de 10x requer um stop loss disciplinado e estreito.
                  </div>
                </div>
              )}

              {isLossWarning && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-rose-400 text-xs font-bold leading-normal">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <span className="font-extrabold text-rose-300">Exposição Inadequada:</span> Você está arriscando mais do que 10% da sua banca total nesta única operação!
                  </div>
                </div>
              )}

              {isLiqBeforeSl && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-rose-400 text-xs font-bold leading-normal">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500 font-extrabold" />
                  <div>
                    <span className="font-extrabold text-rose-300">Risco Crítico de Liquidação:</span> O preço de liquidação está posicionado antes do Stop Loss! Reduza a alavancagem ou diminua a distância do Stop Loss.
                  </div>
                </div>
              )}

            {/* New contextual alerts */}
              {isLowBalanceHighLev && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold leading-normal animate-pulse">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <span className="font-extrabold text-rose-200">Saldo Muito Baixo para Esta Alavancagem:</span> Com saldo abaixo de $50 e {leverage}x, qualquer movimento pequeno pode causar liquidação imediata.
                  </div>
                </div>
              )}

              {isHighMarginUsage && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-300 text-xs font-bold leading-normal">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-extrabold text-amber-200">Alta Exposição de Margem:</span> Esta operação usa {marginPercent.toFixed(1)}% do seu saldo disponível como margem. Recomendado: máximo 20%.
                  </div>
                </div>
              )}

              {isLiqVeryClose && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold leading-normal animate-pulse">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <span className="font-extrabold text-rose-200">Liquidação Crítica:</span> O preço de liquidação está a apenas {distToLiq.toFixed(2)}% do preço de entrada. Qualquer spike de mercado liquida sua posição.
                  </div>
                </div>
              )}

              {isLiqClose && !isLiqVeryClose && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-bold leading-normal">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                  <div>
                    <span className="font-extrabold text-orange-200">Liquidação Próxima:</span> Distância até liquidação de {distToLiq.toFixed(2)}%. Considere reduzir a alavancagem.
                  </div>
                </div>
              )}

              {!isLeverageWarning && !isLossWarning && !isLiqBeforeSl && !isLowBalanceHighLev && !isHighMarginUsage && !isLiqVeryClose && !isLiqClose && (
                <div className="flex gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-bold leading-normal">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <div>
                    <span className="font-extrabold text-emerald-300">Gestão Aprovada:</span> Alavancagem e limites dentro de parâmetros profissionais e saudáveis.
                  </div>
                </div>
              )}
            </div>
            
            {/* CTA button */}
            <button
              onClick={handleUseInOrderTicket}
              className="w-full mt-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-extrabold text-xs py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            >
              📥 Usar na Boleta de Ordens Futures
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
