/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/lecturas — Obtiene las últimas 100 lecturas de la boya
export async function GET() {
  const { data, error } = await supabase
    .from('sensors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Reordenamos de más antiguo a más nuevo para las gráficas
  const formattedData = data.reverse().map(record => ({
    timestamp: record.created_at,
    ...record.payload
  }));

  return NextResponse.json({ success: true, data: formattedData });
}

// POST /api/lecturas — Inserta una nueva lectura de sensor en la base de datos
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const { data, error } = await supabase
      .from('sensors')
      .insert([{ payload }])
      .select();

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: 'Lectura guardada en Supabase', record: data[0] },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Payload JSON inválido' },
      { status: 400 }
    );
  }
}
