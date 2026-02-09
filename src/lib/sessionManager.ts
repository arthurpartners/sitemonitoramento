import { supabase } from './supabase';
import crypto from 'crypto';

const SESSION_DURATION_HOURS = 8;

// Gera um token aleatório seguro
function generateToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

// Cria uma nova sessão
export async function createSession(
  clientId: string,
  ip: string,
  userAgent: string
): Promise<string | null> {
  try {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

    const { error } = await supabase
      .from('sessions')
      .insert({
        client_id: clientId,
        token,
        ip,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
      });

    if (error) {
      console.error('Erro ao criar sessão:', error);
      return null;
    }

    return token;
  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    return null;
  }
}

// Valida um token de sessão e retorna os dados do cliente
export async function validateSession(token: string) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        clients (
          id,
          username,
          name,
          report_url,
          drive_url,
          is_admin,
          is_active
        )
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Verifica se o cliente está ativo
    const client = data.clients as {
      id: string;
      username: string;
      name: string;
      report_url: string;
      drive_url: string;
      is_admin: boolean;
      is_active: boolean;
    } | null;

    if (!client || !client.is_active) {
      return null;
    }

    return {
      session: data,
      client,
    };
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    return null;
  }
}

// Destrói uma sessão (logout)
export async function destroySession(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('token', token);

    if (error) {
      console.error('Erro ao destruir sessão:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao destruir sessão:', error);
    return false;
  }
}

// Destrói todas as sessões de um cliente (forçar logout)
export async function destroyAllSessionsForClient(clientId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('client_id', clientId);

    if (error) {
      console.error('Erro ao destruir sessões:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao destruir sessões:', error);
    return false;
  }
}

// Lista sessões ativas
export async function getActiveSessions() {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        clients (
          id,
          username,
          name
        )
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar sessões:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar sessões:', error);
    return [];
  }
}

// Limpa sessões expiradas
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('Erro ao limpar sessões expiradas:', error);
  }
}
