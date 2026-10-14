import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Loader2, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";

const LOGO_SRC = "/lovable-uploads/4df8089b-e46d-449e-b42e-4ec8daedc049.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasRecoverySession(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasRecoverySession(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error("Erro ao atualizar senha", { description: error.message });
      } else {
        setSuccess(true);
        toast.success("Senha redefinida com sucesso!");
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate("/auth", { replace: true });
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Critérios visuais simples para guiar o usuário
  const minLengthOk = password.length >= 8;
  const matchOk = password.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header com logo */}
      <header className="px-4 sm:px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2">
          <img
            src={LOGO_SRC}
            alt="Bah Ofertas"
            className="h-9 sm:h-10 w-auto"
            loading="eager"
          />
        </Link>
      </header>

      {/* Conteúdo central */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border/60 overflow-hidden">
            {/* Faixa superior com gradiente da marca */}
            <div className="h-1.5 bg-gradient-to-r from-destructive via-primary to-destructive" />

            <div className="p-6 sm:p-8">
              {/* Ícone + título */}
              <div className="text-center mb-6">
                <div
                  className={`mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center transition-colors ${
                    success
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {success ? (
                    <CheckCircle2 className="h-7 w-7" />
                  ) : (
                    <KeyRound className="h-7 w-7" />
                  )}
                </div>

                <h1 className="text-2xl sm:text-[26px] font-bold text-foreground tracking-tight">
                  {success ? "Senha alterada!" : "Redefinir senha"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {success
                    ? "Tudo pronto! Estamos te redirecionando para o login..."
                    : hasRecoverySession
                    ? "Crie uma nova senha para acessar sua conta no Bah Ofertas."
                    : "Validando seu link de recuperação..."}
                </p>
              </div>

              {/* Formulário */}
              {!success && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-sm font-medium text-foreground">
                      Nova senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        required
                        disabled={!hasRecoverySession || isLoading}
                        className="h-11 pr-10 border-2 focus:border-destructive/50 transition-colors"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                      Confirmar nova senha
                    </Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
                      required
                      disabled={!hasRecoverySession || isLoading}
                      className="h-11 border-2 focus:border-destructive/50 transition-colors"
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Indicadores de critérios */}
                  <ul className="space-y-1 text-xs">
                    <li className={`flex items-center gap-2 ${minLengthOk ? "text-success" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${minLengthOk ? "opacity-100" : "opacity-40"}`} />
                      Pelo menos 8 caracteres
                    </li>
                    <li className={`flex items-center gap-2 ${matchOk ? "text-success" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${matchOk ? "opacity-100" : "opacity-40"}`} />
                      As duas senhas são iguais
                    </li>
                  </ul>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive/80 text-destructive-foreground font-semibold shadow-md hover:shadow-lg transition-all"
                    disabled={!hasRecoverySession || isLoading || !minLengthOk || !matchOk}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Atualizando...</>
                    ) : (
                      "Redefinir senha"
                    )}
                  </Button>

                  <div className="pt-2 text-center">
                    <Link
                      to="/auth"
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline"
                    >
                      Voltar para o login
                    </Link>
                  </div>
                </form>
              )}
            </div>

            {/* Rodapé do card com selo de segurança */}
            <div className="px-6 sm:px-8 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Conexão segura · Bah Ofertas</span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bah Ofertas — Todos os direitos reservados
          </p>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
