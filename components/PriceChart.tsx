'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';

export default function PriceChart() {
  const [data, setData] = useState<{ time: string; btc: number; eth: number }[]>([]);
  const [currentBtc, setCurrentBtc] = useState<number>(0);
  const [currentEth, setCurrentEth] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLastUpdate(new Date());
    const fetchPrices = async () => {
      try {
        const [btcRes, ethRes] = await Promise.all([
          axios.get('/api/binance/price?symbol=BTCUSDT'),
          axios.get('/api/binance/price?symbol=ETHUSDT'),
        ]);

        const btcPrice = parseFloat(btcRes.data.price);
        const ethPrice = parseFloat(ethRes.data.price);
        
        setCurrentBtc(btcPrice);
        setCurrentEth(ethPrice);
        setLastUpdate(new Date());

        const newDataPoint = {
          time: format(new Date(), 'HH:mm:ss'),
          btc: btcPrice,
          eth: ethPrice,
        };

        setData((prev) => [...prev.slice(-19), newDataPoint]);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 border border-border p-3 rounded-lg shadow-xl backdrop-blur-sm">
          <p className="text-muted-foreground text-xs font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-4 mb-1">
              <span className="text-xs font-semibold" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="text-xs font-bold text-foreground">
                ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card border-border shadow-md w-full">
      <CardHeader className="pb-2 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Preços ao Vivo</h2>
            <span className="flex h-2 w-2 relative ml-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">BTC</span>
              <span className="text-lg font-bold text-[#F7931A]">
                ${currentBtc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-8 w-px bg-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">ETH</span>
              <span className="text-lg font-bold text-[#627EEA]">
                ${currentEth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-1">
          {lastUpdate ? `Atualizado há ${Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)} segundos` : 'Aguardando atualização...'}
        </p>
      </CardHeader>
      <CardContent className="h-[350px] pt-6">
        {!mounted ? (
          <div style={{ height: '100%', width: '100%', background: 'transparent' }} />
        ) : (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="time" className="text-xs" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" domain={['auto', 'auto']} className="text-xs" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `$${value.toLocaleString()}`} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} className="text-xs" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `$${value.toLocaleString()}`} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
            <Line yAxisId="left" type="monotone" dataKey="btc" stroke="#F7931A" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name="Bitcoin (BTC)" animationDuration={300} />
            <Line yAxisId="right" type="monotone" dataKey="eth" stroke="#627EEA" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} name="Ethereum (ETH)" animationDuration={300} />
          </LineChart>
        </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
