import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already_unsubscribed");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };

    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setStatus("error");
      } else if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already_unsubscribed");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Processando...</p>
            </>
          )}

          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Cancelar inscrição</h1>
              <p className="text-muted-foreground">
                Deseja cancelar o recebimento de emails do BahOfertas?
              </p>
              <Button onClick={handleUnsubscribe} variant="destructive" className="w-full">
                Confirmar cancelamento
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-success mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Inscrição cancelada</h1>
              <p className="text-muted-foreground">
                Você não receberá mais emails do BahOfertas. Sentiremos sua falta!
              </p>
            </>
          )}

          {status === "already_unsubscribed" && (
            <>
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Já cancelado</h1>
              <p className="text-muted-foreground">
                Sua inscrição já foi cancelada anteriormente.
              </p>
            </>
          )}

          {status === "invalid" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Link inválido</h1>
              <p className="text-muted-foreground">
                Este link de cancelamento é inválido ou expirou.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-bold text-foreground">Erro</h1>
              <p className="text-muted-foreground">
                Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
