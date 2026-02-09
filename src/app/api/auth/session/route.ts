import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/sessionManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token ausente.' }, { status: 400 });
    }

    const result = await validateSession(token);
    if (!result) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { client } = result;
    return NextResponse.json({
      client: {
        username: client.username,
        name: client.name,
        reportUrl: client.report_url ?? '',
        driveUrl: client.drive_url ?? '',
        isAdmin: client.is_admin ?? false,
      },
    });
  } catch (err) {
    console.error('Erro ao validar sessão:', err);
    return NextResponse.json(
      { error: 'Erro de conexão. Tente novamente.' },
      { status: 500 }
    );
  }
}
