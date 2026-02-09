import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/adminAuth';
import { getStatsByDateRange } from '@/lib/accessLogs';

export async function GET(request: NextRequest) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    if (!startDate || !endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];
      const defaultEnd = today.toISOString().split('T')[0];
      const stats = await getStatsByDateRange(defaultStart, defaultEnd);
      return NextResponse.json(stats);
    }

    const stats = await getStatsByDateRange(startDate, endDate);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
