import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { getActiveSessions, destroyAllSessionsForClient } from '@/lib/sessionManager';
import { recordAuditLog } from '@/lib/auditLog';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const sessions = await getActiveSessions();
    return NextResponse.json(sessions);
  } catch (err) {
    console.error('Erro ao buscar sessões:', err);
    return NextResponse.json(
      { error: 'Erro ao buscar sessões' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ error: 'clientId obrigatório' }, { status: 400 });
  }

  try {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();

    await destroyAllSessionsForClient(clientId);
    await recordAuditLog(admin.id, 'force_logout', client?.name ?? clientId, {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro ao forçar logout:', err);
    return NextResponse.json(
      { error: 'Erro ao encerrar sessões' },
      { status: 500 }
    );
  }
}
