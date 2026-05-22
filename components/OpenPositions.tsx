'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, LayoutDashboard, Clock, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
// Read-Only mode: no order execution — positions are monitored only

export default function OpenPositions() {
  const [positions, setPositions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]); // trades abertos no Supabase (tem SL/TP)
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({ leverage: 3, stop_loss_percent: 1.0, take_profit_percent: 2.0 });
  const [now, setNow] = useState(Date.now());

  const fetchAll = useCallback(async () => {
    try {
      const [posRes, tradeRes, cfgRes] = await Promise.all([
        fetch('/api/binance/positions', { cache: 'no-store' }),
        fetch('/api/trades?status=OPEN', { cache: 'no-store' }).catch(() => null),
        fetch('/api/bot/config', { cache: 'no-store' }),
      ]);

      const posData = await posRes.json();
      const active = Array.isArray(posData)
        ? posData.filter((p: any) => Math.abs(parseFloat(p.positionAmt || '0')) > 0)
        : [];
      setPositions(active);

      const cfgData = await cfgRes.json();
      if (cfgData?.leverage) setConfig(cfgData);

      if (tradeRes?.ok) {
        const tradeData = await tradeRes.json();
        setTrades(Array.isArray(tradeData) ? tradeData : []);
      }
    } catch (e) {
      console.error('Fetch positions error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const posInterval = setInterval(fetchAll, 15000);
    const clockInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(posInterval); clearInterval(clockInterval); };
  }, [fetchAll]);

  // Read-Only: order execution removed — use Binance directly to manage positions

  return (
    <Card className="col-span-full bg-card border-border shadow-md">
      <CardHeader className="pb-4 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="h-5 w-5 text-indigo-500" />
            <div>
              <CardTitle className="text-lg">Posições Abertas</CardTitle>
              <CardDescription className="text-xs">Monitoramento ao vivo · SL/TP estimado · Tempo aberto</CardDescription>
            </div>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {positions.length === 0 && !loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm font-medium">
            Nenhuma posição aberta no momento
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow className="border-border">
                  <TableHead>Par</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Atual</TableHead>
                  <TableHead>PnL USDT / %</TableHead>
                  <TableHead className="min-w-[200px]">SL ←→ TP</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p: any) => {
                  const isLong = parseFloat(p.positionAmt) > 0;
                  const currentSide = isLong ? 'LONG' : 'SHORT';
                  const pnlUSDT = parseFloat(p.unRealizedProfit || p.unrealizedProfit || '0');
                  const entryPrice = parseFloat(p.entryPrice || '0');
                  const markPrice = parseFloat(p.markPrice || entryPrice.toString());
                  // Use leverage from Binance position directly
                  const lev = parseFloat(p.leverage) || config.leverage || 3;
                  const slPct = config.stop_loss_percent || 1.0;
                  const tpPct = config.take_profit_percent || 2.0;

                  const pnlPct = entryPrice > 0
                    ? (isLong
                      ? (markPrice - entryPrice) / entryPrice * 100 * lev
                      : (entryPrice - markPrice) / entryPrice * 100 * lev)
                    : 0;

                  // Calcular SL/TP a partir do preço de entrada + config (sem depender do Supabase)
                  const trade = trades.find(t => t.symbol === p.symbol);
                  const slPrice = trade?.stop_loss != null
                    ? parseFloat(trade.stop_loss)
                    : isLong
                      ? entryPrice * (1 - slPct / 100 / lev)
                      : entryPrice * (1 + slPct / 100 / lev);
                  const tpPrice = trade?.take_profit != null
                    ? parseFloat(trade.take_profit)
                    : isLong
                      ? entryPrice * (1 + tpPct / 100 / lev)
                      : entryPrice * (1 - tpPct / 100 / lev);

                  // Progresso entre SL e TP (SHORT: SL > entry > TP, então inverter range)
                  const lo = Math.min(slPrice, tpPrice);
                  const hi = Math.max(slPrice, tpPrice);
                  const range = hi - lo;
                  const progress = range > 0
                    ? Math.min(100, Math.max(0, ((markPrice - lo) / range) * 100))
                    : 50;

                  // Tempo aberto
                  const openTime = trade?.open_time
                    ? new Date(trade.open_time).getTime()
                    : p.updateTime ? parseInt(p.updateTime) : null;
                  const durationSec = openTime ? Math.floor((now - openTime) / 1000) : null;
                  const durationStr = durationSec !== null
                    ? durationSec < 60
                      ? `${durationSec}s`
                      : `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
                    : '—';
                  const maxDur = config.max_trade_duration_minutes || 30;
                  const durationMin = durationSec !== null ? durationSec / 60 : 0;
                  const timeoutPct = Math.min(100, (durationMin / maxDur) * 100);

                  return (
                    <TableRow key={p.symbol} className="border-border">
                      {/* Par */}
                      <TableCell className="font-bold">{p.symbol}</TableCell>

                      {/* Direção */}
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit ${isLong
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {currentSide} {lev}x
                        </Badge>
                      </TableCell>

                      {/* Qtd */}
                      <TableCell className="font-mono text-xs">{Math.abs(parseFloat(p.positionAmt))}</TableCell>

                      {/* Entrada */}
                      <TableCell className="font-mono text-xs">${entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</TableCell>

                      {/* Atual */}
                      <TableCell className="font-mono text-xs">${markPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</TableCell>

                      {/* PnL */}
                      <TableCell className={`font-mono font-bold text-sm ${pnlUSDT >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <div>{pnlUSDT >= 0 ? '+' : ''}{pnlUSDT.toFixed(2)} USDT</div>
                        <div className="text-xs opacity-70">{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                      </TableCell>

                      {/* SL/TP Progress bar */}
                      <TableCell className="min-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                            <span className="text-red-400">SL ${slPrice.toFixed(2)}</span>
                            <span className="text-green-400">TP ${tpPrice.toFixed(2)}</span>
                          </div>
                          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                            {/* SL zone */}
                            <div className="absolute left-0 top-0 h-full w-[20%] bg-red-500/30 rounded-l-full" />
                            {/* TP zone */}
                            <div className="absolute right-0 top-0 h-full w-[20%] bg-green-500/30 rounded-r-full" />
                            {/* Price marker */}
                            <div
                              className={`absolute top-0 h-full w-1.5 rounded-full ${pnlUSDT >= 0 ? 'bg-green-400' : 'bg-red-400'} shadow-lg`}
                              style={{ left: `calc(${progress}% - 3px)`, transition: 'left 0.5s ease' }}
                            />
                          </div>
                          {/* Timeout bar */}
                          <div className="h-1 rounded-full bg-muted overflow-hidden" title={`${durationMin.toFixed(1)}/${maxDur} min`}>
                            <div
                              className={`h-full rounded-full transition-all ${timeoutPct > 80 ? 'bg-orange-400' : 'bg-indigo-400/50'}`}
                              style={{ width: `${timeoutPct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Tempo */}
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className={timeoutPct > 80 ? 'text-orange-400 font-bold' : ''}>{durationStr}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60">max {maxDur}min</div>
                      </TableCell>

                      {/* Botão fechar */}
                      <TableCell className="text-right">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs bg-indigo-500/10 text-indigo-450 hover:bg-indigo-600 hover:text-white border border-indigo-500/20"
                          onClick={() => window.open(`https://www.binance.com/pt-BR/futures/${p.symbol}`, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver na Binance
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
