import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { createSession } from '@/lib/sessionManager';
import { recordLoginAttempt } from '@/lib/loginAttempts';
import { addAccessLog } from '@/lib/accessLogs';

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
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuário e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const userAgent = getUserAgent(request);

    // Busca o cliente pelo username (apenas ativos)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, username, name, report_url, drive_url, is_admin, password_hash')
      .eq('username', username.trim())
      .eq('is_active', true)
      .single();

    if (clientError || !client) {
      await recordLoginAttempt(username, false, ip, userAgent);
      return NextResponse.json(
        { error: 'Usuário ou senha incorretos.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, client.password_hash);
    if (!passwordMatch) {
      await recordLoginAttempt(username, false, ip, userAgent);
      return NextResponse.json(
        { error: 'Usuário ou senha incorretos.' },
        { status: 401 }
      );
    }

    const token = await createSession(client.id, ip, userAgent);
    if (!token) {
      await recordLoginAttempt(username, false, ip, userAgent);
      return NextResponse.json(
        { error: 'Erro ao criar sessão. Tente novamente.' },
        { status: 500 }
      );
    }

    await recordLoginAttempt(username, true, ip, userAgent);
    // Admins não entram nas métricas de acesso
    if (!client.is_admin) {
      await addAccessLog(client.id, client.username, client.name, 'login', ip, userAgent);
    }

    return NextResponse.json({
      token,
      client: {
        username: client.username,
        name: client.name,
        reportUrl: client.report_url ?? '',
        driveUrl: client.drive_url ?? '',
        isAdmin: client.is_admin ?? false,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return NextResponse.json(
      { error: 'Erro de conexão. Tente novamente.' },
      { status: 500 }
    );
  }
}
