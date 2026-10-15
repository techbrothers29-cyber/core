import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SocialLoginButtonsProps {
  isLoading?: boolean;
  /**
   * Apenas visual. "default" mantém o visual atual (usado no menu do cabeçalho);
   * "redesign" é o botão largo "Continuar com Google" das novas telas de login.
   */
  variant?: "default" | "redesign";
}

const GoogleIcon = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.56-2.77v-.53z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const SocialLoginButtons = ({ isLoading = false, variant = "default" }: SocialLoginButtonsProps) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSocialLogin = async (provider: "google" | "apple" | "facebook") => {
    setLoadingProvider(provider);
    try {
      // Resolve a safe absolute redirect URL. In iOS Safari (especially PWA
      // standalone), window.location.origin can be empty/inconsistent. We
      // never want Google to fall back to the Supabase Site URL (which may
      // be misconfigured to localhost).
      const origin =
        (typeof window !== "undefined" && window.location?.origin) ||
        "https://bahofertas.com";
      const redirectTo = `${origin}/`;

      // Detect iOS Safari/WebKit, where ITP breaks the default redirect flow.
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) &&
        !(window as unknown as { MSStream?: unknown }).MSStream;
      const isAppleWebkit = isIOS && /AppleWebKit/.test(ua);

      if (isAppleWebkit) {
        // iOS path: ask Supabase to BUILD the URL but NOT redirect. We then
        // navigate manually with location.assign so Safari has time to
        // persist the PKCE code_verifier in localStorage before leaving.
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams:
              provider === "google" ? { prompt: "select_account" } : undefined,
          },
        });

        if (error || !data?.url) {
          toast({
            title: "Erro no login social",
            description: error?.message || "Não foi possível iniciar o login.",
            variant: "destructive",
          });
          return;
        }

        // Small delay so Safari flushes localStorage before navigating.
        setTimeout(() => {
          window.location.assign(data.url);
        }, 80);
        return;
      }

      // Default path (Android, Desktop, etc.) — works as before.
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams:
            provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });

      if (error) {
        toast({
          title: "Erro no login social",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível conectar ao provedor.",
        variant: "destructive",
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  const disabled = isLoading || !!loadingProvider;

  if (variant === "redesign") {
    return (
      <div className="mt-5">
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-[#ebebeb] dark:bg-border" />
          <span className="text-xs text-[#6b6b6b] dark:text-muted-foreground">ou entre/cadastre-se com</span>
          <span className="h-px flex-1 bg-[#ebebeb] dark:bg-border" />
        </div>
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          disabled={disabled}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-foreground bg-background text-[15px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <GoogleIcon className="h-[18px] w-[18px]" />
          Continuar com Google
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">ou entre/cadastre-se com</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        {/* Google */}
        <button
          type="button"
          onClick={() => handleSocialLogin("google")}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg border-2 border-border bg-background/50 hover:bg-muted/80 transition-all duration-200 hover:scale-[1.03] disabled:opacity-50 disabled:pointer-events-none"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.56-2.77v-.53z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="text-xs font-medium text-foreground">Google</span>
        </button>

      </div>
    </div>
  );
};

export default SocialLoginButtons;
