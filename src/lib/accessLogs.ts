import { supabase } from './supabase';

export interface AccessLog {
  id: string;
  client_id?: string;
  username: string;
  client_name: string;
  ip?: string;
  user_agent?: string;
  action: 'login' | 'open_drive';
  created_at: string;
}

export interface AccessStats {
  totalAccesses: number;
  totalDriveAccesses: number;
  accessesByClient: { [key: string]: number };
  driveByClient: { [key: string]: number };
  accessesByDate: { [key: string]: number };
  recentLogs: AccessLog[];
}

// Adiciona um novo log de acesso
export async function addAccessLog(
  clientId: string,
  username: string,
  clientName: string,
  action: 'login' | 'open_drive' = 'login',
  ip?: string,
  userAgent?: string
): Promise<AccessLog | null> {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .insert({
        client_id: clientId,
        username,
        client_name: clientName,
        action,
        ip: ip || 'unknown',
        user_agent: userAgent || '',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao registrar acesso:', error);
    return null;
  }
}

// Busca logs por período (ajustado para Brasília UTC-3)
export async function getLogsByDateRange(startDate: string, endDate: string): Promise<AccessLog[]> {
  try {
    // Brasília = UTC-3, então 00:00 em Brasília = 03:00 UTC
    const startDateTime = `${startDate}T03:00:00.000Z`;
    // Fim do dia em Brasília = 02:59:59 UTC do dia seguinte
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const endDateTime = `${endDateObj.toISOString().split('T')[0]}T02:59:59.999Z`;

    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .gte('created_at', startDateTime)
      .lte('created_at', endDateTime)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return [];
  }
}

// Busca todos os logs
export async function getAllLogs(): Promise<AccessLog[]> {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar todos os logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar todos os logs:', error);
    return [];
  }
}

// Converte UTC para data local (Brasília UTC-3)
function toLocalDate(utcTimestamp: string): string {
  const date = new Date(utcTimestamp);
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // formato YYYY-MM-DD
}

// Gera estatísticas dos logs
export function getStats(logs: AccessLog[]): AccessStats {
  const accessesByClient: { [key: string]: number } = {};
  const driveByClient: { [key: string]: number } = {};
  const accessesByDate: { [key: string]: number } = {};

  const loginLogs = logs.filter(log => log.action === 'login');
  const driveLogs = logs.filter(log => log.action === 'open_drive');

  // Contabiliza logins (acessos)
  loginLogs.forEach(log => {
    accessesByClient[log.client_name] = (accessesByClient[log.client_name] || 0) + 1;

    const date = toLocalDate(log.created_at);
    accessesByDate[date] = (accessesByDate[date] || 0) + 1;
  });

  // Contabiliza acessos ao Drive separadamente
  driveLogs.forEach(log => {
    driveByClient[log.client_name] = (driveByClient[log.client_name] || 0) + 1;
  });

  return {
    totalAccesses: loginLogs.length,
    totalDriveAccesses: driveLogs.length,
    accessesByClient,
    driveByClient,
    accessesByDate,
    recentLogs: loginLogs.slice(0, 50),
  };
}

// Estatísticas por período
export async function getStatsByDateRange(startDate: string, endDate: string): Promise<AccessStats> {
  const logs = await getLogsByDateRange(startDate, endDate);
  return getStats(logs);
}
