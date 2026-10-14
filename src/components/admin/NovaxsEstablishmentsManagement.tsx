import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNovaxsAdminWeeklySnapshot } from '@/hooks/useNovaxsAdminWeeklySnapshot';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { dedupeNovaxsProducts as dedupeAdminProducts, getCanonicalProductId, getLegacyProductId, isGenericProductTitle } from '@/lib/novaxs-product-dedupe';
import {
  Search, Store, Loader2, Ticket, Clock, Users, Package,
  Edit, Eye, EyeOff, Save, X, Image, Star, MapPin, RefreshCw, Upload, AlertTriangle, ChevronDown, ChevronUp, Download
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
import type { Establishment, NovaxsProduct } from '@/data/novaxs-establishments';
import { classifyEstablishment, getRating } from '@/data/novaxs-establishments';
import { AddressSearchInput } from './AddressSearchInput';

interface EstablishmentOverride {
  id: string;
  novaxs_establishment_id: string;
  custom_name: string | null;
  custom_banner_url: string | null;
  custom_image_url: string | null;
  custom_description: string | null;
  carousel_primary: boolean;
  carousel_secondary: boolean;
  carousel_tertiary: boolean;
  is_visible: boolean;
  display_order: number;
  about_text: string | null;
  includes_included: string[] | null;
  includes_not_included: string[] | null;
  important_notes: string[] | null;
  banner_position: string;
  latitude: number | null;
  longitude: number | null;
  address_label: string | null;
}

interface ProductOverride {
  id: string;
  novaxs_product_id: string;
  novaxs_establishment_id: string;
  custom_name: string | null;
  custom_description: string | null;
  custom_image_url: string | null;
  custom_price_cents: number | null;
  custom_old_price_cents: number | null;
  is_visible: boolean;
  carousel_primary?: boolean;
  carousel_secondary?: boolean;
  carousel_tertiary?: boolean;
  updated_at?: string | null;
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const parseCurrencyCents = (value: string): number | null => {
  const cleaned = value
    .trim()
    .replace(/[^\d,.-]/g, '')
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : null;
};

const getEditableProductName = (name: string | null | undefined, productId: string, fallback = '') => {
  const cleaned = (name || '').trim();
  return cleaned && !isGenericProductTitle(cleaned, productId) ? cleaned : fallback;
};

const findMatchingProductOverride = (
  productOverrides: ProductOverride[],
  productId: string,
  establishmentId: string,
) => {
  const legacyProductId = getLegacyProductId(productId);
  // Match any override pointing to this product (canonical or legacy id), regardless
  // of establishment_id — the same product can be saved under different est ids
  // (e.g. legacy uploads). This keeps the admin view in sync with what the public
  // site actually renders via applyOverrides.
  const matches = productOverrides.filter(
    (o) => o.novaxs_product_id === productId || o.novaxs_product_id === legacyProductId,
  );
  if (matches.length === 0) return null;

  const ts = (o: ProductOverride) => (o.updated_at ? Date.parse(o.updated_at) : 0);
  const sortedByRecency = [...matches].sort((x, y) => ts(y) - ts(x));
  const exact = matches.find((o) => o.novaxs_establishment_id === establishmentId);
  const base: ProductOverride = { ...(exact || sortedByRecency[0]) };

  const isMeaningful = (v: unknown): boolean => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed === "") return false;
      if (!/[a-zA-Z0-9]/.test(trimmed)) return false;
    }
    return true;
  };
  const pickLatest = <K extends keyof ProductOverride>(field: K): ProductOverride[K] => {
    for (const o of sortedByRecency) {
      const v = o[field];
      if (field === "custom_name" && isGenericProductTitle(String(v || ""), productId)) continue;
      if (isMeaningful(v)) return v;
    }
    return base[field];
  };
  base.custom_name = pickLatest("custom_name");
  base.custom_description = pickLatest("custom_description");
  base.custom_image_url = pickLatest("custom_image_url");
  base.custom_price_cents = pickLatest("custom_price_cents");
  base.custom_old_price_cents = pickLatest("custom_old_price_cents");

  for (const o of matches) {
    if (o === base) continue;
    base.carousel_primary = base.carousel_primary || o.carousel_primary;
    base.carousel_secondary = base.carousel_secondary || o.carousel_secondary;
    base.carousel_tertiary = base.carousel_tertiary || o.carousel_tertiary;
    base.is_visible = base.is_visible || o.is_visible;
  }

  return base;
};

const CategoryBadge = ({ category }: { category: string }) => {
  const colors: Record<string, string> = {
    entretenimento: 'bg-blue-100 text-blue-800 border-blue-200',
    restaurante: 'bg-orange-100 text-orange-800 border-orange-200',
    servicos: 'bg-purple-100 text-purple-800 border-purple-200',
  };
  const labels: Record<string, string> = {
    entretenimento: 'Entretenimento',
    restaurante: 'Restaurante',
    servicos: 'Serviços',
  };
  return (
    <Badge variant="outline" className={colors[category] || ''}>
      {labels[category] || category}
    </Badge>
  );
};

