import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// In-memory fallback database for seamless out-of-the-box operation if Supabase table is not configured
let inMemoryAlerts: any[] = [];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');

    let query = supabase.from('alert_configs').select('*').order('created_at', { ascending: false });

    if (symbol) {
      query = query.eq('symbol', symbol.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[Supabase GET Alerts Error, falling back to local memory]:', error.message);
      let filtered = [...inMemoryAlerts];
      if (symbol) {
        filtered = filtered.filter(a => a.symbol === symbol.toUpperCase());
      }
      return NextResponse.json({ success: true, data: filtered, fallback: true });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar configurações de alertas', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      symbol,
      condition,
      threshold,
      discord_webhook = '',
      is_active = true
    } = body;

    if (!symbol || !condition || threshold === undefined) {
      return NextResponse.json(
        { success: false, error: 'Par, condição e limite são obrigatórios' },
        { status: 400 }
      );
    }

    const thresholdVal = parseFloat(threshold);

    // Try Supabase first
    const { data, error } = await supabase
      .from('alert_configs')
      .insert({
        symbol: symbol.toUpperCase(),
        condition,
        threshold: thresholdVal,
        discord_webhook,
        is_active,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.warn('[Supabase POST Alerts Error, saving to local memory]:', error.message);
      
      const newAlert = {
        id: crypto.randomUUID(),
        symbol: symbol.toUpperCase(),
        condition,
        threshold: thresholdVal,
        discord_webhook,
        is_active,
        created_at: new Date().toISOString()
      };
      
      inMemoryAlerts.unshift(newAlert);
      return NextResponse.json({ success: true, data: newAlert, fallback: true });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating alert config:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao cadastrar configuração de alerta', details: error.message },
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
        { success: false, error: 'ID do alerta ausente' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('alert_configs')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[Supabase DELETE Alerts Error, removing from local memory]:', error.message);
      const initialLength = inMemoryAlerts.length;
      inMemoryAlerts = inMemoryAlerts.filter(a => a.id !== id);
      
      if (inMemoryAlerts.length === initialLength && id.length > 10) {
        // Did not delete anything but it was probably a local id
      }
      return NextResponse.json({ success: true, message: 'Alerta excluído da memória local', fallback: true });
    }

    return NextResponse.json({ success: true, message: 'Alerta excluído com sucesso' });
  } catch (error: any) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir o alerta', details: error.message },
      { status: 500 }
    );
  }
}
