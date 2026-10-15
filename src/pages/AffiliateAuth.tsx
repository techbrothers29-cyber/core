import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAffiliateAuth } from "@/hooks/useAffiliateAuth";
import AuthSplitLayout from "@/components/auth/redesign/AuthSplitLayout";
import AuthField, { AuthFieldGroup, PasswordToggle } from "@/components/auth/redesign/AuthField";
import { AuthSubmitButton, AuthTextButton } from "@/components/auth/redesign/AuthCard";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";
import { affiliateSignUpSchema, formatValidationErrors } from '@/lib/validation';
import { clearSessionForNewLogin } from '@/lib/session-guard';

const AffiliateAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const referrerCode = searchParams.get('referrer');
  const [activeTab, setActiveTab] = useState(referrerCode ? "signup" : "login");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, loading } = useAffiliateAuth();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || isLoading) return;
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    setIsLoading(true);
    await clearSessionForNewLogin('affiliate');

    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({ title: "Erro no login", description: "Email ou senha incorretos.", variant: "destructive" });
    } else {
      toast({ title: "Login realizado com sucesso!", description: "Redirecionando para o painel..." });
      navigate("/afiliado/painel");
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    const validation = affiliateSignUpSchema.safeParse({ fullName, email, phone, password, confirmPassword });
    if (!validation.success) {
      toast({ title: "Erro no cadastro", description: formatValidationErrors(validation.error), variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, phone, referrerCode || undefined);
    setIsLoading(false);

    if (error) {
      toast({ title: "Erro no cadastro", description: error.message || "Erro ao criar conta.", variant: "destructive" });
    } else {
      toast({ title: "Cadastro realizado!", description: "Você já pode fazer login." });
      (e.target as HTMLFormElement).reset();
      setActiveTab("login");
    }
  };

  const referrerNotice = (
    <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#fff1f1] dark:bg-primary/10 px-3.5 py-2.5 text-sm text-foreground">
      <UserPlus className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span>Você foi indicado por um afiliado</span>
    </div>
  );

  const loginForm = (
    <form onSubmit={handleLogin}>
      {/* No desktop o aviso aparece só no cartão de cadastro, ao lado. */}
      {referrerCode && <div className="md:hidden">{referrerNotice}</div>}
      <AuthFieldGroup>
        <AuthField id="email" name="email" type="email" label="E-mail" placeholder="seu@email.com" autoComplete="email" required />
        <AuthField
          id="password"
          name="password"
          type={showLoginPassword ? "text" : "password"}
          label="Senha"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          endAdornment={<PasswordToggle visible={showLoginPassword} onToggle={() => setShowLoginPassword(v => !v)} />}
        />
      </AuthFieldGroup>
      <AuthSubmitButton disabled={isLoading || loading}>
        {isLoading || loading ? "Entrando..." : "Entrar no Painel"}
      </AuthSubmitButton>
      <AuthTextButton onClick={() => setForgotOpen(true)}>Esqueci minha senha</AuthTextButton>
    </form>
  );

  const signupForm = (
    <form onSubmit={handleRegister}>
      {referrerCode && referrerNotice}
      <AuthFieldGroup>
        <AuthField id="fullName" name="fullName" type="text" label="Nome completo" placeholder="Seu nome completo" autoComplete="name" required />
        <AuthField id="reg-email" name="email" type="email" label="E-mail" placeholder="seu@email.com" autoComplete="email" required />
        <AuthField id="phone" name="phone" type="tel" label="Telefone" placeholder="(00) 00000-0000" autoComplete="tel" required />
        <AuthField
          id="reg-password"
          name="password"
          type={showRegPassword ? "text" : "password"}
          label="Senha"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          hint="A senha deve ter pelo menos 8 dígitos."
          endAdornment={<PasswordToggle visible={showRegPassword} onToggle={() => setShowRegPassword(v => !v)} />}
        />
        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          type={showRegConfirm ? "text" : "password"}
          label="Confirmar senha"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          endAdornment={<PasswordToggle visible={showRegConfirm} onToggle={() => setShowRegConfirm(v => !v)} />}
        />
      </AuthFieldGroup>
      <AuthSubmitButton disabled={isLoading}>
        {isLoading ? "Cadastrando..." : "Criar Conta de Afiliado"}
      </AuthSubmitButton>
    </form>
  );

  return (
    <>
      <AuthSplitLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hero={{
          title: "Seja um Afiliado!",
          subtitle: "Ganhe 5% em cada venda de ofertas, ingressos e hospedagem — e mais 1% sobre as vendas dos sub-afiliados que você indicar.",
        }}
        loginForm={loginForm}
        signupForm={signupForm}
      />
      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        accentColor="primary"
        portal="afiliado"
      />
    </>
  );
};

export default AffiliateAuth;
