import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, QrCode, LogOut, User as UserIcon, History, ShoppingCart, X, Check, Camera, Edit3, DollarSign, TrendingUp, Copy, Building2, Ticket, ChevronLeft, ChevronRight } from "lucide-react";
import HomeBottomNav from "@/components/home/HomeBottomNav";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import QRCode from "react-qr-code";
interface UserVoucher {
  id: string;
  offer_id: string | null;
  voucher_id?: string;
  purchase_price: number;
  original_price: number;
  economy_amount: number;
  status: string;
  expires_at: string;
  used_at?: string;
  qr_code: string;
  offers: {
    title: string;
    subtitle: string | null;
    description: string | null;
    company_id: string;
    card_image_url: string | null;
    companies: {
      name: string;
      address: any;
    };
  } | null;
}

interface NovaxsTicket {
  product_name?: string;
  product_path?: string;
  date?: string;
  barcode?: string;
}

interface NovaxsTicketBooking {
  id: string;
  status: string;
  establishment_name: string | null;
  localizador: string | null;
  voucher_id: string | null;
  voucher_pdf_path: string | null;
  total_price: number;
  use_date: string | null;
  created_at: string;
  products: any;
  tickets: NovaxsTicket[] | null;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  created_at: string;
  payment_method?: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  cpf?: string;
  profile_image_url?: string;
  created_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userVouchers, setUserVouchers] = useState<UserVoucher[]>([]);
  const [ticketBookings, setTicketBookings] = useState<NovaxsTicketBooking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState({
    totalSavings: 0,
    usedVouchers: 0,
    activeVouchers: 0
  });
  // "?aba=perfil" / "?aba=historico" abrem direto a aba (usado pela barra inferior da Home).
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const aba = new URLSearchParams(window.location.search).get("aba");
      if (aba === "perfil") return "profile";
      if (aba === "historico") return "history";
    } catch {}
    return "vouchers";
  });
  const [selectedVoucher, setSelectedVoucher] = useState<UserVoucher | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherPdfLoading, setVoucherPdfLoading] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<NovaxsTicketBooking | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketPdfLoading, setTicketPdfLoading] = useState(false);
  const [isUsingVoucher, setIsUsingVoucher] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  // A barra inferior navega para /dashboard?aba=... com a página já aberta: acompanha a aba.
  useEffect(() => {
    const aba = new URLSearchParams(location.search).get("aba");
    if (aba === "perfil") setActiveTab("profile");
    else if (aba === "historico") setActiveTab("history");
    else if (aba === "vouchers" || location.search === "") setActiveTab("vouchers");
  }, [location.search]);
  const { toast } = useToast();

  // Use the centralized auth context instead of local auth state
  const { user: authUser, session: authSession } = useAuth();
  
  useEffect(() => {
    // Update local state from auth context
    setUser(authUser);
    setSession(authSession);
    
    // Redirect if not authenticated
    if (authUser === null && authSession === null) {
      navigate("/auth");
    }
  }, [authUser, authSession, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserVouchers();
      fetchTicketBookings();
      fetchTransactions();
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserVouchers = async () => {
    if (!user) return;

    setIsLoadingVouchers(true);
    try {
      // First, update any expired vouchers
      await supabase.rpc('update_expired_vouchers');

      // Fetch vouchers with offers data instead of vouchers table
      const { data, error } = await supabase
        .from("user_vouchers")
        .select(`
          *,
          offers:offer_id (
            title,
            subtitle,
            description,
            company_id,
            card_image_url,
            companies (
              name,
              address
            )
          )
        `)
        .eq("user_id", user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching vouchers:", error);
        throw error;
      }

      const validVouchers = (data || []) as unknown as UserVoucher[];
      setUserVouchers(validVouchers);
      
      // Calculate stats using economy_amount
      const totalSavings = validVouchers.reduce((sum, voucher) => sum + Number(voucher.economy_amount || 0), 0);
      const usedVouchers = validVouchers.filter(v => v.status === 'used').length;
      const activeVouchers = validVouchers.filter(v => v.status === 'active').length;
      const expiredVouchers = validVouchers.filter(v => v.status === 'expired').length;
      
      setUserStats({
        totalSavings,
        usedVouchers,
        activeVouchers
      });

    } catch (error) {
      console.error("Error fetching vouchers:", error);
      
      // Set empty state for any error
      setUserVouchers([]);
      setUserStats({
        totalSavings: 0,
        usedVouchers: 0,
        activeVouchers: 0
      });
    } finally {
      setIsLoadingVouchers(false);
    }
  };

  const fetchTicketBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("ticket_bookings")
        .select("id,status,establishment_name,localizador,voucher_id,voucher_pdf_path,total_price,use_date,created_at,products,tickets")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTicketBookings((data || []) as NovaxsTicketBooking[]);
    } catch (error) {
      console.error("Error fetching NovaXS tickets:", error);
      setTicketBookings([]);
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleLogout = () => {
    try {
      navigate("/");
      supabase.auth.signOut();
    } catch (error) {
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao sair.",
        variant: "destructive",
      });
    }
  };

  const getVouchersByStatus = (status: string) => {
    // Build a set of QR codes that already belong to a NovaXS ticket_booking
    // to avoid showing the same voucher twice (generic + ticket card).
    const ticketCodes = new Set<string>();
    for (const b of ticketBookings) {
      if (b.voucher_id) ticketCodes.add(String(b.voucher_id));
      if ((b as any).localizador) ticketCodes.add(String((b as any).localizador));
      const tickets = Array.isArray((b as any).tickets) ? (b as any).tickets : [];
      for (const t of tickets) {
        if (t?.barcode) ticketCodes.add(String(t.barcode));
      }
    }
    return userVouchers.filter(voucher => {
      if (voucher.qr_code && ticketCodes.has(String(voucher.qr_code))) return false;
      if (status === 'active') return voucher.status === 'active';
      if (status === 'used') return voucher.status === 'used';
      if (status === 'expired') return voucher.status === 'expired';
      return false;
    });
  };

  const getTicketBookingsByStatus = (status: string) => {
    return ticketBookings.filter((booking) => {
      const isExpired = booking.use_date ? new Date(`${booking.use_date}T23:59:59`) < new Date() : false;
      if (status === 'active') return booking.status === 'confirmed' && !isExpired;
      if (status === 'used') return booking.status === 'used';
      if (status === 'expired') return isExpired || booking.status === 'expired';
      return false;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getUserInitials = () => {
    if (!user?.user_metadata?.full_name) return "U";
    return user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  const handleViewVoucher = (voucher: UserVoucher) => {
    setSelectedVoucher(voucher);
    setIsVoucherModalOpen(true);
  };

  const handleViewTicket = (booking: NovaxsTicketBooking) => {
    setSelectedTicket(booking);
    setIsTicketModalOpen(true);
  };

  const handleDownloadTicketPdf = async () => {
    if (!selectedTicket?.id) return;
    setTicketPdfLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sessão expirada');
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bahofertas-voucher-pdf`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ booking_id: selectedTicket.id }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt.slice(0, 200) || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      console.error('PDF download error:', err);
      toast({ title: 'Erro', description: 'Não foi possível gerar o voucher em PDF.', variant: 'destructive' });
    } finally {
      setTicketPdfLoading(false);
    }
  };

  const handleDownloadVoucherPdf = async () => {
    if (!selectedVoucher?.id) return;
    setVoucherPdfLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sessão expirada');
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bahofertas-offer-voucher-pdf`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ voucher_id: selectedVoucher.id }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt.slice(0, 200) || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      console.error('Voucher PDF download error:', err);
      toast({ title: 'Erro', description: 'Não foi possível gerar o voucher em PDF.', variant: 'destructive' });
    } finally {
      setVoucherPdfLoading(false);
    }
  };


  const getVoucherTitle = (voucher: UserVoucher) => voucher.offers?.title || 'Ingresso NovaXS';

  const getVoucherCompanyName = (voucher: UserVoucher) => voucher.offers?.companies?.name || 'Estabelecimento NovaXS';

  const getTicketTitle = (booking: NovaxsTicketBooking) => {
    const products = Array.isArray(booking.products) ? booking.products : [];
    if (products.length === 0) return 'Ingresso NovaXS';
    const titles = products
      .map((p: any) => p?.title)
      .filter((t: any): t is string => typeof t === 'string' && t.length > 0);
    if (titles.length === 0) return 'Ingresso NovaXS';
    return titles.join(' + ');
  };

  const handleUseVoucher = async () => {
    if (!selectedVoucher) return;

    setIsUsingVoucher(true);
    try {
      const { error } = await supabase
        .from('user_vouchers')
        .update({ 
          status: 'used',
          used_at: new Date().toISOString()
        })
        .eq('id', selectedVoucher.id);

      if (error) throw error;

      toast({
        title: "Voucher utilizado!",
        description: "Seu voucher foi marcado como usado com sucesso.",
      });

      // Refresh vouchers list
      fetchUserVouchers();
      setIsVoucherModalOpen(false);
      setSelectedVoucher(null);

    } catch (error) {
      console.error('Error using voucher:', error);
      toast({
        title: "Erro ao usar voucher",
        description: "Não foi possível marcar o voucher como usado.",
        variant: "destructive",
      });
    } finally {
      setIsUsingVoucher(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploadingAvatar(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Erro no Upload",
          description: "Não foi possível fazer o upload da imagem. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user profile with new image URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        toast({
          title: "Erro",
          description: "Upload realizado, mas erro ao salvar: " + updateError.message,
          variant: "destructive",
        });
        return;
      }

      // Update local state
      fetchUserProfile();

      toast({
        title: "Foto Atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
        variant: "default",
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erro",
        description: "Erro interno ao fazer upload da foto.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = async (formData: FormData) => {
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      const full_name = formData.get('full_name') as string;
      const phone = formData.get('phone') as string;
      const cpf = formData.get('cpf') as string;

      const { error } = await supabase
        .from('users')
        .update({
          full_name,
          phone,
          cpf
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name }
      });

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram atualizadas com sucesso.",
      });

      fetchUserProfile();

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar seu perfil.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (!user || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-jakarta">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Carregando…
        </div>
      </div>
    );
  }

  const displayName = userProfile?.full_name || user?.user_metadata?.full_name || "Usuário";
  const memberSince = userProfile?.created_at
    ? new Date(userProfile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;
  const points = userStats.activeVouchers * 100;

  const NAV = [
    { id: "vouchers", label: "Meus vouchers", icon: Ticket },
    { id: "history", label: "Histórico", icon: History },
    { id: "reservas", label: "Minhas reservas", icon: Building2, href: "/hospedagem/reservas" },
    { id: "profile", label: "Dados pessoais", icon: UserIcon },
  ];
  const goTab = (item: (typeof NAV)[number]) => {
    if (item.href) return navigate(item.href);
    setActiveTab(item.id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("aba", item.id === "profile" ? "perfil" : item.id === "history" ? "historico" : "vouchers");
      window.history.replaceState(null, "", url.toString());
    } catch {}
  };

  const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativo", cls: "bg-[#e8f6ee] text-[#137a3f]" },
    used: { label: "Utilizado", cls: "bg-[#f2f2f2] text-[#5c5c5c]" },
    expired: { label: "Expirado", cls: "bg-[#fdecec] text-[#b4141a]" },
  };

  const VoucherRow = ({
    title, subtitle, meta, price, status, code, onOpen,
  }: { title: string; subtitle: string; meta: string; price: number; status: "active" | "used" | "expired"; code?: string; onOpen?: () => void }) => (
    <li className={`rounded-2xl border border-[#ebebeb] bg-card p-4 md:p-5 ${status === "expired" ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status].cls}`}>{STATUS_STYLE[status].label}</span>
          <h3 className="m-0 mt-2 text-[15px] md:text-base font-bold leading-snug">{title}</h3>
          <p className="m-0 mt-0.5 text-sm text-muted-foreground truncate">{subtitle}</p>
        </div>
        <span className={`shrink-0 text-base md:text-lg font-bold tabular-nums ${status === "active" ? "text-foreground" : "text-muted-foreground"}`}>{formatCurrency(price)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] pt-3">
        <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Calendar className="w-4 h-4" aria-hidden="true" />
          {meta}
          {code && <span className="font-mono ml-1">· {code}</span>}
        </span>
        {onOpen && (
          <button type="button" onClick={onOpen} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <QrCode className="w-4 h-4" aria-hidden="true" />
            Ver QR Code
          </button>
        )}
      </div>
    </li>
  );

  const voucherCounts = {
    active: getVouchersByStatus("active").length + getTicketBookingsByStatus("active").length,
    used: getVouchersByStatus("used").length + getTicketBookingsByStatus("used").length,
    expired: getVouchersByStatus("expired").length + getTicketBookingsByStatus("expired").length,
  };
  const EMPTY: Record<string, string> = {
    active: "Você não possui vouchers ativos no momento.",
    used: "Você ainda não utilizou nenhum voucher.",
    expired: "Você não possui vouchers expirados.",
  };
  const renderVoucherList = (status: "active" | "used" | "expired") => {
    const tickets = getTicketBookingsByStatus(status);
    const vouchers = getVouchersByStatus(status);
    if (isLoadingVouchers && status === "active") {
      return (
        <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Carregando vouchers…
        </div>
      );
    }
    if (tickets.length + vouchers.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[#dddddd] py-12 px-6 text-center">
          <Ticket className="w-10 h-10 mx-auto text-muted-foreground/60" aria-hidden="true" />
          <p className="m-0 mt-3 text-sm text-muted-foreground">{EMPTY[status]}</p>
          {status === "active" && (
            <button type="button" onClick={() => navigate("/")} className="mt-4 h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Explorar ofertas
            </button>
          )}
        </div>
      );
    }
    return (
      <ul className="m-0 p-0 list-none grid gap-3 lg:grid-cols-2">
        {tickets.map((b) => (
          <VoucherRow
            key={b.id}
            status={status}
            title={getTicketTitle(b)}
            subtitle={b.establishment_name || "Ingresso"}
            meta={status === "expired" ? (b.use_date ? `Expirou em ${formatDate(b.use_date)}` : "Expirado") : b.use_date ? `Uso em ${formatDate(b.use_date)}` : "Data confirmada"}
            price={b.total_price}
            code={status === "active" ? (b.localizador || b.voucher_id || b.id.slice(0, 8)) : undefined}
            onOpen={status === "active" ? () => handleViewTicket(b) : undefined}
          />
        ))}
        {vouchers.map((v) => (
          <VoucherRow
            key={v.id}
            status={status}
            title={getVoucherTitle(v)}
            subtitle={getVoucherCompanyName(v)}
            meta={status === "used" ? `Usado em ${v.used_at ? formatDate(v.used_at) : "—"}` : status === "expired" ? `Expirou em ${formatDate(v.expires_at)}` : `Válido até ${formatDate(v.expires_at)}`}
            price={v.purchase_price}
            onOpen={status === "active" ? () => handleViewVoucher(v) : undefined}
          />
        ))}
      </ul>
    );
  };

  const fieldCls = "h-12 rounded-xl border-[#dddddd] text-[15px]";
  const lockedCls = `${fieldCls} bg-[#f7f7f7] text-muted-foreground cursor-not-allowed`;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fafafa] font-jakarta text-foreground pb-24 md:pb-0">
      {/* Topo */}
      <header className="sticky top-0 z-40 bg-card border-b border-[#ebebeb]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
              aria-label="Voltar"
              className="w-10 h-10 rounded-full border border-[#dddddd] flex items-center justify-center hover:bg-[#f7f7f7]"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => navigate("/")} aria-label="Bah Ofertas — página inicial">
              <img src="/logo-desktop.png" alt="Bah Ofertas" className="h-9 md:h-10 w-auto" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#dddddd] px-4 text-sm font-semibold hover:border-primary hover:text-primary"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:items-start">
          {/* Coluna do perfil */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
            <section className="rounded-2xl border border-[#ebebeb] bg-card p-5">
              <div className="flex items-center gap-4 lg:flex-col lg:text-center">
                <div className="relative shrink-0">
                  <Avatar className="w-16 h-16 lg:w-24 lg:h-24">
                    <AvatarImage src={userProfile?.profile_image_url || user?.user_metadata?.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-lg font-semibold bg-primary text-white">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    aria-label="Alterar foto"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border border-[#dddddd] shadow-sm flex items-center justify-center hover:text-primary"
                  >
                    {isUploadingAvatar ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>
                <div className="min-w-0">
                  <h1 className="m-0 text-lg lg:text-xl font-bold leading-tight truncate">{displayName}</h1>
                  <p className="m-0 mt-0.5 text-sm text-muted-foreground truncate">{user?.email}</p>
                  {memberSince && <p className="m-0 mt-1 text-xs text-muted-foreground">Membro desde {memberSince}</p>}
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-[#e8f6ee] px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#137a3f]">Você já economizou</span>
                <span className="text-lg font-bold text-[#137a3f] tabular-nums">{formatCurrency(userStats.totalSavings)}</span>
              </div>
              <dl className="m-0 mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Ativos", value: userStats.activeVouchers },
                  { label: "Usados", value: userStats.usedVouchers },
                  { label: "Pontos", value: points },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-[#f7f7f7] py-3">
                    <dd className="m-0 text-xl font-bold tabular-nums">{s.value}</dd>
                    <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </section>

            {/* Navegação: pílulas roláveis no celular, lista no desktop */}
            <nav aria-label="Minha conta" className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ul className="m-0 p-0 list-none flex gap-2 lg:flex-col lg:gap-1 lg:rounded-2xl lg:border lg:border-[#ebebeb] lg:bg-card lg:p-2">
                {NAV.map((item) => {
                  const active = !item.href && activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <li key={item.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => goTab(item)}
                        aria-current={active ? "page" : undefined}
                        className={`w-full inline-flex items-center gap-2 h-11 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors lg:rounded-xl lg:border-0 lg:h-12 ${
                          active
                            ? "bg-[#1f1f1f] border-[#1f1f1f] text-white lg:bg-primary/10 lg:text-primary"
                            : "bg-card border-[#dddddd] text-foreground hover:border-[#1f1f1f] lg:hover:bg-[#f7f7f7]"
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        {item.label}
                        {item.href && <ChevronRight className="hidden lg:block w-4 h-4 ml-auto text-muted-foreground" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Conteúdo */}
          <section className="min-w-0">
            {activeTab === "vouchers" && (
              <div>
                <h2 className="m-0 text-xl md:text-2xl font-bold">Meus vouchers</h2>
                <p className="m-0 mt-1 text-sm text-muted-foreground">Apresente o QR Code no estabelecimento para usar.</p>
                <Tabs defaultValue="active" className="mt-4">
                  <TabsList className="h-auto bg-transparent p-0 gap-2 flex-wrap justify-start">
                    {(["active", "used", "expired"] as const).map((s) => (
                      <TabsTrigger
                        key={s}
                        value={s}
                        className="h-10 rounded-full border border-[#dddddd] bg-card px-4 text-sm font-semibold data-[state=active]:bg-[#1f1f1f] data-[state=active]:text-white data-[state=active]:border-[#1f1f1f] data-[state=active]:shadow-none"
                      >
                        {{ active: "Ativos", used: "Utilizados", expired: "Expirados" }[s]}
                        <span className="ml-1.5 text-xs opacity-70">{voucherCounts[s]}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {(["active", "used", "expired"] as const).map((s) => (
                    <TabsContent key={s} value={s} className="mt-4">
                      {renderVoucherList(s)}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            {activeTab === "history" && (
              <div>
                <h2 className="m-0 text-xl md:text-2xl font-bold">Histórico</h2>
                <p className="m-0 mt-1 text-sm text-muted-foreground">Suas compras e pagamentos.</p>
                {transactions.length > 0 ? (
                  <>
                    <div className="mt-4 rounded-2xl border border-[#ebebeb] bg-card px-5 py-4 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
                        Total em compras concluídas
                      </span>
                      <span className="text-lg font-bold tabular-nums">
                        {formatCurrency(transactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + Number(t.amount), 0))}
                      </span>
                    </div>
                    <ul className="m-0 mt-3 p-0 list-none rounded-2xl border border-[#ebebeb] bg-card divide-y divide-[#ebebeb]">
                      {transactions.map((t) => {
                        const st =
                          t.status === "completed"
                            ? { label: "Concluída", cls: "bg-[#e8f6ee] text-[#137a3f]" }
                            : t.status === "pending"
                              ? { label: "Pendente", cls: "bg-[#fff6e0] text-[#8a5a00]" }
                              : { label: "Cancelada", cls: "bg-[#fdecec] text-[#b4141a]" };
                        return (
                          <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-4 md:px-5">
                            <div className="min-w-0">
                              <p className="m-0 text-[15px] font-semibold leading-snug">{t.description || "Compra de voucher"}</p>
                              <p className="m-0 mt-0.5 text-[13px] text-muted-foreground">
                                {new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                {t.payment_method ? ` · ${t.payment_method}` : ""}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="m-0 text-[15px] font-bold tabular-nums">{formatCurrency(t.amount)}</p>
                              <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-[#dddddd] py-12 px-6 text-center">
                    <History className="w-10 h-10 mx-auto text-muted-foreground/60" aria-hidden="true" />
                    <p className="m-0 mt-3 text-sm text-muted-foreground">Nenhuma compra por aqui ainda.</p>
                    <button type="button" onClick={() => navigate("/")} className="mt-4 h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
                      Explorar ofertas
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div>
                <h2 className="m-0 text-xl md:text-2xl font-bold">Dados pessoais</h2>
                <p className="m-0 mt-1 text-sm text-muted-foreground">Usados nas suas compras e reservas.</p>
                {userProfile ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateProfile(new FormData(e.currentTarget));
                    }}
                    className="mt-4 rounded-2xl border border-[#ebebeb] bg-card p-5 md:p-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="full_name">Nome completo</Label>
                        <Input id="full_name" name="full_name" defaultValue={userProfile.full_name} required readOnly disabled className={lockedCls} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" value={userProfile.email} disabled className={lockedCls} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={userProfile.phone || ""} placeholder="(00) 00000-0000" className={fieldCls} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input id="cpf" name="cpf" defaultValue={userProfile.cpf || ""} placeholder="000.000.000-00" readOnly disabled className={lockedCls} />
                      </div>
                    </div>
                    <p className="m-0 mt-3 text-xs text-muted-foreground">Nome, e-mail e CPF não podem ser alterados por aqui. Precisa corrigir? Fale com a gente pelo WhatsApp.</p>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#ebebeb] pt-5 text-sm">
                      <div>
                        <span className="block text-xs text-muted-foreground">Cadastro</span>
                        <span className="font-semibold">{new Date(userProfile.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground">Status da conta</span>
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-[#1f9d55]" aria-hidden="true" />
                          Ativa
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                      <button type="button" onClick={handleLogout} className="h-12 rounded-xl border border-[#dddddd] px-5 text-[15px] font-semibold inline-flex items-center justify-center gap-2 hover:border-primary hover:text-primary">
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        Sair da conta
                      </button>
                      <button type="submit" disabled={isUpdatingProfile} className="h-12 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-60">
                        {isUpdatingProfile ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Salvando…
                          </>
                        ) : (
                          "Salvar alterações"
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Carregando informações…
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <HomeBottomNav />

      {/* Voucher Modal */}
      <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Usar Voucher</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-4">
              {/* Voucher Info */}
              <div className="text-center">
                <h3 className="font-semibold text-lg">{getVoucherTitle(selectedVoucher)}</h3>
                <p className="text-muted-foreground">{getVoucherCompanyName(selectedVoucher)}</p>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-success">
                    {formatCurrency(selectedVoucher.purchase_price)}
                  </span>
                </div>
              </div>

              {/* QR Code - real scannable */}
              <div className="bg-white p-6 rounded-xl border-2 border-dashed border-muted text-center">
                <div className="w-48 h-48 mx-auto flex items-center justify-center mb-4">
                  <QRCode value={selectedVoucher.qr_code} size={180} />
                </div>
                <p className="text-sm text-muted-foreground mb-2">Código do Voucher:</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="font-mono text-lg font-semibold tracking-[0.3em] bg-muted p-2 rounded">
                    {selectedVoucher.qr_code}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedVoucher.qr_code);
                      toast({ title: "Copiado!", description: "Código copiado para a área de transferência." });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Como usar:</strong> Apresente este QR Code ou informe o código de 8 caracteres no estabelecimento.
                  O parceiro irá escanear ou digitar o código para validar seu voucher.
                </p>
              </div>

              {/* Download PDF + Close */}
              <Button
                className="w-full"
                onClick={handleDownloadVoucherPdf}
                disabled={voucherPdfLoading}
              >
                {voucherPdfLoading ? 'Gerando PDF…' : 'Baixar voucher (PDF)'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsVoucherModalOpen(false)}
              >
                Fechar
              </Button>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ticket (NovaXS) Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Ingresso</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-base sm:text-lg break-words">{getTicketTitle(selectedTicket)}</h3>
                <p className="text-sm text-muted-foreground break-words">{selectedTicket.establishment_name || 'Estabelecimento NovaXS'}</p>
                {selectedTicket.use_date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Uso em {formatDate(selectedTicket.use_date)}
                  </p>
                )}
                <div className="mt-2">
                  <span className="text-xl sm:text-2xl font-bold text-primary">
                    {formatCurrency(selectedTicket.total_price)}
                  </span>
                </div>
              </div>

              {(() => {
                const ticketsArr = Array.isArray(selectedTicket.tickets)
                  ? selectedTicket.tickets.filter((t) => t && t.barcode)
                  : [];

                if (ticketsArr.length > 0) {
                  return (
                    <div className="space-y-4">
                      {ticketsArr.map((t, idx) => (
                        <div key={`${t.barcode}-${idx}`} className="bg-white p-4 sm:p-6 rounded-xl border-2 border-dashed border-muted text-center">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                            Ingresso {idx + 1} de {ticketsArr.length}
                          </p>
                          {t.product_name && (
                            <p className="text-sm font-medium mb-1 break-words">{t.product_name}</p>
                          )}
                          {t.date && (
                            <p className="text-xs text-muted-foreground mb-3">Uso em {formatDate(t.date)}</p>
                          )}
                          <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto flex items-center justify-center mb-4">
                            <QRCode value={String(t.barcode)} size={160} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">Código (barcode Parksnet):</p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <p className="font-mono text-xs sm:text-sm font-semibold tracking-[0.1em] bg-muted px-2 py-1 sm:p-2 rounded break-all">
                              {t.barcode}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-2"
                              onClick={() => {
                                navigator.clipboard.writeText(String(t.barcode));
                                toast({ title: 'Copiado!', description: 'Código do ingresso copiado.' });
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Fallback (booking antigo / sem barcode individual): mostra localizador
                if (!selectedTicket.localizador && !selectedTicket.voucher_id) return null;
                const code = String(selectedTicket.localizador || selectedTicket.voucher_id);
                return (
                  <div className="bg-white p-4 sm:p-6 rounded-xl border-2 border-dashed border-muted text-center">
                    <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto flex items-center justify-center mb-4">
                      <QRCode value={code} size={160} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Localizador:</p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <p className="font-mono text-base sm:text-lg font-semibold tracking-[0.15em] sm:tracking-[0.2em] bg-muted px-2 py-1 sm:p-2 rounded break-all">
                        {code}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2"
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                          toast({ title: 'Copiado!', description: 'Localizador copiado.' });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Como usar:</strong> Apresente o QR Code de cada ingresso na bilheteria do estabelecimento. Cada ingresso tem seu próprio código emitido pela Parksnet.
                </p>
              </div>


              <Button
                className="w-full"
                onClick={handleDownloadTicketPdf}
                disabled={ticketPdfLoading}
              >
                {ticketPdfLoading ? 'Gerando voucher...' : 'Baixar voucher (Bah Ofertas + Parksnet)'}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsTicketModalOpen(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;