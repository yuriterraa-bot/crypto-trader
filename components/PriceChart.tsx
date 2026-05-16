'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export default function PriceChart() {
  const [data, setData] = useState<{ time: string; btc: number; eth: number }[]>([]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const [btcRes, ethRes] = await Promise.all([
          axios.get('/api/binance/price?symbol=BTCUSDT'),
          axios.get('/api/binance/price?symbol=ETHUSDT'),
        ]);

        const newDataPoint = {
          time: format(new Date(), 'HH:mm:ss'),
          btc: parseFloat(btcRes.data.price),
          eth: parseFloat(ethRes.data.price),
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

  return (
    <Card className="col-span-full lg:col-span-4">
      <CardHeader>
        <CardTitle>Live Prices (BTC & ETH)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="time" className="text-xs" />
            <YAxis yAxisId="left" domain={['auto', 'auto']} className="text-xs" tickFormatter={(value) => `$${value}`} />
            <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} className="text-xs" tickFormatter={(value) => `$${value}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line yAxisId="left" type="monotone" dataKey="btc" stroke="#f59e0b" strokeWidth={2} dot={false} name="BTC" />
            <Line yAxisId="right" type="monotone" dataKey="eth" stroke="#3b82f6" strokeWidth={2} dot={false} name="ETH" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
