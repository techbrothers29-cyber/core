import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, signUpSchema, formatValidationErrors } from "@/lib/validation";
import AuthLayout from "@/components/auth/AuthLayout";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";
import { getEffectiveUserAccess } from "@/lib/user-role";
import { clearSessionForNewLogin } from "@/lib/session-guard";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [forgotOpen, setForgotOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading } = useAuth();

  // Reage a mudanças de ?mode= na URL (ex.: CTA "Cadastre-se" do modal de boas-vindas)
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup" || mode === "login") setActiveTab(mode);
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || isLoading) return;
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    try {
      await clearSessionForNewLogin('client');
      const validatedData = loginSchema.parse(rawData);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        toast({ title: "Erro no login", description: "Email ou senha incorretos.", variant: "destructive" });
      } else {
        if (data?.user) {
          const { role } = await getEffectiveUserAccess(data.user.id, data.user.email);

          toast({ title: "Login realizado com sucesso!", description: "Redirecionando..." });

          switch (role) {
            case 'admin':
              navigate("/admin/dashboard", { replace: true });
              return;
            case 'affiliate':
              navigate("/afiliado/painel", { replace: true });
              return;
            case 'partner':
              navigate("/parceiro/painel", { replace: true });
              return;
            case 'client':
            case 'user':
            default:
              navigate("/dashboard", { replace: true });
              return;
          }
        }

        toast({ title: "Login realizado com sucesso!", description: "Redirecionando para a página inicial..." });
        navigate("/", { replace: true });
      }
    } catch (validationError: any) {
      toast({ title: "Dados inválidos", description: formatValidationErrors(validationError), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      fullName: formData.get("fullName") as string,
      cpf: formData.get("cpf") as string,
      phone: formData.get("phone") as string,
    };

    try {
      const validatedData = signUpSchema.parse(rawData);

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validatedData.fullName,
            cpf: validatedData.cpf,
            phone: validatedData.phone,
            role_type: 'user',
            referrer_code: (() => { try { return localStorage.getItem('referrer_affiliate_code') || undefined; } catch { return undefined; } })()
          }
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message?.includes('User already registered')) {
          errorMessage = "Este e-mail já está cadastrado. Faça login ou use um e-mail diferente.";
        } else if (error.message?.includes('Database error saving new user')) {
          errorMessage = "Este CPF ou e-mail já está cadastrado. Use dados diferentes ou faça login.";
        } else if (error.message?.includes('Password should be')) {
          errorMessage = "A senha deve ter pelo menos 8 dígitos (ex: 10203040).";
        }
        toast({ title: "Erro no cadastro", description: errorMessage, variant: "destructive" });
      } else if (signUpData?.session) {
        // Auto-confirm ativo: usuário já entra logado — vai direto para a home
        toast({ title: "Cadastro realizado!", description: "Bem-vindo ao Bah Ofertas!" });
        navigate("/", { replace: true });
      } else {
        toast({ title: "Cadastro realizado!", description: "Verifique seu email para confirmar a conta antes de fazer login." });

        // Send welcome email
        supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'boas-vindas',
            recipientEmail: validatedData.email,
            idempotencyKey: `boas-vindas-${validatedData.email}-${Date.now()}`,
            templateData: { name: validatedData.fullName },
          },
        }).catch(err => console.error('Welcome email error:', err));
      }
    } catch (validationError: any) {
      if (validationError.issues) {
        toast({ title: "Dados inválidos", description: formatValidationErrors(validationError), variant: "destructive" });
      } else {
        let errorMessage = "Ocorreu um erro inesperado.";
        if (validationError.message?.includes('Database error saving new user')) {
          errorMessage = "Este CPF ou e-mail já está cadastrado.";
        } else if (validationError.message?.includes('User already registered')) {
          errorMessage = "Este e-mail já está cadastrado.";
        }
        toast({ title: "Erro no cadastro", description: errorMessage, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loginForm = (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="text-foreground font-medium text-sm">E-mail</Label>
        <Input id="login-email" name="email" type="email" placeholder="seu@email.com" required className="h-10 border-2 border-border focus:border-destructive/50 transition-all duration-300 bg-background/50" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password" className="text-foreground font-medium text-sm">Senha</Label>
        <Input id="login-password" name="password" type="password" placeholder="••••••••" required className="h-10 border-2 border-border focus:border-destructive/50 transition-all duration-300 bg-background/50" />
      </div>
      <Button type="submit" className="w-full h-10 bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive/80 text-destructive-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0" disabled={isLoading || loading}>
        {isLoading || loading ? "Entrando..." : "Entrar"}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={() => setForgotOpen(true)}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline"
        >
          Esqueci minha senha
        </button>
      </div>
      <SocialLoginButtons isLoading={isLoading} />
    </form>
  );

  const signupForm = (
    <form onSubmit={handleSignUp} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="signup-name" className="text-foreground font-medium text-sm">Nome completo</Label>
        <Input id="signup-name" name="fullName" type="text" placeholder="Seu nome completo" required className="h-9 border-2 border-border focus:border-destructive/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="signup-cpf" className="text-foreground font-medium text-sm">CPF</Label>
        <Input id="signup-cpf" name="cpf" type="text" placeholder="000.000.000-00" required maxLength={14} className="h-9 border-2 border-border focus:border-destructive/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="signup-email" className="text-foreground font-medium text-sm">E-mail</Label>
        <Input id="signup-email" name="email" type="email" placeholder="seu@email.com" required className="h-9 border-2 border-border focus:border-destructive/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="signup-phone" className="text-foreground font-medium text-sm">Telefone</Label>
        <Input id="signup-phone" name="phone" type="tel" placeholder="(11) 99999-9999" required maxLength={15} className="h-9 border-2 border-border focus:border-destructive/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="signup-password" className="text-foreground font-medium text-sm">Senha</Label>
<Input id="signup-password" name="password" type="password" placeholder="Mín. 8 dígitos" minLength={8} required className="h-9 border-2 border-border focus:border-destructive/50 transition-all bg-background/50" />
      </div>
      <Button type="submit" className="w-full h-10 bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive/80 text-destructive-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0" disabled={isLoading}>
        {isLoading ? "Cadastrando..." : "Cadastrar"}
      </Button>
      <SocialLoginButtons isLoading={isLoading} />
    </form>
  );

  return (
    <>
      <AuthLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        loginForm={loginForm}
        signupForm={signupForm}
        accentColor="destructive"
        logoSrc="/logo-desktop.png"
        logoAlt="Bah Ofertas"
        loginCta={{
          title: "Bah!\nVocê aqui novamente",
          subtitle: "Vamos iniciar o seu cadastro e começar a melhor experiência para sua viagem",
          buttonText: "Cadastrar",
        }}
        signupCta={{
          title: "Bem-vindo de volta!",
          subtitle: "Entre com suas credenciais para acessar suas ofertas e vouchers",
          buttonText: "Entrar",
        }}
      />
      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        accentColor="destructive"
        portal="cliente"
      />
    </>
  );
};

export default Auth;
