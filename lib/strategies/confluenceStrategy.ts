/**
 * lib/strategies/confluenceStrategy.ts
 * Sistema de confluência multi-indicador para scalping
 * 
 * Indicadores:
 *   EMA Cross 13/30  — tendência primária (peso 3)
 *   EMA 9/21         — tendência rápida    (peso 1)
 *   Didi Index       — momentum/agulhada   (peso 2)
 *   RSI(14)          — força/exaustão      (peso 1.5)
 *   SMI(14)          — momentum suavizado  (peso 1)
 *   Nadaraya-Watson  — posição vs envelope (peso 1.5)
 *   Coppock Curve    — impulso longo prazo (peso 2)
 *
 * Score > +4  → LONG
 * Score < -4  → SHORT
 * Else        → NEUTRAL (bot mantém posição atual ou aguarda)
 */

import {
  calcEMA, calcRSI, calcDidi, calcSMI,
  calcNadarayaWatson, calcCoppock, emaCrossSignal,
} from '../indicators';

export interface IndicatorSignal {
  name: string;
  signal: string;
  score: number;
  value?: string;
}

export interface ConfluenceResult {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  score: number;
  threshold: number;
  confidence: number; // 0–100%
  signals: IndicatorSignal[];
  details: Record<string, any>;
}

