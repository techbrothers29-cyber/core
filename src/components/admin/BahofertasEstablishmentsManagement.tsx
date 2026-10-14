import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Store, Loader2, Edit, Save, RefreshCw, AlertTriangle, X, Upload,
  ChevronDown, ChevronUp, Building2, Plus, Image as ImageIcon, Eye, EyeOff, MapPin, Download
} from 'lucide-react';

const downloadImage = async (url: string, filename?: string) => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    const urlName = url.split('/').pop()?.split('?')[0] || 'imagem';
    a.download = filename || urlName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(url, '_blank');
  }
};
import { BahofertasOfferEditor } from './BahofertasOfferEditor';
import { AddressSearchInput } from './AddressSearchInput';

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  email: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  category_id: string | null;
  is_active: boolean;
  is_verified: boolean;
  approval_status: string | null;
  created_at: string | null;
}

interface OfferRow {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  category: string | null;
  card_image_url: string | null;
  is_active: boolean;
  company_id: string;
}

interface BahOverride {
  id: string;
  company_id: string;
  custom_name: string | null;
  custom_description: string | null;
  custom_image_url: string | null;
  custom_banner_url: string | null;
  banner_position: string;
  about_text: string | null;
  includes_included: string[] | null;
  includes_not_included: string[] | null;
  important_notes: string[] | null;
  address_label: string | null;
  latitude: number | null;
  longitude: number | null;
  carousel_primary: boolean;
  carousel_secondary: boolean;
  carousel_tertiary: boolean;
  is_visible: boolean;
  display_order: number;
}

interface GalleryImage {
  id: string;
  image_url: string;
  display_order: number;
}

