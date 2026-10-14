import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Ticket, Plus, Search, Ban, Power, Trash2, Copy, Calendar, Send } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  is_revoked: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export const CouponsManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discount_percent: 10,
    max_uses: '',
    valid_until: '',
  });
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data as any[]) || []);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'BAH';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon(prev => ({ ...prev, code }));
  };

  const handleCreate = async () => {
    if (!newCoupon.code || newCoupon.discount_percent <= 0) {
      toast({ title: 'Preencha o código e o percentual', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const payload: any = {
        code: newCoupon.code.toUpperCase().trim(),
        description: newCoupon.description || null,
        discount_percent: newCoupon.discount_percent,
        max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
        valid_until: newCoupon.valid_until || null,
      };

      const { error } = await supabase.from('discount_coupons').insert(payload);
      if (error) throw error;

      toast({ title: 'Cupom criado com sucesso!' });
      setShowCreateModal(false);
      setNewCoupon({ code: '', description: '', discount_percent: 10, max_uses: '', valid_until: '' });
      loadCoupons();
    } catch (error: any) {
      toast({ title: 'Erro ao criar cupom', description: error.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_active: !coupon.is_active, updated_at: new Date().toISOString() })
        .eq('id', coupon.id);
      if (error) throw error;
      toast({ title: coupon.is_active ? 'Cupom desabilitado' : 'Cupom habilitado' });
      loadCoupons();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const revokeCoupon = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from('discount_coupons')
        .update({ is_revoked: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', coupon.id);
      if (error) throw error;
      toast({ title: 'Cupom revogado com sucesso' });
      loadCoupons();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    try {
      const { data: notifications, error: notificationsError } = await supabase
        .from('affiliate_notifications')
        .select('id, metadata')
        .eq('type', 'coupon');

      if (notificationsError) throw notificationsError;

      const notificationIds = (notifications || [])
        .filter((notification: any) => {
          const metadata = notification.metadata || {};
          return metadata.coupon_id === coupon.id || metadata.coupon_code === coupon.code;
        })
        .map((notification: any) => notification.id);

      if (notificationIds.length > 0) {
        const { error: readsError } = await supabase
          .from('affiliate_notification_reads')
          .delete()
          .in('notification_id', notificationIds);

        if (readsError) throw readsError;

        const { error: deleteNotificationsError } = await supabase
          .from('affiliate_notifications')
          .delete()
          .in('id', notificationIds);

        if (deleteNotificationsError) throw deleteNotificationsError;
      }

      const { error } = await supabase.from('discount_coupons').delete().eq('id', coupon.id);
      if (error) throw error;
      toast({ title: 'Cupom excluído' });
      loadCoupons();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Código copiado!' });
  };

  const sendToAffiliates = async (coupon: Coupon) => {
    try {
      const { error } = await supabase.from('affiliate_notifications').insert({
        title: `Novo Cupom: ${coupon.code}`,
        message: coupon.description || `Use o cupom ${coupon.code} e ganhe ${coupon.discount_percent}% de desconto!`,
        type: 'coupon',
        metadata: {
          coupon_id: coupon.id,
          coupon_code: coupon.code,
          discount_percent: coupon.discount_percent,
          valid_until: coupon.valid_until,
        },
      });
      if (error) throw error;
      toast({ title: 'Cupom enviado para todos os afiliados!' });
    } catch (error: any) {
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    }
  };

  const filteredCoupons = coupons.filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCoupons = coupons.filter(c => c.is_active && !c.is_revoked).length;
  const revokedCoupons = coupons.filter(c => c.is_revoked).length;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const getStatusBadge = (coupon: Coupon) => {
    if (coupon.is_revoked) return <Badge className="bg-red-100 text-red-800 border-red-200">Revogado</Badge>;
    if (!coupon.is_active) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Desabilitado</Badge>;
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Expirado</Badge>;
    return <Badge className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Gestão de Cupons</h2>
          <p className="text-muted-foreground">Crie e gerencie cupons de desconto personalizados</p>
        </div>
        <Button onClick={() => { generateCode(); setShowCreateModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Gerar Cupom
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Cupons</CardTitle>
            <Ticket className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold">{coupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Cupons Ativos</CardTitle>
            <Power className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{activeCoupons}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Cupons Revogados</CardTitle>
            <Ban className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-red-600">{revokedCoupons}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Usos</CardTitle>
            <Ticket className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {coupons.reduce((sum, c) => sum + c.current_uses, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por código ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Coupons List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cupons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCoupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono font-bold text-lg">{coupon.code}</h3>
                      <Button variant="ghost" size="sm" onClick={() => copyCode(coupon.code)} className="h-6 w-6 p-0">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground">{coupon.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Criado em {formatDate(coupon.created_at)}</span>
                      {coupon.valid_until && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Válido até {formatDate(coupon.valid_until)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4 lg:mt-0">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{coupon.discount_percent}%</p>
                    <p className="text-sm text-muted-foreground">
                      {coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ''} usos
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(coupon)}

                    {!coupon.is_revoked && (
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={() => toggleActive(coupon)}
                          aria-label="Ativar/Desativar"
                        />
                      </div>
                    )}

                    {!coupon.is_revoked && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendToAffiliates(coupon)}
                        className="text-primary hover:text-primary"
                        title="Enviar para afiliados"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}

                    {!coupon.is_revoked && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeCoupon(coupon)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Revogar cupom"
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCoupon(coupon)}
                      className="text-destructive hover:text-destructive"
                      title="Excluir cupom"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredCoupons.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cupom encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Coupon Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Gerar Novo Cupom
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código do Cupom</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="EX: BAH20OFF"
                  className="font-mono"
                />
                <Button variant="outline" onClick={generateCode} type="button">
                  Gerar
                </Button>
              </div>
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={newCoupon.description}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ex: Cupom de boas-vindas"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Percentual de Desconto (%)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={newCoupon.discount_percent}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, discount_percent: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Limite de Usos (opcional)</Label>
              <Input
                type="number"
                min={1}
                value={newCoupon.max_uses}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, max_uses: e.target.value }))}
                placeholder="Ilimitado"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Válido até (opcional)</Label>
              <Input
                type="date"
                value={newCoupon.valid_until}
                onChange={(e) => setNewCoupon(prev => ({ ...prev, valid_until: e.target.value }))}
                className="mt-1"
              />
            </div>

            <Button onClick={handleCreate} disabled={creating} className="w-full gap-2">
              {creating ? (
                <div className="animate-spin w-4 h-4 border-2 border-background border-t-transparent rounded-full" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Criar Cupom
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
