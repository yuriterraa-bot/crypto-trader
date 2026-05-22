'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Info, 
  Coins, 
  Percent,
  Calculator,
  AlertTriangle
} from 'lucide-react';

// Custom Simple Tabs Component to replace shadcn Tabs
const SimpleTabs = ({ 
  value, 
  onChange, 
  options 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string }[]; 
}) => (
  <div className="w-full flex p-1 bg-[#1a202c] rounded-lg border border-slate-800">
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        type="button"
        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
          value === opt.value 
            ? 'bg-indigo-600 text-white shadow' 
            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default function OrderTicket({ activeSymbol }: { activeSymbol?: string } = {}) {
  const [symbol, setSymbol] = useState(activeSymbol || 'BTCUSDT');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [orderType, setOrderType] = useState('MARKET');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [leverage, setLeverage] = useState(10);
  
  // Risk & Wallet Sizing
  const [riskPercent, setRiskPercent] = useState(1); // Defaults to 1% risk
  const [customMargin, setCustomMargin] = useState(''); // User manual margin setting
  const [isManualMargin, setIsManualMargin] = useState(false); // Toggle between suggested and manual margin

  useEffect(() => {
    if (activeSymbol) {
      setSymbol(activeSymbol);
    }
  }, [activeSymbol]);

  const [limitPrice, setLimitPrice] = useState('');
  const [slEnabled, setSlEnabled] = useState(true); // Enabled by default for risk calculation
  const [slValue, setSlValue] = useState('1.5'); // Default 1.5% Stop Loss
  const [slType, setSlType] = useState('PERCENT'); // PRICE or PERCENT

  const [tpEnabled, setTpEnabled] = useState(true);
  const [tpValue, setTpValue] = useState('3.0'); // Default 3.0% Take Profit
  const [tpType, setTpType] = useState('PERCENT'); // PRICE or PERCENT

  const [balance, setBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [mode, setMode] = useState('demo');
  const [copied, setCopied] = useState(false);

  // Col Right data
  const [signal, setSignal] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => {
    try {
      const pendingStr = localStorage.getItem('pending_leverage_calc');
      if (pendingStr) {
        const pending = JSON.parse(pendingStr);
        if (Date.now() - pending.timestamp < 120 * 1000) {
          if (pending.symbol) setSymbol(pending.symbol);
          if (pending.leverage) setLeverage(pending.leverage);
          if (pending.direction) {
            setSide(pending.direction === 'LONG' ? 'BUY' : 'SELL');
          }
          if (pending.slPrice) {
            setSlEnabled(true);
            setSlType('PRICE');
            setSlValue(pending.slPrice);
          }
          if (pending.tpPrice) {
            setTpEnabled(true);
            setTpType('PRICE');
            setTpValue(pending.tpPrice);
          }
        }
        localStorage.removeItem('pending_leverage_calc');
      }
    } catch (e) {
      console.error('Error loading pending leverage calculator', e);
    }
  }, []);

  const fetchData = async () => {
    try {
      // 1. Get Balance & Account Overview
      const balRes = await axios.get('/api/account/overview');
      if (balRes.data) {
        setBalance(balRes.data.walletBalance || 0);
        setAvailableBalance(balRes.data.availableBalance || 0);
        setMode(balRes.data.mode || 'demo');
      }

      // 2. Get Price
      const priceRes = await axios.get(`/api/binance/price?symbol=${symbol}`);
      if (priceRes.data && priceRes.data.price) {
        setCurrentPrice(parseFloat(priceRes.data.price));
      }

      // 3. Get Signal
      const sigRes = await axios.get('/api/signal');
      if (sigRes.data && sigRes.data.success) {
        setSignal(sigRes.data.data[symbol]);
      }

      // 4. Get Positions
      const posRes = await axios.get(`/api/orders?symbol=${symbol}`);
      const posData = posRes.data;
      const validPositions = Array.isArray(posData) ? posData : 
        (posData?.data ? posData.data : (posData?.positions ? posData.positions : []));
      setPositions(validPositions);
    } catch (e) {
      console.error('Error fetching order ticket data', e);
    }
  };

  // Entry Price determination
  const getEntryPrice = () => {
    if (orderType === 'MARKET') return currentPrice;
    return parseFloat(limitPrice) || currentPrice;
  };

  // Stop Loss Price calculation
  const getEstSlPrice = () => {
    if (!slEnabled || !slValue || currentPrice === 0) return null;
    const entry = getEntryPrice();
    if (slType === 'PRICE') return parseFloat(slValue);
    
    // Percent
    const pct = parseFloat(slValue) / 100;
    return side === 'BUY' ? entry * (1 - pct) : entry * (1 + pct);
  };

  // Take Profit Price calculation
  const getEstTpPrice = () => {
    if (!tpEnabled || !tpValue || currentPrice === 0) return null;
    const entry = getEntryPrice();
    if (tpType === 'PRICE') return parseFloat(tpValue);
    
    // Percent
    const pct = parseFloat(tpValue) / 100;
    return side === 'BUY' ? entry * (1 + pct) : entry * (1 - pct);
  };

  // CALCULATIONS FOR SIMULATOR
  const entryPrice = getEntryPrice();
  const stopLossPrice = getEstSlPrice();
  const takeProfitPrice = getEstTpPrice();

  // Unleverage Loss percentage
  const unleveragedLossPct = (stopLossPrice && entryPrice > 0) 
    ? Math.abs(entryPrice - stopLossPrice) / entryPrice 
    : 0;

  // Target risk amount in USDT
  const capitalToUse = availableBalance || balance || 1000; // Fallback to 1000 if balance is 0
  const riskAmount = capitalToUse * (riskPercent / 100);

  // Suggested trade parameters
  const suggestedPositionValue = unleveragedLossPct > 0 ? (riskAmount / unleveragedLossPct) : 0;
  const suggestedMargin = leverage > 0 ? (suggestedPositionValue / leverage) : 0;

  // Actual parameters to show (Manual or Suggested)
  const actualMargin = isManualMargin ? (parseFloat(customMargin) || 0) : suggestedMargin;
  const actualPositionValue = actualMargin * leverage;
  
  // Real risk amount for selected parameters
  const actualRiskAmount = actualPositionValue * unleveragedLossPct;
  const actualRiskPercent = capitalToUse > 0 ? (actualRiskAmount / capitalToUse) * 100 : 0;

  // Estimated reward amount
  const unleveragedGainPct = (takeProfitPrice && entryPrice > 0)
    ? Math.abs(takeProfitPrice - entryPrice) / entryPrice
    : 0;
  const expectedGain = actualPositionValue * unleveragedGainPct;
  const expectedGainPercent = capitalToUse > 0 ? (expectedGain / capitalToUse) * 100 : 0;

  // Risk / Reward Ratio
  const rrRatio = (unleveragedLossPct > 0 && unleveragedGainPct > 0) 
    ? (unleveragedGainPct / unleveragedLossPct) 
    : 0;

  // Copy trade specifications to Clipboard
  const handleCopyAnalysis = () => {
    if (!entryPrice) return;
    
    const formattedEntry = entryPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
    const formattedSL = stopLossPrice ? stopLossPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' }) : 'Não Definido';
    const formattedTP = takeProfitPrice ? takeProfitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' }) : 'Não Definido';
    const formattedMargin = actualMargin.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
    const formattedRealSize = actualPositionValue.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
    
    const text = `⚡ *SIMULAÇÃO DE TRADE - SWING TRADE* ⚡
-----------------------------------------
📈 *Par:* ${symbol}
🧭 *Direção:* ${side === 'BUY' ? 'COMPRA / LONG 🟢' : 'VENDA / SHORT 🔴'}
⚙️ *Alavancagem:* ${leverage}x
💸 *Preço de Entrada:* ${formattedEntry}
-----------------------------------------
🛑 *Stop Loss:* ${formattedSL} (${slType === 'PERCENT' ? `${slValue}%` : 'Preço Fixo'})
🛡️ *Risco Projetado:* ${actualRiskAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })} (${actualRiskPercent.toFixed(2)}% da banca)

🎯 *Take Profit:* ${formattedTP} (${tpType === 'PERCENT' ? `${tpValue}%` : 'Preço Fixo'})
💰 *Retorno Projetado:* ${expectedGain.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })} (${expectedGainPercent.toFixed(2)}% da banca)

📊 *Relação Risco/Retorno (R:R):* 1 : ${rrRatio.toFixed(2)}
-----------------------------------------
📐 *Margem Recomendada:* ${formattedMargin}
⚖️ *Tamanho Alavancado:* ${formattedRealSize}

⚠️ *Aviso:* Simulador exclusivo para análise quantitativa. Execute as ordens na sua plataforma Binance.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getLeverageWarning = () => {
    if (leverage > 50) return { text: '⚠️ Alavancagem extrema! Alto risco de liquidação rápida.', color: 'text-red-400 bg-red-950/20 border-red-900/50' };
    if (leverage > 20) return { text: '⚠️ Alavancagem alta. Indicado apenas para traders experientes.', color: 'text-orange-400 bg-orange-950/20 border-orange-900/50' };
    return null;
  };

  const getRRBadgeInfo = () => {
    if (!slEnabled || !tpEnabled) return { text: 'Defina SL & TP', color: 'text-slate-400 bg-slate-900 border-slate-800' };
    if (rrRatio >= 2.5) return { text: '💎 Excelente R:R (Premium)', color: 'text-emerald-400 bg-emerald-950/25 border-emerald-900/50' };
    if (rrRatio >= 1.5) return { text: '✅ Bom R:R (Adequado)', color: 'text-indigo-400 bg-indigo-950/25 border-indigo-900/50' };
    return { text: '🚨 R:R Ruim (Risco Alto)', color: 'text-rose-450 bg-rose-950/25 border-rose-900/50' };
  };

  return (
    <div className="space-y-6">
      
      {/* Container Principal */}
      <Card className="bg-[#0b0e14] border-slate-900 shadow-xl">
        <CardHeader className="border-b border-slate-900/50 pb-4 bg-slate-950/40">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-sm font-black tracking-wider uppercase text-slate-100 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-400" />
                Simulador de Alavancagem & Risco
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-450 leading-relaxed">
                Calcule a margem ideal por trade baseando-se no seu limite de perda.
              </CardDescription>
            </div>
            {mode === 'real' ? (
              <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">🔴 CONTA REAL</span>
            ) : (
              <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">🟡 DEMO</span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Ticker do preço atual */}
          <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-lg border border-slate-900">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Preço Atual ({symbol.replace('USDT', '')})</span>
              <div className="text-xl font-mono font-black text-slate-100">${currentPrice > 0 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}</div>
            </div>
            
            {/* Quick selector of symbol */}
            <div className="w-[110px]">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs font-bold h-9">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-slate-800 text-xs text-slate-200">
                  <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                  <SelectItem value="SOLUSDT">SOL/USDT</SelectItem>
                  <SelectItem value="XRPUSDT">XRP/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo de ordem e Direção */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Entrada</Label>
              <SimpleTabs 
                value={orderType} 
                onChange={setOrderType} 
                options={[
                  {value: 'MARKET', label: 'Mercado'},
                  {value: 'LIMIT', label: 'Limite'},
                ]} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direção</Label>
              <div className="grid grid-cols-2 p-1 bg-[#1a202c] rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`py-1 text-[11px] font-bold rounded transition-all flex items-center justify-center gap-1 ${
                    side === 'BUY' 
                      ? 'bg-emerald-600 text-white shadow font-black' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" /> LONG
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`py-1 text-[11px] font-bold rounded transition-all flex items-center justify-center gap-1 ${
                    side === 'SELL' 
                      ? 'bg-rose-600 text-white shadow font-black' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingDown className="w-3 h-3" /> SHORT
                </button>
              </div>
            </div>
          </div>

          {/* Preço Limite se for Limit */}
          {orderType === 'LIMIT' && (
            <div className="space-y-2 bg-slate-950/20 p-3 rounded-lg border border-slate-900 animate-in fade-in slide-in-from-top-1.5 duration-200">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preço Limite de Execução</Label>
              <Input 
                type="number" 
                placeholder={currentPrice.toString()} 
                value={limitPrice} 
                onChange={e => setLimitPrice(e.target.value)} 
                className="font-mono text-sm bg-slate-950 border-slate-850 text-slate-200 h-9" 
              />
            </div>
          )}

          {/* Configuração de Risco de Carteira e Alavancagem */}
          <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-slate-900">
            {/* Alavancagem */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Alavancagem Recomendada</Label>
                <span className="text-sm font-black text-indigo-400 font-mono">{leverage}x</span>
              </div>
              <input 
                type="range" 
                min={1} 
                max={125} 
                step={1} 
                value={leverage} 
                onChange={(e) => setLeverage(parseInt(e.target.value))} 
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650" 
              />
              {getLeverageWarning() && (
                <div className={`text-[10px] p-2 rounded border font-semibold flex items-start gap-1.5 ${getLeverageWarning()?.color}`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{getLeverageWarning()?.text}</span>
                </div>
              )}
            </div>

            {/* Risco da Carteira */}
            <div className="space-y-2 pt-3 border-t border-slate-900/60">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Risco por Operação</Label>
                  <span className="bg-indigo-950 text-indigo-400 border border-indigo-900 text-[9px] px-1.5 rounded font-bold">Banca: ${capitalToUse.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <span className="text-sm font-black text-indigo-400 font-mono">{riskPercent.toFixed(1)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  min={0.2} 
                  max={5.0} 
                  step={0.1} 
                  value={riskPercent} 
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value))} 
                  className="flex-grow h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-650" 
                />
              </div>
              
              {/* Presets */}
              <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                {[0.5, 1.0, 2.0, 3.0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRiskPercent(preset)}
                    className={`py-1 text-[10px] font-bold rounded border ${
                      riskPercent === preset 
                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30' 
                        : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {preset.toFixed(1)}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Configurações de Stop Loss e Take Profit */}
          <div className="space-y-4">
            
            {/* Stop Loss (Obrigatório para cálculo de risco avançado) */}
            <div className={`p-3.5 rounded-xl border transition-all ${slEnabled ? 'border-rose-900/30 bg-rose-950/5' : 'border-slate-900 bg-slate-950/10'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className={`w-4 h-4 ${slEnabled ? 'text-rose-500' : 'text-slate-500'}`} /> 
                  <span className="text-xs font-bold text-slate-200">Definir Stop Loss</span>
                </div>
                <Switch checked={slEnabled} onCheckedChange={setSlEnabled} />
              </div>
              {slEnabled && (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  <SimpleTabs 
                    value={slType} 
                    onChange={setSlType} 
                    options={[{value: 'PERCENT', label: 'Distância (%)'}, {value: 'PRICE', label: 'Preço Gatilho'}]} 
                  />
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder={slType === 'PRICE' ? 'Ex: 62000' : 'Ex: 1.5'} 
                      value={slValue} 
                      onChange={e => setSlValue(e.target.value)} 
                      className="font-mono text-xs bg-slate-950 border-slate-850 text-slate-200 h-9 pr-8" 
                    />
                    <div className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-500">
                      {slType === 'PERCENT' ? '%' : 'USD'}
                    </div>
                  </div>
                  {stopLossPrice && (
                    <div className="flex justify-between text-[10px] font-mono text-rose-400 bg-rose-950/20 px-2.5 py-1.5 rounded border border-rose-900/10">
                      <span>Preço do Stop:</span>
                      <span className="font-bold">${stopLossPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Take Profit */}
            <div className={`p-3.5 rounded-xl border transition-all ${tpEnabled ? 'border-emerald-900/30 bg-emerald-950/5' : 'border-slate-900 bg-slate-950/10'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${tpEnabled ? 'text-emerald-500' : 'text-slate-500'}`} /> 
                  <span className="text-xs font-bold text-slate-200">Definir Take Profit</span>
                </div>
                <Switch checked={tpEnabled} onCheckedChange={setTpEnabled} />
              </div>
              {tpEnabled && (
                <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1.5 duration-200">
                  <SimpleTabs 
                    value={tpType} 
                    onChange={setTpType} 
                    options={[{value: 'PERCENT', label: 'Distância (%)'}, {value: 'PRICE', label: 'Preço Gatilho'}]} 
                  />
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder={tpType === 'PRICE' ? 'Ex: 68000' : 'Ex: 3.0'} 
                      value={tpValue} 
                      onChange={e => setTpValue(e.target.value)} 
                      className="font-mono text-xs bg-slate-950 border-slate-850 text-slate-200 h-9 pr-8" 
                    />
                    <div className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-500">
                      {tpType === 'PERCENT' ? '%' : 'USD'}
                    </div>
                  </div>
                  {takeProfitPrice && (
                    <div className="flex justify-between text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2.5 py-1.5 rounded border border-emerald-900/10">
                      <span>Preço do Alvo:</span>
                      <span className="font-bold">${takeProfitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Alternar Margem Manual vs Sugerida */}
          <div className="space-y-3 pt-4 border-t border-slate-900/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ajuste de Margem</span>
              <button 
                type="button" 
                onClick={() => setIsManualMargin(!isManualMargin)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
              >
                {isManualMargin ? 'Usar Margem Calculada' : 'Digitar Margem Manual'}
              </button>
            </div>
            
            {isManualMargin && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <Label className="text-[10px] text-slate-500 font-bold">Margem Manual (USDT)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={customMargin} 
                    onChange={e => setCustomMargin(e.target.value)} 
                    className="font-mono text-xs bg-slate-950 border-slate-850 text-slate-200 h-9 pr-12" 
                  />
                  <div className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-500">USDT</div>
                </div>
              </div>
            )}
          </div>

          {/* PAINEL DE RESULTADOS E ALOCADOS (R:R Ratio, Ideal Margin, Expected Drawdown) */}
          <div className="space-y-3.5 bg-slate-950 border border-slate-900 p-4 rounded-xl font-mono text-xs">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2 flex items-center justify-between">
              <span>Métricas de Simulação</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${getRRBadgeInfo().color}`}>
                {getRRBadgeInfo().text}
              </span>
            </div>

            {/* Margem e Posição Real */}
            <div className="flex justify-between items-center py-1.5 border-b border-slate-900/80">
              <span className="text-slate-400 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-indigo-450" /> Margem Necessária:
              </span>
              <span className={`font-black text-slate-100 ${!isManualMargin ? 'text-indigo-400' : ''}`}>
                ${actualMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-900/80">
              <span className="text-slate-400">Posição Real ({leverage}x):</span>
              <span className="font-bold text-slate-300">
                ${actualPositionValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </span>
            </div>

            {/* Risco (Stop Loss) */}
            {slEnabled && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-900/80 text-rose-400">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-rose-500" /> Perda Máxima (SL):
                </span>
                <span className="font-black">
                  ~${actualRiskAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT ({actualRiskPercent.toFixed(2)}%)
                </span>
              </div>
            )}

            {/* Retorno (Take Profit) */}
            {tpEnabled && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-900/80 text-emerald-400">
                <span className="flex items-center gap-1">
                  📈 Retorno Esperado (TP):
                </span>
                <span className="font-black">
                  ~${expectedGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT ({expectedGainPercent.toFixed(2)}%)
                </span>
              </div>
            )}

            {/* Relação R:R de forma gráfica */}
            {slEnabled && tpEnabled && rrRatio > 0 && (
              <div className="pt-2.5 space-y-1.5">
                <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                  <span>Risco (1x)</span>
                  <span>Razão R:R 1 : {rrRatio.toFixed(2)}</span>
                  <span className="text-emerald-500">Retorno ({rrRatio.toFixed(1)}x)</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden flex">
                  {/* Risco */}
                  <div className="h-full bg-rose-500" style={{ width: `${100 / (1 + rrRatio)}%` }} />
                  {/* Retorno */}
                  <div className="h-full bg-emerald-500" style={{ width: `${(100 * rrRatio) / (1 + rrRatio)}%` }} />
                </div>
              </div>
            )}

            {/* Alerta de saldo insuficiente */}
            {actualMargin > availableBalance && (
              <div className="text-[10px] bg-red-950/20 border border-red-900/35 text-red-400 p-2.5 rounded-lg flex items-start gap-1.5 font-sans leading-relaxed mt-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Saldo disponível insuficiente (${availableBalance.toFixed(2)} USDT) para simular esta operação com estes parâmetros.</span>
              </div>
            )}
          </div>

          {/* AÇÕES DE EXPORTAÇÃO E COPILOTO */}
          <div className="space-y-3 pt-3">
            <Button
              onClick={handleCopyAnalysis}
              className="w-full h-11 bg-indigo-650 hover:bg-indigo-700 text-slate-100 font-black tracking-wide text-xs transition-all uppercase flex items-center justify-center gap-2 rounded-lg"
              disabled={!entryPrice}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-450" />
                  Copiado para a área de transferência!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Parâmetros do Trade
                </>
              )}
            </Button>
            
            <Button
              onClick={() => window.open(`https://www.binance.com/pt-BR/futures/${symbol}`, '_blank')}
              variant="outline"
              className="w-full h-11 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-slate-100 font-black tracking-wide text-xs uppercase transition-all flex items-center justify-center gap-2 rounded-lg"
            >
              <ExternalLink className="w-4 h-4" />
              Operar na Binance Futures
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Card de Contexto e Sinal */}
      {signal && (
        <Card className="bg-[#0b0e14]/50 border-slate-900 shadow-md">
          <CardHeader className="py-3.5 border-b border-slate-900/50 bg-slate-950/15">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Contexto de Análise IA</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-sans">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Recomendação IA:</span>
              <span className={`text-[10px] py-0.5 px-2 rounded font-black text-white ${
                signal.combined?.recommendation?.includes('BUY') 
                  ? 'bg-emerald-600' 
                  : signal.combined?.recommendation?.includes('SELL') 
                    ? 'bg-rose-600' 
                    : 'bg-slate-700'
              }`}>
                {signal.combined?.recommendation || 'NEUTRAL'}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Pontuação de Força:</span>
              <span className="font-mono font-bold text-slate-200">
                {signal.combined?.score > 0 ? '+' : ''}{(signal.combined?.score || 0).toFixed(1)} / 10
              </span>
            </div>

            {signal.indicators && (
              <div className="text-[10px] bg-slate-950/40 p-2.5 rounded border border-slate-900/60 text-slate-400 space-y-1 leading-relaxed">
                <div className="font-bold text-slate-300 pb-0.5 border-b border-slate-900 text-[9px] uppercase tracking-wider">Gatilhos Técnicos</div>
                <div>⚡ RSI: <span className="font-mono text-slate-355">{signal.indicators.rsi?.direction || 'NEUTRAL'} ({signal.indicators.rsi?.value?.toFixed(1)})</span></div>
                <div>⚡ MACD: <span className="font-mono text-slate-355">{signal.indicators.macd?.direction || 'NEUTRAL'}</span></div>
                {signal.smc && (
                  <div>⚡ Estrutura SMC: <span className="font-mono text-slate-355 font-bold">{signal.smc.structure === 'BULLISH' ? 'BULLISH 🟢' : signal.smc.structure === 'BEARISH' ? 'BEARISH 🔴' : 'CHOPPY'}</span></div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
