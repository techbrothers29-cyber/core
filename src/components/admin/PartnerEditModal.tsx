import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

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

interface Category {
  id: string;
  name: string;
}

interface PartnerEditModalProps {
  partner: Partner | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const PartnerEditModal = ({ partner, isOpen, onClose, onUpdate }: PartnerEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    commission_rate: 5,
    partner_retention_rate: 70,
    is_active: true,
    is_verified: false,
    category_id: ''
  });

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || '',
        trade_name: partner.trade_name || '',
        email: partner.email || '',
        phone: partner.phone || '',
        website: partner.website || '',
        description: partner.description || '',
        commission_rate: partner.commission_rate || 5,
        partner_retention_rate: (partner as any).partner_retention_rate || 70,
        is_active: partner.is_active ?? true,
        is_verified: partner.is_verified ?? false,
        category_id: ''
      });
    }
  }, [partner]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.
      from('categories').
      select('id, name').
      eq('is_active', true).
      order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;

    setLoading(true);
    try {
      const { error } = await supabase.
      from('companies').
      update({
        name: formData.name,
        trade_name: formData.trade_name || null,
        email: formData.email,
        phone: formData.phone || null,
        website: formData.website || null,
        description: formData.description || null,
        commission_rate: formData.commission_rate,
        partner_retention_rate: formData.partner_retention_rate,
        is_active: formData.is_active,
        is_verified: formData.is_verified,
        approval_status: formData.is_verified ? 'approved' : 'pending',
        category_id: formData.category_id || null,
        updated_at: new Date().toISOString()
      }).
      eq('id', partner.id);

      if (error) throw error;

      // Registrar ação no audit_logs
      const actions: string[] = [];
      if (partner.is_verified !== formData.is_verified) {
        actions.push(formData.is_verified ? 'verify_partner' : 'unverify_partner');
      }
      if (partner.is_active !== formData.is_active) {
        actions.push(formData.is_active ? 'activate_partner' : 'deactivate_partner');
      }
      if (actions.length === 0) actions.push('update_partner');

      for (const action of actions) {
        await supabase.from('audit_logs').insert({
          action,
          entity_type: 'company',
          entity_id: partner.id,
          description: `${action === 'verify_partner' ? 'Parceiro verificado' : action === 'update_partner' ? 'Parceiro atualizado' : action === 'activate_partner' ? 'Parceiro ativado' : action === 'deactivate_partner' ? 'Parceiro desativado' : 'Parceiro desverificado'}: ${formData.name}`,
          metadata: { partner_name: formData.name, changes: actions }
        });
      }

      toast.success('Parceiro atualizado com sucesso!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar parceiro:', error);
      toast.error('Erro ao atualizar parceiro');
    } finally {
      setLoading(false);
    }
  };

  if (!partner) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Parceiro: {partner.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required />

            </div>

            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome Fantasia</Label>
              <Input
                id="trade_name"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })} />

            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required />

            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />

            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })} />

            </div>














            <div className="space-y-2">
              <Label htmlFor="partner_retention_rate">Retenção do Parceiro (%)</Label>
              <Input
                id="partner_retention_rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={formData.partner_retention_rate}
                onChange={(e) => setFormData({ ...formData, partner_retention_rate: parseFloat(e.target.value) || 70 })} />

              <p className="text-xs text-muted-foreground">
                % que o parceiro retém de cada venda. A plataforma fica com {100 - (formData.partner_retention_rate || 70)}%.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}>

                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categories.map((category) =>
                  <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3} />

          </div>

          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />

              <Label htmlFor="is_active">Ativo</Label>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                id="is_verified"
                checked={formData.is_verified}
                onCheckedChange={(checked) => setFormData({ ...formData, is_verified: checked })} />

              <Label htmlFor="is_verified">Verificado</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ?
              <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </> :

              <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>);

};
