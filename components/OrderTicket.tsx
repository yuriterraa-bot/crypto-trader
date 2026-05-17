'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, ShieldAlert, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

// Custom Simple Tabs Component to replace shadcn Tabs
const SimpleTabs = ({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: { value: string, label: string }[] }) => (
  <div className="w-full flex p-1 bg-secondary rounded-lg">
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${value === opt.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default function OrderTicket() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [orderType, setOrderType] = useState('MARKET');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  
  const [leverage, setLeverage] = useState(10);
  const [sizeUSDT, setSizeUSDT] = useState('');
  const [sizePercent, setSizePercent] = useState(0);
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  
  const [slEnabled, setSlEnabled] = useState(false);
  const [slValue, setSlValue] = useState('');
  const [slType, setSlType] = useState('PRICE'); // PRICE or PERCENT
  
  const [tpEnabled, setTpEnabled] = useState(false);
  const [tpValue, setTpValue] = useState('');
  const [tpType, setTpType] = useState('PRICE'); // PRICE or PERCENT

  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  // Col Right data
  const [signal, setSignal] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  const fetchData = async () => {
    try {
      // 1. Get Balance
      const balRes = await axios.get('/api/binance/balance');
      const usdt = balRes.data.find((b: any) => b.asset === 'USDT');
      if (usdt) setBalance(parseFloat(usdt.availableBalance));

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

  const handleSizePercentChange = (val: number) => {
    const pct = val;
    setSizePercent(pct);
    if (balance > 0) {
      const amount = (balance * (pct / 100)).toFixed(2);
      setSizeUSDT(amount);
    }
  };

  const getLeverageWarning = () => {
    if (leverage > 50) return { text: '🚨 Alavancagem extrema!', color: 'text-red-500' };
    if (leverage > 10) return { text: '⚠️ Alta alavancagem = alto risco', color: 'text-orange-500' };
    return null;
  };

  const calcRealSize = () => {
    const margin = parseFloat(sizeUSDT) || 0;
    return margin * leverage;
  };

  const calcQty = () => {
    const realSize = calcRealSize();
    const px = orderType === 'MARKET' ? currentPrice : (parseFloat(limitPrice) || currentPrice);
    if (px > 0 && realSize > 0) {
      let qty = realSize / px;
      if (symbol.includes('BTC')) {
        qty = parseFloat(qty.toFixed(3));
        if (qty < 0.001) qty = 0.001;
      } else if (symbol.includes('ETH')) {
        qty = parseFloat(qty.toFixed(2));
        if (qty < 0.01) qty = 0.01;
      }
      return qty.toString();
    }
    return symbol.includes('BTC') ? '0.001' : '0.01';
  };

  const getEstSlPrice = () => {
    if (!slEnabled || !slValue || currentPrice === 0) return null;
    const px = orderType === 'MARKET' ? currentPrice : (parseFloat(limitPrice) || currentPrice);
    if (slType === 'PRICE') return parseFloat(slValue);
    
    // Percent
    const pct = parseFloat(slValue) / 100;
    return side === 'BUY' ? px * (1 - pct) : px * (1 + pct);
  };

  const getEstTpPrice = () => {
    if (!tpEnabled || !tpValue || currentPrice === 0) return null;
    const px = orderType === 'MARKET' ? currentPrice : (parseFloat(limitPrice) || currentPrice);
    if (tpType === 'PRICE') return parseFloat(tpValue);
    
    // Percent
    const pct = parseFloat(tpValue) / 100;
    return side === 'BUY' ? px * (1 + pct) : px * (1 - pct);
  };

  const executeOrder = async () => {
    setLoading(true);
    try {
      // Backend espera quantity em USDT (tamanho real alavancado)
      const payload: any = {
        symbol,
        side,
        type: orderType,
        quantity: calcRealSize(),
        leverage,
      };

      if (orderType === 'LIMIT' || orderType === 'STOP_LIMIT') {
        payload.price = parseFloat(limitPrice);
      }
      if (orderType === 'STOP_LIMIT') {
        payload.stopPrice = parseFloat(stopPrice);
      }

      if (slEnabled) payload.stopLoss = getEstSlPrice();
      if (tpEnabled) payload.takeProfit = getEstTpPrice();

      const res = await axios.post('/api/orders', payload);
      
      if (res.data.success) {
        alert(`Ordem enviada com sucesso! ID: ${res.data.orderId}`);
        setConfirmModal(false);
        fetchData();
      } else {
        throw new Error(res.data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      alert(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const closePosition = async (posSymbol: string, posSide: string) => {
    try {
      const res = await axios.post('/api/orders/close', { symbol: posSymbol, positionSide: posSide });
      if (res.data.success) {
        alert("Posição fechada com sucesso!");
        fetchData();
      } else {
        throw new Error(res.data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Esquerda: Boleta */}
      <Card className="xl:col-span-2 bg-card border-border shadow-lg">
        <CardHeader className="border-b border-border/50 bg-secondary/5 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-xl">
                Boleta de Ordens <span className="ml-3 bg-orange-500/20 text-orange-500 text-xs px-2 py-1 rounded-full border-0">🧪 Demo</span>
              </CardTitle>
              <CardDescription>Execução manual na Binance Testnet</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Preço Atual</div>
              <div className="text-2xl font-mono font-black text-foreground">${currentPrice > 0 ? currentPrice.toFixed(2) : '---'}</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-8">
          {/* Linha 1: Par e Tipo */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Par</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="bg-background h-12 text-lg font-bold">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                  <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Tipo de Ordem</Label>
              <SimpleTabs 
                value={orderType} 
                onChange={setOrderType} 
                options={[
                  {value: 'MARKET', label: 'Mercado'},
                  {value: 'LIMIT', label: 'Limitada'},
                  {value: 'STOP_LIMIT', label: 'Stop Limit'},
                ]} 
              />
            </div>
          </div>

          {/* Inputs Condicionais de Preço */}
          {orderType !== 'MARKET' && (
            <div className="grid grid-cols-2 gap-6 bg-secondary/10 p-4 rounded-xl border border-border/50">
              {orderType === 'STOP_LIMIT' && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Preço Stop (Gatilho)</Label>
                  <Input type="number" placeholder={currentPrice.toString()} value={stopPrice} onChange={e => setStopPrice(e.target.value)} className="font-mono text-lg" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Preço Limite (Execução)</Label>
                <Input type="number" placeholder={currentPrice.toString()} value={limitPrice} onChange={e => setLimitPrice(e.target.value)} className="font-mono text-lg" />
              </div>
            </div>
          )}

          {/* Direção */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant={side === 'BUY' ? 'default' : 'outline'} 
              className={`h-16 text-lg font-black tracking-wider ${side === 'BUY' ? 'bg-green-600 hover:bg-green-700 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)]' : 'border-green-600/30 text-green-500 hover:bg-green-600/10'}`}
              onClick={() => setSide('BUY')}
            >
              <TrendingUp className="mr-2 h-6 w-6" /> COMPRA / LONG
            </Button>
            <Button 
              variant={side === 'SELL' ? 'default' : 'outline'} 
              className={`h-16 text-lg font-black tracking-wider ${side === 'SELL' ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'border-red-600/30 text-red-500 hover:bg-red-600/10'}`}
              onClick={() => setSide('SELL')}
            >
              <TrendingDown className="mr-2 h-6 w-6" /> VENDA / SHORT
            </Button>
          </div>

          {/* Alavancagem e Tamanho */}
          <div className="space-y-6 bg-secondary/5 p-5 rounded-xl border border-border/50">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Alavancagem</Label>
                <span className="text-2xl font-black">{leverage}x</span>
              </div>
              <input 
                type="range" 
                min={1} 
                max={125} 
                step={1} 
                value={leverage} 
                onChange={(e) => setLeverage(parseInt(e.target.value))} 
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" 
              />
              {getLeverageWarning() && (
                <p className={`text-xs font-bold flex items-center ${getLeverageWarning()?.color}`}>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {getLeverageWarning()?.text}
                </p>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex justify-between items-end">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Margem (USDT)</Label>
                <span className="text-xs text-muted-foreground">Disponível: ${balance.toFixed(2)}</span>
              </div>
              <div className="flex space-x-4">
                <Input type="number" placeholder="0.00" value={sizeUSDT} onChange={e => { setSizeUSDT(e.target.value); setSizePercent((parseFloat(e.target.value)/balance)*100 || 0); }} className="font-mono text-lg bg-background" />
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs font-bold w-12">{sizePercent.toFixed(0)}%</span>
                <input 
                  type="range" 
                  min={0} 
                  max={100} 
                  step={1} 
                  value={sizePercent} 
                  onChange={(e) => handleSizePercentChange(parseFloat(e.target.value))} 
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" 
                />
              </div>
              <div className="flex justify-between text-sm font-mono bg-background p-3 rounded border border-border">
                <span className="text-muted-foreground">Posição Real ({leverage}x):</span>
                <span className="font-bold text-foreground">${calcRealSize().toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* SL & TP */}
          <div className="grid grid-cols-2 gap-6">
            {/* Stop Loss */}
            <div className={`p-4 rounded-xl border transition-all ${slEnabled ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-secondary/5'}`}>
              <div className="flex items-center justify-between mb-4">
                <Label className="font-bold flex items-center cursor-pointer" onClick={() => setSlEnabled(!slEnabled)}>
                  <ShieldAlert className={`w-4 h-4 mr-2 ${slEnabled ? 'text-red-500' : 'text-muted-foreground'}`} /> 
                  Stop Loss
                </Label>
                <Switch checked={slEnabled} onCheckedChange={setSlEnabled} />
              </div>
              {slEnabled && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <SimpleTabs 
                    value={slType} 
                    onChange={setSlType} 
                    options={[{value: 'PRICE', label: 'Preço'}, {value: 'PERCENT', label: '%'}]} 
                  />
                  <Input type="number" placeholder={slType === 'PRICE' ? 'Ex: 60000' : 'Ex: 2'} value={slValue} onChange={e => setSlValue(e.target.value)} className="font-mono" />
                  {getEstSlPrice() && (
                    <p className="text-xs font-mono text-red-400">Est. Price: ${getEstSlPrice()?.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>

            {/* Take Profit */}
            <div className={`p-4 rounded-xl border transition-all ${tpEnabled ? 'border-green-500/50 bg-green-500/5' : 'border-border bg-secondary/5'}`}>
              <div className="flex items-center justify-between mb-4">
                <Label className="font-bold flex items-center cursor-pointer" onClick={() => setTpEnabled(!tpEnabled)}>
                  <CheckCircle2 className={`w-4 h-4 mr-2 ${tpEnabled ? 'text-green-500' : 'text-muted-foreground'}`} /> 
                  Take Profit
                </Label>
                <Switch checked={tpEnabled} onCheckedChange={setTpEnabled} />
              </div>
              {tpEnabled && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <SimpleTabs 
                    value={tpType} 
                    onChange={setTpType} 
                    options={[{value: 'PRICE', label: 'Preço'}, {value: 'PERCENT', label: '%'}]} 
                  />
                  <Input type="number" placeholder={tpType === 'PRICE' ? 'Ex: 80000' : 'Ex: 5'} value={tpValue} onChange={e => setTpValue(e.target.value)} className="font-mono" />
                  {getEstTpPrice() && (
                    <p className="text-xs font-mono text-green-400">Est. Price: ${getEstTpPrice()?.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button 
            className={`w-full h-14 text-lg font-black tracking-widest uppercase transition-all
              ${side === 'BUY' ? 'bg-green-600 hover:bg-green-700 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)]' : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'}
            `}
            onClick={() => setConfirmModal(true)}
            disabled={!sizeUSDT || parseFloat(sizeUSDT) <= 0 || loading}
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Revisar Ordem de ${side === 'BUY' ? 'COMPRA' : 'VENDA'}`}
          </Button>
        </CardContent>
      </Card>

      {/* Direita: Contexto */}
      <div className="space-y-6">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="bg-secondary/10 pb-4 border-b border-border/50">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" /> Contexto: {symbol}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {signal && (
              <div className="p-5 border-b border-border/50 bg-secondary/5">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-bold">Sinal Atual</div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm py-1 px-3 rounded-full text-white font-bold ${signal.combined.recommendation.includes('BUY') ? 'bg-green-500' : signal.combined.recommendation.includes('SELL') ? 'bg-red-500' : 'bg-gray-500'}`}>
                    {signal.combined.recommendation}
                  </span>
                  <span className="font-mono font-bold text-lg">{signal.combined.score > 0 ? '+' : ''}{signal.combined.score.toFixed(1)}</span>
                </div>
              </div>
            )}
            
            <div className="p-5 border-b border-border/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-bold">Calculadora de Risco</div>
              <div className="bg-background border border-border p-3 rounded-lg text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamanho (USDT):</span>
                  <span>${parseFloat(sizeUSDT || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posição Real:</span>
                  <span>${calcRealSize().toFixed(2)}</span>
                </div>
                {slEnabled && getEstSlPrice() && (
                  <div className="flex justify-between text-red-400">
                    <span>Risco (SL):</span>
                    <span>~${(calcRealSize() * Math.abs((currentPrice - getEstSlPrice()!) / currentPrice)).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-bold">Posições Abertas ({symbol})</div>
              {positions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma posição aberta.</p>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos, i) => {
                    const isLong = parseFloat(pos.positionAmt) > 0;
                    const pnl = parseFloat(pos.unRealizedProfit);
                    return (
                      <div key={i} className="bg-background border border-border p-3 rounded-lg flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${isLong ? 'text-green-500 border-green-500/50 bg-green-500/10' : 'text-red-500 border-red-500/50 bg-red-500/10'}`}>
                            {isLong ? 'LONG' : 'SHORT'}
                          </span>
                          <span className={`font-mono font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {pnl > 0 ? '+' : ''}{pnl.toFixed(2)} USDT
                          </span>
                        </div>
                        <div className="text-xs font-mono text-muted-foreground flex justify-between">
                          <span>Entrada: ${parseFloat(pos.entryPrice).toFixed(2)}</span>
                          <span>Qtd: {Math.abs(parseFloat(pos.positionAmt))}</span>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full mt-2 h-7 text-xs font-bold uppercase tracking-wider"
                          onClick={() => closePosition(pos.symbol, pos.positionSide)}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Fechar Posição
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Confirmação */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-1 uppercase tracking-wider text-center">Confirmar Ordem</h2>
            <p className="text-xs text-center text-muted-foreground mb-6">Esta ordem será enviada para a Binance Testnet</p>
            
            <div className="space-y-3 bg-secondary/10 p-4 rounded-xl font-mono text-sm border border-border mb-6">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Par:</span>
                <span className="font-bold">{symbol}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Direção:</span>
                <span className={`font-bold ${side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{side}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-bold">{orderType}</span>
              </div>
              {orderType !== 'MARKET' && (
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Preço Limite:</span>
                  <span className="font-bold">${limitPrice}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Alavancagem:</span>
                <span className="font-bold">{leverage}x</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Margem:</span>
                <span className="font-bold">${parseFloat(sizeUSDT).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Qtd Moedas:</span>
                <span className="font-bold">{calcQty()} {symbol.replace('USDT', '')}</span>
              </div>
              {slEnabled && (
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Stop Loss:</span>
                  <span className="font-bold text-red-400">${getEstSlPrice()?.toFixed(2)}</span>
                </div>
              )}
              {tpEnabled && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Take Profit:</span>
                  <span className="font-bold text-green-400">${getEstTpPrice()?.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <Button variant="outline" className="flex-1 font-bold" onClick={() => setConfirmModal(false)} disabled={loading}>
                CANCELAR
              </Button>
              <Button 
                className={`flex-1 font-black tracking-wider ${side === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`} 
                onClick={executeOrder}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRMAR'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
