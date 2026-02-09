import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/sessionManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (token) {
      await destroySession(token);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro no logout:', err);
    return NextResponse.json({ ok: true }); // Sempre retorna ok para limpar o front
  }
}
