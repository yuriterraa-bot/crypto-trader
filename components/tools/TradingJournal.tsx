'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Trash2, Tag, Smile, AlertCircle, CheckCircle, Sparkles, Filter, Plus, Save } from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number;
  quantity: number;
  leverage: number;
  pnl_usdt: number;
  pnl_percent: number;
  strategy: string;
  setup?: string;
  emotions?: string;
  mistakes?: string;
  lessons?: string;
  tags?: string[];
  created_at?: string;
}

const STRATEGIES_LIST = [
  'EMA Golden Cross',
  'SMC Choch/BOS Reversal',
  'Fibonacci Retracement Bounce',
  'Nadaraya-Watson Envelope Reversal',
  'Didi Index Squeeze',
  'RSI Divergence Exhaustion',
  'Order Block Liquidity Sweep',
  'Breakout Pullback'
];

const EMOTIONS_LIST = ['Calmo/Neutro', 'Ansiedade', 'FOMO (Fear Of Missing Out)', 'Ganância', 'Impaciência', 'Raiva/Vingança'];
const MISTAKES_LIST = ['Nenhum', 'Entrada FOMO', 'Stop Loss Movido', 'Volume Excessivo', 'Fuga do Plano de Trade', 'Alavancagem Muito Alta'];

export default function TradingJournal({ onEntriesChange }: { onEntriesChange?: (entries: JournalEntry[]) => void }) {
  // Main state
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [leverage, setLeverage] = useState('10');
  const [strategy, setStrategy] = useState(STRATEGIES_LIST[0]);
  const [setup, setSetup] = useState('');
  const [emotions, setEmotions] = useState(EMOTIONS_LIST[0]);
  const [mistakes, setMistakes] = useState(MISTAKES_LIST[0]);
  const [lessons, setLessons] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Filter states
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterStrategy, setFilterStrategy] = useState('ALL');
  const [filterEmotion, setFilterEmotion] = useState('ALL');

  // Load entries on mount
  useEffect(() => {
    fetchJournalEntries();
  }, []);

  const fetchJournalEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/journal');
      const resData = await response.json();
      
      if (resData.success && Array.isArray(resData.data)) {
        setEntries(resData.data);
        if (onEntriesChange) onEntriesChange(resData.data);
      } else {
        // Fallback to localStorage if Supabase query fails
        const local = localStorage.getItem('local_journal_entries');
        if (local) {
          const parsed = JSON.parse(local);
          setEntries(parsed);
          if (onEntriesChange) onEntriesChange(parsed);
        }
      }
    } catch (err) {
      console.warn('Error loading database journal, resolving local storage fallback');
      const local = localStorage.getItem('local_journal_entries');
      if (local) {
        const parsed = JSON.parse(local);
        setEntries(parsed);
        if (onEntriesChange) onEntriesChange(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  // Form Live Math calculations
  const parsedEntry = parseFloat(entryPrice) || 0;
  const parsedExit = parseFloat(exitPrice) || 0;
  const parsedQty = parseFloat(quantity) || 0;
  const parsedLev = parseInt(leverage) || 1;

  const calculatedPnl = parsedEntry > 0 && parsedExit > 0 && parsedQty > 0
    ? (direction === 'LONG' ? (parsedExit - parsedEntry) * parsedQty : (parsedEntry - parsedExit) * parsedQty)
    : 0;

  const calculatedMargin = parsedEntry > 0 && parsedQty > 0 ? (parsedEntry * parsedQty) / parsedLev : 0;
  const calculatedRoi = calculatedMargin > 0 ? (calculatedPnl / calculatedMargin) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!entryPrice || !exitPrice || !quantity) {
      setErrorMsg('Por favor, preencha todos os campos matemáticos.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      date,
      symbol: symbol.toUpperCase(),
      direction,
      entryPrice,
      exitPrice,
      quantity,
      leverage,
      strategy,
      setup,
      emotions,
      mistakes,
      lessons,
      tags
    };

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (resData.success) {
        setSuccessMsg('Trade registrado com sucesso no banco de dados!');
        // Reset form
        setEntryPrice('');
        setExitPrice('');
        setQuantity('');
        setSetup('');
        setLessons('');
        setTagsInput('');
        setShowForm(false);
        fetchJournalEntries();
      } else {
        throw new Error(resData.error || 'Database submission failed');
      }
    } catch (err: any) {
      console.warn('Database save failed, writing to localStorage fallback:', err.message);
      
      // Local Storage Fallback
      const entryId = crypto.randomUUID();
      const localPnl = direction === 'LONG' 
        ? (parsedExit - parsedEntry) * parsedQty 
        : (parsedEntry - parsedExit) * parsedQty;
      const localMargin = (parsedEntry * parsedQty) / parsedLev;
      const localRoi = localMargin > 0 ? (localPnl / localMargin) * 100 : 0;

      const newEntry: JournalEntry = {
        id: entryId,
        date,
        symbol: symbol.toUpperCase(),
        direction,
        entry_price: parsedEntry,
        exit_price: parsedExit,
        quantity: parsedQty,
        leverage: parsedLev,
        pnl_usdt: localPnl,
        pnl_percent: localRoi,
        strategy,
        setup,
        emotions,
        mistakes,
        lessons,
        tags,
        created_at: new Date().toISOString()
      };

      const updated = [newEntry, ...entries];
      setEntries(updated);
      localStorage.setItem('local_journal_entries', JSON.stringify(updated));
      if (onEntriesChange) onEntriesChange(updated);
      
      setSuccessMsg('Registrado na memória local! (Supabase pendente)');
      
      // Reset
      setEntryPrice('');
      setExitPrice('');
      setQuantity('');
      setSetup('');
      setLessons('');
      setTagsInput('');
      setShowForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/journal?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchJournalEntries();
      } else {
        throw new Error('Database delete failed');
      }
    } catch (e) {
      console.warn('Database delete failed, deleting from local memory');
      const updated = entries.filter((item) => item.id !== id);
      setEntries(updated);
      localStorage.setItem('local_journal_entries', JSON.stringify(updated));
      if (onEntriesChange) onEntriesChange(updated);
    }
  };

  // Filter logic
  const filteredEntries = entries.filter((item) => {
    const matchSymbol = filterSymbol ? item.symbol.includes(filterSymbol.toUpperCase()) : true;
    const matchStrategy = filterStrategy !== 'ALL' ? item.strategy === filterStrategy : true;
    const matchEmotion = filterEmotion !== 'ALL' ? item.emotions === filterEmotion : true;
    return matchSymbol && matchStrategy && matchEmotion;
  });

  return (
    <div className="space-y-6">
      {/* Header and Toggle Form Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-200 tracking-tight flex items-center gap-1.5">
            <BookOpen className="w-5 h-5 text-indigo-400" /> Diário de Operações Profissional
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-1 leading-normal">
            Registre e monitore seus setups, estados psicológicos e erros técnicos para calibração profissional.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs px-4 py-3 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5 self-start transition-all"
        >
          {showForm ? 'Fechar Formulário' : 'Novo Registro de Trade'}
        </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="flex gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-bold leading-normal">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs font-bold leading-normal">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Card */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#0d0e15]/60 border border-slate-900 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/5 blur-[95px] rounded-full -mr-16 -mt-16"></div>
          
          <h4 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider mb-5 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Detalhes do Trade Executado
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Col: Quantitative Inputs */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Data</label>
                  <input
                    type="date"
                    className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Par</label>
                  <input
                    type="text"
                    placeholder="BTCUSDT"
                    className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 placeholder-slate-600 uppercase focus:outline-none"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Direção</label>
                <div className="grid grid-cols-2 p-0.5 bg-[#12131b] border border-slate-900 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDirection('LONG')}
                    className={`py-1.5 rounded text-[11px] font-black transition-all ${direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-500'}`}
                  >
                    LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('SHORT')}
                    className={`py-1.5 rounded text-[11px] font-black transition-all ${direction === 'SHORT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-slate-500'}`}
                  >
                    SHORT
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Preço Entrada</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Preço Saída</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Leverage</label>
                  <input
                    type="number"
                    className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Quantidade ({symbol.replace('USDT', '')})</label>
                <input
                  type="number"
                  step="any"
                  className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            {/* Middle Col: Setup and Strategy */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Estratégia Técnica</label>
                <select
                  className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                >
                  {STRATEGIES_LIST.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Descrição do Setup / Confluências</label>
                <textarea
                  placeholder="Ex: Divergência de RSI confirmada com candle de Engolfo de Alta no suporte da média móvel 21 EMA..."
                  rows={4}
                  className="w-full bg-[#12131b] border border-slate-900 rounded-xl p-3 text-xs font-bold text-slate-100 placeholder-slate-600 focus:outline-none"
                  value={setup}
                  onChange={(e) => setSetup(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tags (Separadas por vírgula)</label>
                <input
                  type="text"
                  placeholder="suporte, rsi, trendline"
                  className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 placeholder-slate-600 focus:outline-none"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </div>

            {/* Right Col: Psychological feedback & Live Math preview */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Estado Psicológico / Emoção</label>
                  <select
                    className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                    value={emotions}
                    onChange={(e) => setEmotions(e.target.value)}
                  >
                    {EMOTIONS_LIST.map(em => (
                      <option key={em} value={em}>{em}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Erros Cometidos (Autoavaliação)</label>
                  <select
                    className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:outline-none"
                    value={mistakes}
                    onChange={(e) => setMistakes(e.target.value)}
                  >
                    {MISTAKES_LIST.map(mis => (
                      <option key={mis} value={mis}>{mis}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Lições Aprendidas</label>
                  <input
                    type="text"
                    placeholder="Evitar entrar antes do fechamento do candle..."
                    className="w-full bg-[#12131b] border border-slate-900 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 placeholder-slate-600 focus:outline-none"
                    value={lessons}
                    onChange={(e) => setLessons(e.target.value)}
                  />
                </div>
              </div>

              {/* Math preview */}
              <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2 text-xs mt-4">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">PnL Estimado:</span>
                  <span className={`font-black ${calculatedPnl > 0 ? 'text-emerald-400' : calculatedPnl < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {calculatedPnl > 0 ? '+' : ''}{calculatedPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Retorno Alavancado (ROI):</span>
                  <span className={`font-black ${calculatedRoi > 0 ? 'text-emerald-400' : calculatedRoi < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {calculatedRoi > 0 ? '+' : ''}{calculatedRoi.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" /> Registrar no Diário de Trading
            </button>
          </div>
        </form>
      )}

      {/* Filter and Trade list */}
      <div className="bg-[#0b0c10]/80 border border-slate-900 rounded-2xl shadow-2xl relative overflow-hidden group">
        <div className="px-5 py-4 border-b border-slate-900 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-indigo-400" /> Filtros do Diário
          </span>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Buscar Par (ex: BTC)"
              className="bg-[#12131b] border border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-100 placeholder-slate-600 uppercase focus:outline-none"
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
            />
            <select
              className="bg-[#12131b] border border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-100 focus:outline-none"
              value={filterStrategy}
              onChange={(e) => setFilterStrategy(e.target.value)}
            >
              <option value="ALL">Todas Estratégias</option>
              {STRATEGIES_LIST.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <select
              className="bg-[#12131b] border border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-100 focus:outline-none"
              value={filterEmotion}
              onChange={(e) => setFilterEmotion(e.target.value)}
            >
              <option value="ALL">Todas Emoções</option>
              {EMOTIONS_LIST.map(em => (
                <option key={em} value={em}>{em}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List of Trades */}
        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-500">
            Carregando diário de operações...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs font-bold text-slate-500">
            Nenhum trade registrado encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/20 text-slate-500 font-black border-b border-slate-900">
                  <th className="px-5 py-3.5">Data / Par</th>
                  <th className="px-5 py-3.5">Operação</th>
                  <th className="px-5 py-3.5">Estratégia</th>
                  <th className="px-5 py-3.5">Entrada / Saída</th>
                  <th className="px-5 py-3.5">Resultado (PnL)</th>
                  <th className="px-5 py-3.5">ROI</th>
                  <th className="px-5 py-3.5">Psicologia / Erros</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {filteredEntries.map((item) => {
                  const isWin = item.pnl_usdt > 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-900/10 font-bold text-slate-300">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-100 font-extrabold">{item.symbol}</span>
                          <span className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-2.5 h-2.5" /> {item.date}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {item.direction} {item.leverage}x
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-extrabold">
                        {item.strategy}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span>In: ${item.entry_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          <span className="text-slate-500 text-[10px]">Out: ${item.exit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={isWin ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                          {isWin ? '+' : ''}${item.pnl_usdt.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${isWin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {isWin ? '+' : ''}{item.pnl_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="text-slate-400 font-extrabold text-[10px] flex items-center gap-1">
                            <Smile className="w-3 h-3 text-indigo-400" /> {item.emotions || 'N/A'}
                          </span>
                          <span className="text-slate-500 text-[9px] mt-0.5">
                            Erro: {item.mistakes || 'Nenhum'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
