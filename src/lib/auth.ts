'use client';

export interface Session {
  username: string;
  clientName: string;
  reportUrl: string;
  driveUrl: string;
  loginTime: number;
  isAdmin?: boolean;
  token: string;
}

const SESSION_KEY = 'partners_session';

export function saveSession(session: Session): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) {
    return null;
  }

  try {
    const session: Session = JSON.parse(stored);
    // Sessão expira após 8 horas (client-side check)
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    if (Date.now() - session.loginTime > EIGHT_HOURS) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// Registra acesso no servidor
export async function logAccess(
  token: string,
  action: 'login' | 'view_report' | 'open_drive' = 'login'
): Promise<void> {
  try {
    await fetch('/api/log-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    });
  } catch (error) {
    console.error('Erro ao registrar acesso:', error);
  }
}
