import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '@/hooks/usePartnerAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LogOut,
  Camera,
  Plus,
  Building,
  User,
  Settings,
  BarChart3,
  FileText,
  Phone,
  Mail,
  ShoppingBag,
  DollarSign,
  Tag,
  Ticket,
  Search,
  Wallet,
  Clock,
  CalendarCheck } from
'lucide-react';
import PromotionRequestForm from '@/components/partner/PromotionRequestForm';
import VoucherValidator from '@/components/partner/VoucherValidator';
import QRScannerModal from '@/components/partner/QRScannerModal';
import { useToast } from "@/hooks/use-toast";
import { ScanLine } from 'lucide-react';
import CashiersManagement from '@/components/partner/CashiersManagement';

interface PartnerStats {
  active_offers: number;
  total_vouchers_sold: number;
  total_revenue: number;
  partner_retention_rate: number;
}

interface SaleRecord {
  voucher_id: string;
  offer_title: string;
  buyer_name: string;
  buyer_email: string;
  purchase_price: number;
  original_price: number;
  voucher_status: string;
  purchased_at: string;
  used_at: string | null;
  qr_code: string;
}

const PartnerPanel = () => {
  const { user, loading: authLoading, partnerData, signOut, updatePartnerData, fetchPartnerData } = usePartnerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [promotionRequests, setPromotionRequests] = useState<any[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
  const [pixKeyType, setPixKeyType] = useState<string>('');
  const [pixKey, setPixKey] = useState<string>('');

  useEffect(() => {
    setPixKeyType(((partnerData as any)?.pix_key_type || '').trim());
    setPixKey(((partnerData as any)?.pix_key || '').trim());
  }, [(partnerData as any)?.pix_key_type, (partnerData as any)?.pix_key]);

  const fetchWithdrawals = async () => {
    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('id, amount, status, payment_method, payment_details, admin_notes, reason, created_at, processed_at')
        .eq('user_type', 'partner')
        .eq('requested_by_email', user.email)
        .order('created_at', { ascending: false });
      if (!error && data) setWithdrawals(data);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    }
  };

  const handleWithdrawalRequest = async (availableAmount: number) => {
    if (!partnerData || !user?.email) return;

    const amount = Number(availableAmount.toFixed(2));
    if (amount <= 0) {
      toast({ title: "Sem saldo", description: "Você não possui saldo disponível para saque.", variant: "destructive" });
      return;
    }

    const hasPending = withdrawals.some((w) => w.status === 'pending');
    if (hasPending) {
      toast({ title: "Solicitação em andamento", description: "Você já possui uma solicitação de saque pendente. Aguarde a análise do administrador.", variant: "destructive" });
      return;
    }

    const pixKey = (partnerData as any)?.pix_key?.trim?.();
    const pixKeyType = (partnerData as any)?.pix_key_type;
    if (!pixKey || !pixKeyType) {
      toast({ title: "Chave PIX não cadastrada", description: "Cadastre uma chave PIX na aba Perfil antes de solicitar o saque.", variant: "destructive" });
      setActiveTab('profile');
      return;
    }

    setRequestingWithdrawal(true);
    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        user_type: 'partner',
        amount,
        payment_method: 'pix',
        payment_details: {
          company_id: partnerData.id,
          company_name: partnerData.name || partnerData.trade_name,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
        },
        requested_by_email: user.email,
        requester_name: partnerData.trade_name || partnerData.name || 'Parceiro',
        status: 'pending',
      });

      if (error) throw error;

      toast({ title: "Solicitação enviada!", description: "Sua solicitação de saque foi enviada ao administrador para aprovação." });
      fetchWithdrawals();
    } catch (err: any) {
      console.error('Withdrawal request error:', err);
      toast({ title: "Erro ao solicitar saque", description: err.message || "Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setRequestingWithdrawal(false);
    }
  };

  // Fetch partner stats
  const fetchStats = async () => {
    if (!partnerData?.id) return;
    setLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('get_partner_stats', {
        partner_company_id: partnerData.id
      });
      if (!error && data) {
        setStats(data as unknown as PartnerStats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch sales data
  const fetchSales = async () => {
    if (!partnerData?.id) return;
    setLoadingSales(true);
    try {
      const { data, error } = await supabase.rpc('get_partner_sales_data' as any, {
        partner_company_id: partnerData.id
      } as any);
      if (!error && data) {
        setSales(data as unknown as SaleRecord[]);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  const fetchPromotionRequests = async () => {
    if (!partnerData?.id) return;
    setLoadingPromotions(true);
    try {
      const { data, error } = await supabase.
      from('promotion_requests').
      select('*').
      eq('company_id', partnerData.id).
      order('created_at', { ascending: false });
      if (!error && data) {
        setPromotionRequests(data);
      }
    } catch (err) {
      console.error('Error fetching promotions:', err);
    } finally {
      setLoadingPromotions(false);
    }
  };

  useEffect(() => {
    if (partnerData?.id) {
      fetchStats();
      fetchSales();
      fetchPromotionRequests();
      fetchWithdrawals();
    }
  }, [partnerData?.id]);

  // Realtime: sync partner data whenever admin updates the company (verification, approval, etc.)
  useEffect(() => {
    if (!partnerData?.id) return;

    const channel = supabase
      .channel(`company-sync-${partnerData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${partnerData.id}`,
        },
        () => {
          fetchPartnerData();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerData?.id]);

  // Realtime: refresh withdrawals when admin approves/rejects
  useEffect(() => {
    if (!user?.email) return;
    const channel = supabase
      .channel(`withdrawals-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawal_requests', filter: `requested_by_email=eq.${user.email}` },
        () => { fetchWithdrawals(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.email, user?.id]);


  const fetchCurrentUserData = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.
      from('users').
      select('full_name, phone, profile_image_url').
      eq('id', user.id).
      single();
      if (!error && data) {
        setCurrentUserData(data);
        if (data.profile_image_url) setProfileImageUrl(data.profile_image_url);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    fetchCurrentUserData();
  }, [user?.id]);

  // Fallback: use company logo_url if profile image not set from users table
  useEffect(() => {
    if (!profileImageUrl && partnerData?.logo_url) {
      setProfileImageUrl(partnerData.logo_url);
    }
  }, [partnerData?.logo_url, profileImageUrl]);

  // Redirect if not authenticated (aguarda fim do loading para não disparar redirect antes da sessão carregar)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/parceiro/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingPhoto(true);

    try {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Erro", description: "Por favor, selecione apenas arquivos de imagem.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB.", variant: "destructive" });
        return;
      }

      // Mesmo fluxo usado no painel do cliente e do afiliado (bucket público "avatars",
      // pasta nomeada com auth.uid() para satisfazer a RLS).
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.
      from('avatars').
      upload(fileName, file);

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        toast({ title: "Erro no Upload", description: "Não foi possível fazer o upload da imagem. Tente novamente.", variant: "destructive" });
        return;
      }

      const { data: { publicUrl } } = supabase.storage.
      from('avatars').
      getPublicUrl(fileName);

      // Cache-bust: força o browser a re-baixar a imagem
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      // Save to users table (best effort)
      await supabase.
      from('users').
      update({ profile_image_url: publicUrl }).
      eq('id', user.id);

      // Save to companies table (persistent for partner)
      const { error: companyError } = await updatePartnerData({ logo_url: publicUrl });

      if (companyError) {
        toast({ title: "Erro", description: "Upload realizado, mas erro ao salvar: " + companyError.message, variant: "destructive" });
        return;
      }

      setProfileImageUrl(cacheBustedUrl);
      toast({ title: "Foto Atualizada!", description: "Sua foto foi atualizada com sucesso." });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({ title: "Erro", description: "Erro interno ao fazer upload da foto.", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(event.currentTarget);
      const updateData = {
        full_name: formData.get('name') as string,
        phone: formData.get('phone') as string
      };
      const { error: userError } = await supabase.from('users').update(updateData).eq('id', user?.id);
      if (userError) {
        toast({ title: "Erro", description: "Erro ao salvar dados pessoais: " + userError.message, variant: "destructive" });
        return;
      }
      const companyData = {
        name: (formData.get('name') as string) || partnerData?.name,
        phone: (formData.get('phone') as string) || null,
        pix_key: pixKey.trim() || null,
        pix_key_type: pixKeyType || null,
      };
      // Não sobrescrever CNPJ (campo disabled não é enviado no FormData e a coluna é NOT NULL)
      const { data: savedCompany, error: companyError } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', partnerData?.id || '')
        .select('id, pix_key, pix_key_type')
        .maybeSingle();
      if (companyError) {
        toast({ title: "Erro", description: "Erro ao salvar dados da empresa: " + companyError.message, variant: "destructive" });
        return;
      }
      if (!savedCompany) {
        toast({ title: "Erro", description: "Nenhum cadastro de empresa foi encontrado para atualizar.", variant: "destructive" });
        return;
      }
      await Promise.all([fetchPartnerData(), fetchCurrentUserData()]);
      toast({ title: "Sucesso!", description: "Dados salvos e sincronizados com sucesso!" });
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Erro", description: "Erro interno ao salvar dados", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePromotionRequest = async () => {
    if (!user?.email) {
      toast({ title: "Erro", description: "Usuário não autenticado. Faça login novamente.", variant: "destructive" });
      return;
    }
    try {
      const { data: companyData, error: companyError } = await supabase.
      from('companies').
      select('id, name, trade_name, approval_status, is_verified').
      ilike('email', user.email.trim()).
      single();
      if (companyError || !companyData) {
        toast({ title: "Erro", description: "Empresa não encontrada. Entre em contato com o suporte.", variant: "destructive" });
        return;
      }
      if (companyData.approval_status === 'rejected') {
        toast({ title: "❌ Conta Rejeitada", description: "Sua conta foi rejeitada pelos administradores.", variant: "destructive", duration: 5000 });
        return;
      }
      const isCompanyApproved = companyData.approval_status === 'approved' || companyData.is_verified === true;
      if (!isCompanyApproved) {
        toast({ title: "⏳ Conta Pendente", description: "Sua conta ainda não foi aprovada. Aguarde a aprovação.", variant: "destructive", duration: 5000 });
        return;
      }
      const { error } = await supabase.from('promotion_requests').insert({
        company_id: companyData.id,
        company_name: companyData.name || companyData.trade_name || 'Estabelecimento',
        requester_email: user.email
      });
      if (error) throw error;
      toast({ title: "✅ Solicitação Enviada!", description: "Um administrador entrará em contato para criar sua promoção.", duration: 3000 });
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast({ title: "Erro", description: "Não foi possível enviar a solicitação.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    navigate('/parceiro/login', { replace: true });
    await signOut();
  };

  const isPartnerApproved = partnerData?.approval_status === 'approved' || partnerData?.is_verified === true;
  const isPartnerRejected = partnerData?.approval_status === 'rejected';

  const getStatusVariant = () => isPartnerApproved ? 'default' : isPartnerRejected ? 'destructive' : 'secondary';

  const getStatusText = () => isPartnerApproved ? 'Aprovado' : isPartnerRejected ? 'Rejeitado' : 'Pendente';

  const getVoucherStatusBadge = (status: string) => {
    switch (status) {
      case 'active':return <Badge variant="default">Ativo</Badge>;
      case 'used':return <Badge variant="secondary">Usado</Badge>;
      case 'expired':return <Badge variant="destructive">Expirado</Badge>;
      default:return <Badge variant="outline">{status}</Badge>;
    }
  };

  const retentionRate = stats?.partner_retention_rate || partnerData?.partner_retention_rate || 70;
  const partnerRevenue = (stats?.total_revenue || 0) * retentionRate / 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <img src="/logo-desktop.png" alt="BahOfertas" className="h-6 sm:h-8 w-auto shrink-0 cursor-pointer" onClick={() => navigate('/')} />
              <div className="min-w-0">
                
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="truncate max-w-[120px] sm:max-w-none">{partnerData?.name || user?.user_metadata?.company_name || user?.email}</span>
                  <Badge
                    variant={isPartnerApproved ? 'default' : isPartnerRejected ? 'destructive' : 'outline'}
                    className="text-[10px] sm:text-xs shrink-0">
                    {isPartnerApproved ? 'Ativa' : isPartnerRejected ? 'Rejeitada' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowQRScanner(true)}
                className="relative"
                title="Escanear QR Code">
                
                <ScanLine className="h-5 w-5 text-primary" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger value="cashiers" className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Caixas</span>
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Promoções</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cashiers" className="space-y-6">
            {partnerData?.id && <CashiersManagement companyId={partnerData.id} />}
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              

















              

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Promoções Ativas</CardTitle>
                  <Tag className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.active_offers ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Ofertas em exibição</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vouchers Vendidos</CardTitle>
                  <Ticket className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_vouchers_sold ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Total de vouchers gerados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita (sua parte)</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    R$ {partnerRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Retenção: {retentionRate}% das vendas
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
                <p className="text-sm text-muted-foreground">Gerencie suas promoções e configurações</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => setShowPromotionForm(true)} className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Solicitar Nova Promoção
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab("sales")}>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Ver Vendas
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab("profile")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Atualizar Informações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validate tab removed - validation is done via QR Scanner modal */}

          {/* Sales Tab */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Vendas & Vouchers</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Detalhes de cada venda realizada através das suas ofertas
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchSales} disabled={loadingSales} className="shrink-0 w-full sm:w-auto">
                    {loadingSales ? 'Atualizando...' : 'Atualizar'}
                  </Button>
                </div>
                {sales.length > 0 && (
                  <div className="relative mt-3 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente, oferta ou código..."
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredSales = sales.filter((sale) => {
                    if (!salesSearch.trim()) return true;
                    const q = salesSearch.toLowerCase();
                    return (
                      sale.buyer_name?.toLowerCase().includes(q) ||
                      sale.buyer_email?.toLowerCase().includes(q) ||
                      sale.offer_title?.toLowerCase().includes(q) ||
                      sale.qr_code?.toLowerCase().includes(q) ||
                      sale.voucher_id?.toLowerCase().includes(q)
                    );
                  });

                  if (sales.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhuma venda encontrada</h3>
                        <p className="text-muted-foreground">Quando clientes comprarem suas ofertas, as vendas aparecerão aqui.</p>
                      </div>
                    );
                  }

                  if (filteredSales.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Search className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                        <h3 className="text-base font-medium mb-1">Nenhum resultado</h3>
                        <p className="text-sm text-muted-foreground">Nenhuma venda encontrada para "{salesSearch}"</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID Voucher</TableHead>
                              <TableHead>Oferta</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Valor Pago</TableHead>
                              <TableHead>Sua Parte ({retentionRate}%)</TableHead>
                              <TableHead>Data/Hora</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSales.map((sale) => (
                              <TableRow key={sale.voucher_id}>
                                <TableCell>
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{sale.qr_code || sale.voucher_id?.slice(0, 8)}</code>
                                </TableCell>
                                <TableCell className="font-medium">{sale.offer_title}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="text-sm font-medium">{sale.buyer_name}</p>
                                    <p className="text-xs text-muted-foreground">{sale.buyer_email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>R$ {Number(sale.purchase_price).toFixed(2)}</TableCell>
                                <TableCell className="font-semibold text-primary">
                                  R$ {(Number(sale.purchase_price) * retentionRate / 100).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="text-sm">{new Date(sale.purchased_at).toLocaleDateString('pt-BR')}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(sale.purchased_at).toLocaleTimeString('pt-BR')}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{getVoucherStatusBadge(sale.voucher_status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="md:hidden space-y-3">
                        {filteredSales.map((sale) => (
                          <div key={sale.voucher_id} className="border rounded-lg p-3 space-y-2 bg-card">
                            <div className="flex items-center justify-between">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{sale.qr_code || sale.voucher_id?.slice(0, 8)}</code>
                              {getVoucherStatusBadge(sale.voucher_status)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{sale.offer_title}</p>
                              <p className="text-xs text-muted-foreground">{sale.buyer_name} · {sale.buyer_email}</p>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="text-muted-foreground">Pago: </span>
                                <span>R$ {Number(sale.purchase_price).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Sua parte: </span>
                                <span className="font-semibold text-primary">R$ {(Number(sale.purchase_price) * retentionRate / 100).toFixed(2)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sale.purchased_at).toLocaleDateString('pt-BR')} às {new Date(sale.purchased_at).toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            {(() => {
              const now = new Date();

              const grossRevenue = stats?.total_revenue || 0;
              const retentionPct = stats?.partner_retention_rate || partnerData?.partner_retention_rate || 70;
              const netRevenue = grossRevenue * (retentionPct / 100);

              // Saldo só fica disponível 14 dias após a transação da venda
              const HOLD_DAYS = 14;
              const holdMs = HOLD_DAYS * 24 * 60 * 60 * 1000;
              const holdCutoff = new Date(now.getTime() - holdMs);

              let matureGross = 0;
              const pendingByDay = new Map<string, { date: Date; gross: number }>();

              for (const s of sales) {
                const purchasedAt = s.purchased_at ? new Date(s.purchased_at) : null;
                if (!purchasedAt) continue;
                const price = Number(s.purchase_price || 0);
                if (purchasedAt <= holdCutoff) {
                  matureGross += price;
                } else {
                  const releaseAt = new Date(purchasedAt.getTime() + holdMs);
                  // Agrupa por dia local (não UTC) para que vendas no mesmo dia local fiquem juntas
                  const key = `${releaseAt.getFullYear()}-${String(releaseAt.getMonth() + 1).padStart(2, '0')}-${String(releaseAt.getDate()).padStart(2, '0')}`;
                  const existing = pendingByDay.get(key);
                  if (existing) {
                    existing.gross += price;
                  } else {
                    pendingByDay.set(key, { date: releaseAt, gross: price });
                  }
                }
              }

              let nextReleaseDate: Date | null = null;
              let nextReleaseAmount = 0;
              for (const { date, gross } of pendingByDay.values()) {
                if (!nextReleaseDate || date < nextReleaseDate) {
                  nextReleaseDate = date;
                  nextReleaseAmount = gross * (retentionPct / 100);
                }
              }

              const matureNet = matureGross * (retentionPct / 100);
              const pendingNet = Math.max(0, netRevenue - matureNet);
              const paidWithdrawn = withdrawals
                .filter((w) => w.status === 'approved' || w.status === 'paid' || w.status === 'completed')
                .reduce((sum, w) => sum + Number(w.amount || 0), 0);
              const pendingWithdrawn = withdrawals
                .filter((w) => w.status === 'pending')
                .reduce((sum, w) => sum + Number(w.amount || 0), 0);
              const hasPendingWithdrawal = pendingWithdrawn > 0;
              const availableBalance = Math.max(0, matureNet - paidWithdrawn - pendingWithdrawn);
              const hasAvailable = availableBalance > 0;

              const nextReleaseFormatted = nextReleaseDate
                ? nextReleaseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : null;

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className={hasAvailable ? "border-success/40 bg-success/10" : "border-primary/30 bg-primary/5"}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Saldo Disponível para Saque</CardTitle>
                        <Wallet className={`h-4 w-4 ${hasAvailable ? 'text-success' : 'text-primary'}`} />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold ${hasAvailable ? 'text-success' : 'text-primary'}`}>
                          R$ {availableBalance.toFixed(2)}
                        </div>
                        {hasAvailable ? (
                          <div className="flex items-center gap-1 mt-1">
                            <CalendarCheck className="h-3 w-3 text-success" />
                            <p className="text-xs text-success font-medium">Disponível para saque</p>
                          </div>
                        ) : nextReleaseFormatted ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              Próxima liberação: {nextReleaseFormatted} (R$ {nextReleaseAmount.toFixed(2)})
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Nenhuma venda pendente</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          O saldo de cada venda é liberado 14 dias após a data da transação.
                        </p>
                        {pendingNet > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Aguardando liberação (carência de 14 dias): <span className="font-semibold">R$ {pendingNet.toFixed(2)}</span>
                          </p>
                        )}
                        {hasPendingWithdrawal && (
                          <p className="text-xs text-warning mt-1">
                            Saque pendente de aprovação: <span className="font-semibold">R$ {pendingWithdrawn.toFixed(2)}</span>
                          </p>
                        )}
                        {hasAvailable && !hasPendingWithdrawal && (
                          <Button
                            size="sm"
                            className="mt-3 w-full"
                            variant="success"
                            onClick={() => handleWithdrawalRequest(availableBalance)}
                            disabled={requestingWithdrawal}
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            {requestingWithdrawal ? 'Enviando...' : `Solicitar Saque (R$ ${availableBalance.toFixed(2)})`}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                    <Card>

                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Bruta</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          R$ {grossRevenue.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">Total pago pelos clientes</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
                        <DollarSign className="h-4 w-4 text-success" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-success">
                          R$ {netRevenue.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sua parte ({retentionPct}%)
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Resumo Financeiro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Total de Vouchers Vendidos</span>
                        <span className="font-medium">{stats?.total_vouchers_sold || 0}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Ticket Médio</span>
                        <span className="font-medium">
                          R$ {stats?.total_vouchers_sold ? ((stats?.total_revenue || 0) / stats.total_vouchers_sold).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm text-muted-foreground">Promoções Ativas</span>
                        <span className="font-medium">{stats?.active_offers || 0}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Taxa de Retenção</span>
                        <Badge variant="secondary">{stats?.partner_retention_rate || 70}%</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico de Saques</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {withdrawals.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma solicitação de saque ainda.</p>
                      ) : (
                        <div className="space-y-2">
                          {withdrawals.slice(0, 10).map((w) => {
                            const statusLabel = w.status === 'pending' ? 'Pendente'
                              : (w.status === 'approved' || w.status === 'paid' || w.status === 'completed') ? 'Concluído'
                              : w.status === 'rejected' ? 'Cancelado'
                              : w.status;
                            const statusVariant: any = w.status === 'pending' ? 'secondary'
                              : (w.status === 'approved' || w.status === 'paid' || w.status === 'completed') ? 'default'
                              : 'destructive';
                            return (
                              <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm">R$ {Number(w.amount).toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(w.created_at).toLocaleDateString('pt-BR')}
                                    {w.processed_at && ` • Processado em ${new Date(w.processed_at).toLocaleDateString('pt-BR')}`}
                                  </p>
                                  {w.reason && <p className="text-xs text-destructive mt-0.5">Motivo: {w.reason}</p>}
                                </div>
                                <Badge variant={statusVariant}>{statusLabel}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* Promotions Tab */}
          <TabsContent value="promotions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Minhas Promoções</CardTitle>
                <Button onClick={() => setShowPromotionForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Promoção
                </Button>
              </CardHeader>
              <CardContent>
                {loadingPromotions ?
                <div className="space-y-3">
                    {[1, 2, 3].map((i) =>
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  )}
                  </div> :
                promotionRequests.length === 0 ?
                <div className="text-center py-8">
                    <Plus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma promoção encontrada</h3>
                    <p className="text-muted-foreground mb-4">Crie sua primeira promoção para começar a atrair clientes</p>
                    <Button onClick={() => setShowPromotionForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Promoção
                    </Button>
                  </div> :

                <div className="space-y-3">
                    {promotionRequests.map((promo) => {
                    const statusConfig: Record<string, {label: string;className: string;}> = {
                      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
                      approved: { label: 'Ativa', className: 'bg-green-100 text-green-800 border-green-200' },
                      rejected: { label: 'Rejeitada', className: 'bg-red-100 text-red-800 border-red-200' }
                    };
                    const status = statusConfig[promo.status] || statusConfig.pending;

                    // Parse title from notes
                    const titleMatch = promo.notes?.match(/Título:\s*(.+)/);
                    const promoTitle = titleMatch ? titleMatch[1].trim() : 'Promoção';
                    const priceMatch = promo.notes?.match(/Valor com Desconto:\s*R\$\s*([\d.,]+)/);
                    const originalMatch = promo.notes?.match(/Valor Original:\s*R\$\s*([\d.,]+)/);
                    const discountMatch = promo.notes?.match(/Desconto:\s*(\d+)%/);

                    return (
                      <div key={promo.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-foreground truncate">{promoTitle}</h4>
                              <Badge className={status.className}>{status.label}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {originalMatch && priceMatch &&
                            <span>
                                  <span className="line-through">R$ {originalMatch[1]}</span>
                                  {' → '}
                                  <span className="font-semibold text-primary">R$ {priceMatch[1]}</span>
                                </span>
                            }
                              {discountMatch &&
                            <Badge variant="outline" className="text-xs">{discountMatch[1]}% OFF</Badge>
                            }
                              <span className="text-xs">
                                {new Date(promo.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>);

                  })}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Foto do Perfil</CardTitle>
                  <p className="text-sm text-muted-foreground">Adicione o logo da sua empresa</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative group">
                      <Avatar className="w-32 h-32 border-4 border-border">
                        <AvatarImage key={profileImageUrl || partnerData?.logo_url} src={profileImageUrl || partnerData?.logo_url} alt={partnerData?.name || "Logo da empresa"} />
                        <AvatarFallback className="text-2xl"><Building className="h-12 w-12" /></AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => photoInputRef.current?.click()}>
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} className="w-full max-w-xs">
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadingPhoto ? 'Enviando...' : 'Alterar Logo'}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Informações da Empresa</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Nome:</span>
                          </div>
                          <p className="text-sm pl-6">{currentUserData?.full_name || partnerData?.name || "Não informado"}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">CNPJ:</span>
                          </div>
                          <p className="text-sm pl-6">{partnerData?.cnpj || user?.user_metadata?.cnpj || "Não informado"}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">E-mail:</span>
                          </div>
                          <p className="text-sm pl-6">{partnerData?.email || user?.email}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Telefone:</span>
                          </div>
                          <p className="text-sm pl-6">{currentUserData?.phone || partnerData?.phone || "Não informado"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Editar Informações</CardTitle>
                  <p className="text-sm text-muted-foreground">Atualize os dados da sua empresa</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome da Empresa *</Label>
                        <Input id="name" name="name" defaultValue={currentUserData?.full_name || partnerData?.name || user?.user_metadata?.company_name || ''} placeholder="Digite o nome da empresa" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input id="cnpj" name="cnpj" defaultValue={partnerData?.cnpj || user?.user_metadata?.cnpj || ''} disabled className="bg-muted" />
                        <p className="text-xs text-muted-foreground">CNPJ de cadastro (não editável)</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone *</Label>
                        <Input id="phone" name="phone" defaultValue={currentUserData?.phone || partnerData?.phone || user?.user_metadata?.phone || ''} placeholder="(00) 00000-0000" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" name="email" defaultValue={user?.email || ''} disabled className="bg-muted" />
                        <p className="text-xs text-muted-foreground">E-mail de acesso ao sistema (não editável)</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="text-base font-semibold mb-1">Chave PIX para Saques</h4>
                      <p className="text-xs text-muted-foreground mb-4">Esta chave será usada para receber os saques aprovados pelo administrador.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pix_key_type">Tipo da Chave</Label>
                          <Select value={pixKeyType} onValueChange={setPixKeyType}>
                            <SelectTrigger id="pix_key_type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpf">CPF</SelectItem>
                              <SelectItem value="cnpj">CNPJ</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="random">Chave Aleatória</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pix_key">Chave PIX</Label>
                          <Input id="pix_key" name="pix_key" value={pixKey} onChange={(event) => setPixKey(event.target.value)} placeholder="Digite sua chave PIX" />
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={saving} className="w-full">
                      {saving ? 'Salvando...' : 'Salvar Informações'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {user?.email &&
      <PromotionRequestForm
        open={showPromotionForm}
        onOpenChange={(open) => {
          setShowPromotionForm(open);
          if (!open) fetchPromotionRequests();
        }}
        userEmail={user.email} />

      }

      {partnerData?.id &&
      <QRScannerModal
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        companyId={partnerData.id} />

      }
    </div>);

};

export default PartnerPanel;