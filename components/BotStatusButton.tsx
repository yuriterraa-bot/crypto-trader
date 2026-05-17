'use client';
import { useState, useEffect } from 'react';

export default function BotStatusButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/bot/config', 
        { cache: 'no-store' });
      const data = await res.json();
      setIsRunning(data.is_running === true);
    } catch(e) {}
  };

  const toggle = async () => {
    setLoading(true);
    try {
      const newStatus = !isRunning;
      const res = await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_running: newStatus })
      });
      const data = await res.json();
      // Usar o valor que veio do banco, não o local
      setIsRunning(data.is_running === true || 
                   data.config?.is_running === true ||
                   newStatus);
      
      if (newStatus) {
        // Disparar análise em background
        fetch('/api/bot/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: 'BTCUSDT' })
        }).catch(() => {});
      }
    } catch(e) {
      console.error('Toggle error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        background: isRunning ? '#ef4444' : '#22c55e',
        color: 'white',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px'
      }}
    >
      {loading ? '...' : isRunning ? '⏹ Parar Bot' : '▶ Iniciar Bot'}
    </button>
  );
}
