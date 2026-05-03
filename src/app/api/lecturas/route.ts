/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://swnhvzevedukcnkxhsvp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bmh2emV2ZWR1a2Nua3hoc3ZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE4NjU2OCwiZXhwIjoyMDkwNzYyNTY4fQ.X1aVJJToKddLqAcphprRhKLSX3kTdl1tbOWFwGTm_H4';

function headers() {
  return {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  };
}

// GET /api/lecturas
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/sensors?select=*&order=created_at.desc&limit=100`,
    { headers: headers() }
  );

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }

  const data = await res.json();
  const formattedData = data.reverse().map((record: any) => ({
    timestamp: record.created_at,
    ...record.payload,
  }));

  return NextResponse.json({ success: true, data: formattedData });
}

// POST /api/lecturas
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/sensors`, {
      method: 'POST',
      headers: { ...headers(), 'Prefer': 'return=representation' },
      body: JSON.stringify({ payload }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ success: false, error: err.message || err.code }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(
      { success: true, message: 'Lectura guardada', record: data[0] },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Payload inválido' },
      { status: 400 }
    );
  }
}
