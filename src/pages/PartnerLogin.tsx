import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '@/hooks/usePartnerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AuthLayout from '@/components/auth/AuthLayout';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';
import { partnerSignUpSchema, formatValidationErrors } from '@/lib/validation';
import { clearSessionForNewLogin } from '@/lib/session-guard';

interface Category {
  id: string;
  name: string;
  slug: string;
}

const PartnerLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [categories, setCategories] = useState<Category[]>([]);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { signUp, signIn, loading } = usePartnerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      if (data && !error) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || isLoading) return;
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    setIsLoading(true);
    await clearSessionForNewLogin('partner');

    const { error } = await signIn(email, password);
    if (!error) {
      toast.success('Redirecionando para seu painel...');
      navigate('/parceiro/painel');
    } else {
      toast.error('Email ou senha incorretos.');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const fullName = formData.get('fullName') as string;
    const companyName = formData.get('companyName') as string;
    const cnpj = formData.get('cnpj') as string;
    const phone = formData.get('phone') as string;
    const categoryId = formData.get('categoryId') as string;

    const validation = partnerSignUpSchema.safeParse({ fullName, companyName, cnpj, phone, email, password, confirmPassword, categoryId });
    if (!validation.success) {
      toast.error(formatValidationErrors(validation.error));
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, companyName, cnpj, phone, categoryId);
    if (!error) {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        toast.success('Estabelecimento cadastrado! Redirecionando...');
        navigate('/parceiro/painel');
      } else {
        toast.success('Cadastro realizado! Faça login para acessar o painel.');
        setActiveTab('login');
      }
    } else {
      toast.error(error.message || 'Erro ao cadastrar. Tente novamente.');
    }
    setIsLoading(false);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 14);
    let formatted = digits;
    if (digits.length > 12) {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5');
    } else if (digits.length > 8) {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, '$1.$2.$3/$4');
    } else if (digits.length > 5) {
      formatted = digits.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
    } else if (digits.length > 2) {
      formatted = digits.replace(/^(\d{2})(\d{0,3}).*/, '$1.$2');
    }
    e.target.value = formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 10) {
      formatted = digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
    } else if (digits.length > 6) {
      formatted = digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (digits.length > 2) {
      formatted = digits.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
    } else if (digits.length > 0) {
      formatted = digits.replace(/^(\d{0,2}).*/, '($1');
    }
    e.target.value = formatted;
  };

  const loginForm = (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="text-foreground font-medium text-sm">E-mail</Label>
        <Input id="login-email" name="email" type="email" placeholder="seu@estabelecimento.com" required className="h-10 border-2 border-border focus:border-success/50 transition-all bg-background/50" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password" className="text-foreground font-medium text-sm">Senha</Label>
        <Input id="login-password" name="password" type="password" placeholder="••••••••" required className="h-10 border-2 border-border focus:border-success/50 transition-all bg-background/50" />
      </div>
      <Button type="submit" className="w-full h-10 bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success/80 text-success-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0" disabled={isLoading || loading}>
        {isLoading || loading ? "Entrando..." : "Entrar"}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={() => setForgotOpen(true)}
          className="text-xs text-muted-foreground hover:text-success transition-colors underline-offset-2 hover:underline"
        >
          Esqueci minha senha
        </button>
      </div>
    </form>
  );

  const signupForm = (
    <form onSubmit={handleSignUp} className="space-y-2.5">
      <div className="space-y-1">
        <Label htmlFor="signup-name" className="text-foreground font-medium text-xs">Nome Completo</Label>
        <Input id="signup-name" name="fullName" type="text" placeholder="Seu nome" required className="h-8 border-2 border-border focus:border-success/50 transition-all bg-background/50 text-sm" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="signup-company" className="text-foreground font-medium text-xs">Nome da Empresa</Label>
        <Input id="signup-company" name="companyName" type="text" placeholder="Seu estabelecimento" required className="h-8 border-2 border-border focus:border-success/50 transition-all bg-background/50 text-sm" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="signup-cnpj" className="text-foreground font-medium text-xs">CNPJ</Label>
        <Input id="signup-cnpj" name="cnpj" type="text" placeholder="00.000.000/0000-00" required maxLength={18}
          onChange={handleCnpjChange}
          className="h-8 border-2 border-border focus:border-success/50 transition-all bg-background/50 text-sm" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="signup-category" className="text-foreground font-medium text-xs">Categoria</Label>
        <Select name="categoryId" required>
          <SelectTrigger className="h-8 border-2 border-border focus:border-success/50 transition-all bg-background/50 text-sm">
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border">
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id} className="cursor-pointer">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="signup-phone" className="text-foreground font-medium text-xs">Telefone</Label>
          <Input id="signup-phone" name="phone" type="tel" placeholder="(00) 00000-0000" required maxLength={15} onChange={handlePhoneChange} className="h-8 border-2 border-border focus:border-success/50 transition-all bg-background/50 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="signup-email" className="text-foreground font-medium text-xs">E-mail</Label>
          <Input id="signup-email" name="email" type="email" placeholder="email@empresa.com" required className="h-8 border-2 border-border focus:border-success/50 transition-all bg-background/50 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="signup-password" className="text-foreground font-medium text-xs">Senha</Label>
          <Input id="signup-password" name="password" type="password" placeholder="Mín. 8 caracteres" minLength={8} required className="h-8 border-2 border-border focus:border-success/50 transition-all bg-background/50 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="signup-confirm" className="text-foreground font-medium text-xs">Confirmar</Label>
          <Input id="signup-confirm" name="confirmPassword" type="password" placeholder="••••••••" minLength={8} required className="h-8 border-2 border-border focus:border-success/50 transition-all bg-background/50 text-sm" />
        </div>
      </div>
      <Button type="submit" className="w-full h-9 bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success/80 text-success-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 mt-1" disabled={isLoading}>
        {isLoading ? "Cadastrando..." : "Cadastrar Estabelecimento"}
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
        accentColor="success"
        logoSrc="/lovable-uploads/4df8089b-e46d-449e-b42e-4ec8daedc049.png"
        logoAlt="Bah Ofertas - Parceiro"
        loginCta={{
          title: "Seja Parceiro!",
          subtitle: "Cadastre seu estabelecimento e alcance milhares de clientes com ofertas exclusivas",
          buttonText: "Cadastrar",
        }}
        signupCta={{
          title: "Já é Parceiro?",
          subtitle: "Acesse seu painel e gerencie suas ofertas e vendas",
          buttonText: "Entrar",
        }}
      />
      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        accentColor="success"
        portal="parceiro"
      />
    </>
  );
};

export default PartnerLogin;
