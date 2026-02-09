import { supabase } from './supabase';

export interface LoginAttempt {
  id: string;
  username: string;
  success: boolean;
  ip: string;
  user_agent: string;
  created_at: string;
}

// Registra uma tentativa de login
export async function recordLoginAttempt(
  username: string,
  success: boolean,
  ip: string,
  userAgent: string
): Promise<void> {
  try {
    await supabase
      .from('login_attempts')
      .insert({
        username,
        success,
        ip,
        user_agent: userAgent,
      });
  } catch (error) {
    console.error('Erro ao registrar tentativa de login:', error);
  }
}

// Busca tentativas de login por período
export async function getLoginAttempts(
  startDate?: string,
  endDate?: string,
  onlyFailed?: boolean
): Promise<LoginAttempt[]> {
  try {
    let query = supabase
      .from('login_attempts')
      .select('*')
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
    }
    if (onlyFailed) {
      query = query.eq('success', false);
    }

    const { data, error } = await query.limit(200);

    if (error) {
      console.error('Erro ao buscar tentativas:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar tentativas:', error);
    return [];
  }
}

// Conta tentativas falhadas recentes de um IP (para rate limiting)
export async function getRecentFailedAttempts(ip: string, minutes: number = 15): Promise<number> {
  try {
    const since = new Date();
    since.setMinutes(since.getMinutes() - minutes);

    const { count, error } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .eq('success', false)
      .gte('created_at', since.toISOString());

    if (error) {
      console.error('Erro ao contar tentativas:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Erro ao contar tentativas:', error);
    return 0;
  }
}
