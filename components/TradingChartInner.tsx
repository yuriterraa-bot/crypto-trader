'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts';

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];
const SYMBOLS = ['BTCUSDT', 'ETHUSDT'];

export default function TradingChartInner({ symbol = 'BTCUSDT' }: { symbol?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema9Ref   = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21Ref  = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50Ref  = useRef<ISeriesApi<'Line'> | null>(null);
  const ema13Ref  = useRef<ISeriesApi<'Line'> | null>(null);
  const ema30Ref  = useRef<ISeriesApi<'Line'> | null>(null);
  const nwUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const nwLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const [selectedTf, setSelectedTf] = useState('15m');
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(0);
  const [change, setChange] = useState(0);
  const [position, setPosition] = useState<any>(null);
  const [chartReady, setChartReady] = useState(false);
  const [confluence, setConfluence] = useState<any>(null);

  // ── Init chart (once) ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
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
      timeScale: {
        borderColor: '#1e1e2e',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 480,
    });

    // ── lightweight-charts v5 API: addSeries(SeriesType) ──
    candleRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e', downColor: '#ef4444',
      borderUpColor: '#22c55e', borderDownColor: '#ef4444',
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    ema9Ref.current  = chart.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 1, title: 'EMA9' });
    ema21Ref.current = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'EMA21' });
    ema50Ref.current = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1, title: 'EMA50' });
    ema13Ref.current = chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 2, title: 'EMA13' });
    ema30Ref.current = chart.addSeries(LineSeries, { color: '#f43f5e', lineWidth: 2, title: 'EMA30' });
    nwUpperRef.current = chart.addSeries(LineSeries, { color: '#ef444466', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'NW↑' });
    nwLowerRef.current = chart.addSeries(LineSeries, { color: '#22c55e66', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'NW↓' });

    chartRef.current = chart;
    setChartReady(true);

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null; candleRef.current = null;
      ema9Ref.current = null; ema21Ref.current = null; ema50Ref.current = null;
      ema13Ref.current = null; ema30Ref.current = null;
      nwUpperRef.current = null; nwLowerRef.current = null;
    };
  }, []);

  const [botConfig, setBotConfig] = useState<any>({ stop_loss_percent: 1.0, take_profit_percent: 2.0 });
  // Refs for price lines so we can remove/re-add them
  const priceLineRefs = useRef<any[]>([]);

  // ── Load data ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!chartReady || !candleRef.current) return;
    setLoading(true);
    try {
      // Fetch in parallel: candles + positions + config
      const [candleRes, posRes, cfgRes] = await Promise.all([
        fetch(`/api/binance/klines?symbol=${selectedSymbol}&interval=${selectedTf}&limit=200`, { cache: 'no-store' }),
        fetch('/api/binance/positions', { cache: 'no-store' }),
        fetch('/api/bot/config', { cache: 'no-store' }),
      ]);

      if (!candleRes.ok) throw new Error(`HTTP ${candleRes.status}`);
      const candles: any[] = await candleRes.json();
      if (!Array.isArray(candles) || candles.length === 0) return;

      // Parse config
      let cfg = botConfig;
      try {
        const cfgData = await cfgRes.json();
        if (cfgData?.stop_loss_percent) {
          cfg = cfgData;
          setBotConfig(cfgData);
        }
      } catch {}

      // Candles
      const candleData = candles.map(c => ({
        time: Math.floor(c.openTime / 1000) as any,
        open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      candleRef.current!.setData(candleData);

      // EMA helper (chart format)
      const calcEMA = (period: number) => {
        const closes = candles.map(c => c.close);
        if (closes.length < period) return [];
        const k = 2 / (period + 1);
        const result: { time: any; value: number }[] = [];
        let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
        result.push({ time: Math.floor(candles[period - 1].openTime / 1000), value: ema });
        for (let i = period; i < closes.length; i++) {
          ema = closes[i] * k + ema * (1 - k);
          result.push({ time: Math.floor(candles[i].openTime / 1000), value: ema });
        }
        return result;
      };
      ema9Ref.current?.setData(calcEMA(9));
      ema21Ref.current?.setData(calcEMA(21));
      ema50Ref.current?.setData(calcEMA(50));
      ema13Ref.current?.setData(calcEMA(13));
      ema30Ref.current?.setData(calcEMA(30));

      // Nadaraya-Watson Envelope (bandwidth=8, mult=2)
      const nwCloses = candles.map(c => c.close);
      const nwN = nwCloses.length;
      const bw = 8;
      const nwMid: number[] = [];
      for (let i = 0; i < nwN; i++) {
        let s = 0, w = 0;
        for (let j = 0; j < nwN; j++) {
          const wi = Math.exp(-((i - j) ** 2) / (2 * bw * bw));
          s += wi * nwCloses[j]; w += wi;
        }
        nwMid.push(s / w);
      }
      const residuals = nwCloses.map((c, i) => c - nwMid[i]);
      const std = Math.sqrt(residuals.reduce((a, b) => a + b * b, 0) / nwN);
      nwUpperRef.current?.setData(candles.map((c, i) => ({ time: Math.floor(c.openTime / 1000) as any, value: nwMid[i] + 2 * std })));
      nwLowerRef.current?.setData(candles.map((c, i) => ({ time: Math.floor(c.openTime / 1000) as any, value: nwMid[i] - 2 * std })));

      chartRef.current?.timeScale().fitContent();

      // Fetch confluence signals from API
      try {
        const confRes = await fetch(`/api/signal?symbol=${selectedSymbol}&interval=${selectedTf}`, { cache: 'no-store' });
        if (confRes.ok) { const cd = await confRes.json(); setConfluence(cd); }
      } catch { /* ignore */ }


      // ── Remove linhas anteriores ──
      priceLineRefs.current.forEach(pl => {
        try { candleRef.current?.removePriceLine(pl); } catch {}
      });
      priceLineRefs.current = [];

      // ── Positions: markers + price lines ──
      try {
        const posData = await posRes.json();
        const openPos = Array.isArray(posData)
          ? posData.filter((p: any) =>
              p.symbol === selectedSymbol &&
              Math.abs(parseFloat(p.positionAmt || '0')) > 0.0001
            )
          : [];
        setPosition(openPos[0] || null);

        const lastTime = Math.floor(candles[candles.length - 1].openTime / 1000) as any;
        const markers = openPos.map((p: any) => {
          const isLong = parseFloat(p.positionAmt) > 0;
          return {
            time: lastTime,
            position: isLong ? 'belowBar' : 'aboveBar',
            color: isLong ? '#22c55e' : '#ef4444',
            shape: isLong ? 'arrowUp' : 'arrowDown',
            text: `${isLong ? 'LONG' : 'SHORT'} @ $${parseFloat(p.entryPrice).toFixed(0)}`,
            size: 2,
          };
        });
        candleRef.current?.setMarkers(markers.length > 0 ? markers as any : []);

        // Desenhar linhas de preço para cada posição
        openPos.forEach((p: any) => {
          const isLong = parseFloat(p.positionAmt) > 0;
          const entry = parseFloat(p.entryPrice);
          const lev = parseFloat(p.leverage) || cfg.leverage || 3;
          const slPct = parseFloat(cfg.stop_loss_percent) || 1.0;
          const tpPct = parseFloat(cfg.take_profit_percent) || 2.0;

          const slPrice = isLong
            ? entry * (1 - slPct / 100 / lev)
            : entry * (1 + slPct / 100 / lev);
          const tpPrice = isLong
            ? entry * (1 + tpPct / 100 / lev)
            : entry * (1 - tpPct / 100 / lev);

          // Linha de entrada (branca tracejada)
          const entryLine = candleRef.current!.createPriceLine({
            price: entry,
            color: '#e2e8f0',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `▲ Entry`,
          });

          // Linha de SL (vermelha)
          const slLine = candleRef.current!.createPriceLine({
            price: slPrice,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `▼ SL`,
          });

          // Linha de TP (verde)
          const tpLine = candleRef.current!.createPriceLine({
            price: tpPrice,
            color: '#22c55e',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `▲ TP`,
          });

          priceLineRefs.current.push(entryLine, slLine, tpLine);
        });
      } catch { /* ignore */ }

      const last = candles[candles.length - 1];
      setPrice(last.close);
      setChange(((last.close - candles[0].close) / candles[0].close) * 100);
    } catch (e) {
      console.error('[TradingChart] error:', e);
    } finally {
      setLoading(false);
    }
  }, [chartReady, selectedSymbol, selectedTf, botConfig]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const isLong = position ? parseFloat(position.positionAmt) > 0 : null;
  const pnl = position
    ? parseFloat(position.unRealizedProfit || position.unrealizedProfit || '0')
    : 0;

  return (
    <div style={{ background: '#12121a', border: '1px solid #1e1e2e', borderRadius: '12px', padding: '16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#e2e8f0' }}>📈 {selectedSymbol}</span>
          {price > 0 && (
            <>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', fontFamily: 'monospace' }}>
                ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span style={{ color: change >= 0 ? '#22c55e' : '#ef4444', fontSize: '13px', fontWeight: 'bold' }}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {SYMBOLS.map(s => (
            <button key={s} onClick={() => setSelectedSymbol(s)} style={{
              padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: selectedSymbol === s ? '#6366f1' : '#1e1e2e',
              color: '#e2e8f0', fontSize: '12px',
              fontWeight: selectedSymbol === s ? 'bold' : 'normal',
            }}>
              {s.replace('USDT', '')}
            </button>
          ))}
          <div style={{ width: '1px', height: '20px', background: '#2e2e3e', margin: '0 2px' }} />
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setSelectedTf(tf)} style={{
              padding: '3px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: selectedTf === tf ? '#6366f1' : '#1e1e2e',
              color: '#e2e8f0', fontSize: '11px',
              fontWeight: selectedTf === tf ? 'bold' : 'normal',
            }}>
              {tf}
            </button>
          ))}
          <button onClick={loadData} title="Atualizar" style={{
            padding: '4px 10px', borderRadius: '6px', border: '1px solid #2e2e3e',
            cursor: 'pointer', background: 'transparent',
            color: loading ? '#6366f1' : '#94a3b8', fontSize: '14px',
          }}>
            ⟳
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '11px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#60a5fa' }}>━ EMA9</span>
        <span style={{ color: '#f59e0b' }}>━ EMA21</span>
        <span style={{ color: '#a855f7' }}>━ EMA50</span>
        <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>━ EMA13</span>
        <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>━ EMA30</span>
        <span style={{ color: '#ef444488' }}>╌ NW↑</span>
        <span style={{ color: '#22c55e88' }}>╌ NW↓</span>
        <span style={{ color: '#94a3b8' }}>╌ Entry</span>
        <span style={{ color: '#ef4444' }}>╌ SL</span>
        <span style={{ color: '#22c55e' }}>╌ TP</span>
        <span style={{ color: '#22c55e' }}>▲ LONG</span>
        <span style={{ color: '#ef4444' }}>▼ SHORT</span>
        {loading && <span style={{ color: '#6366f1' }}>• Atualizando...</span>}
      </div>

      {/* ── Chart ── */}
      <div ref={containerRef} style={{ width: '100%', height: '480px', minWidth: 0 }} />

      {/* ── Position bar ── */}
      {position && (() => {
        const _entry = parseFloat(position.entryPrice);
        const _lev = parseFloat(position.leverage) || botConfig.leverage || 3;
        const _sl = parseFloat(botConfig.stop_loss_percent) || 1.0;
        const _tp = parseFloat(botConfig.take_profit_percent) || 2.0;
        const _slPrice = isLong ? _entry*(1-_sl/100/_lev) : _entry*(1+_sl/100/_lev);
        const _tpPrice = isLong ? _entry*(1+_tp/100/_lev) : _entry*(1-_tp/100/_lev);
        return (
          <div style={{
            marginTop: '12px', padding: '12px', background: '#0a0a0f', borderRadius: '8px',
            border: `1px solid ${isLong ? '#22c55e44' : '#ef444444'}`,
            display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', alignItems: 'center',
          }}>
            <span style={{ color: isLong ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
              {isLong ? '▲ LONG' : '▼ SHORT'} {position.leverage}x
            </span>
            <span style={{ color: '#94a3b8' }}>Entrada: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>${_entry.toFixed(2)}</span></span>
            <span style={{ color: '#94a3b8' }}>Mark: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>${parseFloat(position.markPrice || position.entryPrice).toFixed(2)}</span></span>
            <span style={{ color: '#ef4444' }}>SL: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>${_slPrice.toFixed(2)}</span></span>
            <span style={{ color: '#22c55e' }}>TP: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>${_tpPrice.toFixed(2)}</span></span>
            <span style={{ color: '#94a3b8' }}>Qtd: <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{Math.abs(parseFloat(position.positionAmt))}</span></span>
            <span style={{ color: '#94a3b8' }}>PnL: <span style={{ color: pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold', fontFamily: 'monospace' }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} USDT</span></span>
          </div>
        );
      })()}
      {/* ── Confluence Signals Panel ── */}
      {confluence && (
        <div style={{ marginTop: '12px', padding: '12px', background: '#0a0a0f', borderRadius: '8px', border: '1px solid #1e1e2e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8' }}>⚡ CONFLOWÊNCI A DE INDICADORES</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Score:</span>
              <span style={{
                fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace',
                color: confluence.score >= 4 ? '#22c55e' : confluence.score <= -4 ? '#ef4444' : '#f59e0b'
              }}>{confluence.score > 0 ? '+' : ''}{confluence.score}</span>
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                background: confluence.direction === 'LONG' ? '#22c55e22' : confluence.direction === 'SHORT' ? '#ef444422' : '#f59e0b22',
                color: confluence.direction === 'LONG' ? '#22c55e' : confluence.direction === 'SHORT' ? '#ef4444' : '#f59e0b',
                border: `1px solid ${confluence.direction === 'LONG' ? '#22c55e44' : confluence.direction === 'SHORT' ? '#ef444444' : '#f59e0b44'}`,
              }}>{confluence.direction}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {confluence.signals?.map((s: any) => {
              const bull = s.score > 0;
              const bear = s.score < 0;
              return (
                <div key={s.name} style={{
                  padding: '4px 8px', borderRadius: '6px', fontSize: '10px',
                  background: bull ? '#22c55e11' : bear ? '#ef444411' : '#ffffff08',
                  border: `1px solid ${bull ? '#22c55e33' : bear ? '#ef444433' : '#ffffff15'}`,
                  display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '80px',
                }}>
                  <span style={{ color: '#64748b', fontSize: '9px' }}>{s.name}</span>
                  <span style={{ color: bull ? '#22c55e' : bear ? '#ef4444' : '#94a3b8', fontWeight: 'bold', fontSize: '10px' }}>
                    {s.signal}
                  </span>
                  <span style={{ color: bull ? '#22c55eaa' : bear ? '#ef4444aa' : '#64748b', fontSize: '9px', fontFamily: 'monospace' }}>
                    {s.score > 0 ? '+' : ''}{s.score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
