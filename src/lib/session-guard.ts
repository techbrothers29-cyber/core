import { supabase } from '@/integrations/supabase/client';
import { getEffectiveUserAccess, type EffectiveUserRole } from '@/lib/user-role';

export type SessionRole = EffectiveUserRole | 'cashier';

/**
 * Verifica se já existe uma sessão ativa no LocalStorage do navegador.
 * Como o Supabase compartilha o mesmo storage entre todos os tipos de usuário,
 * essa função sempre detecta a sessão da própria máquina (não de outros dispositivos).
 *
 * Para o caixa (email no domínio interno @caixa.bahofertas.local) usamos
 * heurística pelo email pois o role não está em getEffectiveUserAccess.
 */
export const checkActiveSession = async (): Promise<{
  hasSession: boolean;
  email?: string | null;
  role?: SessionRole;
}> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const cachedUser = sessionData?.session?.user;
  if (!cachedUser) return { hasSession: false };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userError || !user) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    return { hasSession: false };
  }

  // Detecta caixa pelo domínio interno
  if (user.email?.endsWith('@caixa.bahofertas.local')) {
    return { hasSession: true, email: user.email, role: 'cashier' };
  }

  try {
    const { role } = await getEffectiveUserAccess(user.id, user.email);
    return { hasSession: true, email: user.email, role };
  } catch {
    return { hasSession: true, email: user.email };
  }
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'administrador',
  partner: 'parceiro',
  affiliate: 'afiliado',
  cashier: 'caixa',
  client: 'cliente',
  user: 'cliente',
};

export const buildActiveSessionMessage = (
  email?: string | null,
  role?: SessionRole,
): string => {
  const label = role ? ROLE_LABELS[role] ?? 'usuário' : 'usuário';
  const who = email ? ` (${email})` : '';
  return `Já existe uma sessão ativa de ${label}${who}. Saia da conta atual antes de entrar com outro usuário.`;
};

export const ACTIVE_SESSION_MESSAGE =
  'Já existe uma sessão ativa. Saia da conta atual antes de entrar com outro usuário.';

/**
 * Limpa qualquer sessão local ativa antes de iniciar um novo login.
 * Como o storage do Supabase é compartilhado entre todos os tipos de usuário
 * no mesmo navegador, sempre que alguém tenta logar com um tipo diferente,
 * derrubamos a sessão anterior automaticamente.
 *
 * Retorna informações sobre a sessão que foi derrubada (se houver), para que
 * a UI possa exibir um aviso amigável.
 */
export const clearSessionForNewLogin = async (
  targetRole: SessionRole,
): Promise<{ replaced: boolean; previousRole?: SessionRole; previousEmail?: string | null }> => {
  const active = await checkActiveSession();

  if (!active.hasSession) {
    return { replaced: false };
  }

  // Mesmo papel: não precisamos derrubar (signIn vai sobrescrever igualmente,
  // mas mantemos signOut local para garantir storage limpo).
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);

  return {
    replaced: active.role !== targetRole,
    previousRole: active.role,
    previousEmail: active.email,
  };
};

export const buildReplacedSessionMessage = (
  previousRole?: SessionRole,
  previousEmail?: string | null,
): string => {
  const label = previousRole ? ROLE_LABELS[previousRole] ?? 'usuário' : 'usuário';
  const who = previousEmail ? ` (${previousEmail})` : '';
  return `Sessão anterior de ${label}${who} foi encerrada para liberar este login.`;
};
