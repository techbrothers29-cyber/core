import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, signUpSchema, formatValidationErrors } from "@/lib/validation";
import AuthSplitLayout from "@/components/auth/redesign/AuthSplitLayout";
import AuthField, { AuthFieldGroup } from "@/components/auth/redesign/AuthField";
import { AuthSubmitButton, AuthTextButton } from "@/components/auth/redesign/AuthCard";
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
    <form onSubmit={handleLogin}>
      <AuthFieldGroup>
        <AuthField id="login-email" name="email" type="email" label="E-mail" placeholder="seu@email.com" autoComplete="email" required />
        <AuthField id="login-password" name="password" type="password" label="Senha" placeholder="••••••••" autoComplete="current-password" required />
      </AuthFieldGroup>
      <AuthSubmitButton disabled={isLoading || loading}>
        {isLoading || loading ? "Entrando..." : "Entrar"}
      </AuthSubmitButton>
      <AuthTextButton onClick={() => setForgotOpen(true)}>Esqueci minha senha</AuthTextButton>
      <SocialLoginButtons isLoading={isLoading} variant="redesign" />
    </form>
  );

  const signupForm = (
    <form onSubmit={handleSignUp}>
      <AuthFieldGroup>
        <AuthField id="signup-name" name="fullName" type="text" label="Nome completo" placeholder="Seu nome completo" autoComplete="name" required />
        <AuthField id="signup-cpf" name="cpf" type="text" label="CPF" placeholder="000.000.000-00" autoComplete="off" required maxLength={14} />
        <AuthField id="signup-email" name="email" type="email" label="E-mail" placeholder="seu@email.com" autoComplete="email" required />
        <AuthField id="signup-phone" name="phone" type="tel" label="Telefone" placeholder="(11) 99999-9999" autoComplete="tel" required maxLength={15} />
        <AuthField id="signup-password" name="password" type="password" label="Senha" placeholder="Mín. 8 dígitos" autoComplete="new-password" minLength={8} required />
      </AuthFieldGroup>
      <AuthSubmitButton disabled={isLoading}>
        {isLoading ? "Cadastrando..." : "Cadastrar"}
      </AuthSubmitButton>
      {/* No desktop o Google já aparece no cartão "Entrar", ao lado; no celular cada aba tem o seu. */}
      <div className="md:hidden">
        <SocialLoginButtons isLoading={isLoading} variant="redesign" />
      </div>
    </form>
  );

  return (
    <>
      <AuthSplitLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hero={{
          title: "Bah! Você aqui novamente",
          subtitle: "Vamos iniciar o seu cadastro e começar a melhor experiência para sua viagem",
        }}
        loginForm={loginForm}
        signupForm={signupForm}
      />
      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        accentColor="primary"
        portal="cliente"
      />
    </>
  );
};

export default Auth;
