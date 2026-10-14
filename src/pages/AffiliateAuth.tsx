import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAffiliateAuth } from "@/hooks/useAffiliateAuth";
import AuthLayout from "@/components/auth/AuthLayout";
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

  const loginForm = (
    <form onSubmit={handleLogin} className="space-y-4">
      {referrerCode && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-primary/10 rounded-lg p-2">
          <UserPlus className="h-3 w-3 text-primary" />
          <span>Você foi indicado por um afiliado</span>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-foreground font-medium text-sm">E-mail</Label>
        <Input id="email" name="email" type="email" placeholder="seu@email.com" required className="h-10 border-2 border-border focus:border-primary/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-foreground font-medium text-sm">Senha</Label>
        <div className="relative">
          <Input id="password" name="password" type={showLoginPassword ? "text" : "password"} placeholder="••••••••" required className="h-10 pr-10 border-2 border-border focus:border-primary/50 transition-all bg-background/50" />
          <button type="button" onClick={() => setShowLoginPassword(v => !v)} aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
            {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full h-10 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0" disabled={isLoading || loading}>
        {isLoading || loading ? "Entrando..." : "Entrar no Painel"}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={() => setForgotOpen(true)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
        >
          Esqueci minha senha
        </button>
      </div>
    </form>
  );

  const signupForm = (
    <form onSubmit={handleRegister} className="space-y-3">
      {referrerCode && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-primary/10 rounded-lg p-2">
          <UserPlus className="h-3 w-3 text-primary" />
          <span>Você foi indicado por um afiliado</span>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="fullName" className="text-foreground font-medium text-sm">Nome completo</Label>
        <Input id="fullName" name="fullName" type="text" placeholder="Seu nome completo" required className="h-9 border-2 border-border focus:border-primary/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="reg-email" className="text-foreground font-medium text-sm">E-mail</Label>
        <Input id="reg-email" name="email" type="email" placeholder="seu@email.com" required className="h-9 border-2 border-border focus:border-primary/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone" className="text-foreground font-medium text-sm">Telefone</Label>
        <Input id="phone" name="phone" type="tel" placeholder="(00) 00000-0000" required className="h-9 border-2 border-border focus:border-primary/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="reg-password" className="text-foreground font-medium text-sm">Senha</Label>
        <div className="relative">
          <Input id="reg-password" name="password" type={showRegPassword ? "text" : "password"} placeholder="••••••••" required className="h-9 pr-10 border-2 border-border focus:border-primary/50 transition-all bg-background/50" />
          <button type="button" onClick={() => setShowRegPassword(v => !v)} aria-label={showRegPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
            {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">A senha deve ter pelo menos 8 dígitos.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirmPassword" className="text-foreground font-medium text-sm">Confirmar senha</Label>
        <div className="relative">
          <Input id="confirmPassword" name="confirmPassword" type={showRegConfirm ? "text" : "password"} placeholder="••••••••" required className="h-9 pr-10 border-2 border-border focus:border-primary/50 transition-all bg-background/50" />
          <button type="button" onClick={() => setShowRegConfirm(v => !v)} aria-label={showRegConfirm ? "Ocultar senha" : "Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
            {showRegConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full h-10 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0" disabled={isLoading}>
        {isLoading ? "Cadastrando..." : "Criar Conta de Afiliado"}
      </Button>
    </form>
  );

  return (
    <>
      <AuthLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        loginForm={loginForm}
        signupForm={signupForm}
        accentColor="primary"
        logoSrc="/lovable-uploads/4df8089b-e46d-449e-b42e-4ec8daedc049.png"
        logoAlt="Bah Ofertas"
        loginCta={{
          title: "Seja um Afiliado!",
          subtitle: "Ganhe comissões de até 15% promovendo ofertas incríveis para sua rede",
          buttonText: "Cadastrar",
        }}
        signupCta={{
          title: "Já é Afiliado?",
          subtitle: "Entre no seu painel e acompanhe suas comissões e indicações",
          buttonText: "Entrar",
        }}
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
