'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface TradingChartProps {
  symbol?: string;
}

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];
const SYMBOLS = ['BTCUSDT', 'ETHUSDT'];

export default function TradingChart({ symbol = 'BTCUSDT' }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const ema9Ref = useRef<any>(null);
  const ema21Ref = useRef<any>(null);
  const ema50Ref = useRef<any>(null);

  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const [selectedTf, setSelectedTf] = useState('15m');
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [position, setPosition] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ── EMA helper ─────────────────────────────────────────────────────
  const calcEMA = (period: number, closes: number[], candles: any[]) => {
    if (closes.length < period) return [];
    const k = 2 / (period + 1);
    const result: { time: number; value: number }[] = [];
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push({ time: Math.floor(candles[period - 1].openTime / 1000), value: ema });
    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
      result.push({ time: Math.floor(candles[i].openTime / 1000), value: ema });
    }
    return result;
  };

  // ── Fetch position info ────────────────────────────────────────────
  const fetchPosition = useCallback(async (sym: string) => {
    try {
      const res = await fetch('/api/binance/positions', { cache: 'no-store' });
      const data = await res.json();
      const pos = Array.isArray(data)
        ? data.find((p: any) => p.symbol === sym && Math.abs(parseFloat(p.positionAmt || '0')) > 0.0001)
        : null;
      setPosition(pos || null);
      return pos;
    } catch { return null; }
  }, []);

  // ── Load candle data + draw chart ─────────────────────────────────
  const loadData = useCallback(async (sym: string, tf: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/binance/klines?symbol=${sym}&interval=${tf}&limit=200`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const candles: any[] = await res.json();
      if (!Array.isArray(candles) || candles.length === 0) throw new Error('Sem dados');

      const candleData = candles.map(c => ({
        time: Math.floor(c.openTime / 1000) as any,
        open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      const closes = candles.map(c => c.close);

      candleSeriesRef.current?.setData(candleData);
      ema9Ref.current?.setData(calcEMA(9, closes, candles));
      ema21Ref.current?.setData(calcEMA(21, closes, candles));
      ema50Ref.current?.setData(calcEMA(50, closes, candles));

      // Position markers
      const pos = await fetchPosition(sym);
      if (pos) {
        const isLong = parseFloat(pos.positionAmt) > 0;
        const lastTime = Math.floor(candles[candles.length - 1].openTime / 1000) as any;
        candleSeriesRef.current?.setMarkers([{
          time: lastTime,
          position: isLong ? 'belowBar' : 'aboveBar',
          color: isLong ? '#22c55e' : '#ef4444',
          shape: isLong ? 'arrowUp' : 'arrowDown',
          text: `${isLong ? 'LONG' : 'SHORT'} @ $${parseFloat(pos.entryPrice).toFixed(2)}`,
          size: 2,
        }]);
      } else {
        candleSeriesRef.current?.setMarkers([]);
      }

      chartRef.current?.timeScale().fitContent();

      const last = candles[candles.length - 1];
      setCurrentPrice(last.close);
      setPriceChange(((last.close - candles[0].close) / candles[0].close) * 100);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchPosition]);

  // ── Init chart ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    let cleanup: (() => void) | undefined;

    import('lightweight-charts').then(({ createChart, ColorType, CrosshairMode }) => {
      // Destroy previous
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

      const chart = createChart(containerRef.current!, {
        layout: {
          background: { type: ColorType.Solid, color: '#0a0a0f' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#1a1a2e' },
          horzLines: { color: '#1a1a2e' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#1e1e2e' },
        timeScale: { borderColor: '#1e1e2e', timeVisible: true, secondsVisible: false },
        width: containerRef.current!.clientWidth,
        height: 500,
      });

      candleSeriesRef.current = chart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderUpColor: '#22c55e', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e', wickDownColor: '#ef4444',
      });

      ema9Ref.current = chart.addLineSeries({
        color: '#60a5fa', lineWidth: 1, title: 'EMA9',
      });
      ema21Ref.current = chart.addLineSeries({
        color: '#f59e0b', lineWidth: 1, title: 'EMA21',
      });
      ema50Ref.current = chart.addLineSeries({
        color: '#a855f7', lineWidth: 1, title: 'EMA50',
      });

      chartRef.current = chart;

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);

      loadData(selectedSymbol, selectedTf);

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        chartRef.current = null;
      };
    });

    return () => { cleanup?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, selectedTf]);

  // Auto-refresh price every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (candleSeriesRef.current) loadData(selectedSymbol, selectedTf);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedSymbol, selectedTf, loadData]);

  const isLong = position ? parseFloat(position.positionAmt) > 0 : null;
  const pnl = position ? parseFloat(position.unRealizedProfit || position.unrealizedProfit || '0') : 0;

  return (
    <div style={{
      background: '#12121a',
      border: '1px solid #1e1e2e',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '0',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '18px' }}>
            📈 {selectedSymbol}
          </span>
          {currentPrice > 0 && (
            <>
              <span style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ color: priceChange >= 0 ? '#22c55e' : '#ef4444', fontSize: '13px', fontWeight: 'bold' }}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Symbol selector */}
          {SYMBOLS.map(s => (
            <button key={s} onClick={() => setSelectedSymbol(s)} style={{
              padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: selectedSymbol === s ? '#6366f1' : '#1e1e2e',
              color: '#e2e8f0', fontSize: '12px',
              fontWeight: selectedSymbol === s ? 'bold' : 'normal',
              transition: 'background 0.2s',
            }}>
              {s.replace('USDT', '')}
            </button>
          ))}

          <div style={{ width: '1px', height: '20px', background: '#2e2e3e', margin: '0 2px' }} />

          {/* Timeframe selector */}
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setSelectedTf(tf)} style={{
              padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: selectedTf === tf ? '#6366f1' : '#1e1e2e',
              color: '#e2e8f0', fontSize: '11px',
              fontWeight: selectedTf === tf ? 'bold' : 'normal',
              transition: 'background 0.2s',
            }}>
              {tf}
            </button>
          ))}

          <button onClick={() => loadData(selectedSymbol, selectedTf)} style={{
            padding: '4px 10px', borderRadius: '6px', border: '1px solid #2e2e3e',
            cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: '13px',
          }} title="Atualizar">
            ⟳
          </button>
        </div>
      </div>

      {/* ── EMA Legend ── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '11px' }}>
        <span style={{ color: '#60a5fa' }}>━ EMA 9</span>
        <span style={{ color: '#f59e0b' }}>━ EMA 21</span>
        <span style={{ color: '#a855f7' }}>━ EMA 50</span>
        {position && (
          <span style={{ color: isLong ? '#22c55e' : '#ef4444' }}>
            {isLong ? '▲' : '▼'} Posição Aberta
          </span>
        )}
      </div>

      {/* ── Chart Container ── */}
      <div style={{ position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,15,0.85)', zIndex: 10, borderRadius: '8px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#6366f1', fontSize: '24px', marginBottom: '8px' }}>⟳</div>
              <span style={{ color: '#64748b', fontSize: '13px' }}>Carregando gráfico...</span>
            </div>
          </div>
        )}
        {error && !loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,15,0.85)', zIndex: 10, borderRadius: '8px',
          }}>
            <span style={{ color: '#ef4444', fontSize: '13px' }}>Erro: {error}</span>
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '500px', minWidth: 0 }} />
      </div>

      {/* ── Open Position Info Bar ── */}
      {position && (
        <div style={{
          marginTop: '12px', padding: '12px',
          background: '#0a0a0f', borderRadius: '8px',
          border: `1px solid ${isLong ? '#22c55e44' : '#ef444444'}`,
          display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px',
        }}>
          <span style={{ color: isLong ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
            {isLong ? '▲ LONG' : '▼ SHORT'} {position.leverage}x
          </span>
          <span style={{ color: '#94a3b8' }}>
            Entrada: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
              ${parseFloat(position.entryPrice).toFixed(2)}
            </span>
          </span>
          <span style={{ color: '#94a3b8' }}>
            Mark: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
              ${parseFloat(position.markPrice || position.entryPrice).toFixed(2)}
            </span>
          </span>
          <span style={{ color: '#94a3b8' }}>
            Qtd: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
              {Math.abs(parseFloat(position.positionAmt))}
            </span>
          </span>
          <span style={{ color: '#94a3b8' }}>
            PnL: <span style={{ color: pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} USDT
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
