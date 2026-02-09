import { supabase } from './supabase';

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
  created_at: string;
  clients?: { username: string; name: string } | null;
}

// Registra uma ação de auditoria
export async function recordAuditLog(
  adminId: string,
  action: string,
  target: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        action,
        target,
        details,
      });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseDetails(details: unknown): Record<string, unknown> {
  if (details == null) return {};
  if (typeof details === 'object' && !Array.isArray(details)) return details as Record<string, unknown>;
  if (typeof details === 'string') {
    try {
      return JSON.parse(details) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

// Busca log de auditoria por período
export async function getAuditLogs(
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  try {
    let query = supabase
      .from('admin_audit_log')
      .select(`
        id,
        admin_id,
        action,
        target,
        details,
        created_at,
        clients:admin_id ( username, name )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('Erro ao buscar auditoria:', error);
      return [];
    }

    if (!rows?.length) return [];

    // Coleta IDs (UUIDs) que ainda estão como target para buscar o nome do cliente
    const idsToResolve = [...new Set(rows.map((r: { target?: string }) => r.target).filter((t): t is string => typeof t === 'string' && UUID_REGEX.test(t)))];

    let nameById: Record<string, string> = {};
    if (idsToResolve.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', idsToResolve);
      if (clients) {
        nameById = Object.fromEntries(clients.map((c: { id: string; name: string }) => [c.id, c.name ?? c.id]));
      }
    }

    const result: AuditLogEntry[] = rows.map((row: {
      id: string;
      admin_id: string;
      action: string;
      target?: string;
      details?: unknown;
      created_at: string;
      clients?: { username: string; name: string } | null;
    }) => {
      const target = row.target ?? '';
      const targetDisplay = typeof target === 'string' && UUID_REGEX.test(target) ? (nameById[target] ?? target) : target;
      return {
        id: row.id,
        admin_id: row.admin_id,
        action: row.action,
        target: targetDisplay,
        details: parseDetails(row.details),
        created_at: row.created_at,
        clients: row.clients ?? null,
      };
    });

    return result;
  } catch (error) {
    console.error('Erro ao buscar auditoria:', error);
    return [];
  }
}
