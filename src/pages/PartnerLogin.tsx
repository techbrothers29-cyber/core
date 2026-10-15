import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '@/hooks/usePartnerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AuthSplitLayout from '@/components/auth/redesign/AuthSplitLayout';
import AuthField, { AuthFieldGroup, AuthFieldRow, AuthFieldShell, AUTH_INPUT_CLASS } from '@/components/auth/redesign/AuthField';
import { AuthSubmitButton, AuthTextButton } from '@/components/auth/redesign/AuthCard';
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
    <form onSubmit={handleLogin}>
      <AuthFieldGroup>
        <AuthField id="login-email" name="email" type="email" label="E-mail" placeholder="seu@estabelecimento.com" autoComplete="email" required />
        <AuthField id="login-password" name="password" type="password" label="Senha" placeholder="••••••••" autoComplete="current-password" required />
      </AuthFieldGroup>
      <AuthSubmitButton disabled={isLoading || loading}>
        {isLoading || loading ? "Entrando..." : "Entrar"}
      </AuthSubmitButton>
      <AuthTextButton onClick={() => setForgotOpen(true)}>Esqueci minha senha</AuthTextButton>
    </form>
  );

  const signupForm = (
    <form onSubmit={handleSignUp}>
      <AuthFieldGroup>
        <AuthField id="signup-name" name="fullName" type="text" label="Nome Completo" placeholder="Seu nome" autoComplete="name" required />
        <AuthField id="signup-company" name="companyName" type="text" label="Nome da Empresa" placeholder="Seu estabelecimento" autoComplete="organization" required />
        <AuthField id="signup-cnpj" name="cnpj" type="text" label="CNPJ" placeholder="00.000.000/0000-00" autoComplete="off" required maxLength={18}
          onChange={handleCnpjChange} />
        <AuthFieldShell htmlFor="signup-category" label="Categoria">
          <Select name="categoryId" required>
            <SelectTrigger
              id="signup-category"
              className={`${AUTH_INPUT_CLASS} flex items-center justify-between text-left rounded-none shadow-none ring-offset-0 focus:ring-0 focus:ring-offset-0 md:focus:ring-offset-0`}
            >
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border">
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id} className="cursor-pointer">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </AuthFieldShell>
        <AuthFieldRow>
          <AuthField id="signup-phone" name="phone" type="tel" label="Telefone" placeholder="(00) 00000-0000" autoComplete="tel" required maxLength={15} onChange={handlePhoneChange} />
          <AuthField id="signup-email" name="email" type="email" label="E-mail" placeholder="email@empresa.com" autoComplete="email" required />
        </AuthFieldRow>
        <AuthFieldRow>
          <AuthField id="signup-password" name="password" type="password" label="Senha" placeholder="Mín. 8 caracteres" autoComplete="new-password" minLength={8} required />
          <AuthField id="signup-confirm" name="confirmPassword" type="password" label="Confirmar senha" placeholder="••••••••" autoComplete="new-password" minLength={8} required />
        </AuthFieldRow>
      </AuthFieldGroup>
      <AuthSubmitButton disabled={isLoading}>
        {isLoading ? "Cadastrando..." : "Cadastrar Estabelecimento"}
      </AuthSubmitButton>
    </form>
  );

  return (
    <>
      <AuthSplitLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hero={{
          title: "Seja Parceiro!",
          subtitle: "Cadastre seu estabelecimento e alcance milhares de clientes com ofertas exclusivas",
        }}
        loginForm={loginForm}
        signupForm={signupForm}
      />
      <ForgotPasswordDialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        accentColor="primary"
        portal="parceiro"
      />
    </>
  );
};

export default PartnerLogin;
