import * as React from 'react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Edit, Eye, EyeOff, Loader2, Save, Star, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OfferData {
  id?: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  original_price: number;
  discount_percent?: number | null;
  category: string | null;
  city: string | null;
  company_id: string;
  card_image_url: string | null;
  banner_image_url: string | null;
  is_active: boolean;
  carousel_primary?: boolean;
  carousel_secondary?: boolean;
  carousel_tertiary?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  offer: Partial<OfferData> | null;
  onSaved: () => void;
}

export function BahofertasOfferEditor({ open, onOpenChange, offer, onSaved }: Props) {
  const { toast } = useToast();
  const isCreating = !offer?.id;

  const [companies, setCompanies] = useState<Array<{ id: string; name: string; trade_name: string | null }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [cardImageUrl, setCardImageUrl] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [carouselPrimary, setCarouselPrimary] = useState(false);
  const [carouselSecondary, setCarouselSecondary] = useState(false);
  const [carouselTertiary, setCarouselTertiary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: cats }] = await Promise.all([
        supabase.from('companies').select('id, name, trade_name').eq('is_active', true).eq('is_verified', true).order('name'),
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
      ]);
      if (c) setCompanies(c);
      if (cats) setCategories(cats);
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    setTitle(offer?.title || '');
    setSubtitle(offer?.subtitle || '');
    setDescription(offer?.description || '');
    setPrice(offer?.price ? String(offer.price) : '');
    setOriginalPrice(offer?.original_price ? String(offer.original_price) : '');
    setCity(offer?.city || '');
    setCategory(offer?.category || '');
    setCompanyId(offer?.company_id || '');
    setCardImageUrl(offer?.card_image_url || '');
    setBannerImageUrl(offer?.banner_image_url || '');
    setIsActive(offer?.is_active !== false);
    setCarouselPrimary(offer?.carousel_primary === true);
    setCarouselSecondary(offer?.carousel_secondary === true);
    setCarouselTertiary(offer?.carousel_tertiary === true);
  }, [open, offer?.id]);

  const priceNum = parseFloat(price) || 0;
  const originalNum = parseFloat(originalPrice) || 0;
  const discount = originalNum > 0 && priceNum > 0 && priceNum < originalNum
    ? Math.round((1 - priceNum / originalNum) * 100)
    : 0;

  const uploadImage = async (file: File, kind: 'card' | 'banner') => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }
    const setter = kind === 'card' ? setUploadingCard : setUploadingBanner;
    setter(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('offer-images').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      });
      if (error) throw error;
      const { data } = supabase.storage.from('offer-images').getPublicUrl(path);
      if (kind === 'card') setCardImageUrl(data.publicUrl);
      else setBannerImageUrl(data.publicUrl);
      toast({ title: 'Imagem enviada' });
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e?.message, variant: 'destructive' });
    } finally {
      setter(false);
    }
  };

  const pickFile = (kind: 'card' | 'banner') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) uploadImage(f, kind);
    };
    input.click();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    if (!companyId) {
      toast({ title: 'Selecione um parceiro', variant: 'destructive' });
      return;
    }
    if (priceNum <= 0) {
      toast({ title: 'Preço deve ser maior que zero', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        price: priceNum,
        original_price: originalNum > 0 ? originalNum : priceNum,
        discount_percent: discount,
        category: category || null,
        city: city.trim() || null,
        company_id: companyId,
        card_image_url: cardImageUrl || null,
        banner_image_url: bannerImageUrl || null,
        is_active: isActive,
        carousel_primary: carouselPrimary,
        carousel_secondary: carouselSecondary,
        carousel_tertiary: carouselTertiary,
      };
      if (offer?.id) {
        const { error } = await supabase.from('offers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', offer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('offers').insert(payload);
        if (error) throw error;
      }
      toast({ title: offer?.id ? 'Oferta atualizada' : 'Oferta criada' });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            {isCreating ? 'Criar Oferta' : 'Editar Oferta'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isCreating && (
            <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
              <p><strong>Original:</strong> {offer?.title}</p>
              <p><strong>Preço Original:</strong> R$ {Number(offer?.original_price || offer?.price || 0).toFixed(2)}</p>
              <p><strong>Categoria:</strong> {offer?.category || 'N/A'}</p>
            </div>
          )}

          {/* Visibility */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {isActive ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-destructive" />}
              <Label>Oferta Ativa no site</Label>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Carousel highlight toggles */}
          <div className="p-3 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <Label className="font-semibold">Destacar esta oferta em carrosséis</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Escolha em quais carrosséis da página inicial esta oferta deve aparecer individualmente.
            </p>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Carrossel Principal</Label>
              <Switch checked={carouselPrimary} onCheckedChange={setCarouselPrimary} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Carrossel Secundário</Label>
              <Switch checked={carouselSecondary} onCheckedChange={setCarouselSecondary} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Carrossel de Ofertas (Terciário)</Label>
              <Switch checked={carouselTertiary} onCheckedChange={setCarouselTertiary} />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Título <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: 50% off em massagens" />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtítulo opcional" />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">Preço Original (R$)</Label>
              <Input type="number" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Preço Oferta (R$) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Desconto</Label>
              <div className="flex h-10 items-center justify-center rounded-md border bg-muted/40 px-3 text-sm font-semibold text-primary">
                {discount}%
              </div>
            </div>
          </div>

          {/* Partner */}
          <div className="space-y-2">
            <Label>Parceiro <span className="text-destructive">*</span></Label>
            <Select value={companyId} onValueChange={setCompanyId} disabled={!isCreating}>
              <SelectTrigger><SelectValue placeholder="Selecione um parceiro" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.trade_name || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category + City */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Gramado" />
            </div>
          </div>

          {/* Card image */}
          <div className="space-y-2">
            <Label>Imagem do Card</Label>
            <div className="flex gap-2">
              <Input value={cardImageUrl} onChange={(e) => setCardImageUrl(e.target.value)} placeholder="URL ou faça upload..." className="flex-1" />
              <Button type="button" variant="outline" size="icon" disabled={uploadingCard} onClick={() => pickFile('card')}>
                {uploadingCard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
            </div>
            {cardImageUrl && (
              <div className="h-32 rounded-lg overflow-hidden bg-muted">
                <img src={cardImageUrl} alt="Preview card" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Banner image */}
          <div className="space-y-2">
            <Label>Imagem do Banner</Label>
            <div className="flex gap-2">
              <Input value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} placeholder="URL ou faça upload..." className="flex-1" />
              <Button type="button" variant="outline" size="icon" disabled={uploadingBanner} onClick={() => pickFile('banner')}>
                {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
            </div>
            {bannerImageUrl && (
              <div className="h-32 rounded-lg overflow-hidden bg-muted">
                <img src={bannerImageUrl} alt="Preview banner" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição completa da oferta..." rows={6} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
