import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PromotionRequestDetailModal } from '@/components/admin/PromotionRequestDetailModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Users, Building2, UserCheck, DollarSign, ShoppingCart, Gift, AlertTriangle, LogOut, Shield, TrendingUp, Settings, Code, ChevronDown, ChevronUp, X, Image, CalendarIcon, Check, Ticket, Bell, Store, Hotel, UserPlus, ShieldCheck, CreditCard } from 'lucide-react';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { isLovableVisualEditIframe } from '@/lib/visual-edit-mode';

// Lazy-load admin tabs — each is a heavy module (often 700-1500+ LOC). Loading them on
// demand keeps the AdminDashboard chunk small and dramatically speeds up HMR for any
// edit inside this page or its tabs.
const UsersManagement = lazy(() => import('@/components/admin/UsersManagement').then(m => ({ default: m.UsersManagement })));
const PartnersManagement = lazy(() => import('@/components/admin/PartnersManagement').then(m => ({ default: m.PartnersManagement })));
const AffiliatesManagement = lazy(() => import('@/components/admin/AffiliatesManagement').then(m => ({ default: m.AffiliatesManagement })));
const FinancialReports = lazy(() => import('@/components/admin/FinancialReports').then(m => ({ default: m.FinancialReports })));
const PlatformSettings = lazy(() => import('@/components/admin/PlatformSettings').then(m => ({ default: m.PlatformSettings })));
const SecurityDashboard = lazy(() => import('@/components/admin/SecurityDashboard').then(m => ({ default: m.SecurityDashboard })));
const BannersManagement = lazy(() => import('@/components/admin/BannersManagement'));
const HeroSlidesManagement = lazy(() => import('@/components/admin/HeroSlidesManagement'));
const CouponsManagement = lazy(() => import('@/components/admin/CouponsManagement').then(m => ({ default: m.CouponsManagement })));
const NotificationsManagement = lazy(() => import('@/components/admin/NotificationsManagement').then(m => ({ default: m.NotificationsManagement })));
const DevManagement = lazy(() => import('@/components/admin/DevManagement'));
const NovaxsEstablishmentsManagement = lazy(() => import('@/components/admin/NovaxsEstablishmentsManagement').then(m => ({ default: m.NovaxsEstablishmentsManagement })));
const BahofertasEstablishmentsManagement = lazy(() => import('@/components/admin/BahofertasEstablishmentsManagement').then(m => ({ default: m.BahofertasEstablishmentsManagement })));
const TicketingManagement = lazy(() => import('@/components/admin/TicketingManagement').then(m => ({ default: m.TicketingManagement })));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const LazyTab = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<TabFallback />}>{children}</Suspense>
);
interface DashboardStats {
  totalUsers: number;
  totalPartners: number;
  activeAffiliates: number;
  monthlyRevenue: number;
  monthlyNetRevenue: number;
  monthlyAffiliateCommissions: number;
  totalTransactions: number;
  activeVouchers: number;
  activeOffers: number;
  pendingIssues: number;
  usersGrowthPct: number;
  partnersGrowthPct: number;
  affiliatesGrowthPct: number;
  monthlyRevenueGrowthPct: number;
}
type ActivityCategory = 'sales' | 'bookings' | 'signups' | 'admin';
type ActivityActorRole = 'client' | 'partner' | 'affiliate' | 'admin' | 'system';
interface RecentActivity {
  id: string;
  category: ActivityCategory;
  actorRole: ActivityActorRole;
  actorLabel?: string;
  type: 'partner' | 'offer' | 'affiliate' | 'transaction' | 'admin_action' | 'hotel_booking' | 'ticket_booking' | 'signup' | 'login';
  title: string;
  description: string;
  time: string;
  status: string;
  sortDate: string;
  rawData?: any;
}
interface PendingItem {
  id: string;
  type: 'company' | 'affiliate' | 'promotion' | 'withdrawal';
  title: string;
  description: string;
  created_at: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  companyName?: string;
  requesterEmail?: string;
}
const AdminDashboard = () => {
  const {
    user,
    session,
    loading,
    signOut
  } = useAdminAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const visualEditBypass = isLovableVisualEditIframe();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPartners: 0,
    activeAffiliates: 0,
    monthlyRevenue: 0,
    monthlyNetRevenue: 0,
    monthlyAffiliateCommissions: 0,
    totalTransactions: 0,
    activeVouchers: 0,
    activeOffers: 0,
    pendingIssues: 0,
    usersGrowthPct: 0,
    partnersGrowthPct: 0,
    affiliatesGrowthPct: 0,
    monthlyRevenueGrowthPct: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<RecentActivity | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [showPendingDetails, setShowPendingDetails] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<PendingItem & { notes?: string; companyName?: string; requesterEmail?: string } | null>(null);
  const [showPromotionDetail, setShowPromotionDetail] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<'all' | ActivityCategory>('all');
  const [activityRoleFilter, setActivityRoleFilter] = useState<'all' | ActivityActorRole>('all');
  const [chartDateFrom, setChartDateFrom] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [chartDateTo, setChartDateTo] = useState<Date>(new Date());
  useEffect(() => {
    if (visualEditBypass) return;
    if (!loading && !session) {
      navigate('/admin/login');
    }
  }, [session, loading, navigate, visualEditBypass]);
  useEffect(() => {
    if (session) {
      loadDashboardData();
      loadRevenueChartData(chartDateFrom, chartDateTo);

      // Debounced reload to avoid storm of refetches when realtime fires for many tables
      let reloadTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleReload = () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          loadDashboardData();
        }, 1500);
      };

      const channel = supabase
        .channel('admin-dashboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliates' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_vouchers' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'promotion_requests' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, scheduleReload)
        .subscribe();

      return () => {
        if (reloadTimer) clearTimeout(reloadTimer);
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  // Reload chart when date range changes
  useEffect(() => {
    if (session) {
      loadRevenueChartData(chartDateFrom, chartDateTo);
    }
  }, [chartDateFrom, chartDateTo, session]);

  // Generate chart data based on real transaction data grouped by day
  const loadRevenueChartData = async (from: Date, to: Date) => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .neq('type', 'affiliate_commission')
        .gte('created_at', startOfDay(from).toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true });

      // Build day-by-day map for the selected range
      const days = eachDayOfInterval({ start: startOfDay(from), end: startOfDay(to) });
      const dayMap: Record<string, { receita: number; transacoes: number }> = {};
      days.forEach(d => {
        const key = format(d, 'dd/MM');
        dayMap[key] = { receita: 0, transacoes: 0 };
      });

      transactions?.forEach((t) => {
        const key = format(new Date(t.created_at), 'dd/MM');
        if (dayMap[key]) {
          dayMap[key].receita += Number(t.amount) || 0;
          dayMap[key].transacoes += 1;
        }
      });

      const data = Object.entries(dayMap).map(([day, values]) => ({
        day,
        receita: Number(values.receita.toFixed(2)),
        transacoes: values.transacoes,
      }));

      setChartData(data);
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error);
    }
  };
  const loadDashboardData = async () => {
    try {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfThisMonthIso = startOfThisMonth.toISOString();
      const startOfLastMonthIso = startOfLastMonth.toISOString();

      // Helper: extrai valor de cada Promise.allSettled, retornando fallback se rejeitado
      const unwrap = <T,>(result: PromiseSettledResult<T>, fallback: T): T => {
        if (result.status === 'fulfilled') return result.value;
        console.warn('Admin Dashboard - Query falhou:', result.reason);
        return fallback;
      };

      // ÚNICA onda paralela com todas as queries do dashboard
      // Usamos allSettled para que uma RPC com falha (ex: RLS) não derrube as demais
      const settledResults = await Promise.allSettled([
        supabase.rpc('get_admin_total_users_count'),
        supabase.rpc('get_admin_total_companies_count'),
        supabase.rpc('get_admin_total_affiliates_count'),
        supabase.from('transactions').select('amount, created_at').eq('status', 'completed').neq('type', 'affiliate_commission').gte('created_at', startOfThisMonthIso),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'completed').neq('type', 'affiliate_commission'),
        supabase.from('user_vouchers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('offers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        Promise.all([
          supabase.rpc('get_company_admin_data_secure').then(result => ({
            data: result.data?.slice(0, 5).map(c => ({
              name: c.name,
              created_at: c.created_at,
              is_verified: c.is_verified,
              approval_status: c.approval_status,
            })) || [],
          })),
          supabase.from('offers').select('title, created_at, is_active, company_id').order('created_at', { ascending: false }).limit(5),
          supabase.from('affiliates').select('full_name, email, created_at, status, user_id').order('created_at', { ascending: false }).limit(5),
          supabase.from('transactions').select('amount, created_at, status, type, user_id, description').order('created_at', { ascending: false }).limit(8),
          supabase.from('audit_logs').select('id, action, entity_type, description, created_at, metadata, user_id').order('created_at', { ascending: false }).limit(15),
          supabase.from('etg_bookings').select('id, hotel_name, total_price, currency, status, created_at, user_id').order('created_at', { ascending: false }).limit(8),
          supabase.from('ticket_bookings').select('id, establishment_name, total_price, currency, status, created_at, user_id').order('created_at', { ascending: false }).limit(8),
          supabase.from('users').select('id, full_name, email, role_type, created_at').order('created_at', { ascending: false }).limit(8),
        ]),
        supabase.from('transactions').select('amount, created_at').eq('status', 'completed').neq('type', 'affiliate_commission').gte('created_at', startOfLastMonthIso).lt('created_at', startOfThisMonthIso),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', startOfThisMonthIso),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', startOfLastMonthIso).lt('created_at', startOfThisMonthIso),
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_verified', true).gte('created_at', startOfThisMonthIso),
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved').eq('is_verified', true).gte('created_at', startOfLastMonthIso).lt('created_at', startOfThisMonthIso),
        supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', startOfThisMonthIso),
        supabase.from('affiliates').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', startOfLastMonthIso).lt('created_at', startOfThisMonthIso),
        supabase.rpc('get_pending_companies_admin'),
        supabase.rpc('get_pending_affiliates_admin'),
        supabase.from('promotion_requests').select('id, company_name, requester_email, created_at, notes').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
        supabase.from('withdrawal_requests').select('id, amount, user_type, requester_name, requested_by_email, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
        supabase.from('transactions').select('amount').eq('status', 'completed').eq('type', 'affiliate_commission').gte('created_at', startOfThisMonthIso),
      ]);

      // Desestrutura tolerante a falhas individuais
      const emptyData = { data: null as any, count: 0 };
      const usersCount = unwrap(settledResults[0] as PromiseSettledResult<any>, emptyData);
      const companiesCount = unwrap(settledResults[1] as PromiseSettledResult<any>, emptyData);
      const affiliatesCount = unwrap(settledResults[2] as PromiseSettledResult<any>, emptyData);
      const transactionsData = unwrap(settledResults[3] as PromiseSettledResult<any>, emptyData);
      const totalTransactionsCount = unwrap(settledResults[4] as PromiseSettledResult<any>, emptyData);
      const vouchersCount = unwrap(settledResults[5] as PromiseSettledResult<any>, emptyData);
      const offersCount = unwrap(settledResults[6] as PromiseSettledResult<any>, emptyData);
      const recentActivity = unwrap(settledResults[7] as PromiseSettledResult<any>, [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }]);
      const lastMonthRevenue = unwrap(settledResults[8] as PromiseSettledResult<any>, emptyData);
      const usersThisMonth = unwrap(settledResults[9] as PromiseSettledResult<any>, emptyData);
      const usersLastMonth = unwrap(settledResults[10] as PromiseSettledResult<any>, emptyData);
      const partnersThisMonth = unwrap(settledResults[11] as PromiseSettledResult<any>, emptyData);
      const partnersLastMonth = unwrap(settledResults[12] as PromiseSettledResult<any>, emptyData);
      const affiliatesThisMonth = unwrap(settledResults[13] as PromiseSettledResult<any>, emptyData);
      const affiliatesLastMonth = unwrap(settledResults[14] as PromiseSettledResult<any>, emptyData);
      const pendingCompaniesDetailsRpc = unwrap(settledResults[15] as PromiseSettledResult<any>, { data: [], error: null });
      const pendingAffiliatesDetailsRpc = unwrap(settledResults[16] as PromiseSettledResult<any>, { data: [], error: null });
      const pendingPromotionsData = unwrap(settledResults[17] as PromiseSettledResult<any>, { data: [], error: null });
      const pendingWithdrawalsData = unwrap(settledResults[18] as PromiseSettledResult<any>, { data: [], error: null });
      const monthlyCommissionsData = unwrap(settledResults[19] as PromiseSettledResult<any>, emptyData);

      // Receita mensal
      const monthlyRevenue = transactionsData.data?.reduce((total: number, t: any) => total + (Number(t.amount) || 0), 0) || 0;
      const lastMonthRevenueAmount = lastMonthRevenue.data?.reduce((total: number, t: any) => total + (Number(t.amount) || 0), 0) || 0;
      const monthlyAffiliateCommissions = monthlyCommissionsData.data?.reduce((total: number, t: any) => total + (Number(t.amount) || 0), 0) || 0;
      const monthlyNetRevenue = monthlyRevenue - monthlyAffiliateCommissions;
      const monthlyRevenueGrowthPct = (() => {
        if (lastMonthRevenueAmount === 0) return monthlyRevenue > 0 ? 100 : 0;
        return (monthlyRevenue - lastMonthRevenueAmount) / lastMonthRevenueAmount * 100;
      })();

      const usersGrowthPct = (() => {
        const thisCount = usersThisMonth.count || 0;
        const lastCount = usersLastMonth.count || 0;
        if (lastCount === 0) return thisCount > 0 ? 100 : 0;
        return (thisCount - lastCount) / lastCount * 100;
      })();
      const partnersGrowthPct = (() => {
        const thisCount = partnersThisMonth.count || 0;
        const lastCount = partnersLastMonth.count || 0;
        if (lastCount === 0) return thisCount > 0 ? 100 : 0;
        return (thisCount - lastCount) / lastCount * 100;
      })();
      const affiliatesGrowthPct = (() => {
        const thisCount = affiliatesThisMonth.count || 0;
        const lastCount = affiliatesLastMonth.count || 0;
        if (lastCount === 0) return thisCount > 0 ? 100 : 0;
        return (thisCount - lastCount) / lastCount * 100;
      })();

      // Pendências - reusa os detalhes para contar (elimina 2 RPC duplicadas)
      const pendingCompaniesCount = pendingCompaniesDetailsRpc.data?.length || 0;
      const pendingAffiliatesCount = pendingAffiliatesDetailsRpc.data?.length || 0;
      const pendingPromotionsCount = pendingPromotionsData.data?.length || 0;
      const pendingWithdrawalsCount = pendingWithdrawalsData.data?.length || 0;
      const pendingIssues = pendingCompaniesCount + pendingAffiliatesCount + pendingPromotionsCount + pendingWithdrawalsCount;

      console.log('Admin Dashboard - Pendências encontradas:', {
        parceiros: pendingCompaniesCount,
        afiliados: pendingAffiliatesCount,
        promocoes: pendingPromotionsCount,
        saques: pendingWithdrawalsCount,
        total: pendingIssues,
      });

      // Set stats IMEDIATAMENTE para garantir que os cards renderizem,
      // mesmo se o processamento posterior (pendências, atividade recente) falhar.
      setStats({
        totalUsers: (usersCount.data as number) || 0,
        totalPartners: (companiesCount.data as number) || 0,
        activeAffiliates: (affiliatesCount.data as number) || 0,
        monthlyRevenue,
        monthlyNetRevenue,
        monthlyAffiliateCommissions,
        totalTransactions: totalTransactionsCount.count || 0,
        activeVouchers: vouchersCount.count || 0,
        activeOffers: offersCount.count || 0,
        pendingIssues,
        usersGrowthPct,
        partnersGrowthPct,
        affiliatesGrowthPct,
        monthlyRevenueGrowthPct,
      });

      // Processar itens pendentes para lista detalhada
      const pendingList: PendingItem[] = [];
      console.log('Admin Dashboard - Dados detalhados recebidos:', {
        parceiros: pendingCompaniesDetailsRpc.data?.length || 0,
        afiliados: pendingAffiliatesDetailsRpc.data?.length || 0,
        promocoes: pendingPromotionsData.data?.length || 0,
        saques: pendingWithdrawalsData.data?.length || 0,
        erros: {
          parceiros_error: pendingCompaniesDetailsRpc.error?.message,
          afiliados_error: pendingAffiliatesDetailsRpc.error?.message,
          promocoes_error: pendingPromotionsData.error?.message,
          saques_error: pendingWithdrawalsData.error?.message
        }
      });

      // (Removido) Clientes pendentes de verificação para evitar erros de RLS na tabela users

      // PARCEIROS PENDENTES DE APROVAÇÃO - PRIORIDADE ALTA
      pendingCompaniesDetailsRpc.data?.forEach(company => {
        pendingList.push({
          id: `company-${company.id}`,
          type: 'company',
          title: `🏢 Parceiro para Aprovação: ${company.name}`,
          description: `CNPJ: ${company.cnpj || 'Não informado'} - Status: ${company.approval_status || 'Pendente'} - Verificado: ${company.is_verified ? 'Sim' : 'Não'}`,
          created_at: company.created_at,
          priority: 'high'
        });
      });

      // AFILIADOS PENDENTES DE APROVAÇÃO - PRIORIDADE ALTA
      pendingAffiliatesDetailsRpc.data?.forEach(affiliate => {
        pendingList.push({
          id: `affiliate-${affiliate.id}`,
          type: 'affiliate',
          title: `👤 Afiliado para Aprovação: ${affiliate.full_name || 'Afiliado'}`,
          description: `Código: ${affiliate.affiliate_code} - Email: ${affiliate.email || 'N/A'} - Status: ${affiliate.status}`,
          created_at: affiliate.created_at,
          priority: 'high'
        });
      });

      // Promoções pendentes
      pendingPromotionsData.data?.forEach(promotion => {
        pendingList.push({
          id: `promotion-${promotion.id}`,
          type: 'promotion',
          title: `📢 Solicitação de Promoção: ${promotion.company_name}`,
          description: `Email: ${promotion.requester_email} - ${promotion.notes || 'Sem observações'}`,
          created_at: promotion.created_at,
          priority: 'medium',
          notes: promotion.notes || '',
          companyName: promotion.company_name,
          requesterEmail: promotion.requester_email,
        });
      });

      // SOLICITAÇÕES DE SAQUE PENDENTES - PRIORIDADE ALTA
      pendingWithdrawalsData.data?.forEach(withdrawal => {
        pendingList.push({
          id: `withdrawal-${withdrawal.id}`,
          type: 'withdrawal',
          title: `💰 Solicitação de Saque - ${withdrawal.user_type === 'affiliate' ? 'Afiliado' : 'Parceiro'}`,
          description: `${withdrawal.requester_name} (${withdrawal.requested_by_email}) - R$ ${Number(withdrawal.amount).toLocaleString('pt-BR', {
            minimumFractionDigits: 2
          })}`,
          created_at: withdrawal.created_at,
          priority: 'high'
        });
      });

      // Ordenar por prioridade e data
      pendingList.sort((a, b) => {
        const priorityOrder = {
          high: 3,
          medium: 2,
          low: 1
        };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      console.log('Admin Dashboard - Lista final de pendências:', pendingList);
      setPendingItems(pendingList);

      // Processar atividade recente — feed unificado de toda a plataforma
      try {
      const recentActivityData = recentActivity as any[];
      const [companies, offers, affiliates, transactions, auditLogs, hotelBookings, ticketBookings, newUsers] = recentActivityData;
      const activities: RecentActivity[] = [];

      const fmtBRL = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

      // Ações administrativas (audit_logs)
      (auditLogs?.data || []).forEach((log: any, index: number) => {
        const actionMap: Record<string, { title: string; status: string; category?: ActivityCategory }> = {
          'login': { title: '🔐 Login admin', status: 'Ativo' },
          'approve_partner': { title: '✅ Parceiro aprovado', status: 'Aprovado' },
          'reject_partner': { title: '❌ Parceiro rejeitado', status: 'Rejeitado' },
          'approve_affiliate': { title: '✅ Afiliado aprovado', status: 'Aprovado' },
          'reject_affiliate': { title: '❌ Afiliado rejeitado', status: 'Rejeitado' },
          'verify_partner': { title: '✅ Parceiro verificado', status: 'Aprovado' },
          'approve_withdrawal': { title: '💰 Saque aprovado', status: 'Aprovado' },
          'reject_withdrawal': { title: '💰 Saque rejeitado', status: 'Rejeitado' },
          'create_offer': { title: '📦 Oferta criada', status: 'Ativo' },
          'update_offer': { title: '📦 Oferta atualizada', status: 'Ativo' },
          'delete_offer': { title: '📦 Oferta removida', status: 'Removido' },
          'update_banner': { title: '🖼️ Banner atualizado', status: 'Ativo' },
          'update_settings': { title: '⚙️ Configuração alterada', status: 'Ativo' },
          'deactivate_user': { title: '🚫 Usuário desativado', status: 'Inativo' },
          'activate_user': { title: '✅ Usuário ativado', status: 'Ativo' },
          'user_full_deletion': { title: '🗑️ Usuário excluído', status: 'Removido' },
        };
        const mapped = actionMap[log.action] || { title: `Ação: ${log.action}`, status: 'Info' };
        activities.push({
          id: `audit-${log.id || index}`,
          category: 'admin',
          actorRole: 'admin',
          actorLabel: 'Administrador',
          type: 'admin_action',
          title: mapped.title,
          description: log.description || `${log.entity_type} - ${log.action}`,
          time: formatTimeAgo(log.created_at),
          status: mapped.status,
          sortDate: log.created_at,
        });
      });

      // Novos parceiros
      (companies?.data || []).forEach((company: any, index: number) => {
        activities.push({
          id: `company-${index}-${company.created_at}`,
          category: 'signups',
          actorRole: 'partner',
          actorLabel: company.name,
          type: 'partner',
          title: company.is_verified ? 'Parceiro verificado' : company.approval_status === 'approved' ? 'Parceiro aprovado' : 'Novo parceiro cadastrado',
          description: company.name,
          time: formatTimeAgo(company.created_at),
          status: company.is_verified ? 'Aprovado' : company.approval_status === 'approved' ? 'Aprovado' : 'Pendente',
          sortDate: company.created_at,
        });
      });

      // Ofertas (admin/partner publicaram)
      (offers?.data || []).forEach((offer: any, index: number) => {
        activities.push({
          id: `offer-${index}-${offer.created_at}`,
          category: 'admin',
          actorRole: 'partner',
          actorLabel: 'Parceiro',
          type: 'offer',
          title: offer.is_active ? 'Nova oferta ativa' : 'Oferta cadastrada',
          description: offer.title,
          time: formatTimeAgo(offer.created_at),
          status: offer.is_active ? 'Ativo' : 'Pendente',
          sortDate: offer.created_at,
        });
      });

      // Novos afiliados
      (affiliates?.data || []).forEach((affiliate: any, index: number) => {
        activities.push({
          id: `affiliate-${index}-${affiliate.created_at}`,
          category: 'signups',
          actorRole: 'affiliate',
          actorLabel: affiliate.full_name || affiliate.email || 'Afiliado',
          type: 'affiliate',
          title: affiliate.status === 'active' ? 'Afiliado aprovado' : 'Novo afiliado cadastrado',
          description: affiliate.full_name || affiliate.email || 'Afiliado se cadastrou na plataforma',
          time: formatTimeAgo(affiliate.created_at),
          status: affiliate.status === 'active' ? 'Ativo' : 'Pendente',
          sortDate: affiliate.created_at,
        });
      });

      // Transações (compras)
      (transactions?.data || []).forEach((t: any, index: number) => {
        activities.push({
          id: `transaction-${index}-${t.created_at}`,
          category: 'sales',
          actorRole: 'client',
          actorLabel: 'Cliente',
          type: 'transaction',
          title: t.type === 'purchase' ? 'Nova compra' : 'Transação processada',
          description: `${fmtBRL(t.amount)}${t.description ? ` · ${t.description}` : ''}`,
          time: formatTimeAgo(t.created_at),
          status: t.status === 'completed' ? 'Concluído' : t.status === 'failed' ? 'Rejeitado' : t.status === 'cancelled' ? 'Removido' : 'Processando',
          sortDate: t.created_at,
          rawData: t,
        });
      });

      // Reservas de hospedagem (ETG)
      (hotelBookings?.data || []).forEach((b: any, index: number) => {
        activities.push({
          id: `etg-${b.id || index}`,
          category: 'bookings',
          actorRole: 'client',
          actorLabel: 'Cliente',
          type: 'hotel_booking',
          title: '🏨 Reserva de hospedagem',
          description: `${b.hotel_name || 'Hotel'} · ${fmtBRL(b.total_price)}`,
          time: formatTimeAgo(b.created_at),
          status: b.status === 'completed' || b.status === 'confirmed' ? 'Concluído' : b.status === 'cancelled' ? 'Removido' : b.status === 'failed' ? 'Rejeitado' : 'Processando',
          sortDate: b.created_at,
          rawData: b,
        });
      });

      // Reservas de ingressos (NovaXS)
      (ticketBookings?.data || []).forEach((b: any, index: number) => {
        activities.push({
          id: `ticket-${b.id || index}`,
          category: 'bookings',
          actorRole: 'client',
          actorLabel: 'Cliente',
          type: 'ticket_booking',
          title: '🎟️ Compra de ingresso',
          description: `${b.establishment_name || 'Atração'} · ${fmtBRL(b.total_price)}`,
          time: formatTimeAgo(b.created_at),
          status: b.status === 'completed' || b.status === 'confirmed' ? 'Concluído' : b.status === 'cancelled' ? 'Removido' : b.status === 'failed' ? 'Rejeitado' : 'Processando',
          sortDate: b.created_at,
          rawData: b,
        });
      });

      // Novos cadastros de clientes
      (newUsers?.data || []).forEach((u: any, index: number) => {
        const role = (u.role_type as ActivityActorRole) || 'client';
        if (role === 'partner' || role === 'affiliate') return; // já cobertos acima
        activities.push({
          id: `user-${u.id || index}`,
          category: 'signups',
          actorRole: 'client',
          actorLabel: u.full_name || u.email || 'Novo usuário',
          type: 'signup',
          title: '👤 Novo cliente cadastrado',
          description: u.full_name ? `${u.full_name}${u.email ? ` · ${u.email}` : ''}` : (u.email || 'Cadastro realizado'),
          time: formatTimeAgo(u.created_at),
          status: 'Ativo',
          sortDate: u.created_at,
        });
      });

      // Ordenar e manter os 20 mais recentes
      activities.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
      setRecentActivity(activities.slice(0, 20));
      } catch (activityError) {
        console.error('Erro ao processar atividade recente (stats já foram aplicados):', activityError);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // NÃO zera os stats — mantém o último valor válido para evitar piscar 0
    }
  };

  // Função auxiliar para formatar tempo relativo
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };
  const handleApprovePartner = async (partnerId: string) => {
    try {
      // Extrai o UUID removendo o prefixo
      const actualId = partnerId.replace('company-', '');
      const { error } = await supabase.rpc('approve_partner' as any, {
        partner_id: actualId,
      } as any);
      if (error) throw error;

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        action: 'approve_partner',
        entity_type: 'company',
        entity_id: actualId,
        description: 'Parceiro aprovado pelo admin',
      });

      // Remove o item da lista local imediatamente
      setPendingItems((prevItems) => prevItems.filter((item) => item.id !== partnerId));

      // Atualiza as estatísticas
      setStats((prevStats) => ({
        ...prevStats,
        pendingIssues: Math.max(0, prevStats.pendingIssues - 1),
      }));
      toast({
        title: 'Parceiro aprovado',
        description: 'O parceiro foi aprovado com sucesso!',
      });
    } catch (error: any) {
      console.error('Error approving partner (rpc):', error);
      // Fallback: tenta atualização direta caso o RPC esteja bloqueado por permissões
      try {
        const actualId = partnerId.replace('company-', '');
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            is_verified: true,
            approval_status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', actualId);

        if (updateError) throw updateError;

        setPendingItems((prevItems) => prevItems.filter((item) => item.id !== partnerId));
        setStats((prevStats) => ({
          ...prevStats,
          pendingIssues: Math.max(0, prevStats.pendingIssues - 1),
        }));
        toast({
          title: 'Parceiro aprovado',
          description: 'Aprovação concluída com atualização direta.',
        });
      } catch (fallbackErr: any) {
        console.error('Fallback approve partner failed:', fallbackErr);
        toast({
          title: 'Erro',
          description: `Erro ao aprovar parceiro: ${fallbackErr?.message || error?.message || 'Tente novamente.'}`,
          variant: 'destructive',
        });
      }
    }
  };
  const handleRejectPartner = async (partnerId: string) => {
    try {
      // Extract the actual UUID by removing the prefix
      const actualId = partnerId.replace('company-', '');
      const { error } = await supabase.rpc('reject_partner', {
        partner_id: actualId,
        rejection_reason: "Rejeitado pelo administrador"
      });
      if (error) throw error;

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        action: 'reject_partner',
        entity_type: 'company',
        entity_id: actualId,
        description: 'Parceiro rejeitado pelo admin',
      });

      // Remove o item da lista local imediatamente
      setPendingItems(prevItems => prevItems.filter(item => item.id !== partnerId));

      // Atualiza as estatísticas
      setStats(prevStats => ({
        ...prevStats,
        pendingIssues: Math.max(0, prevStats.pendingIssues - 1)
      }));
      toast({
        title: "Parceiro rejeitado",
        description: "O parceiro foi rejeitado com sucesso!"
      });
    } catch (error: any) {
      console.error('Error rejecting partner (rpc):', error);
      // Fallback: tenta atualização direta caso o RPC esteja bloqueado por permissões
      try {
        const actualId = partnerId.replace('company-', '');
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            approval_status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', actualId);

        if (updateError) throw updateError;

        setPendingItems(prevItems => prevItems.filter(item => item.id !== partnerId));
        setStats(prevStats => ({
          ...prevStats,
          pendingIssues: Math.max(0, prevStats.pendingIssues - 1),
        }));
        toast({
          title: 'Parceiro rejeitado',
          description: 'Rejeição concluída com atualização direta.',
        });
      } catch (fallbackErr: any) {
        console.error('Fallback reject partner failed:', fallbackErr);
        toast({
          title: 'Erro',
          description: `Erro ao rejeitar parceiro: ${fallbackErr?.message || error?.message || 'Tente novamente.'}`,
          variant: 'destructive',
        });
      }
    }
  };
  const handleApproveAffiliate = async (affiliateId: string) => {
    try {
      // Extrai o UUID removendo o prefixo
      const actualId = affiliateId.replace('affiliate-', '');
      const { error } = await supabase.rpc('approve_affiliate' as any, {
        affiliate_id: actualId,
      } as any);
      if (error) throw error;

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        action: 'approve_affiliate',
        entity_type: 'affiliate',
        entity_id: actualId,
        description: 'Afiliado aprovado pelo admin',
      });

      // Remove o item da lista local imediatamente
      setPendingItems((prevItems) => prevItems.filter((item) => item.id !== affiliateId));

      // Atualiza as estatísticas
      setStats((prevStats) => ({
        ...prevStats,
        pendingIssues: Math.max(0, prevStats.pendingIssues - 1),
      }));
      toast({
        title: 'Afiliado aprovado',
        description: 'O afiliado foi aprovado com sucesso!',
      });
    } catch (error: any) {
      console.error('Error approving affiliate (rpc):', error);
      // Fallback: tenta atualização direta caso o RPC esteja bloqueado por permissões
      try {
        const actualId = affiliateId.replace('affiliate-', '');
        const { error: updateError } = await supabase
          .from('affiliates')
          .update({
            status: 'active',
            approval_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', actualId);

        if (updateError) throw updateError;

        setPendingItems((prevItems) => prevItems.filter((item) => item.id !== affiliateId));
        setStats((prevStats) => ({
          ...prevStats,
          pendingIssues: Math.max(0, prevStats.pendingIssues - 1),
        }));
        toast({
          title: 'Afiliado aprovado',
          description: 'Aprovação concluída com atualização direta.',
        });
      } catch (fallbackErr: any) {
        console.error('Fallback approve affiliate failed:', fallbackErr);
        toast({
          title: 'Erro',
          description: `Erro ao aprovar afiliado: ${fallbackErr?.message || error?.message || 'Tente novamente.'}`,
          variant: 'destructive',
        });
      }
    }
  };
  const handleRejectAffiliate = async (affiliateId: string) => {
    try {
      // Extract the actual UUID by removing the prefix
      const actualId = affiliateId.replace('affiliate-', '');
      const { error } = await supabase.rpc('reject_affiliate', {
        affiliate_id: actualId,
        rejection_reason: "Rejeitado pelo administrador"
      });
      if (error) throw error;

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        action: 'reject_affiliate',
        entity_type: 'affiliate',
        entity_id: actualId,
        description: 'Afiliado rejeitado pelo admin',
      });

      // Remove o item da lista local imediatamente
      setPendingItems(prevItems => prevItems.filter(item => item.id !== affiliateId));

      // Atualiza as estatísticas
      setStats(prevStats => ({
        ...prevStats,
        pendingIssues: Math.max(0, prevStats.pendingIssues - 1)
      }));
      toast({
        title: "Afiliado rejeitado",
        description: "O afiliado foi rejeitado com sucesso!"
      });
    } catch (error: any) {
      console.error('Error rejecting affiliate (rpc):', error);
      // Fallback: tenta atualização direta caso o RPC esteja bloqueado por permissões
      try {
        const actualId = affiliateId.replace('affiliate-', '');
        const { error: updateError } = await supabase
          .from('affiliates')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', actualId);

        if (updateError) throw updateError;

        setPendingItems(prevItems => prevItems.filter(item => item.id !== affiliateId));
        setStats(prevStats => ({
          ...prevStats,
          pendingIssues: Math.max(0, prevStats.pendingIssues - 1),
        }));
        toast({
          title: 'Afiliado rejeitado',
          description: 'Rejeição concluída com atualização direta.',
        });
      } catch (fallbackErr: any) {
        console.error('Fallback reject affiliate failed:', fallbackErr);
        toast({
          title: 'Erro',
          description: `Erro ao rejeitar afiliado: ${fallbackErr?.message || error?.message || 'Tente novamente.'}`,
          variant: 'destructive',
        });
      }
    }
  };
  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      // Extract the actual UUID by removing the prefix
      const actualId = withdrawalId.replace('withdrawal-', '');
      const {
        error
      } = await supabase.rpc('approve_withdrawal_request' as any, {
        request_id: actualId,
        admin_notes: "Aprovado pelo administrador"
      } as any);
      if (error) throw error;

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        action: 'approve_withdrawal',
        entity_type: 'withdrawal',
        entity_id: actualId,
        description: 'Solicitação de saque aprovada pelo admin',
      });

      // Remove o item da lista local imediatamente
      setPendingItems(prevItems => prevItems.filter(item => item.id !== withdrawalId));

      // Atualiza as estatísticas
      setStats(prevStats => ({
        ...prevStats,
        pendingIssues: Math.max(0, prevStats.pendingIssues - 1)
      }));
      toast({
        title: "Saque aprovado",
        description: "A solicitação de saque foi aprovada com sucesso!"
      });
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar saque. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      // Extract the actual UUID by removing the prefix
      const actualId = withdrawalId.replace('withdrawal-', '');
      const {
        error
      } = await supabase.rpc('reject_withdrawal_request', {
        request_id: actualId,
        rejection_reason: "Rejeitado pelo administrador"
      });
      if (error) throw error;

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        action: 'reject_withdrawal',
        entity_type: 'withdrawal',
        entity_id: actualId,
        description: 'Solicitação de saque rejeitada pelo admin',
      });

      // Remove o item da lista local imediatamente
      setPendingItems(prevItems => prevItems.filter(item => item.id !== withdrawalId));

      // Atualiza as estatísticas
      setStats(prevStats => ({
        ...prevStats,
        pendingIssues: Math.max(0, prevStats.pendingIssues - 1)
      }));
      toast({
        title: "Saque rejeitado",
        description: "A solicitação de saque foi rejeitada com sucesso!"
      });
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: "Erro",
        description: "Erro ao rejeitar saque. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const handleApprovePromotion = async (promotionId: string) => {
    try {
      const actualId = promotionId.replace('promotion-', '');
      const { error } = await supabase
        .from('promotion_requests')
        .update({ status: 'approved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', actualId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action: 'approve_promotion_request',
        entity_type: 'promotion_request',
        entity_id: actualId,
        description: 'Solicitação de promoção aprovada pelo admin',
      });

      setPendingItems(prev => prev.filter(item => item.id !== promotionId));
      setStats(prev => ({ ...prev, pendingIssues: Math.max(0, prev.pendingIssues - 1) }));
      toast({ title: 'Promoção aprovada', description: 'A solicitação de promoção foi aprovada!' });
    } catch (error: any) {
      console.error('Error approving promotion:', error);
      toast({ title: 'Erro', description: 'Erro ao aprovar promoção.', variant: 'destructive' });
    }
  };
  const handleRejectPromotion = async (promotionId: string) => {
    try {
      const actualId = promotionId.replace('promotion-', '');
      const { error } = await supabase
        .from('promotion_requests')
        .update({ status: 'rejected', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', actualId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action: 'reject_promotion_request',
        entity_type: 'promotion_request',
        entity_id: actualId,
        description: 'Solicitação de promoção recusada pelo admin',
      });

      setPendingItems(prev => prev.filter(item => item.id !== promotionId));
      setStats(prev => ({ ...prev, pendingIssues: Math.max(0, prev.pendingIssues - 1) }));
      toast({ title: 'Promoção recusada', description: 'A solicitação de promoção foi recusada.' });
    } catch (error: any) {
      console.error('Error rejecting promotion:', error);
      toast({ title: 'Erro', description: 'Erro ao recusar promoção.', variant: 'destructive' });
    }
  };
  const handleViewPromotionDetails = (item: PendingItem) => {
    setSelectedPromotion(item);
    setShowPromotionDetail(true);
  };
  const handleLogout = async () => {
    try {
      await signOut();

      // Clear ALL localStorage data to ensure clean state
      localStorage.clear();

      // Clear any session storage as well
      sessionStorage.clear();

      // Force navigation to admin login page
      navigate('/admin/login', {
        replace: true
      });

      // Force page reload to ensure complete state reset
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Logout failed:', error);

      // Still clear storage and navigate even if logout fails
      localStorage.clear();
      sessionStorage.clear();
      navigate('/admin/login', {
        replace: true
      });
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };
  if (loading && !visualEditBypass) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p>Carregando...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background to-secondary/5">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg text-foreground truncate">Painel Administrativo</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">BahOfertas - Controle Total</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Dados em tempo real</span>
            </div>
            <Button onClick={() => setShowPendingDetails(!showPendingDetails)} variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{stats.pendingIssues} pendências</span>
              {showPendingDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            <Button onClick={() => setShowPendingDetails(!showPendingDetails)} variant="ghost" size="sm" className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors p-0">
              <span className="text-xs font-bold">{stats.pendingIssues}</span>
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="px-2 sm:px-3">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Expandable Pending Details */}
      {showPendingDetails && <div className="bg-card/95 backdrop-blur-sm border-b border-border/50 shadow-sm animate-fade-in">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Pendências Detalhadas</h3>
              <Button onClick={() => setShowPendingDetails(false)} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-1 sm:p-2">
                <X className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Fechar</span>
              </Button>
            </div>
            {/* Resumo das Pendências */}
            

            <div className="grid gap-2 sm:gap-3 max-h-60 sm:max-h-80 overflow-y-auto">
              {pendingItems.length > 0 ? pendingItems.map(item => <div key={item.id} className={`p-3 rounded-lg border-l-4 bg-card hover:shadow-md transition-all ${item.priority === 'high' ? 'border-l-red-500 bg-red-50/30' : item.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50/30' : 'border-l-blue-500 bg-blue-50/30'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                         <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
                           <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.type === 'company' ? 'bg-purple-100 text-purple-800' : item.type === 'affiliate' ? 'bg-blue-100 text-blue-800' : item.type === 'promotion' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                             {item.type === 'company' ? 'Parceiro' : item.type === 'affiliate' ? 'Afiliado' : item.type === 'promotion' ? 'Promoção' : 'Saque'}
                           </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.priority === 'high' ? 'bg-red-100 text-red-800' : item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                        </div>
                        <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                       <div className="flex gap-2 ml-3">
                         {item.type === 'company' ? <>
                             <Button size="sm" variant="default" className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprovePartner(item.id)}>
                               Aprovar
                             </Button>
                             <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleRejectPartner(item.id)}>
                               Rejeitar
                             </Button>
                           </> : item.type === 'affiliate' ? <>
                             <Button size="sm" variant="default" className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveAffiliate(item.id)}>
                               Aprovar
                             </Button>
                             <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleRejectAffiliate(item.id)}>
                               Rejeitar
                             </Button>
                           </> : item.type === 'withdrawal' ? <>
                             <Button size="sm" variant="default" className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproveWithdrawal(item.id)}>
                               Aprovar
                             </Button>
                             <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleRejectWithdrawal(item.id)}>
                               Rejeitar
                             </Button>
                            </> : <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => handleViewPromotionDetails(item)}>
                                Ver Detalhes
                              </Button>
                              <Button size="sm" variant="default" className="text-xs bg-green-600 hover:bg-green-700 text-white p-2" onClick={() => handleApprovePromotion(item.id)} title="Aprovar">
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="destructive" className="text-xs p-2" onClick={() => handleRejectPromotion(item.id)} title="Recusar">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>}
                       </div>
                    </div>
                  </div>) : <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma pendência encontrada</p>
                </div>}
            </div>
          </div>
        </div>}

      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
        <Tabs defaultValue="overview" className="space-y-3 sm:space-y-6">
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <TabsList className="grid w-max min-w-full grid-cols-7 sm:grid-cols-14 gap-0.5 sm:gap-1 h-auto p-1 bg-muted/50">
              <TabsTrigger value="overview" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BarChart3 className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Geral</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Users className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="partners" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Building2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Parceiros</span>
              </TabsTrigger>
              <TabsTrigger value="affiliates" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <UserCheck className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Afiliados</span>
              </TabsTrigger>
              <TabsTrigger value="establishments" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Store className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Estabelecimentos</span>
              </TabsTrigger>
              <TabsTrigger value="banners" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Image className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Banners</span>
              </TabsTrigger>
              <TabsTrigger value="ticketing" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Ticket className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Bilheteria</span>
              </TabsTrigger>
              <TabsTrigger value="coupons" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Ticket className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Cupons</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <DollarSign className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Finanças</span>
              </TabsTrigger>
              <TabsTrigger value="dev" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Code className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Dev</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Settings className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Config</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Bell className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Notificações</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex flex-col xs:flex-row items-center gap-0.5 xs:gap-1 text-xs sm:text-sm px-1.5 xs:px-2 sm:px-3 py-1.5 xs:py-2 sm:py-2.5 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Shield className="w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0" />
                <span className="hidden xs:inline truncate text-xs xs:text-sm">Segurança</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <div className="space-y-3 sm:space-y-6">
              {/* Title */}
              <div className="text-center sm:text-left px-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">Visão Geral da Plataforma</h2>
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Acompanhe as principais métricas e atividades do BahOfertas</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                <Card className="border-border/50 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Clientes, Parceiros e Afiliados</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Parceiros</CardTitle>
                    <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold">{stats.totalPartners}</div>
                    <p className={`text-xs ${stats.partnersGrowthPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{`${stats.partnersGrowthPct >= 0 ? '+' : ''}${Math.round(stats.partnersGrowthPct)}% este mês`}</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Afiliados Ativos</CardTitle>
                    <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold">{stats.activeAffiliates}</div>
                    <p className={`text-xs ${stats.affiliatesGrowthPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{`${stats.affiliatesGrowthPct >= 0 ? '+' : ''}${Math.round(stats.affiliatesGrowthPct)}% este mês`}</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50 hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Receita Mensal</CardTitle>
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-base sm:text-2xl font-bold text-green-600 leading-tight">
                      R$ {stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Líquido: <span className="font-semibold text-foreground">R$ {stats.monthlyNetRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      (-R$ {stats.monthlyAffiliateCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} comissões)
                    </p>
                    
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Transações</CardTitle>
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Vouchers Ativos</CardTitle>
                    <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold">{stats.activeVouchers.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Ofertas Ativas</CardTitle>
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold">{stats.activeOffers.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pendências</CardTitle>
                    <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.pendingIssues}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                {/* Revenue Chart Placeholder */}
                <Card className="border-border/50 order-2 lg:order-1">
                  <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm sm:text-base lg:text-lg">Receita por Período</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Evolução da receita diária e transações</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs h-8", !chartDateFrom && "text-muted-foreground")}>
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {format(chartDateFrom, "dd/MM/yyyy")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={chartDateFrom} onSelect={(d) => d && setChartDateFrom(d)} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                        <span className="text-xs text-muted-foreground">até</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal text-xs h-8", !chartDateTo && "text-muted-foreground")}>
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {format(chartDateTo, "dd/MM/yyyy")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar mode="single" selected={chartDateTo} onSelect={(d) => d && setChartDateTo(d)} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="h-32 sm:h-48 lg:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.length > 0 ? chartData : [{ day: '-', receita: 0, transacoes: 0 }]}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} className="text-xs" tickFormatter={value => `R$ ${value.toFixed(0)}`} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} className="text-xs" tickFormatter={value => `${Math.round(value)}`} />
                          <Tooltip content={({
                          active,
                          payload,
                          label
                        }) => {
                          if (active && payload && payload.length) {
                            return <div className="bg-card border rounded-lg p-3 shadow-lg">
                                    <p className="font-medium mb-2">{`Dia ${label}`}</p>
                                    {payload.map((entry, index) => <p key={index} className="text-sm" style={{
                                color: entry.color
                              }}>
                                        {entry.name === 'Transações' ? `${entry.name}: ${Math.round(entry.value as number)}` : `${entry.name}: R$ ${typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}`}
                                      </p>)}
                                  </div>;
                          }
                          return null;
                        }} />
                          <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={3} dot={{
                          fill: "hsl(var(--primary))",
                          strokeWidth: 2,
                          r: 4
                        }} name="Receita" yAxisId="left" />
                          <Line type="monotone" dataKey="transacoes" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{
                          fill: "hsl(var(--chart-2))",
                          strokeWidth: 2,
                          r: 3
                        }} name="Transações" yAxisId="right" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="border-border/50 order-1 lg:order-2">
                  <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 space-y-3">
                    <div>
                      <CardTitle className="text-sm sm:text-base lg:text-lg">Atividade da Plataforma</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Eventos de clientes, parceiros, afiliados e admin</CardDescription>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { key: 'all', label: 'Tudo' },
                          { key: 'sales', label: '💳 Vendas' },
                          { key: 'bookings', label: '🏨 Reservas' },
                          { key: 'signups', label: '👤 Cadastros' },
                          { key: 'admin', label: '🛡️ Admin' },
                        ] as const).map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setActivityCategoryFilter(opt.key as any)}
                            className={`text-[11px] sm:text-xs px-2 py-1 rounded-full border transition-colors ${
                              activityCategoryFilter === opt.key
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { key: 'all', label: 'Todos os papéis' },
                          { key: 'client', label: 'Cliente' },
                          { key: 'partner', label: 'Parceiro' },
                          { key: 'affiliate', label: 'Afiliado' },
                          { key: 'admin', label: 'Admin' },
                        ] as const).map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setActivityRoleFilter(opt.key as any)}
                            className={`text-[11px] sm:text-xs px-2 py-1 rounded-full border transition-colors ${
                              activityRoleFilter === opt.key
                                ? 'bg-secondary text-secondary-foreground border-secondary'
                                : 'bg-background text-muted-foreground border-border hover:bg-muted'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="space-y-2 sm:space-y-3 max-h-72 sm:max-h-96 lg:max-h-[28rem] overflow-y-auto pr-1">
                      {(() => {
                        const filtered = recentActivity.filter(a => {
                          if (activityCategoryFilter !== 'all' && a.category !== activityCategoryFilter) return false;
                          if (activityRoleFilter !== 'all' && a.actorRole !== activityRoleFilter) return false;
                          return true;
                        });

                        const categoryStyles: Record<ActivityCategory, { bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }> = {
                          sales: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', Icon: CreditCard },
                          bookings: { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', Icon: Hotel },
                          signups: { bg: 'bg-violet-100 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', Icon: UserPlus },
                          admin: { bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', Icon: ShieldCheck },
                        };

                        const statusBadge = (status: string) => {
                          const map: Record<string, string> = {
                            'Pendente': 'bg-yellow-100 text-yellow-800',
                            'Aprovado': 'bg-green-100 text-green-800',
                            'Ativo': 'bg-blue-100 text-blue-800',
                            'Rejeitado': 'bg-red-100 text-red-800',
                            'Removido': 'bg-red-50 text-red-700',
                            'Inativo': 'bg-orange-100 text-orange-800',
                            'Concluído': 'bg-emerald-100 text-emerald-800',
                            'Processando': 'bg-purple-100 text-purple-800',
                          };
                          return map[status] || 'bg-gray-100 text-gray-800';
                        };

                        const roleBadge: Record<ActivityActorRole, string> = {
                          client: 'Cliente',
                          partner: 'Parceiro',
                          affiliate: 'Afiliado',
                          admin: 'Admin',
                          system: 'Sistema',
                        };

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <div className="text-xs sm:text-sm">Nenhuma atividade encontrada para o filtro selecionado</div>
                            </div>
                          );
                        }

                        return filtered.map((activity, index) => {
                          const cat = categoryStyles[activity.category];
                          const Icon = cat.Icon;
                          const isPurchase = !!activity.rawData && (activity.type === 'transaction' || activity.type === 'hotel_booking' || activity.type === 'ticket_booking');
                          return (
                            <div
                              key={activity.id}
                              role={isPurchase ? 'button' : undefined}
                              tabIndex={isPurchase ? 0 : undefined}
                              onClick={isPurchase ? () => setSelectedPurchase(activity) : undefined}
                              onKeyDown={isPurchase ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPurchase(activity); } } : undefined}
                              className={`flex items-start gap-2.5 sm:gap-3 pb-2 sm:pb-3 ${index < filtered.length - 1 ? 'border-b border-border/30' : ''} ${isPurchase ? 'cursor-pointer hover:bg-muted/50 rounded-md -mx-1 px-1 transition-colors' : ''}`}
                            >
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cat.bg} ${cat.text}`}>
                                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-medium text-xs sm:text-sm text-foreground line-clamp-1">{activity.title}</p>
                                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge(activity.status)}`}>
                                    {activity.status}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{activity.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">{activity.time}</span>
                                  <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {roleBadge[activity.actorRole]}
                                  </span>
                                  {isPurchase && (
                                    <span className="text-[10px] sm:text-xs text-primary ml-auto">Ver detalhes →</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Management Sections */}
          <TabsContent value="users">
            <LazyTab><UsersManagement /></LazyTab>
          </TabsContent>

          <TabsContent value="partners">
            <LazyTab><PartnersManagement /></LazyTab>
          </TabsContent>

          <TabsContent value="affiliates">
            <LazyTab><AffiliatesManagement /></LazyTab>
          </TabsContent>


          <TabsContent value="establishments" className="space-y-4">
            <LazyTab><NovaxsEstablishmentsManagement /></LazyTab>
            <LazyTab><BahofertasEstablishmentsManagement /></LazyTab>
          </TabsContent>

          <TabsContent value="banners" className="space-y-8">
            <LazyTab><HeroSlidesManagement /></LazyTab>
            <LazyTab><BannersManagement /></LazyTab>
          </TabsContent>

          <TabsContent value="ticketing">
            <LazyTab><TicketingManagement /></LazyTab>
          </TabsContent>

          <TabsContent value="coupons">
            <LazyTab><CouponsManagement /></LazyTab>
          </TabsContent>

          <TabsContent value="financial">
            <LazyTab><FinancialReports /></LazyTab>
          </TabsContent>

          <TabsContent value="dev">
            <LazyTab><DevManagement /></LazyTab>
          </TabsContent>

          <TabsContent value="config">
            <LazyTab><PlatformSettings /></LazyTab>
          </TabsContent>

          <TabsContent value="notifications">
            <LazyTab><NotificationsManagement /></LazyTab>
          </TabsContent>

          <TabsContent value="security">
            <LazyTab><SecurityDashboard /></LazyTab>
          </TabsContent>
        </Tabs>
      </div>

      <PromotionRequestDetailModal
        isOpen={showPromotionDetail}
        onClose={() => setShowPromotionDetail(false)}
        item={selectedPromotion}
        onApprove={handleApprovePromotion}
        onReject={handleRejectPromotion}
      />

      <Dialog open={!!selectedPurchase} onOpenChange={(open) => !open && setSelectedPurchase(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPurchase?.title || 'Detalhes da compra'}</DialogTitle>
            <DialogDescription>{selectedPurchase?.description}</DialogDescription>
          </DialogHeader>
          {selectedPurchase?.rawData && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(selectedPurchase.rawData)
                  .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
                  .map(([k, v]) => (
                    <div key={k} className="flex flex-col p-2 rounded-md border border-border/40 bg-muted/30">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</span>
                      <span className="break-all text-foreground">{String(v)}</span>
                    </div>
                  ))}
              </div>
              {Object.entries(selectedPurchase.rawData).some(([, v]) => v && typeof v === 'object') && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Dados adicionais</p>
                  <pre className="text-xs bg-muted/40 p-3 rounded-md overflow-auto max-h-64 border border-border/40">
{JSON.stringify(
  Object.fromEntries(Object.entries(selectedPurchase.rawData).filter(([, v]) => v && typeof v === 'object')),
  null,
  2
)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>;
};
export default AdminDashboard;