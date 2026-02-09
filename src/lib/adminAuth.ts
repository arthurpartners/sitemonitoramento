import { NextRequest } from 'next/server';
import { validateSession } from './sessionManager';

/** Obtém o token do header Authorization e valida se é um admin. Retorna o client ou null. */
export async function getAdminFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
  if (!token) return null;

  const result = await validateSession(token);
  if (!result || !result.client.is_admin) return null;
  return result.client;
}
