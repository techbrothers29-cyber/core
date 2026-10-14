import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryNav from "@/components/CategoryNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Calendar, Building2, Loader2, XCircle, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PageState = "loading" | "success" | "failed" | "error" | "processing";

const HotelConfirmacao = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(8);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  const orderParam = searchParams.get("order");
  const bookingParam = searchParams.get("booking");

  // On mount: check if this is a 3DS return or a direct success redirect
  useEffect(() => {
    const check3DSReturn = async () => {
      // If we have order param, it's a direct success from hotel-book
      if (orderParam) {
        setOrderId(orderParam);
        setPageState("success");
        return;
      }

      // Otherwise, this may be a 3DS return. Check for pending_3ds bookings
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPageState("error");
          setErrorMessage("Faça login para verificar sua reserva.");
          return;
        }

        // Find the latest pending_3ds booking for this user
        const { data: pendingBooking } = await supabase
          .from("etg_bookings")
          .select("partner_order_id, order_id, status")
          .eq("user_id", user.id)
          .in("status", ["pending_3ds", "pending"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!pendingBooking?.partner_order_id) {
          // No pending booking — maybe already confirmed
          const { data: latestBooking } = await supabase
            .from("etg_bookings")
            .select("order_id, status")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (latestBooking?.status === "confirmed") {
            setOrderId(latestBooking.order_id);
            setPageState("success");
          } else if (latestBooking?.status === "processing") {
            setPageState("processing");
            setErrorMessage("Sua reserva está sendo processada.");
          } else {
            setPageState("error");
            setErrorMessage("Nenhuma reserva pendente encontrada.");
          }
          return;
        }

        // Poll finish status for 3DS completion
        const { data, error } = await supabase.functions.invoke("hotel-finish-status", {
          body: { partner_order_id: pendingBooking.partner_order_id },
        });

        if (error) throw error;

        if (data?.success) {
          setOrderId(data.order_id || pendingBooking.order_id);
          setPageState("success");
          toast.success("Reserva confirmada com sucesso!");
        } else if (data?.status === 'processing') {
          setPageState("processing");
          setErrorMessage(data?.error || "Sua reserva está sendo processada.");
        } else {
          setPageState("failed");
          setErrorMessage(data?.error || "A reserva não pôde ser confirmada.");
          toast.error(data?.error || "Falha na confirmação da reserva.");
        }
      } catch (err: any) {
        console.error("3DS return check error:", err);
        setPageState("error");
        setErrorMessage("Erro ao verificar status da reserva.");
      }
    };

    check3DSReturn();
  }, [orderParam]);

  // Google Ads conversion event snippet (Add to cart) on successful hotel booking
  useEffect(() => {
    if (pageState === "success" && typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "conversion", {
        send_to: "AW-18172971010/-NIYCIS8wq8cEIKQxtlD",
      });
    }
  }, [pageState]);

  // Auto-redirect after countdown (only on success)
  useEffect(() => {
    if (pageState !== "success") return;
    if (countdown <= 0) {
      navigate("/hospedagem/reservas");
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate, pageState]);

  return (
    <>
      <Helmet>
        <title>
          {pageState === "success" ? "Reserva Confirmada" : "Processando Reserva"} | Bah Ofertas
        </title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <div className="container mx-auto px-4 py-8 pt-24 flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg w-full text-center animate-fade-in">
            <CardContent className="pt-10 pb-8 space-y-6">

              {/* Loading state */}
              {pageState === "loading" && (
                <>
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Verificando sua reserva...</h1>
                    <p className="text-muted-foreground">
                      Estamos confirmando o pagamento com o banco. Isso pode levar alguns segundos.
                    </p>
                  </div>
                </>
              )}

              {/* Success state */}
              {pageState === "success" && (
                <>
                  <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
                    <Check className="h-10 w-10 text-primary" strokeWidth={3} />
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Reserva Confirmada!</h1>
                    <p className="text-muted-foreground">
                      Sua hospedagem foi reservada com sucesso. Você receberá um e-mail com os detalhes.
                    </p>
                  </div>

                  {orderId && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                      <p className="text-sm text-muted-foreground">Código da reserva</p>
                      <p className="text-lg font-bold text-foreground tracking-wide">{orderId}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 pt-2">
                    <Button onClick={() => navigate("/hospedagem/reservas")} className="w-full" size="lg">
                      <Calendar className="h-4 w-4 mr-2" />
                      Ver Minhas Reservas
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/hospedagem")} className="w-full">
                      <Building2 className="h-4 w-4 mr-2" />
                      Buscar Mais Hospedagens
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Redirecionando para suas reservas em {countdown}s...</span>
                  </div>
                </>
              )}

              {/* Failed state */}
              {pageState === "failed" && (
                <>
                  <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Reserva não confirmada</h1>
                    <p className="text-muted-foreground">{errorMessage}</p>
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <Button onClick={() => navigate("/hospedagem")} className="w-full" size="lg">
                      Tentar Nova Reserva
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/hospedagem/reservas")} className="w-full">
                      Ver Minhas Reservas
                    </Button>
                  </div>
                </>
              )}

              {/* Processing state */}
              {pageState === "processing" && (
                <>
                  <div className="mx-auto w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="h-10 w-10 text-yellow-500" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Processando reserva</h1>
                    <p className="text-muted-foreground">
                      Sua reserva está sendo processada. O resultado final ainda não foi confirmado. Verifique o status em "Minhas Reservas".
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <Button onClick={() => navigate("/hospedagem/reservas")} className="w-full" size="lg">
                      <Calendar className="h-4 w-4 mr-2" />
                      Ver Minhas Reservas
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                      Ir para Início
                    </Button>
                  </div>
                </>
              )}
              {pageState === "error" && (
                <>
                  <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Ops!</h1>
                    <p className="text-muted-foreground">{errorMessage}</p>
                  </div>
                  <div className="flex flex-col gap-3 pt-2">
                    <Button onClick={() => navigate("/hospedagem/reservas")} className="w-full" size="lg">
                      Ver Minhas Reservas
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                      Ir para Início
                    </Button>
                  </div>
                </>
              )}

            </CardContent>
          </Card>
        </div>

        <Footer />
        <CategoryNav />
      </div>
    </>
  );
};

export default HotelConfirmacao;
