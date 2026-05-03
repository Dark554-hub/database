/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient(useServiceRole = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// GET /api/lecturas — Obtiene las últimas 100 lecturas de la boya
export async function GET() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('sensors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const formattedData = data.reverse().map((record: any) => ({
    timestamp: record.created_at,
    ...record.payload
  }));

  return NextResponse.json({ success: true, data: formattedData });
}

// POST /api/lecturas — Inserta una nueva lectura de sensor en la base de datos
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(`${url}/rest/v1/sensors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ payload }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ success: false, error: err.message || err.code }, { status: 500 });
    }

    const data = await res.json();
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
