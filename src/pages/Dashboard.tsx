import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
import { MapPin, Calendar, QrCode, LogOut, User as UserIcon, History, ShoppingCart, X, Check, Camera, Edit3, DollarSign, TrendingUp, Copy, Building2 } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-[var(--shadow-card)] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo-desktop.png" 
              alt="Bah Ofertas" 
              className="h-10 w-auto"
            />
          </div>
          
          <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-2 hover:bg-red-500 hover:text-white transition-colors duration-200">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Botão Voltar */}
        <div className="mb-4">
          <Button 
            variant="destructive" 
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-card shadow-[var(--shadow-card)]">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative group">
                    <Avatar className="w-20 h-20 mb-4">
                      <AvatarImage src={userProfile?.profile_image_url || user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-lg font-semibold bg-primary text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {userProfile?.full_name || user?.user_metadata?.full_name || "Usuário"}
                  </h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-gradient-to-r from-success/10 to-primary/10 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-success" />
                        <span className="text-sm font-medium">Economia Total</span>
                      </div>
                      <span className="text-lg font-bold text-success">
                        {formatCurrency(userStats.totalSavings)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-primary/5 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">{userStats.activeVouchers}</div>
                      <div className="text-xs text-muted-foreground">Ativos</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-foreground">{userStats.usedVouchers}</div>
                      <div className="text-xs text-muted-foreground">Usados</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pontos</span>
                    <Badge variant="secondary" className="bg-warning/10 text-warning">
                      {userStats.activeVouchers * 100}
                    </Badge>
                  </div>
                </div>

                <nav className="space-y-2">
                  <Button
                    variant={activeTab === "vouchers" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("vouchers")}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Meus Vouchers
                  </Button>
                  <Button
                    variant={activeTab === "history" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("history")}
                  >
                    <History className="w-4 h-4 mr-2" />
                    Histórico
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => navigate("/hospedagem/reservas")}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Minhas Reservas
                  </Button>
                  <Button
                    variant={activeTab === "profile" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("profile")}
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    Perfil
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "vouchers" && (
              <Card className="bg-card shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle>Meus Vouchers</CardTitle>
                  <p className="text-muted-foreground">Gerencie seus vouchers ativos e histórico de compras</p>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="active">Ativos</TabsTrigger>
                      <TabsTrigger value="used">Utilizados</TabsTrigger>
                      <TabsTrigger value="expired">Expirados</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="active" className="space-y-4">
                      {getTicketBookingsByStatus('active').map((booking) => (
                        <Card key={booking.id} className="border-2 border-success">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{getTicketTitle(booking)}</h3>
                                <p className="text-muted-foreground text-sm mb-2">{booking.establishment_name || 'Estabelecimento NovaXS'}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{booking.use_date ? `Uso em ${formatDate(booking.use_date)}` : 'Data confirmada'}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-2xl font-bold text-primary">
                                    {formatCurrency(booking.total_price)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 items-end">
                                <Badge className="bg-success text-success-foreground hover:bg-success/90">Ativo</Badge>
                                <p className="font-mono text-sm text-muted-foreground">
                                  {booking.localizador || booking.voucher_id || booking.id.slice(0, 8)}
                                </p>
                                <Button size="sm" className="flex items-center gap-2" onClick={() => handleViewTicket(booking)}>
                                  <QrCode className="w-4 h-4" />
                                  Ver QR Code
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {getVouchersByStatus('active').map((voucher) => (
                        <Card key={voucher.id} className="border-l-4 border-l-success">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{getVoucherTitle(voucher)}</h3>
                                <p className="text-muted-foreground text-sm mb-2">{getVoucherCompanyName(voucher)}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>Local disponível</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Expira em {formatDate(voucher.expires_at)}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-2xl font-bold text-success">
                                    {formatCurrency(voucher.purchase_price)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Badge className="bg-success text-white">
                                  Ativo
                                </Badge>
                                <Button size="sm" className="flex items-center gap-2" onClick={() => handleViewVoucher(voucher)}>
                                  <QrCode className="w-4 h-4" />
                                  Ver QR Code
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                       {isLoadingVouchers ? (
                        <div className="text-center py-8">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Carregando vouchers...</p>
                        </div>
                      ) : getVouchersByStatus('active').length === 0 && getTicketBookingsByStatus('active').length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">Você não possui vouchers ativos no momento.</p>
                          <Button className="mt-4" onClick={() => navigate("/")}>
                            Explorar Ofertas
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="used" className="space-y-4">
                      {getTicketBookingsByStatus('used').map((booking) => (
                        <Card key={booking.id} className="border-l-4 border-l-muted">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{getTicketTitle(booking)}</h3>
                                <p className="text-muted-foreground text-sm mb-2">{booking.establishment_name || 'Estabelecimento NovaXS'}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{booking.use_date ? `Uso em ${formatDate(booking.use_date)}` : 'Data confirmada'}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-2xl font-bold text-muted-foreground">{formatCurrency(booking.total_price)}</span>
                                </div>
                              </div>
                              <Badge variant="secondary">Utilizado</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {getVouchersByStatus('used').map((voucher) => (
                        <Card key={voucher.id} className="border-l-4 border-l-muted">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{getVoucherTitle(voucher)}</h3>
                                <p className="text-muted-foreground text-sm mb-2">{getVoucherCompanyName(voucher)}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Usado em {voucher.used_at ? formatDate(voucher.used_at) : 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-2xl font-bold text-muted-foreground">
                                    {formatCurrency(voucher.purchase_price)}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                Utilizado
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {getVouchersByStatus('used').length === 0 && getTicketBookingsByStatus('used').length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">Você ainda não utilizou nenhum voucher.</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="expired" className="space-y-4">
                      {getTicketBookingsByStatus('expired').map((booking) => (
                        <Card key={booking.id} className="border-l-4 border-l-destructive opacity-75">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{getTicketTitle(booking)}</h3>
                                <p className="text-muted-foreground text-sm mb-2">{booking.establishment_name || 'Estabelecimento NovaXS'}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{booking.use_date ? `Expirou em ${formatDate(booking.use_date)}` : 'Expirado'}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-2xl font-bold text-destructive">{formatCurrency(booking.total_price)}</span>
                                </div>
                              </div>
                              <Badge variant="destructive">Expirado</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {getVouchersByStatus('expired').map((voucher) => (
                        <Card key={voucher.id} className="border-l-4 border-l-destructive opacity-75">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{getVoucherTitle(voucher)}</h3>
                                <p className="text-muted-foreground text-sm mb-2">{getVoucherCompanyName(voucher)}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Expirou em {formatDate(voucher.expires_at)}</span>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <span className="text-2xl font-bold text-destructive">
                                    {formatCurrency(voucher.purchase_price)}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="destructive">
                                Expirado
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {getVouchersByStatus('expired').length === 0 && getTicketBookingsByStatus('expired').length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">Você não possui vouchers expirados.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {activeTab === "history" && (
              <Card className="bg-card shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Histórico de Transações
                  </CardTitle>
                  <p className="text-muted-foreground">Acompanhe todas as suas compras e atividades</p>
                </CardHeader>
                <CardContent>
                  {transactions.length > 0 ? (
                    <div className="space-y-4">
                      {transactions.map((transaction) => (
                        <Card key={transaction.id} className="border-l-4 border-l-primary/50">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold">{transaction.description || "Compra de Voucher"}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(transaction.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                {transaction.payment_method && (
                                  <p className="text-sm text-muted-foreground">
                                    Método: {transaction.payment_method}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-primary">
                                  {formatCurrency(transaction.amount)}
                                </div>
                                <Badge 
                                  variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                                  className={
                                    transaction.status === 'completed' 
                                      ? 'bg-success text-white' 
                                      : transaction.status === 'pending'
                                      ? 'bg-warning text-white'
                                      : 'bg-destructive text-white'
                                  }
                                >
                                  {transaction.status === 'completed' ? 'Concluída' : 
                                   transaction.status === 'pending' ? 'Pendente' : 'Cancelada'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Summary Card */}
                      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-primary" />
                              <span className="font-medium">Total Investido</span>
                            </div>
                            <span className="text-xl font-bold text-primary">
                              {formatCurrency(transactions
                                .filter(t => t.status === 'completed')
                                .reduce((sum, t) => sum + Number(t.amount), 0))}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
                      <Button className="mt-4" onClick={() => navigate("/")}>
                        Explorar Ofertas
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "profile" && (
              <Card className="bg-card shadow-[var(--shadow-card)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5" />
                    Meu Perfil
                  </CardTitle>
                  <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
                </CardHeader>
                <CardContent>
                  {userProfile ? (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleUpdateProfile(formData);
                    }} className="space-y-6">
                      {/* Avatar Section */}
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative group">
                          <Avatar className="w-24 h-24">
                            <AvatarImage src={userProfile?.profile_image_url || user?.user_metadata?.avatar_url} />
                            <AvatarFallback className="text-2xl font-semibold bg-primary text-white">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingAvatar}
                          >
                            {isUploadingAvatar ? (
                              <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          Clique no ícone da câmera para alterar sua foto
                        </p>
                      </div>

                      <Separator />

                      {/* Personal Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Nome Completo</Label>
                          <Input
                            id="full_name"
                            name="full_name"
                            defaultValue={userProfile.full_name}
                            required
                            readOnly
                            disabled
                            className="bg-muted cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail</Label>
                          <Input
                            id="email"
                            value={userProfile.email}
                            disabled
                            className="bg-muted"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            name="phone"
                            defaultValue={userProfile.phone || ''}
                            placeholder="(00) 00000-0000"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            name="cpf"
                            defaultValue={userProfile.cpf || ''}
                            placeholder="000.000.000-00"
                            readOnly
                            disabled
                            className="bg-muted cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Account Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Informações da Conta</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Data de Cadastro</Label>
                            <div className="p-2 bg-muted rounded-md">
                              {new Date(userProfile.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Status da Conta</Label>
                            <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              Ativa
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <Button 
                          type="submit" 
                          disabled={isUpdatingProfile}
                          className="flex-1"
                        >
                          {isUpdatingProfile ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Salvando...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Edit3 className="w-4 h-4" />
                              Salvar Alterações
                            </div>
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Carregando informações...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

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