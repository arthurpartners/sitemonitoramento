import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { getAuditLogs } from '@/lib/auditLog';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const logs = await getAuditLogs(undefined, undefined, 200);
    return NextResponse.json(logs);
  } catch (err) {
    console.error('Erro ao buscar auditoria:', err);
    return NextResponse.json(
      { error: 'Erro ao buscar auditoria' },
      { status: 500 }
    );
  }
}
