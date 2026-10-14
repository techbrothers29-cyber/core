import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, CheckCircle, Clock, DollarSign, Search, Eye, Star, Phone, Mail, Globe, MapPin, Pencil, Trash2 } from 'lucide-react';
import { PartnerEditModal } from './PartnerEditModal';

interface PartnerStatsProps {
  partnerId: string;
}

const PartnerStats = ({ partnerId }: PartnerStatsProps) => {
  const [stats, setStats] = useState({ offers: 0, sales: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartnerStats();
  }, [partnerId]);

  const loadPartnerStats = async () => {
    try {
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id')
        .eq('company_id', partnerId)
        .eq('is_active', true);

      if (offersError) throw offersError;

      const offerIds = (offers ?? []).map((o) => o.id);
      const offersCount = offerIds.length;

      let salesCount = 0;
      let revenue = 0;

      if (offerIds.length > 0) {
        const { data: userVouchers, error: uvError } = await supabase
          .from('user_vouchers')
          .select('purchase_price, status')
          .in('offer_id', offerIds)
          .in('status', ['active', 'used', 'expired']);

        if (uvError) throw uvError;

        salesCount = userVouchers?.length || 0;
        revenue = userVouchers?.reduce((sum, v) => sum + Number(v.purchase_price || 0), 0) || 0;
      }

      setStats({ offers: offersCount, sales: salesCount, revenue });
    } catch (error) {
      console.error('Erro ao carregar stats do parceiro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-right">
        <div className="animate-pulse space-y-1">
          <div className="h-4 bg-muted rounded w-16 ml-auto"></div>
          <div className="h-4 bg-muted rounded w-20 ml-auto"></div>
          <div className="h-4 bg-muted rounded w-24 ml-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-right">
      <p className="text-sm font-medium">{stats.offers} ofertas</p>
      <p className="text-sm text-muted-foreground">{stats.sales} vendas</p>
      <p className="text-sm font-medium text-green-600">
        R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
};

interface PartnerStats {
  total: number;
  active: number;
  pending: number;
  totalRevenue: number;
}

interface Partner {
  id: string;
  name: string;
  trade_name?: string;
  cnpj?: string;
  email: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  commission_rate?: number;
  address?: any;
  description?: string;
}

export const PartnersManagement = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<PartnerStats>({ total: 0, active: 0, pending: 0, totalRevenue: 0 });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [partnerPendingDelete, setPartnerPendingDelete] = useState<Partner | null>(null);
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);

  useEffect(() => {
    loadPartnersData();
  }, []);

  const loadPartnersData = async () => {
    try {
      const { data: partnersData, error } = await supabase.rpc('get_company_admin_data_secure');

      if (error) throw error;

      setPartners(partnersData || []);

      const total = partnersData?.length || 0;
      const active = partnersData?.filter(p => p.is_active && p.is_verified).length || 0;
      const pending = partnersData?.filter(p => !p.is_verified).length || 0;

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, status')
        .eq('status', 'completed');

      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      setStats({
        total,
        active,
        pending,
        totalRevenue
      });
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePartner = async (partner: Partner) => {
    try {
      setDeletingPartnerId(partner.id);

      const { data, error } = await supabase.functions.invoke('delete-partner', {
        body: { partnerId: partner.id },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Erro ao excluir parceiro');
      }

      toast({
        title: 'Parceiro excluído',
        description: `${partner.name} foi removido do site e do banco de dados.`,
      });

      setPartnerPendingDelete(null);

      if (selectedPartner?.id === partner.id) {
        setSelectedPartner(null);
      }

      await loadPartnersData();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir parceiro',
        description: error.message || 'Não foi possível concluir a exclusão.',
        variant: 'destructive',
      });
    } finally {
      setDeletingPartnerId(null);
    }
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && partner.is_active && partner.is_verified;
    if (statusFilter === 'pending') return matchesSearch && !partner.is_verified;
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (partner: Partner) => {
    if (partner.is_verified && partner.is_active) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
    }
    if (!partner.is_verified) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 border-red-200">Inativo</Badge>;
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
        <h2 className="text-3xl font-bold text-foreground mb-2">Gestão de Parceiros</h2>
        <p className="text-muted-foreground">Gerencie todos os parceiros da plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Parceiros</CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Parceiros Ativos</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Aguardando Aprovação</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou categoria..."
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
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Parceiros</CardTitle>
          <p className="text-sm text-muted-foreground">
            Todos os parceiros cadastrados na plataforma
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPartners.map((partner) => {
              const isDeleting = deletingPartnerId === partner.id;

              return (
                <div
                  key={partner.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {partner.logo_url ? (
                        <img
                          src={partner.logo_url}
                          alt={partner.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-lg">{partner.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        Categoria não definida
                      </p>
                      <p className="text-sm text-muted-foreground">{partner.email}</p>
                      {partner.phone && (
                        <p className="text-sm text-muted-foreground">{partner.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4 lg:mt-0">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>

                    <PartnerStats partnerId={partner.id} />

                    <div className="flex items-center gap-2">
                      {getStatusBadge(partner)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPartner(partner);
                          setIsEditModalOpen(true);
                        }}
                        title="Editar parceiro"
                        disabled={isDeleting}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPartnerPendingDelete(partner)}
                        title="Excluir parceiro"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPartner(partner)}
                            title="Ver detalhes"
                            disabled={isDeleting}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              {partner.logo_url ? (
                                <img
                                  src={partner.logo_url}
                                  alt={partner.name}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <Building2 className="w-8 h-8 text-primary" />
                              )}
                              {partner.name}
                            </DialogTitle>
                          </DialogHeader>

                          <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                              {getStatusBadge(partner)}
                              <Badge variant="outline">
                                Cadastrado em {formatDate(partner.created_at)}
                              </Badge>
                              {partner.commission_rate && (
                                <Badge variant="secondary">
                                  Comissão: {partner.commission_rate}%
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  Contato
                                </h3>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span>{partner.email}</span>
                                  </div>
                                  {partner.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-muted-foreground" />
                                      <span>{partner.phone}</span>
                                    </div>
                                  )}
                                  {partner.website && (
                                    <div className="flex items-center gap-2">
                                      <Globe className="w-4 h-4 text-muted-foreground" />
                                      <a
                                        href={partner.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        {partner.website}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  Empresa
                                </h3>
                                <div className="space-y-2 text-sm">
                                  {partner.trade_name && (
                                    <div>
                                      <span className="text-muted-foreground">Nome Fantasia:</span>
                                      <span className="ml-1">{partner.trade_name}</span>
                                    </div>
                                  )}
                                  {partner.cnpj && (
                                    <div>
                                      <span className="text-muted-foreground">CNPJ:</span>
                                      <span className="ml-1">{partner.cnpj}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {partner.description && (
                              <div>
                                <h3 className="font-semibold mb-2">Descrição</h3>
                                <p className="text-sm text-muted-foreground">
                                  {partner.description}
                                </p>
                              </div>
                            )}

                            {partner.address && (
                              <div>
                                <h3 className="font-semibold flex items-center gap-2 mb-2">
                                  <MapPin className="w-4 h-4" />
                                  Endereço
                                </h3>
                                <div className="text-sm text-muted-foreground">
                                  {typeof partner.address === 'object' ? (
                                    <div>
                                      {partner.address.street && <div>{partner.address.street}</div>}
                                      {partner.address.city && partner.address.state && (
                                        <div>{partner.address.city}, {partner.address.state}</div>
                                      )}
                                      {partner.address.zipCode && <div>CEP: {partner.address.zipCode}</div>}
                                    </div>
                                  ) : (
                                    <div>{partner.address}</div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div>
                              <h3 className="font-semibold mb-3">Estatísticas</h3>
                              <PartnerStats partnerId={partner.id} />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredPartners.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum parceiro encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(partnerPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingPartnerId) {
            setPartnerPendingDelete(null);
          }
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-md mx-auto rounded-lg">
          <DialogHeader>
            <DialogTitle>Excluir parceiro</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o parceiro{' '}
              <span className="font-medium text-foreground">{partnerPendingDelete?.name}</span>?
              {' '}Esta ação remove o parceiro do site e apaga os dados vinculados.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setPartnerPendingDelete(null)}
                disabled={Boolean(deletingPartnerId)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => partnerPendingDelete && handleDeletePartner(partnerPendingDelete)}
                disabled={!partnerPendingDelete || Boolean(deletingPartnerId)}
              >
                {deletingPartnerId ? 'Excluindo...' : 'Confirmar exclusão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PartnerEditModal
        partner={editingPartner}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPartner(null);
        }}
        onUpdate={loadPartnersData}
      />
    </div>
  );
};
