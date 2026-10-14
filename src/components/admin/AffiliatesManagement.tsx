import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck, Users, DollarSign, TrendingUp, Search, Eye, ExternalLink, Phone, Mail, Calendar, MapPin, Building2, GitBranch, Pencil, Trash2 } from 'lucide-react';

interface AffiliateStats {
  total: number;
  active: number;
  pending: number;
  totalCommissions: number;
  totalConversions: number;
}

interface Affiliate {
  id: string;
  full_name: string | null;
  email: string | null;
  affiliate_code: string;
  status: string;
  commission_rate: number;
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;
  created_at: string;
  parent_affiliate_id: string | null;
  can_refer_subaffiliate?: boolean | null;
}

interface AffiliateEstablishment {
  id: string;
  company_id: string;
  company_name: string;
  company_trade_name: string | null;
  company_logo_url: string | null;
}

export const AffiliatesManagement = () => {
  const [stats, setStats] = useState<AffiliateStats>({
    total: 0,
    active: 0,
    pending: 0,
    totalCommissions: 0,
    totalConversions: 0
  });
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [affiliateEstablishments, setAffiliateEstablishments] = useState<AffiliateEstablishment[]>([]);
  const [loadingEstablishments, setLoadingEstablishments] = useState(false);
  const [referredUsersCount, setReferredUsersCount] = useState(0);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', commission_rate: 0, status: 'pending', can_refer_subaffiliate: true });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingAffiliate, setDeletingAffiliate] = useState<Affiliate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadAffiliatesData();
  }, []);

  const loadAffiliatesData = async () => {
    try {
      const { data: affiliatesData, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAffiliates(affiliatesData || []);

      // Calculate stats
      const total = affiliatesData?.length || 0;
      const active = affiliatesData?.filter(a => a.status === 'active').length || 0;
      const pending = affiliatesData?.filter(a => a.status === 'pending').length || 0;

      // Calculate totals only from approved/active affiliates
      const activeAffiliates = affiliatesData?.filter(a => a.status === 'active') || [];
      const totalCommissions = activeAffiliates.reduce((sum, a) => sum + (a.total_earnings || 0), 0);
      const totalConversions = activeAffiliates.reduce((sum, a) => sum + (a.total_conversions || 0), 0);

      setStats({
        total,
        active,
        pending,
        totalCommissions,
        totalConversions
      });
    } catch (error) {
      console.error('Erro ao carregar afiliados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliateEstablishments = async (affiliateId: string) => {
    setLoadingEstablishments(true);
    try {
      const { data, error } = await supabase
        .from('affiliate_establishments')
        .select(`
          id,
          company_id,
          companies:company_id (
            name,
            trade_name,
            logo_url
          )
        `)
        .eq('affiliate_id', affiliateId);

      if (error) throw error;

      const establishments: AffiliateEstablishment[] = (data || []).map((item: any) => ({
        id: item.id,
        company_id: item.company_id,
        company_name: item.companies?.name || 'Empresa não encontrada',
        company_trade_name: item.companies?.trade_name,
        company_logo_url: item.companies?.logo_url
      }));

      setAffiliateEstablishments(establishments);
    } catch (error) {
      console.error('Erro ao carregar estabelecimentos:', error);
      setAffiliateEstablishments([]);
    } finally {
      setLoadingEstablishments(false);
    }
  };

  const loadReferredUsersCount = async (affiliateCode: string) => {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_affiliate_code', affiliateCode);

      if (error) throw error;
      setReferredUsersCount(count || 0);
    } catch (error) {
      console.error('Erro ao carregar usuários indicados:', error);
      setReferredUsersCount(0);
    }
  };

  const handleViewAffiliate = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    loadAffiliateEstablishments(affiliate.id);
    loadReferredUsersCount(affiliate.affiliate_code);
  };

  const handleOpenEdit = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate);
    setEditForm({
      full_name: affiliate.full_name || '',
      email: affiliate.email || '',
      commission_rate: affiliate.commission_rate || 0,
      status: affiliate.status || 'pending',
      can_refer_subaffiliate: affiliate.can_refer_subaffiliate ?? true,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingAffiliate) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          commission_rate: Number(editForm.commission_rate),
          status: editForm.status,
          is_active: editForm.status === 'active',
          can_refer_subaffiliate: editForm.can_refer_subaffiliate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingAffiliate.id);
      if (error) throw error;
      toast.success('Afiliado atualizado com sucesso');
      setEditingAffiliate(null);
      await loadAffiliatesData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao atualizar afiliado');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAffiliate) return;
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-affiliate', {
        body: { affiliateId: deletingAffiliate.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Erro ao excluir');
      toast.success('Afiliado excluído permanentemente');
      setDeletingAffiliate(null);
      await loadAffiliatesData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao excluir afiliado');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAffiliates = affiliates.filter(affiliate => {
    const affiliateName = affiliate.full_name || '';
    const affiliateEmail = affiliate.email || '';
    const matchesSearch = affiliateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         affiliateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         affiliate.affiliate_code.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && affiliate.status === statusFilter;
  });

  // Lookup helpers para vínculos pai/sub-afiliado
  const affiliateById = new Map(affiliates.map(a => [a.id, a]));
  const subAffiliatesByParent = affiliates.reduce<Record<string, Affiliate[]>>((acc, a) => {
    if (a.parent_affiliate_id) {
      (acc[a.parent_affiliate_id] ||= []).push(a);
    }
    return acc;
  }, {});

  // Conta sub-afiliados recursivamente (sub do sub, etc.)
  const countAllSubs = (parentId: string, visited = new Set<string>()): number => {
    if (visited.has(parentId)) return 0;
    visited.add(parentId);
    const direct = subAffiliatesByParent[parentId] || [];
    return direct.reduce((sum, s) => sum + 1 + countAllSubs(s.id, visited), 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Suspenso</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Inativo</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Gestão de Afiliados</h2>
        <p className="text-muted-foreground">Gerencie todos os afiliados da plataforma</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Afiliados</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Afiliados Aprovados</CardTitle>
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Afiliados Pendentes</CardTitle>
            <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Comissões (Aprovados)</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              R$ {stats.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Conversões (Aprovados)</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.totalConversions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Affiliates List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Afiliados</CardTitle>
          <p className="text-sm text-muted-foreground">
            Todos os afiliados cadastrados na plataforma
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAffiliates.map((affiliate) => {
              const parent = affiliate.parent_affiliate_id ? affiliateById.get(affiliate.parent_affiliate_id) : null;
              const directSubs = subAffiliatesByParent[affiliate.id] || [];
              const totalSubs = countAllSubs(affiliate.id);
              const indirectSubs = totalSubs - directSubs.length;
              return (
              <div
                key={affiliate.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-lg">{affiliate.full_name || 'Nome não disponível'}</h3>
                      {parent && (
                        <Badge variant="outline" className="text-xs gap-1 border-purple-300 text-purple-700">
                          <GitBranch className="w-3 h-3" />
                          Sub de {parent.full_name || parent.affiliate_code}
                        </Badge>
                      )}
                      {totalSubs > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Users className="w-3 h-3" />
                          {totalSubs} sub{totalSubs > 1 ? 's' : ''}
                          {indirectSubs > 0 && ` (${directSubs.length} diretos + ${indirectSubs} indiretos)`}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ExternalLink className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-500 font-mono">
                        {affiliate.affiliate_code}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Desde {formatDate(affiliate.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4 lg:mt-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      R$ {(affiliate.total_earnings || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {affiliate.total_conversions || 0} conversões
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {affiliate.commission_rate}% taxa
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(affiliate.status)}
                    <Button variant="outline" size="sm" onClick={() => handleViewAffiliate(affiliate)} title="Visualizar">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(affiliate)} title="Editar">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeletingAffiliate(affiliate)} title="Excluir" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );})}

            {filteredAffiliates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum afiliado encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Detail Modal */}
      <Dialog open={!!selectedAffiliate} onOpenChange={(open) => !open && setSelectedAffiliate(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <UserCheck className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedAffiliate.full_name || 'Nome não informado'}</h3>
                  {getStatusBadge(selectedAffiliate.status)}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedAffiliate.email || 'Email não informado'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-primary">{selectedAffiliate.affiliate_code}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Cadastrado em {formatDate(selectedAffiliate.created_at)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    R$ {(selectedAffiliate.total_earnings || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Total de Comissões</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedAffiliate.total_conversions || 0}</p>
                  <p className="text-xs text-muted-foreground">Conversões</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedAffiliate.total_clicks || 0}</p>
                  <p className="text-xs text-muted-foreground">Cliques</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedAffiliate.commission_rate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de Comissão</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg col-span-2">
                  <p className="text-2xl font-bold text-purple-600">{referredUsersCount}</p>
                  <p className="text-xs text-muted-foreground">Usuários Cadastrados pelo Link</p>
                </div>
              </div>

              {/* Estabelecimentos Indicados */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium">Estabelecimentos Indicados</h4>
                  <Badge variant="secondary" className="ml-auto">
                    {affiliateEstablishments.length}
                  </Badge>
                </div>

                {loadingEstablishments ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : affiliateEstablishments.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {affiliateEstablishments.map((est) => (
                      <div key={est.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                        {est.company_logo_url ? (
                          <img
                            src={est.company_logo_url}
                            alt={est.company_name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{est.company_name}</p>
                          {est.company_trade_name && (
                            <p className="text-xs text-muted-foreground truncate">{est.company_trade_name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum estabelecimento selecionado
                  </p>
                )}
              </div>

              {/* Indicador (afiliado pai) */}
              {selectedAffiliate.parent_affiliate_id && (() => {
                const parent = affiliateById.get(selectedAffiliate.parent_affiliate_id);
                if (!parent) return null;
                return (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-medium">Indicado por</h4>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-purple-700 dark:text-purple-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{parent.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground truncate">{parent.email}</p>
                        <p className="text-xs font-mono text-primary">{parent.affiliate_code}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Sub-afiliados */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium">Sub-afiliados</h4>
                  <Badge variant="secondary" className="ml-auto">
                    {(subAffiliatesByParent[selectedAffiliate.id] || []).length}
                  </Badge>
                </div>
                {(subAffiliatesByParent[selectedAffiliate.id] || []).length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(subAffiliatesByParent[selectedAffiliate.id] || []).map((sub) => (
                      <div key={sub.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserCheck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{sub.full_name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                          <p className="text-xs font-mono text-primary">{sub.affiliate_code}</p>
                        </div>
                        {getStatusBadge(sub.status)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum sub-afiliado vinculado
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingAffiliate} onOpenChange={(open) => !open && setEditingAffiliate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Afiliado</DialogTitle>
            <DialogDescription>Atualize os dados do afiliado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input id="edit-name" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rate">Taxa de comissão (%)</Label>
              <Input id="edit-rate" type="number" min="0" step="0.01" value={editForm.commission_rate} onChange={(e) => setEditForm({ ...editForm, commission_rate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-can-refer">Pode indicar sub-afiliado</Label>
                <p className="text-xs text-muted-foreground">
                  {editForm.can_refer_subaffiliate
                    ? 'Ativado: este afiliado pode indicar sub-afiliados.'
                    : 'Desativado: este afiliado não poderá indicar sub-afiliados.'}
                </p>
              </div>
              <Switch
                id="edit-can-refer"
                checked={editForm.can_refer_subaffiliate}
                onCheckedChange={(v) => setEditForm({ ...editForm, can_refer_subaffiliate: v })}
              />
            </div>
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAffiliate(null)} disabled={savingEdit}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAffiliate} onOpenChange={(open) => !open && setDeletingAffiliate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir afiliado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O afiliado <strong>{deletingAffiliate?.full_name || deletingAffiliate?.email}</strong> ({deletingAffiliate?.affiliate_code}) será removido. Os sub-afiliados vinculados ficarão sem indicador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};