import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, FileText, Send, Upload, X, ImageIcon } from 'lucide-react';

interface PromotionRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

const PromotionRequestForm = ({ open, onOpenChange, userEmail }: PromotionRequestFormProps) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const resetForm = () => {
    setTitle('');
    setOriginalPrice('');
    setDiscountPrice('');
    setImageUrl('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `promo-request-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('offer-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('offer-images').getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
      toast({ title: '✅ Imagem enviada' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro no upload', description: 'Não foi possível enviar a imagem.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !originalPrice || !discountPrice) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome, valor original e valor com desconto.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, trade_name, approval_status')
        .eq('email', userEmail)
        .single();

      if (companyError || !companyData) {
        toast({ title: 'Erro', description: 'Empresa não encontrada.', variant: 'destructive' });
        return;
      }

      if (companyData.approval_status !== 'approved') {
        toast({ title: '⏳ Conta Pendente', description: 'Sua conta ainda não foi aprovada.', variant: 'destructive' });
        return;
      }

      const original = parseFloat(originalPrice);
      const discount = parseFloat(discountPrice);

      const notesText = `📋 SOLICITAÇÃO DE PROMOÇÃO\n\n` +
        `Nome: ${title.trim()}\n\n` +
        `💰 Valor Original: R$ ${original.toFixed(2)}\n` +
        `💰 Valor com Desconto: R$ ${discount.toFixed(2)}\n` +
        `📊 Desconto: ${Math.round((1 - discount / original) * 100)}%\n\n` +
        (imageUrl ? `🖼️ Imagem: ${imageUrl}` : '');

      const { error } = await supabase.from('promotion_requests').insert({
        company_id: companyData.id,
        company_name: companyData.trade_name || companyData.name || 'Estabelecimento',
        requester_email: userEmail,
        notes: notesText,
      });

      if (error) throw error;

      toast({ title: '✅ Solicitação Enviada!', description: 'Sua promoção foi enviada para análise do administrador.' });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar a solicitação.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Solicitar Nova Promoção
          </DialogTitle>
          <DialogDescription>
            Preencha os detalhes da promoção. Um administrador analisará sua solicitação.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="promo-title">Nome da Promoção *</Label>
            <Input
              id="promo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Rodízio de Pizza Completo"
              required
            />
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo-original-price" className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Valor Original (R$) *
              </Label>
              <Input
                id="promo-original-price"
                type="number"
                step="0.01"
                min="0.01"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-discount-price" className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Valor com Desconto (R$) *
              </Label>
              <Input
                id="promo-discount-price"
                type="number"
                step="0.01"
                min="0.01"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          {originalPrice && discountPrice && parseFloat(originalPrice) > 0 && (
            <div className="rounded-lg bg-primary/10 p-3 text-center">
              <span className="text-sm font-medium text-primary">
                Desconto de {Math.round((1 - parseFloat(discountPrice) / parseFloat(originalPrice)) * 100)}%
              </span>
            </div>
          )}

          {/* Imagem */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Imagem da Promoção
            </Label>
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={imageUrl} alt="Pré-visualização" className="w-full h-48 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setImageUrl('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'Enviando...' : 'Clique para enviar (máx 5MB)'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={submitting || uploading}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PromotionRequestForm;