const EstablishmentEditModal: React.FC<{
  company: Company;
  override: BahOverride | null;
  open: boolean;
  onClose: () => void;
  onSave: (companyId: string, data: Partial<BahOverride>) => Promise<void>;
}> = ({ company, override, open, onClose, onSave }) => {
  const { toast } = useToast();
  const [customName, setCustomName] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [carouselPrimary, setCarouselPrimary] = useState(false);
  const [carouselSecondary, setCarouselSecondary] = useState(false);
  const [carouselTertiary, setCarouselTertiary] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [bannerPosition, setBannerPosition] = useState('center');
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const bannerPreviewRef = useRef<HTMLDivElement>(null);
  const [aboutText, setAboutText] = useState('');
  const [includesIncluded, setIncludesIncluded] = useState('');
  const [includesNotIncluded, setIncludesNotIncluded] = useState('');
  const [importantNotes, setImportantNotes] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [addressLabel, setAddressLabel] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Reset form on open
  useEffect(() => {
    if (!open) return;
    setCustomName(override?.custom_name || '');
    setBannerUrl(override?.custom_banner_url || '');
    setImageUrl(override?.custom_image_url || '');
    setDescription(override?.custom_description || '');
    setCarouselPrimary(override?.carousel_primary || false);
    setCarouselSecondary(override?.carousel_secondary || false);
    setCarouselTertiary(override?.carousel_tertiary || false);
    setIsVisible(override?.is_visible ?? true);
    setDisplayOrder(override?.display_order || 0);
    setBannerPosition(override?.banner_position || 'center');
    setAboutText(override?.about_text || '');
    setIncludesIncluded(override?.includes_included?.join('\n') || '');
    setIncludesNotIncluded(override?.includes_not_included?.join('\n') || '');
    setImportantNotes(override?.important_notes?.join('\n') || '');
    setLatitude(override?.latitude != null ? String(override.latitude) : '');
    setLongitude(override?.longitude != null ? String(override.longitude) : '');
    setAddressLabel(override?.address_label || '');
  }, [open, override]);

  // Fetch gallery
  useEffect(() => {
    if (!open) return;
    setGalleryLoading(true);
    (supabase as any)
      .from('bahofertas_establishment_gallery')
      .select('id, image_url, display_order')
      .eq('company_id', company.id)
      .order('display_order')
      .then(({ data }: { data: GalleryImage[] | null }) => {
        setGalleryImages((data as GalleryImage[]) || []);
        setGalleryLoading(false);
      });
  }, [open, company.id]);

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. O tamanho máximo é 5MB.');
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${company.id.replace(/[^a-zA-Z0-9-]/g, '_')}_${Date.now()}.${ext}`;
    const filePath = `${folder}/${fileName}`;
    const { error } = await supabase.storage.from('offer-images').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (error) throw new Error(`Erro ao fazer upload: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from('offer-images').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const url = await uploadFile(file, 'bahofertas/banners');
      setBannerUrl(url);
      toast({ title: 'Banner enviado com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar banner', description: err?.message, variant: 'destructive' });
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await uploadFile(file, 'bahofertas/images');
      setImageUrl(url);
      toast({ title: 'Imagem enviada com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar imagem', description: err?.message, variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const newImages: GalleryImage[] = [];
      const maxOrder = galleryImages.length > 0 ? Math.max(...galleryImages.map(g => g.display_order)) : -1;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadFile(file, 'bahofertas/gallery');
        const { data, error } = await (supabase as any)
          .from('bahofertas_establishment_gallery')
          .insert({
            company_id: company.id,
            image_url: url,
            display_order: maxOrder + 1 + i,
          })
          .select('id, image_url, display_order')
          .single();
        if (error) throw error;
        newImages.push(data as GalleryImage);
      }
      setGalleryImages(prev => [...prev, ...newImages]);
      toast({ title: `${files.length} imagem(ns) enviada(s)` });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar imagens', description: err?.message, variant: 'destructive' });
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removeGalleryImage = async (id: string) => {
    await (supabase as any).from('bahofertas_establishment_gallery').delete().eq('id', id);
    setGalleryImages(prev => prev.filter(g => g.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    const parseLines = (text: string): string[] | null => {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.length > 0 ? lines : null;
    };
    try {
      await onSave(company.id, {
        custom_name: customName.trim() || null,
        custom_banner_url: bannerUrl || null,
        custom_image_url: imageUrl || null,
        custom_description: description || null,
        carousel_primary: carouselPrimary,
        carousel_secondary: carouselSecondary,
        carousel_tertiary: carouselTertiary,
        is_visible: isVisible,
        display_order: displayOrder,
        banner_position: bannerPosition || 'center',
        about_text: aboutText || null,
        includes_included: parseLines(includesIncluded),
        includes_not_included: parseLines(includesNotIncluded),
        important_notes: parseLines(importantNotes),
        latitude: latitude.trim() === '' ? null : Number(latitude.replace(',', '.')),
        longitude: longitude.trim() === '' ? null : Number(longitude.replace(',', '.')),
        address_label: addressLabel.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const displayName = company.trade_name || company.name;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar Estabelecimento: {displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {(imageUrl || company.logo_url) ? (
                <img src={imageUrl || company.logo_url || ''} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Store className="w-6 h-6 text-muted-foreground" /></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{customName.trim() || displayName}</h3>
              {customName.trim() && (
                <p className="text-xs text-muted-foreground italic">Original: {displayName}</p>
              )}
              <p className="text-xs text-muted-foreground">{company.email}</p>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {isVisible ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-destructive" />}
              <Label>Visível no site</Label>
            </div>
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
          </div>

          {/* Custom Display Name */}
          <div className="space-y-2">
            <Label>Nome de exibição no site</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={displayName}
            />
            <p className="text-xs text-muted-foreground">
              Sobrescreve o nome exibido nos cards e na página do estabelecimento. Deixe em branco para usar o nome original ({displayName}).
            </p>
          </div>

          {/* Custom Location */}
          <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <Label className="font-semibold">Localização (Mapa)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Busque pelo endereço, nome do local ou cidade e selecione o resultado correto. As coordenadas serão preenchidas automaticamente para exibir no mapa da página do estabelecimento.
            </p>
            <AddressSearchInput
              latitude={latitude}
              longitude={longitude}
              initialLabel={addressLabel}
              onCoordinatesChange={(lat, lng, label) => {
                setLatitude(lat);
                setLongitude(lng);
                setAddressLabel(label ?? '');
              }}
            />
          </div>

          {/* Banner Upload */}
          <div className="space-y-2">
            <Label>Banner Personalizado</Label>
            <input ref={bannerInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                {uploadingBanner ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploadingBanner ? 'Enviando...' : 'Enviar imagem'}
              </Button>
              {bannerUrl && (
                <>
                  <Button type="button" variant="ghost" size="icon" onClick={() => downloadImage(bannerUrl, `banner-${company.id}.jpg`)} title="Baixar imagem">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setBannerUrl('')}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            {bannerUrl && (
              <div className="space-y-1">
                <div
                  ref={bannerPreviewRef}
                  className="h-32 rounded-lg overflow-hidden bg-muted relative cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={(e) => { e.preventDefault(); setIsDraggingPosition(true); }}
                  onMouseMove={(e) => {
                    if (!isDraggingPosition || !bannerPreviewRef.current) return;
                    const rect = bannerPreviewRef.current.getBoundingClientRect();
                    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                    setBannerPosition(`${Math.round(x)}% ${Math.round(y)}%`);
                  }}
                  onMouseUp={() => setIsDraggingPosition(false)}
                  onMouseLeave={() => setIsDraggingPosition(false)}
                >
                  <img src={bannerUrl} alt="Banner preview" className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: bannerPosition }} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white bg-black/60 px-2 py-1 rounded">Arraste para ajustar posição</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">Posição: {bannerPosition}</p>
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagem Personalizada</Label>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploadingImage ? 'Enviando...' : 'Enviar imagem'}
              </Button>
              {imageUrl && (
                <>
                  <Button type="button" variant="ghost" size="icon" onClick={() => downloadImage(imageUrl, `imagem-${company.id}.jpg`)} title="Baixar imagem">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setImageUrl('')}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            {imageUrl && (
              <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted">
                <img src={imageUrl} alt="Image preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Gallery Upload */}
          <div className="space-y-2">
            <Label>Galeria de Imagens</Label>
            <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
            <Button type="button" variant="outline" className="w-full" onClick={() => galleryInputRef.current?.click()} disabled={uploadingGallery}>
              {uploadingGallery ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploadingGallery ? 'Enviando...' : 'Enviar imagens (múltiplas)'}
            </Button>
            {galleryLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando galeria...</div>
            ) : galleryImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {galleryImages.map((img) => (
                  <div key={img.id} className="relative group h-20 rounded-lg overflow-hidden bg-muted">
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => downloadImage(img.image_url, `galeria-${company.id}-${img.id}.jpg`)}
                      className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Baixar imagem"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(img.id)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma imagem na galeria</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição Personalizada</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={company.description || 'Descrição customizada para este estabelecimento...'} rows={3} />
          </div>

          {/* Carousel Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Carrosséis</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label className="text-sm">Principal</Label>
                <Switch checked={carouselPrimary} onCheckedChange={setCarouselPrimary} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label className="text-sm">Secundário</Label>
                <Switch checked={carouselSecondary} onCheckedChange={setCarouselSecondary} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label className="text-sm">Terciário</Label>
                <Switch checked={carouselTertiary} onCheckedChange={setCarouselTertiary} />
              </div>
            </div>
          </div>

          {/* Sidebar Content Overrides */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Conteúdo da Página (Sidebar)</Label>

            <div className="space-y-2">
              <Label>Sobre (texto descritivo)</Label>
              <Textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="Texto personalizado para a seção 'Sobre' do estabelecimento..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>O que inclui (um item por linha)</Label>
              <Textarea
                value={includesIncluded}
                onChange={(e) => setIncludesIncluded(e.target.value)}
                placeholder={"Acesso às atrações principais\nEstacionamento gratuito\nSeguro de atividades"}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Não incluído (um item por linha)</Label>
              <Textarea
                value={includesNotIncluded}
                onChange={(e) => setIncludesNotIncluded(e.target.value)}
                placeholder={"Alimentação\nTransporte até o local\nFotos e souvenirs"}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas Importantes (uma por linha)</Label>
              <Textarea
                value={importantNotes}
                onChange={(e) => setImportantNotes(e.target.value)}
                placeholder={"Chegue com 30 minutos de antecedência.\nApresente o voucher digital na entrada."}
                rows={4}
              />
            </div>
          </div>

          {/* Display order */}
          <div className="space-y-2">
            <Label>Ordem de Exibição</Label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const BahofertasEstablishmentsManagement: React.FC = () => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [overrides, setOverrides] = useState<BahOverride[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden' | 'in-carousel'>('all');
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingOffer, setEditingOffer] = useState<OfferRow | null>(null);
  const [creatingOfferForCompany, setCreatingOfferForCompany] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: comps, error: compsErr } = await supabase
      .from('companies')
      .select('id, name, trade_name, email, logo_url, banner_url, description, category_id, is_active, is_verified, approval_status, created_at')
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (compsErr) {
      toast({ title: 'Erro', description: 'Falha ao carregar empresas.', variant: 'destructive' });
    } else {
      setCompanies((comps || []) as Company[]);
    }

    const { data: offs } = await supabase
      .from('offers')
      .select('id, title, subtitle, price, original_price, discount_percent, category, card_image_url, is_active, company_id')
      .order('created_at', { ascending: false });
    setOffers((offs || []) as OfferRow[]);

    const { data: ovs } = await supabase
      .from('bahofertas_establishment_overrides')
      .select('*');
    setOverrides(((ovs || []) as unknown) as BahOverride[]);
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleSaveOverride = async (companyId: string, data: Partial<BahOverride>) => {
    const existing = overrides.find(o => o.company_id === companyId);
    const payload = { ...data, company_id: companyId };

    if (existing) {
      const { error } = await supabase
        .from('bahofertas_establishment_overrides')
        .update(payload)
        .eq('id', existing.id);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('bahofertas_establishment_overrides')
        .insert(payload);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }
    }

    toast({ title: 'Salvo', description: 'Personalização atualizada com sucesso.' });
    await loadData();
  };

  const toggleQuickOverride = async (companyId: string, field: 'is_visible' | 'carousel_primary' | 'carousel_secondary' | 'carousel_tertiary', value: boolean) => {
    const existing = overrides.find(o => o.company_id === companyId);
    if (existing) {
      const { error } = await supabase
        .from('bahofertas_establishment_overrides')
        .update({ [field]: value } as never)
        .eq('id', existing.id);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('bahofertas_establishment_overrides')
        .insert({ company_id: companyId, [field]: value } as never);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }
    }
    await loadData();
  };

  const filteredCompanies = useMemo(() => {
    let list = [...companies];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.trade_name || '').toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter(c => {
        const ov = overrides.find(o => o.company_id === c.id);
        if (statusFilter === 'visible') return ov?.is_visible !== false;
        if (statusFilter === 'hidden') return ov?.is_visible === false;
        if (statusFilter === 'in-carousel') return !!(ov?.carousel_primary || ov?.carousel_secondary || ov?.carousel_tertiary);
        return true;
      });
    }
    return list.sort((a, b) => {
      const ovA = overrides.find(o => o.company_id === a.id);
      const ovB = overrides.find(o => o.company_id === b.id);
      const orderA = ovA?.display_order ?? 0;
      const orderB = ovB?.display_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [companies, overrides, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = companies.length;
    const withOverrides = overrides.filter(o => companies.some(c => c.id === o.company_id)).length;
    const inCarousel = overrides.filter(o =>
      companies.some(c => c.id === o.company_id) &&
      (o.carousel_primary || o.carousel_secondary || o.carousel_tertiary)
    ).length;
    const hidden = overrides.filter(o =>
      companies.some(c => c.id === o.company_id) && o.is_visible === false
    ).length;
    return { total, withOverrides, inCarousel, hidden };
  }, [companies, overrides]);

  const offersByCompany = useMemo(() => {
    const map = new Map<string, OfferRow[]>();
    for (const o of offers) {
      const arr = map.get(o.company_id) || [];
      arr.push(o);
      map.set(o.company_id, arr);
    }
    return map;
  }, [offers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      toast({ title: 'Atualizado', description: 'Lista de estabelecimentos recarregada.' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="flex items-start gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
              aria-expanded={isExpanded}
            >
              <div className="mt-1 shrink-0">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Gestão de Estabelecimentos Bah Ofertas
                </CardTitle>
                <CardDescription>
                  Gerencie manualmente todos os parceiros aprovados (sem integração com API): visual, carrosséis, visibilidade e ofertas
                </CardDescription>
              </div>
            </button>
            {isExpanded && (
              <Button
                variant="outline"
                size="sm"
                disabled={refreshing || loading}
                onClick={handleRefresh}
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}
          </div>

          {isExpanded && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              <div className="bg-background rounded-lg p-2 text-center border">
                <p className="text-lg font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Parceiros aprovados</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center border">
                <p className="text-lg font-bold text-blue-600">{stats.withOverrides}</p>
                <p className="text-xs text-muted-foreground">Editados</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center border">
                <p className="text-lg font-bold text-orange-600">{stats.inCarousel}</p>
                <p className="text-xs text-muted-foreground">Em carrosséis</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center border">
                <p className="text-lg font-bold text-red-600">{stats.hidden}</p>
                <p className="text-xs text-muted-foreground">Ocultos</p>
              </div>
            </div>
          )}
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nome, fantasia ou e-mail..."
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v: typeof statusFilter) => setStatusFilter(v)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="visible">Visíveis</SelectItem>
                      <SelectItem value="hidden">Ocultos</SelectItem>
                      <SelectItem value="in-carousel">Em carrosséis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredCompanies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum estabelecimento encontrado.
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {filteredCompanies.map((company) => {
                      const ov = overrides.find(o => o.company_id === company.id);
                      const isHidden = ov?.is_visible === false;
                      const inCarousel = !!(ov?.carousel_primary || ov?.carousel_secondary || ov?.carousel_tertiary);
                      const companyOffers = offersByCompany.get(company.id) || [];
                      const displayName = ov?.custom_name || company.trade_name || company.name;
                      const displayImg = ov?.custom_image_url || company.logo_url;

                      return (
                        <AccordionItem
                          key={company.id}
                          value={company.id}
                          className={`border rounded-lg overflow-hidden ${isHidden ? 'opacity-60' : ''}`}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                            <div className="flex items-center gap-3 flex-1 text-left">
                              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                {displayImg ? (
                                  <img src={displayImg} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Store className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm">{displayName}</h4>
                                  {ov && <Badge variant="secondary" className="text-[10px] h-4">Editado</Badge>}
                                  {isHidden && <Badge variant="destructive" className="text-[10px] h-4">Oculto</Badge>}
                                  {inCarousel && <Badge className="text-[10px] h-4 bg-blue-600">Carrossel</Badge>}
                                  {company.is_verified && <Badge variant="outline" className="text-[10px] h-4">Verificado</Badge>}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  <span>{company.email}</span>
                                  <span>{companyOffers.length} oferta(s)</span>
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>

                          <AccordionContent className="px-4 pb-4">
                            <div className="flex items-center justify-between mb-3 pb-3 border-b flex-wrap gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {ov?.carousel_primary && <Badge variant="outline" className="text-xs">Principal</Badge>}
                                {ov?.carousel_secondary && <Badge variant="outline" className="text-xs">Secundário</Badge>}
                                {ov?.carousel_tertiary && <Badge variant="outline" className="text-xs">Terciário</Badge>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCreatingOfferForCompany(company.id)}
                                >
                                  <Plus className="w-4 h-4 mr-1.5" />
                                  Nova oferta
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingCompany(company)}>
                                  <Edit className="w-4 h-4 mr-1.5" />
                                  Editar Estabelecimento
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-3">
                              <div className="flex items-center justify-between border rounded p-2">
                                <span className="text-xs">Visível</span>
                                <Switch
                                  checked={ov?.is_visible !== false}
                                  onCheckedChange={(v) => toggleQuickOverride(company.id, 'is_visible', v)}
                                />
                              </div>
                              <div className="flex items-center justify-between border rounded p-2">
                                <span className="text-xs">Principal</span>
                                <Switch
                                  checked={!!ov?.carousel_primary}
                                  onCheckedChange={(v) => toggleQuickOverride(company.id, 'carousel_primary', v)}
                                />
                              </div>
                              <div className="flex items-center justify-between border rounded p-2">
                                <span className="text-xs">Secundário</span>
                                <Switch
                                  checked={!!ov?.carousel_secondary}
                                  onCheckedChange={(v) => toggleQuickOverride(company.id, 'carousel_secondary', v)}
                                />
                              </div>
                              <div className="flex items-center justify-between border rounded p-2">
                                <span className="text-xs">Terciário</span>
                                <Switch
                                  checked={!!ov?.carousel_tertiary}
                                  onCheckedChange={(v) => toggleQuickOverride(company.id, 'carousel_tertiary', v)}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              {companyOffers.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                                  <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                                  <p className="text-sm font-medium">Nenhuma oferta cadastrada</p>
                                </div>
                              ) : (
                                companyOffers.map(offer => (
                                  <div
                                    key={offer.id}
                                    className="flex items-center justify-between gap-3 border rounded-lg p-2 bg-background"
                                  >
                                    <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                                      {offer.card_image_url ? (
                                        <img src={offer.card_image_url} alt={offer.title} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{offer.title}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>R$ {Number(offer.price).toFixed(2)}</span>
                                        {offer.discount_percent ? <Badge variant="secondary" className="text-[10px] h-4">-{offer.discount_percent}%</Badge> : null}
                                        {!offer.is_active && <Badge variant="destructive" className="text-[10px] h-4">Inativa</Badge>}
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingOffer(offer)}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>

      {editingCompany && (
        <EstablishmentEditModal
          company={editingCompany}
          override={overrides.find(o => o.company_id === editingCompany.id) || null}
          open={!!editingCompany}
          onClose={() => setEditingCompany(null)}
          onSave={handleSaveOverride}
        />
      )}

      {(editingOffer || creatingOfferForCompany) && (
        <BahofertasOfferEditor
          open={!!(editingOffer || creatingOfferForCompany)}
          onOpenChange={(o) => {
            if (!o) {
              setEditingOffer(null);
              setCreatingOfferForCompany(null);
            }
          }}
          offer={editingOffer ? ({ ...editingOffer, company_id: editingOffer.company_id } as never) : (creatingOfferForCompany ? ({ company_id: creatingOfferForCompany } as never) : null)}
          onSaved={() => {
            setEditingOffer(null);
            setCreatingOfferForCompany(null);
            loadData();
          }}
        />
      )}
    </>
  );
};
