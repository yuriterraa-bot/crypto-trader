import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const strategy = searchParams.get('strategy');
    const emotion = searchParams.get('emotion');
    const outcome = searchParams.get('outcome'); // 'win' | 'loss'
    const tag = searchParams.get('tag');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase.from('journal_entries').select('*').order('date', { ascending: false });

    if (symbol) query = query.eq('symbol', symbol.toUpperCase());
    if (strategy) query = query.eq('strategy', strategy);
    if (emotion) query = query.eq('emotions', emotion);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    if (outcome) {
      if (outcome === 'win') query = query.gt('pnl_usdt', 0);
      if (outcome === 'loss') query = query.lte('pnl_usdt', 0);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching trading journal:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar o diário de trading', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      date,
      symbol,
      direction,
      entryPrice,
      exitPrice,
      quantity,
      leverage = 1,
      strategy,
      setup = '',
      emotions = '',
      mistakes = '',
      lessons = '',
      tags = []
    } = body;

    // Validation
    if (!date || !symbol || !direction || !entryPrice || !exitPrice || !quantity || !strategy) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }

    const entry = parseFloat(entryPrice);
    const exit = parseFloat(exitPrice);
    const qty = parseFloat(quantity);
    const lev = parseInt(leverage);

    // Calculate PnL
    const isLong = direction.toUpperCase() === 'LONG';
    const pnl_usdt = isLong ? (exit - entry) * qty : (entry - exit) * qty;
    
    // Margin is (Price * Qty) / Leverage
    const margin = (entry * qty) / lev;
    const pnl_percent = margin > 0 ? (pnl_usdt / margin) * 100 : 0;

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        date,
        symbol: symbol.toUpperCase(),
        direction: direction.toUpperCase(),
        entry_price: entry,
        exit_price: exit,
        quantity: qty,
        leverage: lev,
        pnl_usdt,
        pnl_percent,
        strategy,
        setup,
        emotions,
        mistakes,
        lessons,
        tags
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cadastrar entrada no diário', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do registro ausente' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Registro excluído com sucesso' });
  } catch (error: any) {
    console.error('Error deleting journal entry:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir o registro do diário', details: error.message },
      { status: 500 }
    );
  }
}
