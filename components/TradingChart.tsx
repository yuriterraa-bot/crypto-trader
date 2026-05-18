'use client';
import dynamic from 'next/dynamic';

const TradingChartInner = dynamic(
  () => import('./TradingChartInner'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: '548px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontSize: '14px',
        gap: '10px',
      }}>
        <span style={{ fontSize: '20px' }}>⟳</span>
        Carregando gráfico...
      </div>
    ),
  }
);

export default function TradingChart({ symbol = 'BTCUSDT' }: { symbol?: string }) {
  return <TradingChartInner symbol={symbol} />;
}
