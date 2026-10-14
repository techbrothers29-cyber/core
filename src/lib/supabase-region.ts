import { supabase } from "@/integrations/supabase/client";

/**
 * Invoca uma Edge Function forçando execução na região sa-east-1 (São Paulo).
 * Necessário para APIs que bloqueiam IPs internacionais (ex: NovaXS).
 */
export async function invokeInBrazil<T = any>(
  functionName: string,
  body: Record<string, any>,
  options: { allowFallback?: boolean } = { allowFallback: true }
): Promise<{ data: T | null; error: any }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: anonKey,
    "x-region": "sa-east-1",
  };

  if (sessionData?.session?.access_token) {
    headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
  } else {
    headers["Authorization"] = `Bearer ${anonKey}`;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // Graceful degradation: Supabase Edge Runtime indisponível (503) ou
    // outros erros 5xx do runtime devem retornar fallback vazio ao invés de
    // propagar erro e quebrar a UI.
    if (res.status >= 500) {
      const txt = await res.text().catch(() => '');
      console.warn(
        `[invokeInBrazil] ${functionName} runtime indisponível (${res.status}). Body: ${txt}`
      );
      if (options.allowFallback) {
        return { data: { fallback: true } as unknown as T, error: null };
      }
      return { data: null, error: { message: `Edge runtime ${res.status}: ${txt || 'sem corpo'}` } };
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      return { data: null, error: data };
    }

    return { data, error: null };
  } catch (err) {
    console.warn(`[invokeInBrazil] ${functionName} falha de rede:`, err);
    if (options.allowFallback) {
      return { data: { fallback: true } as unknown as T, error: null };
    }
    return { data: null, error: { message: (err as Error)?.message || 'Falha de rede' } };
  }
}
