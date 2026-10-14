import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import CategoryNav from "@/components/CategoryNav";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar, MapPin, Users, ArrowLeft, Loader2,
  Building2, XCircle, CheckCircle, Clock, AlertCircle, Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Booking {
  id: string;
  hotel_name: string;
  hotel_hid: string;
  check_in: string;
  check_out: string;
  guests: any;
  rooms: number;
  total_price: number;
  currency: string;
  status: string;
  payment_type: string | null;
  order_id: string | null;
  partner_order_id: string | null;
  created_at: string;
  voucher_url: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  confirmed: { label: "Confirmada", variant: "default", icon: CheckCircle },
  processing: { label: "Processando", variant: "outline", icon: Clock },
  pending: { label: "Pendente", variant: "secondary", icon: Clock },
  pending_3ds: { label: "Aguardando 3DS", variant: "secondary", icon: AlertCircle },
  cancelled: { label: "Cancelada", variant: "destructive", icon: XCircle },
  failed: { label: "Falhou", variant: "destructive", icon: XCircle },
};

const MinhasReservas = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Faça login para ver suas reservas");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("etg_bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings((data as Booking[]) || []);
    } catch (err: any) {
      console.error("Error loading bookings:", err);
      toast.error("Erro ao carregar reservas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (booking: Booking) => {
    if (!confirm("Tem certeza que deseja cancelar esta reserva?")) return;

    setCancellingId(booking.id);
    try {
      const { data, error } = await supabase.functions.invoke("hotel-order-cancel", {
        body: {
          order_id: booking.order_id,
          partner_order_id: booking.partner_order_id,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao cancelar");

      toast.success("Reserva cancelada com sucesso");
      loadBookings();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar reserva");
    } finally {
      setCancellingId(null);
    }
  };

  const handleExportLogs = async (partnerOrderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('etg-export-logs', {
        body: { partner_order_id: partnerOrderId },
      });

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etg-logs-${partnerOrderId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Logs exportados com sucesso');
    } catch (err: any) {
      console.error('Error exporting logs:', err);
      toast.error('Erro ao exportar logs');
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);

  return (
    <>
      <Helmet>
        <title>Minhas Reservas | Bah Ofertas</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <div className="container mx-auto px-4 py-8 pt-24">
          <Button variant="ghost" onClick={() => navigate("/hospedagem")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para hospedagem
          </Button>

          <h1 className="text-2xl font-bold text-foreground mb-6">Minhas Reservas</h1>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Carregando reservas...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma reserva encontrada</h3>
              <p className="text-muted-foreground mb-4">Você ainda não fez nenhuma reserva de hospedagem.</p>
              <Button onClick={() => navigate("/hospedagem")}>Buscar hospedagens</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const config = statusConfig[booking.status] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <Card key={booking.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{booking.hotel_name}</h3>
                            <Badge variant={config.variant}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(booking.check_in), "dd/MM/yyyy", { locale: ptBR })} –{" "}
                                {format(new Date(booking.check_out), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{booking.rooms} quarto(s)</span>
                            </div>
                          </div>

                          {booking.order_id && (
                            <p className="text-xs text-muted-foreground">
                              Order ID: {booking.order_id}
                            </p>
                          )}
                          {booking.partner_order_id && (
                            <p className="text-xs text-muted-foreground">
                              Pedido: {booking.partner_order_id}
                            </p>
                          )}
                          {booking.payment_type && (
                            <p className="text-xs text-muted-foreground">
                              Pagamento: {booking.payment_type === 'now' ? 'Cartão (Online)' : 'Pagar no Hotel'}
                            </p>
                          )}
                        </div>

                        <div className="text-right space-y-2">
                          <p className="text-xl font-bold text-foreground">
                            {formatPrice(booking.total_price)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(booking.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>

                          <div className="flex gap-2 justify-end flex-wrap">
                            {booking.partner_order_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExportLogs(booking.partner_order_id!)}
                                title="Exportar logs ETG (certificação)"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Logs ETG
                              </Button>
                            )}
                            {booking.voucher_url && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={booking.voucher_url} target="_blank" rel="noopener noreferrer">
                                  Voucher
                                </a>
                              </Button>
                            )}
                            {["confirmed", "pending"].includes(booking.status) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancel(booking)}
                                disabled={cancellingId === booking.id}
                              >
                                {cancellingId === booking.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Cancelar"
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Footer />
        <CategoryNav />
      </div>
    </>
  );
};

export default MinhasReservas;
