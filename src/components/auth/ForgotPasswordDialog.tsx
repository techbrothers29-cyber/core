import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, KeyRound, ShieldCheck, Eye, EyeOff, ArrowLeft } from "lucide-react";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accentColor?: "destructive" | "success" | "primary";
  redirectPath?: string;
  portal?: "cliente" | "parceiro" | "afiliado";
}

const accentBtn = {
  destructive: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  success: "bg-success hover:bg-success/90 text-success-foreground",
  primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
};

type Step = "email" | "code";

const ForgotPasswordDialog = ({
  open,
  onOpenChange,
  accentColor = "primary",
  portal = "cliente",
}: ForgotPasswordDialogProps) => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("request-password-code", {
        body: { email, portal },
      });

      if (error) {
        toast.error("Erro ao enviar e-mail", { description: error.message });
      } else {
        toast.success("Código enviado!", {
          description: "Se houver uma conta com este e-mail, você receberá um código de 6 dígitos em instantes.",
        });
        setStep("code");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Informe o código de 6 dígitos.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-password-code", {
        body: { email, code, newPassword },
      });
      const errMsg = (data as { error?: string } | null)?.error;
      if (error || errMsg) {
        toast.error("Não foi possível redefinir", {
          description: errMsg || error?.message || "Código inválido ou expirado.",
        });
      } else {
        toast.success("Senha redefinida!", {
          description: "Você já pode entrar com a nova senha.",
        });
        reset();
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const minLengthOk = newPassword.length >= 8;
  const matchOk = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "email" ? <Mail className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
            {step === "email" ? "Esqueci minha senha" : "Redefinir senha"}
          </DialogTitle>
          <DialogDescription>
            {step === "email"
              ? "Informe seu e-mail cadastrado e enviaremos um código de 6 dígitos para você redefinir sua senha."
              : `Insira o código enviado para ${email} e crie uma nova senha.`}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-10"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !email} className={accentBtn[accentColor]}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  "Enviar código"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Código de verificação</Label>
              <div className="flex justify-center py-1">
                <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O código expira em 10 minutos.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-pwd" className="text-sm font-medium">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-pwd"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  className="h-10 pr-10"
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
              <Label htmlFor="confirm-pwd" className="text-sm font-medium">Confirmar nova senha</Label>
              <Input
                id="confirm-pwd"
                type={showPassword ? "text" : "password"}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                className="h-10"
                autoComplete="new-password"
              />
            </div>

            <ul className="space-y-1 text-xs">
              <li className={`flex items-center gap-2 ${minLengthOk ? "text-success" : "text-muted-foreground"}`}>
                <ShieldCheck className={`h-3.5 w-3.5 ${minLengthOk ? "opacity-100" : "opacity-40"}`} />
                Pelo menos 8 caracteres
              </li>
              <li className={`flex items-center gap-2 ${matchOk ? "text-success" : "text-muted-foreground"}`}>
                <ShieldCheck className={`h-3.5 w-3.5 ${matchOk ? "opacity-100" : "opacity-40"}`} />
                As duas senhas são iguais
              </li>
            </ul>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setStep("email"); setCode(""); }}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || code.length !== 6 || !minLengthOk || !matchOk}
                className={accentBtn[accentColor]}
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validando...</>
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
