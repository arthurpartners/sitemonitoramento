import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { getLoginAttempts } from '@/lib/loginAttempts';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const onlyFailed = searchParams.get('onlyFailed') === 'true';
    const attempts = await getLoginAttempts(undefined, undefined, onlyFailed);
    return NextResponse.json(attempts);
  } catch (err) {
    console.error('Erro ao buscar tentativas:', err);
    return NextResponse.json(
      { error: 'Erro ao buscar tentativas' },
      { status: 500 }
    );
  }
}
