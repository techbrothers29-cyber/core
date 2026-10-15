import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import AuthShell from "@/components/auth/redesign/AuthShell";
import AuthCard, { AuthSubmitButton } from "@/components/auth/redesign/AuthCard";
import AuthField, { AuthFieldGroup } from "@/components/auth/redesign/AuthField";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { adminLoginSchema, formatValidationErrors } from "@/lib/validation";
import { clearSessionForNewLogin } from "@/lib/session-guard";

const AdminAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, loading } = useAdminAuth();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || isLoading) return;
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string
    };

    // Validate and sanitize input
    try {
      await clearSessionForNewLogin('admin');
      const validatedData = adminLoginSchema.parse(rawData);
      const { error } = await signIn(validatedData.email, validatedData.password);
      setIsLoading(false);
      if (error) {
        toast({
          title: "Erro no login",
          description: "Email ou senha incorretos.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel administrativo..."
        });
        navigate("/admin/dashboard");
      }
    } catch (validationError: any) {
      setIsLoading(false);
      toast({
        title: "Dados inválidos",
        description: formatValidationErrors(validationError),
        variant: "destructive"
      });
    }
  };

  // SECURITY: Admin registration has been disabled.
  // Admins must be created manually by existing admins through the admin panel
  // or through a secure backend process with proper authorization.

  return (
    <AuthShell mobileTitle="Área administrativa">
      <div className="mx-auto w-full max-w-[460px] px-5 pb-12 pt-10 md:px-0 md:pt-16">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f1] dark:bg-primary/10">
            <Shield className="h-8 w-8 text-primary" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold leading-tight text-foreground md:text-[28px] md:font-extrabold">
            Painel Administrativo
          </h1>
          <p className="mt-1.5 text-sm text-[#6b6b6b] dark:text-muted-foreground md:text-[15px]">
            Área restrita para administradores do sistema
          </p>
        </div>

        <div className="mt-7">
          <AuthCard id="admin-login" title="Acesso Administrativo" hideTitleOnMobile>
            <form onSubmit={handleLogin}>
              <AuthFieldGroup>
                <AuthField id="email" name="email" type="email" label="E-mail" autoComplete="email" required />
                <AuthField id="password" name="password" type="password" label="Senha" placeholder="••••••••" autoComplete="current-password" minLength={8} required />
              </AuthFieldGroup>
              <AuthSubmitButton disabled={isLoading || loading}>
                {isLoading || loading ? "Entrando..." : "Acessar Painel"}
              </AuthSubmitButton>
            </form>
          </AuthCard>
        </div>

        <p className="mt-6 text-center text-xs text-[#6b6b6b] dark:text-muted-foreground">
          Sistema restrito - Acesso autorizado apenas
        </p>
      </div>
    </AuthShell>
  );
};

export default AdminAuth;