// ─── Establishment Edit Modal ───────────────────────────────────────────────

interface EstablishmentEditModalProps {
  establishment: Establishment;
  override: EstablishmentOverride | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<EstablishmentOverride>) => Promise<void>;
}

interface GalleryImage {
  id: string;
  image_url: string;
  display_order: number;
}

const EstablishmentEditModal = ({ establishment, override, open, onClose, onSave }: EstablishmentEditModalProps) => {
  const [customName, setCustomName] = useState(override?.custom_name || '');
  const [bannerUrl, setBannerUrl] = useState(override?.custom_banner_url || '');
  const [imageUrl, setImageUrl] = useState(override?.custom_image_url || '');
  const [description, setDescription] = useState(override?.custom_description || '');
  const [carouselPrimary, setCarouselPrimary] = useState(override?.carousel_primary || false);
  const [carouselSecondary, setCarouselSecondary] = useState(override?.carousel_secondary || false);
  const [carouselTertiary, setCarouselTertiary] = useState(override?.carousel_tertiary || false);
  const [isVisible, setIsVisible] = useState(override?.is_visible ?? true);
  const [displayOrder, setDisplayOrder] = useState(override?.display_order || 0);
  const [bannerPosition, setBannerPosition] = useState(override?.banner_position || 'center');
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const bannerPreviewRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [aboutText, setAboutText] = useState(override?.about_text || '');
  const [includesIncluded, setIncludesIncluded] = useState(override?.includes_included?.join('\n') || '');
  const [includesNotIncluded, setIncludesNotIncluded] = useState(override?.includes_not_included?.join('\n') || '');
  const [importantNotes, setImportantNotes] = useState(override?.important_notes?.join('\n') || '');
  const [latitude, setLatitude] = useState<string>(override?.latitude != null ? String(override.latitude) : '');
  const [longitude, setLongitude] = useState<string>(override?.longitude != null ? String(override.longitude) : '');
  const [addressLabel, setAddressLabel] = useState<string>(override?.address_label || '');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const { toast } = useToast();

  // Fetch gallery images
  useEffect(() => {
    if (!open) return;
    setGalleryLoading(true);
    supabase
      .from('novaxs_establishment_gallery')
      .select('id, image_url, display_order')
      .eq('novaxs_establishment_id', establishment.id)
      .order('display_order')
      .then(({ data }) => {
        setGalleryImages((data as GalleryImage[]) || []);
        setGalleryLoading(false);
      });
  }, [open, establishment.id]);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const newImages: GalleryImage[] = [];
      const maxOrder = galleryImages.length > 0 ? Math.max(...galleryImages.map(g => g.display_order)) : -1;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadFile(file, 'establishments/gallery');
        const { data, error } = await supabase
          .from('novaxs_establishment_gallery')
          .insert({
            novaxs_establishment_id: establishment.id,
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
      console.error(err);
      toast({ title: 'Erro ao enviar imagens', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removeGalleryImage = async (id: string) => {
    await supabase.from('novaxs_establishment_gallery').delete().eq('id', id);
    setGalleryImages(prev => prev.filter(g => g.id !== id));
  };

  useEffect(() => {
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
  }, [override, open]);

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Arquivo muito grande. O tamanho máximo é 5MB.');
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${establishment.id.replace(/[^a-zA-Z0-9-]/g, '_')}_${Date.now()}.${ext}`;
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
      const url = await uploadFile(file, 'establishments/banners');
      setBannerUrl(url);
      toast({ title: 'Banner enviado com sucesso!' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao enviar banner', description: err?.message || 'Tente novamente.', variant: 'destructive' });
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
      const url = await uploadFile(file, 'establishments/images');
      setImageUrl(url);
      toast({ title: 'Imagem enviada com sucesso!' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro ao enviar imagem', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const parseLines = (text: string): string[] | null => {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      return lines.length > 0 ? lines : null;
    };
    try {
      await onSave({
        novaxs_establishment_id: establishment.id,
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar Estabelecimento: {establishment.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {(imageUrl || establishment.image) ? (
                <img src={imageUrl || establishment.image} alt={establishment.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Store className="w-6 h-6 text-muted-foreground" /></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{customName.trim() || establishment.name}</h3>
              {customName.trim() && (
                <p className="text-xs text-muted-foreground italic">Original (API): {establishment.name}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CategoryBadge category={establishment.category} />
                <span>{establishment.productCount} produtos</span>
                <span>⭐ {establishment.rating}</span>
              </div>
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
              placeholder={establishment.name}
            />
            <p className="text-xs text-muted-foreground">
              Sobrescreve o nome exibido nos cards e na página do estabelecimento. Deixe em branco para usar o nome original da API ({establishment.name}).
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
                  <Button type="button" variant="ghost" size="icon" onClick={() => downloadImage(bannerUrl, `banner-${establishment.id}.jpg`)} title="Baixar imagem">
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
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingPosition(true);
                  }}
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
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover pointer-events-none"
                    style={{ objectPosition: bannerPosition }}
                  />
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
                  <Button type="button" variant="ghost" size="icon" onClick={() => downloadImage(imageUrl, `imagem-${establishment.id}.jpg`)} title="Baixar imagem">
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
                      onClick={() => downloadImage(img.image_url, `galeria-${establishment.id}-${img.id}.jpg`)}
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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição customizada para este estabelecimento..." rows={3} />
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
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Product Edit Modal ─────────────────────────────────────────────────────

interface ProductEditModalProps {
  product: NovaxsProduct;
  establishmentId: string;
  override: ProductOverride | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ProductOverride>) => Promise<void>;
}

const ProductEditModal = ({ product, establishmentId, override, open, onClose, onSave }: ProductEditModalProps) => {
  const { toast } = useToast();
  const productId = getCanonicalProductId(product);
  const safeOverrideName = getEditableProductName(override?.custom_name, productId);
  // Apenas a descrição personalizada do admin é considerada — não pré-preenchemos com o memo da API.
  const [customName, setCustomName] = useState(safeOverrideName);
  const [customDescription, setCustomDescription] = useState(override?.custom_description || '');
  const [customImageUrl, setCustomImageUrl] = useState(override?.custom_image_url || '');
  const [customPriceReais, setCustomPriceReais] = useState(override?.custom_price_cents ? (override.custom_price_cents / 100).toFixed(2) : '');
  const [customOldPriceReais, setCustomOldPriceReais] = useState(override?.custom_old_price_cents ? (override.custom_old_price_cents / 100).toFixed(2) : '');
  const [isVisible, setIsVisible] = useState(override?.is_visible ?? true);
  const [carouselPrimary, setCarouselPrimary] = useState(override?.carousel_primary ?? false);
  const [carouselSecondary, setCarouselSecondary] = useState(override?.carousel_secondary ?? false);
  const [carouselTertiary, setCarouselTertiary] = useState(override?.carousel_tertiary ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCustomName(getEditableProductName(override?.custom_name, productId));
    setCustomDescription(override?.custom_description || '');
    setCustomImageUrl(override?.custom_image_url || '');
    setCustomPriceReais(override?.custom_price_cents ? (override.custom_price_cents / 100).toFixed(2) : '');
    setCustomOldPriceReais(override?.custom_old_price_cents ? (override.custom_old_price_cents / 100).toFixed(2) : '');
    setIsVisible(override?.is_visible ?? true);
    setCarouselPrimary(override?.carousel_primary ?? false);
    setCarouselSecondary(override?.carousel_secondary ?? false);
    setCarouselTertiary(override?.carousel_tertiary ?? false);
  }, [override, open, product.htmlMemo, product.memo, productId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const priceCents = parseCurrencyCents(customPriceReais);
      const oldPriceCents = parseCurrencyCents(customOldPriceReais);
      await onSave({
        novaxs_product_id: productId,
        novaxs_establishment_id: establishmentId,
        custom_name: getEditableProductName(customName, productId) || null,
        custom_description: customDescription.trim() || null,
        custom_image_url: customImageUrl || null,
        custom_price_cents: priceCents,
        custom_old_price_cents: oldPriceCents,
        is_visible: isVisible,
        carousel_primary: carouselPrimary,
        carousel_secondary: carouselSecondary,
        carousel_tertiary: carouselTertiary,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current info */}
          <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
            <p><strong>Original:</strong> {product.name}</p>
            <p><strong>Preço Original:</strong> {formatCurrency(product.priceCents)}</p>
            <p><strong>Tipo:</strong> {product.type || 'N/A'}</p>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {isVisible ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-destructive" />}
              <Label>Visível no site</Label>
            </div>
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
          </div>

          {/* Carousel selection */}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <Label className="font-semibold">Destacar este produto em carrosséis</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Escolha em quais carrosséis da página inicial este produto deve aparecer individualmente.
            </p>
            <div className="flex items-center justify-between">
              <Label htmlFor="carousel-primary" className="text-sm font-normal cursor-pointer">Carrossel Principal</Label>
              <Switch id="carousel-primary" checked={carouselPrimary} onCheckedChange={setCarouselPrimary} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="carousel-secondary" className="text-sm font-normal cursor-pointer">Carrossel Secundário</Label>
              <Switch id="carousel-secondary" checked={carouselSecondary} onCheckedChange={setCarouselSecondary} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="carousel-tertiary" className="text-sm font-normal cursor-pointer">Carrossel de Ofertas (Terciário)</Label>
              <Switch id="carousel-tertiary" checked={carouselTertiary} onCheckedChange={setCarouselTertiary} />
            </div>
          </div>

          {/* Custom name */}
          <div className="space-y-2">
            <Label>Nome Personalizado</Label>
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={product.name} />
          </div>

          {/* Custom price */}
          <div className="space-y-2">
            <Label>Preço Personalizado (R$)</Label>
            <Input type="text" inputMode="decimal" value={customPriceReais} onChange={(e) => setCustomPriceReais(e.target.value)} placeholder={(product.priceCents / 100).toFixed(2)} />
          </div>

          {/* Custom "de" (old) price — mostrado riscado nos cards para reforçar o desconto */}
          <div className="space-y-2">
            <Label>Preço "De" — valor cheio riscado (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={customOldPriceReais}
              onChange={(e) => setCustomOldPriceReais(e.target.value)}
              placeholder="Ex.: 260.00"
            />
            <p className="text-xs text-muted-foreground">
              Aparece riscado como "De: R$ …" acima do preço "A partir de" nos cards, deixando a oferta mais persuasiva. Deixe vazio para não exibir.
            </p>
          </div>

          {/* Custom image */}
          <div className="space-y-2">
            <Label>Imagem Personalizada</Label>
            <div className="flex gap-2">
              <Input value={customImageUrl} onChange={(e) => setCustomImageUrl(e.target.value)} placeholder="URL ou faça upload..." className="flex-1" />
              <Button type="button" variant="outline" size="icon" className="flex-shrink-0" disabled={saving} onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) {
                    toast({ title: 'Arquivo muito grande', description: 'O tamanho máximo é 5MB.', variant: 'destructive' });
                    return;
                  }
                  setSaving(true);
                  try {
                    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
                    const safeEstId = establishmentId.replace(/[^a-zA-Z0-9-_]/g, '_');
                    const safeProdId = getCanonicalProductId(product).replace(/[^a-zA-Z0-9-_]/g, '_');
                    const filePath = `products/${safeEstId}/${safeProdId}_${Date.now()}.${ext}`;
                    const { error: uploadError } = await supabase.storage.from('offer-images').upload(filePath, file, { 
                      upsert: true,
                      contentType: file.type || 'image/jpeg',
                    });
                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabase.storage.from('offer-images').getPublicUrl(filePath);
                    setCustomImageUrl(urlData.publicUrl);
                    toast({ title: 'Imagem enviada com sucesso!' });
                  } catch (err: any) {
                    console.error('Upload error:', err);
                    toast({ title: 'Erro ao enviar imagem', description: err?.message || 'Tente novamente.', variant: 'destructive' });
                  } finally {
                    setSaving(false);
                  }
                };
                input.click();
              }}>
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            {(customImageUrl || product.image) && (
              <div className="h-32 rounded-lg overflow-hidden bg-muted">
                <img src={customImageUrl || product.image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Custom description */}
          <div className="space-y-2">
            <Label>Descrição Personalizada</Label>
            <Textarea value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} placeholder="Descrição customizada..." rows={8} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Product Row with Edit ──────────────────────────────────────────────────

const ProductRowEditable = ({
  product, establishmentId, productOverrides, onEditProduct
}: {
  product: NovaxsProduct;
  establishmentId: string;
  productOverrides: ProductOverride[];
  onEditProduct: (product: NovaxsProduct) => void;
}) => {
  const productId = getCanonicalProductId(product);
  const override = findMatchingProductOverride(productOverrides, productId, establishmentId);
  const hasOverride = !!override;
  const isHidden = override?.is_visible === false;
  const hasSchedules = product.schedules && product.schedules.length > 0;
  const hasSubProducts = product.products && product.products.length > 0;

  const displayName = getEditableProductName(override?.custom_name, productId)
    || getEditableProductName(product.name, productId, product.type || 'Produto');
  const displayPrice = override?.custom_price_cents ?? product.priceCents;
  const displayOldPrice = override?.custom_old_price_cents && override.custom_old_price_cents > displayPrice
    ? override.custom_old_price_cents
    : null;

  return (
    <div className={`border rounded-lg p-3 transition-colors ${isHidden ? 'opacity-50 bg-muted/20' : 'hover:bg-muted/30'}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Image */}
        <div className="w-full sm:w-20 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
          {(override?.custom_image_url || product.image) ? (
            <img src={override?.custom_image_url || product.image} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm line-clamp-1">{displayName}</h4>
                {hasOverride && <Badge variant="secondary" className="text-[10px] h-4">Editado</Badge>}
                {isHidden && <Badge variant="destructive" className="text-[10px] h-4">Oculto</Badge>}
              </div>
                <p className="text-xs text-muted-foreground">ID: {productId} • Tipo: {product.type || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                {displayOldPrice && (
                  <p className="text-xs text-muted-foreground line-through">De: {formatCurrency(displayOldPrice)}</p>
                )}
                <p className="font-bold text-sm text-green-600">{formatCurrency(displayPrice)}</p>
                {override?.custom_price_cents && override.custom_price_cents !== product.priceCents && (
                  <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.priceCents)}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEditProduct(product)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {hasSchedules && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <Clock className="w-3 h-3 mr-1" />
                {product.schedules.length} horários
              </Badge>
            )}
            {hasSubProducts && (
              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                <Package className="w-3 h-3 mr-1" />
                Combo ({product.products!.length} itens)
              </Badge>
            )}
            {override?.carousel_primary && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                <Star className="w-3 h-3 mr-1" />Principal
              </Badge>
            )}
            {override?.carousel_secondary && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                <Star className="w-3 h-3 mr-1" />Secundário
              </Badge>
            )}
            {override?.carousel_tertiary && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                <Star className="w-3 h-3 mr-1" />Ofertas
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const NovaxsEstablishmentsManagement = () => {
  const { weeklyEstablishments, weeklyProducts, todayEstablishments, weekDates, loading, error, refetch } = useNovaxsAdminWeeklySnapshot();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [establishmentOverrides, setEstablishmentOverrides] = useState<EstablishmentOverride[]>([]);
  const [productOverrides, setProductOverrides] = useState<ProductOverride[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(true);

  // Edit modals
  const [editingEstablishment, setEditingEstablishment] = useState<Establishment | null>(null);
  const [editingProduct, setEditingProduct] = useState<{ product: NovaxsProduct; establishmentId: string } | null>(null);
  const todayEstablishmentIds = useMemo(() => new Set(todayEstablishments.map((est) => est.id)), [todayEstablishments]);
  const weeklyRangeLabel = weekDates.length > 0 ? `${weekDates[0]} até ${weekDates[weekDates.length - 1]}` : '';

  // Load overrides from Supabase
  const loadOverrides = useCallback(async () => {
    setOverridesLoading(true);
    try {
      const [estResult, prodResult] = await Promise.all([
        supabase.from('novaxs_establishment_overrides').select('*'),
        supabase.from('novaxs_product_overrides').select('*'),
      ]);
      if (estResult.data) setEstablishmentOverrides(estResult.data as EstablishmentOverride[]);
      if (prodResult.data) setProductOverrides(prodResult.data as ProductOverride[]);
    } catch (err) {
      console.error('Error loading overrides:', err);
    } finally {
      setOverridesLoading(false);
    }
  }, []);

  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  // Auto-sync: when API products load, save any new ones to DB automatically
  const autoSyncedRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (loading || overridesLoading || weeklyEstablishments.length === 0) return;
    
    const syncNewProducts = async () => {
      let newCount = 0;
      for (const est of weeklyEstablishments) {
        const snapshotSignature = est.products
          .map((product) => getCanonicalProductId(product))
          .sort()
          .join('|');

        if (autoSyncedRef.current.get(est.id) === snapshotSignature) continue;
        autoSyncedRef.current.set(est.id, snapshotSignature);
        
        for (const product of est.products) {
          const productId = getCanonicalProductId(product);
          const exists = !!findMatchingProductOverride(productOverrides, productId, est.id);
          if (!exists && product.priceCents > 0) {
            const { error } = await supabase
              .from('novaxs_product_overrides')
              .insert({
                novaxs_product_id: productId,
                novaxs_establishment_id: est.id,
                custom_name: getEditableProductName(product.name, productId) || null,
                custom_price_cents: product.priceCents,
                custom_image_url: product.image || null,
                // Não copiamos a descrição da API — admin define manualmente.
                custom_description: null,
                is_visible: true,
              });
            if (!error) newCount++;
          }
        }
      }
      if (newCount > 0) {
        console.log(`Auto-synced ${newCount} new products to DB`);
        await loadOverrides();
      }
    };
    syncNewProducts();
  }, [loading, overridesLoading, weeklyEstablishments, productOverrides, loadOverrides]);

  const handleSaveEstablishmentOverride = async (data: Partial<EstablishmentOverride>) => {
    const existing = establishmentOverrides.find(o => o.novaxs_establishment_id === data.novaxs_establishment_id);

    if (existing) {
      const { error } = await supabase
        .from('novaxs_establishment_overrides')
        .update(data)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('novaxs_establishment_overrides')
        .insert(data as any);
      if (error) throw error;
    }

    toast({ title: 'Estabelecimento atualizado', description: 'As alterações foram salvas com sucesso.' });
    await loadOverrides();
    // Invalidate the public-facing cache so the establishment page reflects changes immediately
    await queryClient.invalidateQueries({ queryKey: ['novaxs-products'] });
  };

  const handleSaveProductOverride = async (data: Partial<ProductOverride>) => {
    const productId = data.novaxs_product_id || '';
    const legacyProductId = getLegacyProductId(productId);
    const matchingRows = productOverrides.filter(
      o => o.novaxs_establishment_id === data.novaxs_establishment_id
        && (o.novaxs_product_id === productId || o.novaxs_product_id === legacyProductId)
    );
    const existing = productOverrides.find(
      o => o.novaxs_product_id === data.novaxs_product_id && o.novaxs_establishment_id === data.novaxs_establishment_id
    ) || matchingRows[0];

    const { novaxs_product_id, novaxs_establishment_id, ...mutableData } = data;

    if (existing) {
      const targetIds = matchingRows.length > 0 ? matchingRows.map(row => row.id) : [existing.id];
      const { error } = await supabase
        .from('novaxs_product_overrides')
        .update(mutableData)
        .in('id', targetIds);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('novaxs_product_overrides')
        .insert(data as any);
      if (error) throw error;
    }

    toast({ title: 'Produto atualizado', description: 'As alterações foram salvas com sucesso.' });
    localStorage.removeItem('novaxs-overrides-cache-v4');
    localStorage.removeItem('novaxs-overrides-cache-v3');
    localStorage.removeItem('novaxs-overrides-cache-v2');
    await loadOverrides();
    await queryClient.invalidateQueries({ queryKey: ['novaxs-overrides'] });
    await queryClient.invalidateQueries({ queryKey: ['novaxs-products'] });
  };

  const [syncingEstId, setSyncingEstId] = useState<string | null>(null);

  const handleSyncProductsToDB = async (est: Establishment) => {
    if (est.products.length === 0) {
      toast({ title: 'Sem produtos para sincronizar', description: 'Este estabelecimento não possui produtos carregados da API.', variant: 'destructive' });
      return;
    }
    setSyncingEstId(est.id);
    try {
      let synced = 0;
      for (const product of est.products) {
        const productId = getCanonicalProductId(product);
        const existing = findMatchingProductOverride(productOverrides, productId, est.id);
          if (existing) {
           // Only touch untouched records so admin edits are preserved
           if (!existing.custom_name && !existing.custom_price_cents && !existing.custom_description && !existing.custom_image_url) {
            await supabase
              .from('novaxs_product_overrides')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', existing.id);
          }
          synced++;
        } else {
          const { error } = await supabase
            .from('novaxs_product_overrides')
            .insert({
              novaxs_product_id: productId,
              novaxs_establishment_id: est.id,
              custom_name: getEditableProductName(product.name, productId) || null,
              custom_price_cents: product.priceCents,
              custom_image_url: product.image || null,
              // Não copiamos a descrição da API — admin define manualmente.
              custom_description: null,
              is_visible: true,
            });
          if (error) console.error('Sync error for product', productId, error);
          else synced++;
        }
      }
      toast({ title: 'Produtos sincronizados', description: `${synced} produtos salvos no banco de dados para ${est.name}.` });
      await loadOverrides();
    } catch (err) {
      console.error('Sync error:', err);
      toast({ title: 'Erro ao sincronizar', description: 'Ocorreu um erro ao salvar os produtos.', variant: 'destructive' });
    } finally {
      setSyncingEstId(null);
    }
  };

  // Merge establishments from overrides that aren't in the current API response
  // so the admin can always edit them even when closed/unavailable for the current date
  // Also inject virtual products from product overrides for unavailable establishments
  const allEstablishments = useMemo(() => {
    const apiIds = new Set(weeklyEstablishments.map(e => e.id));
    
    // For API establishments: keep only products realmente retornados pela API
    const enrichedEstablishments = weeklyEstablishments.map(est => {
      const normalizedApiProducts = dedupeAdminProducts(est.products);
      return {
        ...est,
        products: normalizedApiProducts,
        productCount: normalizedApiProducts.length,
      };
    });

    // Override-only establishments (not in API weekly window)
    const overrideOnlyEstablishments: Establishment[] = establishmentOverrides
      .filter(o => !apiIds.has(o.novaxs_establishment_id))
      .map(o => {
        const rawName = o.custom_name || o.novaxs_establishment_id
          .replace(/^est-/, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());

        // Pull SKUs from productOverrides so the admin can edit/see them
        const ownProductOverrides = productOverrides.filter(
          p => p.novaxs_establishment_id === o.novaxs_establishment_id,
        );
        const products: NovaxsProduct[] = ownProductOverrides.map((p) => ({
          id: p.novaxs_product_id,
          path: p.novaxs_product_id,
          name: getEditableProductName(p.custom_name, p.novaxs_product_id, 'Produto'),
          shortName: getEditableProductName(p.custom_name, p.novaxs_product_id, 'Produto'),
          type: '',
          price: (p.custom_price_cents || 0) / 100,
          priceCents: p.custom_price_cents || 0,
          available: 0,
          currency: 'BRL',
          image: p.custom_image_url || '',
          minAmount: 1,
          supplierName: rawName,
          schedules: [],
          products: [],
          form: [],
          token: '',
          memo: '',
          htmlMemo: p.custom_description || '',
          cancellationPolicies: '',
          category: '',
          destination: '',
          years: '',
          oldValue: undefined,
          dates: undefined,
        } as unknown as NovaxsProduct));

        const minPrice = products.reduce(
          (acc, p) => (p.price > 0 && (acc === 0 || p.price < acc) ? p.price : acc),
          0,
        );

        return {
          id: o.novaxs_establishment_id,
          name: rawName,
          category: classifyEstablishment(rawName),
          image: o.custom_image_url || '',
          rating: getRating(rawName),
          minPrice,
          productCount: products.length,
          products,
          carouselPrimary: o.carousel_primary,
          carouselSecondary: o.carousel_secondary,
          carouselTertiary: o.carousel_tertiary,
          aboutText: o.about_text,
          includesIncluded: o.includes_included,
          includesNotIncluded: o.includes_not_included,
          importantNotes: o.important_notes,
          bannerImage: o.custom_banner_url,
          bannerPosition: o.banner_position,
        } as Establishment;
      });

    return [...enrichedEstablishments, ...overrideOnlyEstablishments].sort((a, b) => a.name.localeCompare(b.name));
  }, [weeklyEstablishments, establishmentOverrides, productOverrides]);

  const filteredEstablishments = useMemo(() => {
    return allEstablishments.filter(est => {
      const matchesSearch = !searchTerm ||
        est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.products.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || est.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allEstablishments, searchTerm, categoryFilter]);

  const stats = useMemo(() => ({
    totalEstablishments: weeklyEstablishments.length,
    totalProducts: weeklyProducts.length,
    withOverrides: establishmentOverrides.length,
    hiddenEstablishments: establishmentOverrides.filter(o => !o.is_visible).length,
    inCarousel: establishmentOverrides.filter(o => o.carousel_primary || o.carousel_secondary || o.carousel_tertiary).length,
    unavailableToday: weeklyEstablishments.filter((est) => !todayEstablishmentIds.has(est.id)).length,
  }), [weeklyEstablishments, weeklyProducts, establishmentOverrides, todayEstablishmentIds]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando balanço semanal da NovaXS...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center">
          <p className="text-destructive font-medium">Erro ao carregar estabelecimentos</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

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
                  <Store className="w-5 h-5 text-primary" />
                  Gestão de Estabelecimentos NovaXS
                </CardTitle>
                <CardDescription>
                  Base semanal estática de 7 dias da API NovaXS, preservando todas as edições já salvas no admin
                </CardDescription>
              </div>
            </button>
            {isExpanded && (
              <Button
                variant="outline"
                size="sm"
                disabled={refreshing || loading}
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    autoSyncedRef.current.clear();
                    await queryClient.invalidateQueries({ queryKey: ["novaxs-admin-weekly-snapshot"] });
                    await refetch();
                    await loadOverrides();
                    toast({ title: 'Dados atualizados', description: 'Balanço semanal e overrides recarregados da API.' });
                  } catch {
                    toast({ title: 'Erro', description: 'Falha ao atualizar dados.', variant: 'destructive' });
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </Button>
            )}
          </div>

          {isExpanded && (<>

          <p className="text-xs text-muted-foreground mt-2">
            Janela semanal consolidada: {weeklyRangeLabel}. Os totais consideram todos os estabelecimentos e produtos encontrados nesses 7 dias.
          </p>

          {/* Weekly establishments list */}
          {weeklyEstablishments.length > 0 && (
            <details open className="mt-3 rounded-lg border bg-muted/30 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-foreground select-none">
                Balanço semanal — {weeklyEstablishments.length} estabelecimento(s) · {weeklyProducts.length} produto(s) totais
              </summary>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto pr-1">
                {[...weeklyEstablishments]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((est, idx) => {
                    const isAvailableToday = todayEstablishmentIds.has(est.id);
                    return (
                      <div
                        key={est.id}
                        className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1 text-xs"
                      >
                        <span className="truncate">
                          <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                          {est.name}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="text-muted-foreground">{est.productCount} prod.</span>
                          <span
                            className={`w-2 h-2 rounded-full ${isAvailableToday ? "bg-green-500" : "bg-amber-500"}`}
                            title={isAvailableToday ? "Disponível hoje" : "Indisponível hoje"}
                          />
                        </span>
                      </div>
                    );
                  })}
              </div>
            </details>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-3">
            <div className="bg-background rounded-lg p-2 text-center border">
              <p className="text-lg font-bold text-foreground">{stats.totalEstablishments}</p>
              <p className="text-xs text-muted-foreground">Estabelecimentos</p>
            </div>
            <div className="bg-background rounded-lg p-2 text-center border">
              <p className="text-lg font-bold text-foreground">{stats.totalProducts}</p>
              <p className="text-xs text-muted-foreground">Produtos</p>
            </div>
            <div className="bg-background rounded-lg p-2 text-center border">
              <p className="text-lg font-bold text-blue-600">{stats.withOverrides}</p>
              <p className="text-xs text-muted-foreground">Editados</p>
            </div>
            <div className="bg-background rounded-lg p-2 text-center border">
              <p className="text-lg font-bold text-orange-600">{stats.inCarousel}</p>
              <p className="text-xs text-muted-foreground">Em Carrosséis</p>
            </div>
            <div className="bg-background rounded-lg p-2 text-center border">
              <p className="text-lg font-bold text-red-600">{stats.hiddenEstablishments}</p>
              <p className="text-xs text-muted-foreground">Ocultos</p>
            </div>
            <div className="bg-background rounded-lg p-2 text-center border">
              <p className="text-lg font-bold text-amber-600">{stats.unavailableToday}</p>
              <p className="text-xs text-muted-foreground">Indisponíveis Hoje</p>
            </div>
          </div>
          </>)}
        </CardHeader>

        {isExpanded && (
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar estabelecimento ou produto..."
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                <SelectItem value="entretenimento">Entretenimento</SelectItem>
                <SelectItem value="restaurante">Restaurantes</SelectItem>
                <SelectItem value="servicos">Serviços</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Establishments */}
          {filteredEstablishments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum estabelecimento encontrado.
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {filteredEstablishments.map((est) => {
                const override = establishmentOverrides.find(o => o.novaxs_establishment_id === est.id);
                const isHidden = override?.is_visible === false;
                const hasOverride = !!override;
                const inCarousel = override?.carousel_primary || override?.carousel_secondary || override?.carousel_tertiary;
                const isUnavailable = !todayEstablishmentIds.has(est.id);

                return (
                  <AccordionItem key={est.id} value={est.id} className={`border rounded-lg overflow-hidden ${isHidden ? 'opacity-60' : ''}`}>
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                      <div className="flex items-center gap-3 flex-1 text-left">
                        {/* Image */}
                        <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {(override?.custom_image_url || est.image) ? (
                            <img src={override?.custom_image_url || est.image} alt={est.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{est.name}</h4>
                            <CategoryBadge category={est.category} />
                            {hasOverride && <Badge variant="secondary" className="text-[10px] h-4">Editado</Badge>}
                            {isHidden && <Badge variant="destructive" className="text-[10px] h-4">Oculto</Badge>}
                            {inCarousel && <Badge className="text-[10px] h-4 bg-blue-600">Carrossel</Badge>}
                            {isUnavailable && (
                              <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200">
                                <AlertTriangle className="w-3 h-3 mr-0.5" />
                                Indisponível Hoje
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded select-all">{est.id}</span>
                            <span>{est.productCount} produtos</span>
                            {est.minPrice > 0 && <span>A partir de {formatCurrency(est.minPrice)}</span>}
                            <span>⭐ {est.rating}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {/* Establishment actions */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b">
                        <div className="flex items-center gap-2 flex-wrap">
                          {override?.carousel_primary && <Badge variant="outline" className="text-xs">Principal</Badge>}
                          {override?.carousel_secondary && <Badge variant="outline" className="text-xs">Secundário</Badge>}
                          {override?.carousel_tertiary && <Badge variant="outline" className="text-xs">Terciário</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          {est.products.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncProductsToDB(est)}
                              disabled={syncingEstId === est.id}
                              className="text-green-700 border-green-300 hover:bg-green-50"
                            >
                              {syncingEstId === est.id ? (
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1.5" />
                              )}
                              Sincronizar Produtos
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditingEstablishment(est)}>
                            <Edit className="w-4 h-4 mr-1.5" />
                            Editar Estabelecimento
                          </Button>
                        </div>
                      </div>

                      {/* Products */}
                      <div className="space-y-2">
                        {est.products.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                            <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                            <p className="text-sm font-medium">Nenhum produto cadastrado</p>
                            <p className="text-xs mt-1">Não há produtos da API nem overrides salvos para este estabelecimento. As edições de banner, carrossel e informações continuam disponíveis.</p>
                          </div>
                        ) : (
                          dedupeAdminProducts(est.products).map((product) => (
                            <ProductRowEditable
                              key={product.id || product.path}
                              product={product}
                              establishmentId={est.id}
                              productOverrides={productOverrides}
                              onEditProduct={(p) => setEditingProduct({ product: p, establishmentId: est.id })}
                            />
                          ))
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
        )}
      </Card>

      {/* Edit Modals */}
      {editingEstablishment && (
        <EstablishmentEditModal
          establishment={editingEstablishment}
          override={establishmentOverrides.find(o => o.novaxs_establishment_id === editingEstablishment.id) || null}
          open={!!editingEstablishment}
          onClose={() => setEditingEstablishment(null)}
          onSave={handleSaveEstablishmentOverride}
        />
      )}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct.product}
          establishmentId={editingProduct.establishmentId}
          override={findMatchingProductOverride(productOverrides, getCanonicalProductId(editingProduct.product), editingProduct.establishmentId)}
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProductOverride}
        />
      )}
    </>
  );
};
