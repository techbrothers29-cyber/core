import { useEffect } from "react";

/**
 * Página de redirecionamento de marca para links de autenticação.
 *
 * O e-mail de recuperação enviado pelo Bah Ofertas aponta para
 *   https://bahofertas.com/auth-redirect?to=<url-encoded supabase auth link>
 * para que o domínio visível seja sempre o da marca. Este componente
 * apenas valida o destino (precisa ser do domínio Supabase do projeto)
 * e faz o redirect, preservando token e parâmetros.
 */
const AuthRedirect = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("to");

    if (!target) {
      window.location.replace("/auth");
      return;
    }

    let url: URL;
    try {
      url = new URL(target);
    } catch {
      window.location.replace("/auth");
      return;
    }

    // Permite somente *.supabase.co (auth oficial) por segurança.
    if (!/\.supabase\.co$/i.test(url.hostname)) {
      window.location.replace("/auth");
      return;
    }

    window.location.replace(url.toString());
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Redirecionando para verificação segura…</p>
      </div>
    </div>
  );
};

export default AuthRedirect;
