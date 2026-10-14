import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Shield, Settings, BarChart3 } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">
            Área restrita para administradores do sistema
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-xl">Acesso Administrativo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || loading}>
                {isLoading || loading ? "Entrando..." : "Acessar Painel"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>Sistema restrito - Acesso autorizado apenas</p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
