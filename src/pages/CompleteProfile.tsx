import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isValidCPF } from "@/lib/cpf-validation";

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const CompleteProfile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      // Pre-fill name from Google metadata if available
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setFullName(metaName);
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanCpf = cpf.replace(/\D/g, "");
    const cleanPhone = phone.replace(/\D/g, "");

    if (!fullName.trim() || fullName.trim().length < 3) {
      toast({ title: "Nome inválido", description: "Informe seu nome completo.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (!isValidCPF(cleanCpf)) {
      toast({ title: "CPF inválido", description: "Informe um CPF válido. Verifique os dígitos.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      toast({ title: "Telefone inválido", description: "Informe um telefone válido.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      // Update user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          cpf: cleanCpf,
          phone: cleanPhone,
          role_type: "user",
          profile_completed: true,
        },
      });

      // Update/insert in users table
      const { error } = await supabase.from("users").upsert({
        id: user!.id,
        email: user!.email!,
        full_name: fullName.trim(),
        cpf: cleanCpf,
        phone: cleanPhone,
        password_hash: "managed_by_supabase_auth",
        role: "user",
        role_type: "user",
        is_active: true,
      }, { onConflict: "id" });

      if (error) {
        if (error.message?.includes("unique") || error.message?.includes("duplicate") || error.code === "23505") {
          toast({ title: "Dados já cadastrados", description: "Este CPF já está vinculado a outra conta.", variant: "destructive" });
        } else {
          toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        }
        setIsLoading(false);
        return;
      }

      toast({ title: "Cadastro completo!", description: "Seus dados foram salvos com sucesso." });
      navigate("/");
    } catch {
      toast({ title: "Erro", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="absolute top-[15%] left-[20%] w-64 h-64 bg-destructive/20 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
      <div className="absolute bottom-[20%] right-[20%] w-56 h-56 bg-destructive/15 rounded-full blur-2xl animate-[pulse_5s_ease-in-out_infinite_1s]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-border/50">
          <div className="h-2 bg-gradient-to-r from-destructive via-destructive/90 to-[hsl(30,90%,55%)]" />

          <div className="p-6 sm:p-8">
            <div className="flex justify-center mb-4">
              <img src="/logo-desktop.png" alt="Bah Ofertas" className="h-9 w-auto" />
            </div>

            <h2 className="text-xl font-bold text-center text-foreground mb-1">
              Complete seu cadastro
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Precisamos de mais alguns dados para finalizar sua conta
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-foreground font-medium text-sm">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-10 border-2 border-border focus:border-destructive/50 transition-all bg-background/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf" className="text-foreground font-medium text-sm">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  required
                  maxLength={14}
                  className="h-10 border-2 border-border focus:border-destructive/50 transition-all bg-background/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-foreground font-medium text-sm">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  required
                  maxLength={15}
                  className="h-10 border-2 border-border focus:border-destructive/50 transition-all bg-background/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive/80 text-destructive-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0"
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Concluir Cadastro"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