export function confluenceStrategy(klines: any[], threshold = 4): ConfluenceResult {
  const closes = klines.map(k => parseFloat(k.close));
  const highs  = klines.map(k => parseFloat(k.high));
  const lows   = klines.map(k => parseFloat(k.low));
  const n = closes.length;

  const signals: IndicatorSignal[] = [];
  let totalScore = 0;

  // ── 1. EMA Cross 13/30 (peso 3) ──────────────────────────────────
  const emaCross = emaCrossSignal(closes, 13, 30);
  signals.push({ name: 'EMA 13/30', signal: emaCross.signal, score: emaCross.score });
  totalScore += emaCross.score;

  // ── 2. EMA 9/21 (peso 1) ─────────────────────────────────────────
  const ema9  = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema9Score = ema9[n-1] > ema21[n-1] ? 1 : -1;
  signals.push({
    name: 'EMA 9/21', score: ema9Score,
    signal: ema9Score > 0 ? 'BULLISH' : 'BEARISH',
    value: `${ema9[n-1]?.toFixed(1)} vs ${ema21[n-1]?.toFixed(1)}`,
  });
  totalScore += ema9Score;

  // ── 3. Didi Index (peso 2) ────────────────────────────────────────
  const didi = calcDidi(closes);
  const df = didi.fast, ds = didi.slow;
  let didiScore = 0, didiSignal = 'NEUTRAL';
  if (!isNaN(df[n-1]) && !isNaN(ds[n-1])) {
    // Agulhada de compra: fast cruzou zero para cima
    if (df[n-2] <= 0 && df[n-1] > 0)      { didiScore = 2;  didiSignal = 'NEEDLE_BUY'; }
    // Agulhada de venda: fast cruzou zero para baixo
    else if (df[n-2] >= 0 && df[n-1] < 0) { didiScore = -2; didiSignal = 'NEEDLE_SELL'; }
    // Ambos positivos = tendência de alta
    else if (df[n-1] > 0 && ds[n-1] > 0)  { didiScore = 1.5; didiSignal = 'BULLISH'; }
    // Ambos negativos = tendência de baixa
    else if (df[n-1] < 0 && ds[n-1] < 0)  { didiScore = -1.5; didiSignal = 'BEARISH'; }
    // Divergência
    else                                    { didiScore = df[n-1] > 0 ? 0.5 : -0.5; didiSignal = 'DIVERGING'; }
  }
  signals.push({
    name: 'Didi Index', signal: didiSignal, score: didiScore,
    value: `F:${df[n-1]?.toFixed(3)} S:${ds[n-1]?.toFixed(3)}`,
  });
  totalScore += didiScore;

  // ── 4. RSI(14) (peso 1.5) ─────────────────────────────────────────
  const rsi = calcRSI(closes, 14);
  const rsiVal = rsi[n-1];
  let rsiScore = 0, rsiSignal = 'NEUTRAL';
  if (!isNaN(rsiVal)) {
    if (rsiVal < 30)       { rsiScore = 1.5;  rsiSignal = 'OVERSOLD'; }
    else if (rsiVal > 70)  { rsiScore = -1.5; rsiSignal = 'OVERBOUGHT'; }
    else if (rsiVal > 55)  { rsiScore = 0.5;  rsiSignal = 'BULLISH'; }
    else if (rsiVal < 45)  { rsiScore = -0.5; rsiSignal = 'BEARISH'; }
    else                   { rsiScore = 0;    rsiSignal = 'NEUTRAL'; }
  }
  signals.push({
    name: 'RSI 14', signal: rsiSignal, score: rsiScore,
    value: rsiVal?.toFixed(1),
  });
  totalScore += rsiScore;

  // ── 5. SMI(14,3) (peso 1) ─────────────────────────────────────────
  const smi = calcSMI(highs, lows, closes, 14, 3);
  const smiVal = smi[n-1];
  const smiPrev = smi[n-2];
  let smiScore = 0, smiSignal = 'NEUTRAL';
  if (!isNaN(smiVal) && !isNaN(smiPrev)) {
    if (smiVal < -40)           { smiScore = 1;  smiSignal = 'OVERSOLD'; }
    else if (smiVal > 40)       { smiScore = -1; smiSignal = 'OVERBOUGHT'; }
    else if (smiPrev < 0 && smiVal > 0) { smiScore = 1;  smiSignal = 'CROSS_UP'; }
    else if (smiPrev > 0 && smiVal < 0) { smiScore = -1; smiSignal = 'CROSS_DOWN'; }
    else                        { smiScore = smiVal > 0 ? 0.5 : -0.5; smiSignal = smiVal > 0 ? 'POSITIVE' : 'NEGATIVE'; }
  }
  signals.push({
    name: 'SMI 14', signal: smiSignal, score: smiScore,
    value: smiVal?.toFixed(1),
  });
  totalScore += smiScore;

  // ── 6. Nadaraya-Watson (peso 1.5) ─────────────────────────────────
  const nw = calcNadarayaWatson(closes, 8, 2.0);
  const price = closes[n-1];
  let nwScore = 0, nwSignal = 'INSIDE';
  if (price > nw.upper[n-1])     { nwScore = -1.5; nwSignal = 'ABOVE_UPPER'; }
  else if (price < nw.lower[n-1]){ nwScore = 1.5;  nwSignal = 'BELOW_LOWER'; }
  else if (price > nw.mid[n-1])  { nwScore = 0.5;  nwSignal = 'ABOVE_MID'; }
  else                            { nwScore = -0.5; nwSignal = 'BELOW_MID'; }
  signals.push({
    name: 'Nadaraya-Watson', signal: nwSignal, score: nwScore,
    value: `U:${nw.upper[n-1]?.toFixed(0)} L:${nw.lower[n-1]?.toFixed(0)}`,
  });
  totalScore += nwScore;

  // ── 7. Coppock Curve (peso 2) ─────────────────────────────────────
  const coppock = calcCoppock(closes);
  const cpLast = coppock[n-1];
  const cpPrev = coppock[n-2];
  let cpScore = 0, cpSignal = 'N/A';
  if (!isNaN(cpLast) && !isNaN(cpPrev)) {
    if (cpPrev < 0 && cpLast > 0)  { cpScore = 2;    cpSignal = 'CROSS_UP'; }
    else if (cpPrev > 0 && cpLast < 0) { cpScore = -2; cpSignal = 'CROSS_DOWN'; }
    else if (cpLast > 0 && cpLast > cpPrev) { cpScore = 1;  cpSignal = 'RISING'; }
    else if (cpLast < 0 && cpLast < cpPrev) { cpScore = -1; cpSignal = 'FALLING'; }
    else if (cpLast > 0) { cpScore = 0.5; cpSignal = 'POSITIVE'; }
    else                  { cpScore = -0.5; cpSignal = 'NEGATIVE'; }
  }
  signals.push({
    name: 'Coppock', signal: cpSignal, score: cpScore,
    value: cpLast?.toFixed(4),
  });
  totalScore += cpScore;

  // ── Resultado final ────────────────────────────────────────────────
  const maxScore = signals.reduce((acc, s) => acc + Math.abs(s.score > 0 ? s.score : 0), 0) * 2;
  const confidence = Math.min(100, Math.round((Math.abs(totalScore) / Math.max(threshold, 1)) * 50));
  let direction: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
  if (totalScore >= threshold)  direction = 'LONG';
  else if (totalScore <= -threshold) direction = 'SHORT';

  return {
    direction,
    score: parseFloat(totalScore.toFixed(2)),
    threshold,
    confidence,
    signals,
    details: {
      rsi: rsiVal?.toFixed(1),
      smi: smiVal?.toFixed(1),
      didi_fast: df[n-1]?.toFixed(4),
      nw_upper: nw.upper[n-1]?.toFixed(2),
      nw_lower: nw.lower[n-1]?.toFixed(2),
      coppock: cpLast?.toFixed(5),
      ema13: calcEMA(closes, 13)[n-1]?.toFixed(2),
      ema30: calcEMA(closes, 30)[n-1]?.toFixed(2),
    },
  };
}
