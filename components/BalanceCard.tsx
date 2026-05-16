'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { BinanceBalance } from '@/types';

export default function BalanceCard() {
  const [balance, setBalance] = useState<BinanceBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { data } = await axios.get('/api/binance/balance');
        setBalance(data);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
        <Wallet className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? '---' : `$${parseFloat(balance?.availableBalance || '0').toFixed(2)}`}
        </div>
        <p className="text-xs text-muted-foreground">
          Total: {loading ? '---' : `$${parseFloat(balance?.balance || '0').toFixed(2)}`} USDT
        </p>
      </CardContent>
    </Card>
  );
}
