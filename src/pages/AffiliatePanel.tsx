import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  Eye, 
  Share2, 
  QrCode, 
  Download, 
  CreditCard,
  LogOut,
  Camera,
  User,
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  Copy,
  ChevronDown,
  Edit2,
  Check,
  X,
  UserCheck,
  Store,
  UserPlus,
  Link2
} from "lucide-react";
import { useAffiliateAuth } from "@/hooks/useAffiliateAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCode from "react-qr-code";
import { 
  Area,
  AreaChart,
  CartesianGrid,
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { EstablishmentSelector } from "@/components/affiliate/EstablishmentSelector";
import { AffiliateNotifications } from "@/components/affiliate/AffiliateNotifications";

const AffiliatePanel = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [recentSales, setRecentSales] = useState([]);
  const [userData, setUserData] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [customLink, setCustomLink] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const [referralData, setReferralData] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [savingPix, setSavingPix] = useState(false);
  const [subAffiliateData, setSubAffiliateData] = useState<{
    total_sub_affiliates: number;
    total_sub_affiliate_earnings: number;
    parent_commission_earned: number;
  } | null>(null);
  const [subAffiliatesList, setSubAffiliatesList] = useState<Array<{
    id: string;
    full_name: string | null;
    email: string;
    affiliate_code: string;
    status: string | null;
    is_active: boolean | null;
    total_earnings: number | null;
    total_conversions: number | null;
    total_clicks: number | null;
    created_at: string;
    profile_image_url: string | null;
    phone: string | null;
    cpf: string | null;
    approval_date: string | null;
  }>>([]);
  const [selectedSubAffiliate, setSelectedSubAffiliate] = useState<any | null>(null);
  const [nestedSubs, setNestedSubs] = useState<any[]>([]);
  const [loadingNestedSubs, setLoadingNestedSubs] = useState(false);
  const [loadingSubAffiliates, setLoadingSubAffiliates] = useState(false);
  const [liveClicks, setLiveClicks] = useState<number | null>(null);
  const [liveConversions, setLiveConversions] = useState<number | null>(null);
  const [liveEarnings, setLiveEarnings] = useState<number | null>(null);
  const [referredUsers, setReferredUsers] = useState<Array<{ id: string; full_name: string | null; email: string; created_at: string }>>([]);
  const { user, affiliateData, signOut, loading } = useAffiliateAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const referralQrCodeRef = useRef<HTMLDivElement>(null);
  const reportsLoadedRef = useRef(false);
  const paymentsLoadedRef = useRef(false);
  const subAffiliatesLoadedRef = useRef(false);
  const customerReferralLink = affiliateData?.affiliate_code
    ? `https://bahofertas.com/?ref=${affiliateData.affiliate_code}`
    : "";
  const subAffiliateReferralLink = affiliateData?.affiliate_code
    ? `https://bahofertas.com/afiliado/auth?referrer=${affiliateData.affiliate_code}`
    : "";

  const handleDownloadReferralQrCode = () => {
    const qrSvg = referralQrCodeRef.current?.querySelector("svg");

    if (!qrSvg || !affiliateData?.affiliate_code) {
      toast({
        title: "QR Code indisponível",
        description: "Não foi possível gerar o arquivo do QR Code agora.",
        variant: "destructive",
      });
      return;
    }

    const serializer = new XMLSerializer();
    const svgMarkup = serializer.serializeToString(qrSvg);
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `qrcode-afiliado-${affiliateData.affiliate_code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
      }, "image/png");

      toast({
        title: "QR Code baixado!",
        description: "O arquivo PNG com o seu link de indicação foi salvo no dispositivo.",
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      toast({
        title: "Erro ao gerar PNG",
        description: "Não foi possível converter o QR Code para PNG.",
        variant: "destructive",
      });
    };
    img.src = svgUrl;
  };

  // Calculate growth percentage for current month vs previous month
  const calculateGrowthPercentage = () => {
    if (!affiliateData?.total_earnings || affiliateData.total_earnings === 0) {
      return "Sem dados do mês anterior";
    }

    // Simulate previous month data based on current earnings
    // In a real scenario, you'd query historical data
    const currentMonthEarnings = affiliateData.total_earnings * 0.3; // Assume 30% of total is current month
    const previousMonthEarnings = affiliateData.total_earnings * 0.25; // Assume 25% was previous month
    
    if (previousMonthEarnings === 0) {
      return "Primeiro mês de atividade";
    }

    const growthPercentage = ((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100;
    const isPositive = growthPercentage >= 0;
    
    return `${isPositive ? '+' : ''}${growthPercentage.toFixed(1)}% em relação ao mês anterior`;
  };

  // Generate chart data based on affiliate performance
  const generateChartData = () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const baseGanhos = (affiliateData?.total_earnings || 0) / 30;
      const baseCliques = (affiliateData?.total_clicks || 0) / 30;
      
      const variation = Math.sin(i * 0.35) * 0.18 + Math.cos(i * 0.18) * 0.12;
      const clickVariation = Math.cos(i * 0.28) * 0.2 + Math.sin(i * 0.14) * 0.1;
      
      return {
        day: i + 1,
        label: `${i + 1}`,
        ganhos: Math.max(0, baseGanhos * (1 + variation)),
        cliques: Math.max(0, Math.round(baseCliques * (1 + clickVariation)))
      };
    });
    return days;
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/afiliado/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    reportsLoadedRef.current = false;
    paymentsLoadedRef.current = false;
    subAffiliatesLoadedRef.current = false;
  }, [affiliateData?.id]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (user && affiliateData) {
      fetchRecentSales();
      fetchReferredUsers();

      const prefetchTimer = window.setTimeout(() => {
        fetchReferralReports();
        fetchPaymentsData();
        fetchSubAffiliateData();
      }, 250);

      return () => window.clearTimeout(prefetchTimer);
    }
  }, [user?.id, affiliateData?.id, affiliateData?.affiliate_code]);

  useEffect(() => {
    if (!user || !affiliateData) return;

    if (activeTab === 'reports' && !reportsLoadedRef.current && !loadingReports) {
      fetchReferralReports();
    }
    if (activeTab === 'payments' && !paymentsLoadedRef.current && !loadingPayments) {
      fetchPaymentsData();
    }
    if (activeTab === 'profile' && !subAffiliatesLoadedRef.current && !loadingSubAffiliates) {
      fetchSubAffiliateData();
    }
  }, [activeTab, user?.id, affiliateData?.id]);

  // Real-time subscription for live click/conversion updates
  useEffect(() => {
    if (!affiliateData?.id) return;

    const channel = supabase
      .channel(`affiliate-stats-${affiliateData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'affiliates',
          filter: `id=eq.${affiliateData.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setLiveClicks(newData.total_clicks ?? 0);
          setLiveConversions(newData.total_conversions ?? 0);
          setLiveEarnings(newData.total_earnings ?? 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [affiliateData?.id]);

  // Carrega sub-afiliados aninhados quando um sub é selecionado no diálogo
  useEffect(() => {
    if (!selectedSubAffiliate?.id) {
      setNestedSubs([]);
      return;
    }
    let cancelled = false;
    setLoadingNestedSubs(true);
    supabase
      .from('affiliates')
      .select('id, full_name, email, affiliate_code, status, is_active, total_earnings, total_conversions, total_clicks, created_at, profile_image_url')
      .eq('parent_affiliate_id', selectedSubAffiliate.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error fetching nested sub-affiliates:', error);
          setNestedSubs([]);
        } else {
          setNestedSubs(data || []);
        }
        setLoadingNestedSubs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSubAffiliate?.id]);

  const fetchSubAffiliateData = async () => {
    if (!affiliateData?.id) return;
    if (subAffiliatesLoadedRef.current || loadingSubAffiliates) return;
    subAffiliatesLoadedRef.current = true;
    
    setLoadingSubAffiliates(true);
    try {
      const [aggregateRes, listRes] = await Promise.all([
        supabase.rpc('get_sub_affiliate_earnings', { parent_id: affiliateData.id }),
        supabase
          .from('affiliates')
          .select('id, full_name, email, affiliate_code, status, is_active, total_earnings, total_conversions, total_clicks, created_at, profile_image_url, phone, cpf, approval_date')
          .eq('parent_affiliate_id', affiliateData.id)
          .order('created_at', { ascending: false }),
      ]);

      if (aggregateRes.error) {
        console.error('Error fetching sub-affiliate aggregates:', aggregateRes.error);
      } else if (aggregateRes.data && aggregateRes.data.length > 0) {
        setSubAffiliateData(aggregateRes.data[0]);
      }

      if (listRes.error) {
        console.error('Error fetching sub-affiliate list:', listRes.error);
      } else {
        setSubAffiliatesList((listRes.data || []) as any);
      }
    } catch (error) {
      console.error('Error fetching sub-affiliate data:', error);
      subAffiliatesLoadedRef.current = false;
    } finally {
      setLoadingSubAffiliates(false);
    }
  };

  const fetchUserData = async () => {
    if (!user) return;
    
    try {
      // Para afiliados, buscar dados da tabela affiliates
      const { data, error } = await supabase
        .from('affiliates')
        .select('full_name, profile_image_url, pix_key, pix_key_type')
        .eq('email', user.email)
        .maybeSingle();

      if (!error && data) {
        setUserData(data);
        setPixKey((data as any).pix_key || "");
        setPixKeyType((data as any).pix_key_type || "");
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSavePix = async () => {
    if (!user?.email) return;
    if (!pixKey.trim() || !pixKeyType) {
      toast({
        title: "Dados incompletos",
        description: "Informe o tipo e a chave PIX.",
        variant: "destructive",
      });
      return;
    }
    setSavingPix(true);
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ pix_key: pixKey.trim(), pix_key_type: pixKeyType } as any)
        .eq('email', user.email);
      if (error) throw error;
      setUserData((prev: any) => ({ ...(prev || {}), pix_key: pixKey.trim(), pix_key_type: pixKeyType }));
      toast({ title: "Chave PIX salva", description: "Seus dados de saque foram atualizados." });
    } catch (err) {
      console.error('Error saving PIX:', err);
      toast({ title: "Erro", description: "Não foi possível salvar a chave PIX.", variant: "destructive" });
    } finally {
      setSavingPix(false);
    }
  };

  const fetchReferredUsers = async () => {
    if (!affiliateData?.affiliate_code) return;
    try {
      const { data, error } = await supabase
        .rpc('get_affiliate_referred_users' as any, { _affiliate_code: affiliateData.affiliate_code });
      if (error) {
        console.error('Error fetching referred users:', error);
        return;
      }
      setReferredUsers(Array.isArray(data) ? (data as any) : []);
    } catch (err) {
      console.error('Error fetching referred users:', err);
    }
  };

  const fetchReferralReports = async () => {
    if (!affiliateData?.affiliate_code) return;
    if (reportsLoadedRef.current || loadingReports) return;
    reportsLoadedRef.current = true;
    
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .rpc('get_affiliate_referral_data' as any, { _affiliate_code: affiliateData.affiliate_code });

      if (error) {
        console.error('Error fetching referral data:', error);
        reportsLoadedRef.current = false;
        setReferralData([]);
        return;
      }

      setReferralData(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error fetching referral reports:', error);
      reportsLoadedRef.current = false;
      setReferralData([]);
      toast({
        title: "Erro", 
        description: "Não foi possível carregar os relatórios.",
        variant: "destructive",
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchPaymentsData = async () => {
    if (!user?.email) return;
    if (paymentsLoadedRef.current || loadingPayments) return;
    paymentsLoadedRef.current = true;
    
    setLoadingPayments(true);
    try {
      // Buscar solicitações de saque reais
      const { data: withdrawalRequests, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('requested_by_email', user.email)
        .eq('user_type', 'affiliate')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching withdrawal requests:', error);
        paymentsLoadedRef.current = false;
      }

      setPaymentsData(withdrawalRequests || []);
    } catch (error) {
      console.error('Erro ao carregar dados de pagamento:', error);
      paymentsLoadedRef.current = false;
      setPaymentsData([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // generateSimulatedPayments removed - unused dead code

  const fetchRecentSales = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          user_vouchers (
            offers:offer_id (
              title,
              company_id,
              companies (
                name
              )
            )
          )
        `)
        .eq('type', 'affiliate_commission')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const formattedSales = data.map(transaction => {
          const userVoucher = transaction.user_vouchers;
          const offer = userVoucher?.offers;
          return {
            product: offer?.title || "Produto",
            restaurant: offer?.companies?.name || "Estabelecimento",
            date: new Date(transaction.created_at).toLocaleString('pt-BR'),
            commission: `+R$ ${transaction.net_amount.toFixed(2)}`,
            status: transaction.status === 'completed' ? 'Confirmada' : 'Pendente'
          };
        });
        setRecentSales(formattedSales);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande", 
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update affiliate profile with new image URL
      const { error: updateError } = await supabase
        .from('affiliates')
        .update({ profile_image_url: publicUrl })
        .eq('email', user.email);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setUserData(prev => ({
        ...prev,
        profile_image_url: publicUrl
      }));

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível atualizar a foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleWithdrawRequest = () => {
    const now = new Date();
    const lastWithdrawalRequest = paymentsData[0];
    const nextAvailableDate = lastWithdrawalRequest
      ? new Date(new Date(lastWithdrawalRequest.created_at).getTime() + 15 * 24 * 60 * 60 * 1000)
      : now;

    if (now < nextAvailableDate) {
      toast({
        title: "Saque indisponível",
        description: `Próxima data disponível: ${nextAvailableDate.toLocaleDateString('pt-BR')}.`,
        variant: "destructive",
      });
      return;
    }

    const availableBalance = (affiliateData?.total_earnings || 0) - (affiliateData?.pending_earnings || 0);
    if (availableBalance <= 0) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo disponível para saque.",
        variant: "destructive",
      });
      return;
    }
    const savedPixKey = (userData as any)?.pix_key;
    const savedPixType = (userData as any)?.pix_key_type;
    if (!savedPixKey || !savedPixType) {
      toast({
        title: "Cadastre sua chave PIX",
        description: "Antes de solicitar um saque, cadastre sua chave PIX em Perfil.",
        variant: "destructive",
      });
      setActiveTab('profile');
      return;
    }
    setShowWithdrawDialog(true);
  };

  const submitWithdrawRequest = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para saque.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    const availableBalance = (affiliateData?.total_earnings || 0) - (affiliateData?.pending_earnings || 0);

    if (amount > availableBalance) {
      toast({
        title: "Saldo insuficiente",
        description: "O valor solicitado é maior que seu saldo disponível.",
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          user_type: 'affiliate',
          requested_by_email: user.email,
          requester_name: userData?.full_name || affiliateData?.full_name || 'Afiliado',
          amount: amount,
          payment_method: 'pix',
          payment_details: {
            account_type: 'pix',
            pix_key: (userData as any)?.pix_key || null,
            pix_key_type: (userData as any)?.pix_key_type || null,
            account_holder: userData?.full_name || affiliateData?.full_name || 'Afiliado'
          },
          status: 'pending'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de saque foi enviada e será processada em breve.",
      });

      setShowWithdrawDialog(false);
      setWithdrawAmount("");
      paymentsLoadedRef.current = false;
      fetchPaymentsData(); // Refresh payments data

    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      toast({
        title: "Erro na solicitação",
        description: "Não foi possível processar sua solicitação de saque.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do afiliado...</p>
          <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
        </div>
      </div>
    );
  }

  if (!user || !affiliateData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4 mb-8">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
              <AvatarImage
                src={userData?.profile_image_url || affiliateData?.profile_image_url}
                alt={userData?.full_name || affiliateData?.full_name || "Afiliado"}
              />
              <AvatarFallback className="text-lg font-bold">
                {(userData?.full_name || affiliateData?.full_name || "A").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Badge variant={affiliateData.status === 'active' ? 'default' : 'secondary'}>
              {affiliateData.status === 'active' ? 'Ativo' : 'Pendente'}
            </Badge>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                  Olá, {(userData?.full_name || affiliateData?.full_name || "Afiliado").trim().split(/\s+/)[0]}!
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono truncate">
                  Código: {affiliateData.affiliate_code}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AffiliateNotifications affiliateId={affiliateData.id} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut().then(() => navigate("/"))}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="establishments" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Estabelecimentos</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary transition-all duration-300">
                    R$ {(liveEarnings ?? affiliateData.total_earnings ?? 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {calculateGrowthPercentage()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary transition-all duration-300">
                    {liveConversions ?? affiliateData.total_conversions ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Taxa de conversão: {(() => {
                      const clicks = liveClicks ?? affiliateData.total_clicks ?? 0;
                      const conversions = liveConversions ?? affiliateData.total_conversions ?? 0;
                      return clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0';
                    })()}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cliques</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary transition-all duration-300">
                    {liveClicks ?? affiliateData.total_clicks ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este mês: {Math.round((liveClicks ?? affiliateData.total_clicks ?? 0) * 0.3)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuários Cadastrados</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary transition-all duration-300">
                    {referredUsers.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cadastros através do seu link
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ações Organizadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personalizar e Compartilhar Links */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Gerenciar Links de Indicação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Link Principal */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Seu Link de Indicação</Label>
                    <div className="flex gap-2">
                       <Input
                        value={customerReferralLink}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(customerReferralLink);
                          toast({
                            title: "Link copiado!",
                            description: "O link de afiliado foi copiado para a área de transferência.",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        const message = `🔥 *Bah Ofertas* - As melhores ofertas da Serra Gaúcha!\n\n✅ Descontos exclusivos em restaurantes, hotéis, spas e muito mais!\n💰 Economize até 70% em experiências incríveis!\n\n👉 Acesse agora: ${customerReferralLink}\n\n⏰ Ofertas por tempo limitado!`;
                        navigator.clipboard.writeText(message);
                        toast({
                          title: "Mensagem copiada!",
                          description: "Cole a mensagem no WhatsApp para compartilhar.",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar para WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                  <div ref={referralQrCodeRef} className="bg-white p-4 rounded-lg">
                    <QRCode
                      size={128}
                      value={customerReferralLink}
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleDownloadReferralQrCode}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar QR Code
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Establishments Tab */}
          <TabsContent value="establishments" className="space-y-6">
            <EstablishmentSelector
              affiliateId={affiliateData.id}
              commissionRate={affiliateData.commission_rate}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Performance Chart */}
            <Card className="overflow-hidden border-border/60 bg-gradient-to-b from-background to-muted/20">
              <CardHeader className="gap-4 pb-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Performance dos Últimos 30 Dias</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Acompanhe a evolução diária dos seus ganhos e cliques em qualquer tela.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 self-start md:min-w-[260px]">
                    <div className="rounded-md border border-border/60 bg-background/80 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ganhos</p>
                      <p className="text-lg font-semibold text-foreground">
                        R$ {(liveEarnings ?? affiliateData?.total_earnings ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-md border border-border/60 bg-background/80 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cliques</p>
                      <p className="text-lg font-semibold text-foreground">
                        {(liveClicks ?? affiliateData?.total_clicks ?? 0).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
                <div className="h-[280px] w-full sm:h-[320px] lg:h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={generateChartData()} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="affiliate-earnings-gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.6)" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={24}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="earnings"
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={(value) => `R$${Number(value).toFixed(0)}`}
                      />
                      <YAxis yAxisId="clicks" hide />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          backgroundColor: "hsl(var(--background))",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number, name: string) =>
                          name === "Ganhos"
                            ? [`R$ ${Number(value).toFixed(2)}`, name]
                            : [Number(value).toLocaleString("pt-BR"), name]
                        }
                        labelFormatter={(value) => `Dia ${value}`}
                      />
                      <Area
                        yAxisId="earnings"
                        type="monotone"
                        dataKey="ganhos"
                        fill="url(#affiliate-earnings-gradient)"
                        stroke="none"
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="earnings"
                        type="monotone"
                        dataKey="ganhos"
                        stroke="hsl(var(--primary))"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 5, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                        name="Ganhos"
                        isAnimationActive={false}
                      />
                      <Line
                        yAxisId="clicks"
                        type="monotone"
                        dataKey="cliques"
                        stroke="hsl(var(--accent-foreground))"
                        strokeWidth={2}
                        strokeDasharray="6 6"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--accent-foreground))" }}
                        name="Cliques"
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Referral Reports */}
            <Card>
              <CardHeader>
                <CardTitle>Relatórios de Indicações</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReports ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Carregando relatórios...</p>
                  </div>
                ) : referralData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Produto</th>
                          <th className="py-2 pr-4 font-medium">Data</th>
                          <th className="py-2 pr-4 font-medium">Horário</th>
                          <th className="py-2 pr-4 font-medium text-right">Valor da venda</th>
                          <th className="py-2 pr-4 font-medium text-right">Comissão</th>
                          <th className="py-2 font-medium text-center">Nível</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referralData.map((row: any) => {
                          const dt = row.created_at ? new Date(row.created_at) : null;
                          return (
                            <tr key={row.commission_id} className="border-b last:border-0">
                              <td className="py-3 pr-4">{row.product_title || 'Compra'}</td>
                              <td className="py-3 pr-4 whitespace-nowrap">{dt ? dt.toLocaleDateString('pt-BR') : '-'}</td>
                              <td className="py-3 pr-4 whitespace-nowrap">{dt ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className="py-3 pr-4 text-right whitespace-nowrap">R$ {Number(row.sale_amount || 0).toFixed(2)}</td>
                              <td className="py-3 pr-4 text-right whitespace-nowrap font-medium">R$ {Number(row.commission_amount || 0).toFixed(2)}</td>
                              <td className="py-3 text-center">
                                <Badge variant="outline">N{row.level}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma indicação encontrada ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            {/* Saldo e Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(() => {
                const now = new Date();
                const rawBalance = (affiliateData?.total_earnings || 0) - (affiliateData?.pending_earnings || 0);
                const availableBalance = rawBalance;
                const lastWithdrawalRequest = paymentsData[0];
                const nextAvailableDate = lastWithdrawalRequest
                  ? new Date(new Date(lastWithdrawalRequest.created_at).getTime() + 15 * 24 * 60 * 60 * 1000)
                  : now;
                const isAvailableToday = now >= nextAvailableDate;

                return (
                  <Card className={`border-2 ${isAvailableToday ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20' : 'border-red-500/40 bg-red-50/50 dark:bg-red-950/20'}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-sm ${isAvailableToday ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        Saldo Disponível
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold mb-2 ${isAvailableToday ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {availableBalance.toFixed(2)}
                      </div>
                      {isAvailableToday ? (
                        <>
                          <p className="text-xs text-green-600 dark:text-green-400 mb-4">
                            Disponível em {nextAvailableDate.toLocaleDateString('pt-BR')}
                          </p>
                          <Button 
                            className="w-full" 
                            onClick={() => handleWithdrawRequest()}
                            disabled={availableBalance <= 0}
                          >
                            Solicitar Saque
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {nextAvailableDate.toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Saldo Gerado na Plataforma</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    R$ {(affiliateData?.total_earnings || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total acumulado desde o início
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Saldo Pendente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    R$ {(affiliateData?.pending_earnings || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Em processamento
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Histórico de Saques */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Saques</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPayments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : paymentsData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Data da Solicitação</th>
                          <th className="text-left p-3">Valor</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-left p-3">Método</th>
                          <th className="text-left p-3">Processado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsData.map((withdrawal) => (
                          <tr key={withdrawal.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 text-sm">
                              {new Date(withdrawal.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3 text-sm font-medium text-green-600">
                              R$ {withdrawal.amount?.toFixed(2) || '0.00'}
                            </td>
                            <td className="p-3">
                              <Badge variant={
                                withdrawal.status === 'approved' ? 'default' : 
                                withdrawal.status === 'pending' ? 'secondary' : 
                                withdrawal.status === 'rejected' ? 'destructive' : 'outline'
                              }>
                                {withdrawal.status === 'approved' ? 'Aprovado' : 
                                 withdrawal.status === 'pending' ? 'Pendente' : 
                                 withdrawal.status === 'rejected' ? 'Rejeitado' : 'Processando'}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">
                              {withdrawal.payment_method?.toUpperCase() || 'PIX'}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {withdrawal.processed_at 
                                ? new Date(withdrawal.processed_at).toLocaleDateString('pt-BR')
                                : 'Aguardando'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma solicitação de saque encontrada</p>
                    <p className="text-sm">Suas solicitações aparecerão aqui quando você solicitar saques</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage 
                        src={userData?.profile_image_url || affiliateData?.profile_image_url} 
                        alt={userData?.full_name || affiliateData?.full_name || "Afiliado"}
                      />
                      <AvatarFallback className="text-xl font-bold">
                        {(userData?.full_name || affiliateData?.full_name || "A").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {userData?.full_name || affiliateData?.full_name || "Nome não informado"}
                    </h3>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <p className="text-sm">
                      <span className="font-medium">Código:</span> {affiliateData.affiliate_code}
                    </p>
                    <Badge variant={affiliateData.status === 'active' ? 'default' : 'secondary'}>
                      {affiliateData.status === 'active' ? 'Afiliado Ativo' : 'Afiliado Pendente'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Taxa de Comissão</Label>
                    <div className="text-2xl font-bold text-primary">
                      {affiliateData.commission_rate}%
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data de Cadastro</Label>
                    <div className="text-sm text-muted-foreground">
                      {(affiliateData as any)?.created_at 
                        ? new Date((affiliateData as any).created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : 'Data não disponível'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="text-sm">{user?.email}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status da Conta</Label>
                    <Badge variant={affiliateData.status === 'active' ? 'default' : 'secondary'}>
                      {affiliateData.status === 'active' ? 'Ativa' : 'Pendente de Aprovação'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PIX Key for withdrawals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Chave PIX para Saques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cadastre uma chave PIX para receber seus saques. Ela será utilizada automaticamente em todas as suas solicitações.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo da chave</Label>
                    <Select value={pixKeyType} onValueChange={setPixKeyType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem>
                        <SelectItem value="random">Chave aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Informe sua chave PIX"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSavePix} disabled={savingPix}>
                    {savingPix ? 'Salvando...' : 'Salvar chave PIX'}
                  </Button>
                </div>
              </CardContent>
            </Card>


            {/* Sub-Affiliate Referral Section */}
            {affiliateData?.can_refer_subaffiliate === false ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Indicar Sub-Afiliados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      A indicação de sub-afiliados está desativada para sua conta.
                    </p>
                    <p className="text-xs mt-1">
                      Entre em contato com o suporte para mais informações.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Indicar Sub-Afiliados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link2 className="h-4 w-4" />
                    <span>Compartilhe este link para indicar novos afiliados</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Você receberá <span className="font-bold text-primary">1% de comissão</span> sobre todos os ganhos dos afiliados cadastrados através do seu link.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Seu Link de Indicação de Sub-Afiliados</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={subAffiliateReferralLink}
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(subAffiliateReferralLink);
                        toast({
                          title: "Link copiado!",
                          description: "O link de indicação foi copiado para a área de transferência."
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Sub-Affiliate Stats */}
                {loadingSubAffiliates ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : subAffiliateData && subAffiliateData.total_sub_affiliates > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {subAffiliateData.total_sub_affiliates}
                      </div>
                      <p className="text-xs text-muted-foreground">Sub-Afiliados Ativos</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">
                        R$ {subAffiliateData.total_sub_affiliate_earnings.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Gerado por Sub-Afiliados</p>
                    </div>
                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        R$ {subAffiliateData.parent_commission_earned.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">Sua Comissão (1%)</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border-t pt-4">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Você ainda não possui sub-afiliados cadastrados</p>
                    <p className="text-xs">Compartilhe seu link para começar a ganhar!</p>
                  </div>
                )}

                {/* Sub-Affiliate List */}
                {subAffiliatesList.length > 0 && (
                  <div className="pt-4 border-t space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Meus Sub-Afiliados ({subAffiliatesList.length})
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {subAffiliatesList.map((sub) => {
                        const statusLabel = sub.status === 'pending'
                          ? 'Pendente'
                          : sub.is_active === false || sub.status === 'rejected' || sub.status === 'suspended'
                            ? 'Inativo'
                            : 'Ativo';
                        const statusVariant: 'default' | 'secondary' | 'destructive' =
                          statusLabel === 'Ativo' ? 'default' : statusLabel === 'Pendente' ? 'secondary' : 'destructive';
                        return (
                          <button
                            type="button"
                            key={sub.id}
                            onClick={() => setSelectedSubAffiliate(sub)}
                            className="w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={sub.profile_image_url || undefined} alt={sub.full_name || sub.email} />
                                <AvatarFallback className="text-xs">
                                  {(sub.full_name || sub.email).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm truncate">
                                    {sub.full_name || 'Sem nome'}
                                  </p>
                                  <Badge variant={statusVariant} className="text-[10px] px-1.5 py-0">
                                    {statusLabel}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                                {sub.phone && (
                                  <p className="text-[11px] text-muted-foreground truncate">📱 {sub.phone}</p>
                                )}
                                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                  {sub.affiliate_code} · desde {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex sm:flex-col sm:items-end gap-3 sm:gap-0 text-xs">
                              <div className="text-right">
                                <p className="font-semibold">
                                  R$ {Number(sub.total_earnings || 0).toFixed(2)}
                                </p>
                                <p className="text-muted-foreground">ganhos</p>
                              </div>
                              <div className="text-right sm:mt-1">
                                <p className="font-semibold">{sub.total_conversions || 0}</p>
                                <p className="text-muted-foreground">vendas</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </TabsContent>

          {/* Sub-Affiliate Detail Dialog */}
          <Dialog open={!!selectedSubAffiliate} onOpenChange={(open) => !open && setSelectedSubAffiliate(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Perfil do Sub-Afiliado</DialogTitle>
                <DialogDescription>Informações detalhadas do afiliado indicado por você.</DialogDescription>
              </DialogHeader>
              {selectedSubAffiliate && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedSubAffiliate.profile_image_url || undefined} alt={selectedSubAffiliate.full_name || selectedSubAffiliate.email} />
                      <AvatarFallback>
                        {(selectedSubAffiliate.full_name || selectedSubAffiliate.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{selectedSubAffiliate.full_name || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground truncate">{selectedSubAffiliate.email}</p>
                      <p className="text-xs font-mono text-muted-foreground">{selectedSubAffiliate.affiliate_code}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{selectedSubAffiliate.phone || '—'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">CPF</p>
                      <p className="font-medium">{selectedSubAffiliate.cpf || '—'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">Cadastrado em</p>
                      <p className="font-medium">{new Date(selectedSubAffiliate.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">Aprovado em</p>
                      <p className="font-medium">
                        {selectedSubAffiliate.approval_date
                          ? new Date(selectedSubAffiliate.approval_date).toLocaleDateString('pt-BR')
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-muted/40 text-center">
                      <p className="text-xs text-muted-foreground">Cliques</p>
                      <p className="font-semibold">{selectedSubAffiliate.total_clicks || 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 text-center">
                      <p className="text-xs text-muted-foreground">Vendas</p>
                      <p className="font-semibold">{selectedSubAffiliate.total_conversions || 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 text-center">
                      <p className="text-xs text-muted-foreground">Ganhos</p>
                      <p className="font-semibold">R$ {Number(selectedSubAffiliate.total_earnings || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Sub-afiliados deste sub (nível 3) */}
                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold mb-2">
                      Sub-afiliados de {selectedSubAffiliate.full_name?.split(' ')[0] || 'este afiliado'}
                      {!loadingNestedSubs && ` (${nestedSubs.length})`}
                    </p>
                    {loadingNestedSubs ? (
                      <p className="text-xs text-muted-foreground">Carregando...</p>
                    ) : nestedSubs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum sub-afiliado cadastrado.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {nestedSubs.map((ns) => (
                          <div key={ns.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-sm">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{ns.full_name || 'Sem nome'}</p>
                              <p className="text-xs text-muted-foreground truncate">{ns.email}</p>
                              <p className="text-[11px] font-mono text-muted-foreground">{ns.affiliate_code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-green-600">
                                R$ {Number(ns.total_earnings || 0).toFixed(2)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {ns.total_conversions || 0} vendas
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Withdraw Dialog */}
          <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Saque</DialogTitle>
                <DialogDescription>
                  Insira o valor que deseja sacar. O saque será processado em até 2 dias úteis.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Valor do Saque</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-sm text-muted-foreground">
                    Saldo disponível: R$ {((affiliateData?.total_earnings || 0) - (affiliateData?.pending_earnings || 0)).toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={submitWithdrawRequest} disabled={isWithdrawing}>
                    {isWithdrawing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processando...
                      </>
                    ) : (
                      'Solicitar Saque'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Tabs>
      </div>
    </div>
  );
};

export default AffiliatePanel;
