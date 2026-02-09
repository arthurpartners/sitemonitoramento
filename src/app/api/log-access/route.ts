import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/sessionManager';
import { supabase } from '@/lib/supabase';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action } = body;

    if (!token || !action) {
      return NextResponse.json({ error: 'Token e action obrigatórios.' }, { status: 400 });
    }

    const validActions = ['login', 'view_report', 'open_drive'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Action inválida.' }, { status: 400 });
    }

    const result = await validateSession(token);
    if (!result) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    const { client } = result;
    // Admins não entram nas métricas de acesso
    if (client.is_admin) {
      return NextResponse.json({ ok: true });
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    await supabase.from('access_logs').insert({
      client_id: client.id,
      username: client.username,
      client_name: client.name,
      action,
      ip,
      user_agent: userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro ao registrar acesso:', err);
    return NextResponse.json({ error: 'Erro ao registrar acesso.' }, { status: 500 });
  }
}
