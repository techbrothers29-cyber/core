import { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Check, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';

interface OfferData {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  original_price: number;
  discount_percent?: number;
  category: string;
  city: string;
  company_id: string;
  card_image_url: string;
  banner_image_url: string;
  is_active: boolean;
}

interface UncontrolledOfferEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: OfferData | null;
  onSaved: () => void;
}

export function UncontrolledOfferEditor({ open, onOpenChange, offer, onSaved }: UncontrolledOfferEditorProps) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; trade_name: string | null }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [createdOfferId, setCreatedOfferId] = useState<string | null>(null);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // ID da oferta atual (ou criada recentemente)
  const currentOfferId = offer?.id || createdOfferId;
  const isCreating = !offer?.id;

  // Refs não controlados para inputs de texto (ZERO re-renders durante digitação)
  const titleRef = useRef<HTMLInputElement>(null);
  const subtitleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const originalPriceRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const companyRef = useRef<HTMLSelectElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const cardImageUrlRef = useRef<HTMLInputElement>(null);
  const bannerImageUrlRef = useRef<HTMLInputElement>(null);
  const isActiveRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Draft autosave para salvar automaticamente sem interromper digitação
  const handleSaveToDatabase = useCallback(async (draftData: OfferData) => {
    // Se estamos criando e ainda não temos ID, criar primeiro
    if (!currentOfferId) {
      const title = titleRef.current?.value?.trim() || '';
      const companyId = companyRef.current?.value?.trim();
      const price = parseFloat(priceRef.current?.value || '0');

      // Validação mínima para criar - company_id não pode ser vazio
      if (!title || !companyId || companyId === '' || price <= 0) {
        return; // Não criar ainda se faltar dados essenciais
      }

      const createData = {
        title,
        subtitle: subtitleRef.current?.value?.trim() || null,
        description: descriptionRef.current?.value?.trim() || null,
        price,
        original_price: parseFloat(originalPriceRef.current?.value || '0') || price,
        category: categoryRef.current?.value?.trim() || null,
        company_id: companyId,
        city: cityRef.current?.value?.trim() || null,
        card_image_url: cardImageUrlRef.current?.value?.trim() || null,
        banner_image_url: bannerImageUrlRef.current?.value?.trim() || null,
        is_active: isActiveRef.current?.checked ?? false,
      };

      const { data, error } = await supabase
        .from('offers')
        .insert(createData)
        .select('id')
        .single();

      if (error) throw error;
      if (data?.id) {
        setCreatedOfferId(data.id);
        toast({
          title: "✅ Rascunho Criado",
          description: "Continue editando. As alterações serão salvas automaticamente.",
          duration: 2000,
        });
      }
      return;
    }

    // Se já temos ID, apenas atualizar
    // Não atualizar se company_id estiver vazio (inválido)
    if (!draftData.company_id || draftData.company_id.trim() === '') {
      return; // Ignorar autosave se dados essenciais estiverem faltando
    }

    const updateData = {
      title: draftData.title?.trim() || '',
      subtitle: draftData.subtitle?.trim() || null,
      description: draftData.description?.trim() || null,
      price: draftData.price,
      original_price: draftData.original_price > 0 ? draftData.original_price : draftData.price,
      category: draftData.category?.trim() || null,
      company_id: draftData.company_id.trim(),
      city: draftData.city?.trim() || null,
      card_image_url: draftData.card_image_url?.trim() || null,
      banner_image_url: draftData.banner_image_url?.trim() || null,
      is_active: draftData.is_active,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', currentOfferId);

    if (error) throw error;
  }, [currentOfferId, toast]);

  const {
    draft,
    updateDraft,
    isTyping,
    isSaving,
    lastSavedAt,
    flushDraft,
    isDirty
  } = useDraftAutosave({
    initialData: offer || {
      title: '',
      subtitle: '',
      description: '',
      price: 0,
      original_price: 0,
      discount_percent: 0,
      category: '',
      city: '',
      company_id: '',
      card_image_url: '',
      banner_image_url: '',
      is_active: false
    } as OfferData,
    onSave: handleSaveToDatabase,
    debounceMs: 2000,
    enabled: open,
  });

  // Limpar ID criado quando fechar o modal
  useEffect(() => {
    if (!open) {
      setCreatedOfferId(null);
    }
  }, [open]);

  // Carregar companies e categories
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name, trade_name')
          .eq('is_active', true)
          .eq('is_verified', true)
          .order('name');

        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (companiesData) setCompanies(companiesData);
        if (categoriesData) setCategories(categoriesData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadData();
  }, []);

  // Inicializar valores quando o modal abre (APENAS UMA VEZ)
  useEffect(() => {
    if (open) {
      if (offer) {
        // Modo edição: preencher com dados existentes
        if (titleRef.current) titleRef.current.value = offer.title || '';
        if (subtitleRef.current) subtitleRef.current.value = offer.subtitle || '';
        if (descriptionRef.current) descriptionRef.current.value = offer.description || '';
        if (priceRef.current) priceRef.current.value = String(offer.price || '');
        if (originalPriceRef.current) originalPriceRef.current.value = String(offer.original_price || '');
        if (categoryRef.current) categoryRef.current.value = offer.category || '';
        if (companyRef.current) companyRef.current.value = offer.company_id || '';
        if (cityRef.current) cityRef.current.value = offer.city || '';
        if (cardImageUrlRef.current) cardImageUrlRef.current.value = offer.card_image_url || '';
        if (bannerImageUrlRef.current) bannerImageUrlRef.current.value = offer.banner_image_url || '';
        if (isActiveRef.current) isActiveRef.current.checked = offer.is_active !== false;
      } else {
        // Modo criação: limpar todos os campos
        if (titleRef.current) titleRef.current.value = '';
        if (subtitleRef.current) subtitleRef.current.value = '';
        if (descriptionRef.current) descriptionRef.current.value = '';
        if (priceRef.current) priceRef.current.value = '';
        if (originalPriceRef.current) originalPriceRef.current.value = '';
        if (categoryRef.current) categoryRef.current.value = '';
        if (companyRef.current) companyRef.current.value = '';
        if (cityRef.current) cityRef.current.value = '';
        if (cardImageUrlRef.current) cardImageUrlRef.current.value = '';
        if (bannerImageUrlRef.current) bannerImageUrlRef.current.value = '';
        if (isActiveRef.current) isActiveRef.current.checked = false;
      }
    }
  }, [open, offer?.id]);

  const handleSave = async () => {
    const title = titleRef.current?.value || '';
    const price = parseFloat(priceRef.current?.value || '0');
    const companyId = companyRef.current?.value?.trim();

    // Validação local (sem tocar no banco)
    if (!title.trim()) {
      toast({
        title: "Erro de Validação",
        description: "O título da oferta é obrigatório.",
        variant: "destructive",
      });
      titleRef.current?.focus();
      return;
    }

    if (!companyId || companyId === '') {
      toast({
        title: "Erro de Validação",
        description: "Selecione um estabelecimento.",
        variant: "destructive",
      });
      companyRef.current?.focus();
      return;
    }

    if (price <= 0) {
      toast({
        title: "Erro de Validação",
        description: "O preço deve ser maior que zero.",
        variant: "destructive",
      });
      priceRef.current?.focus();
      return;
    }

    try {
      // Se está criando e ainda não criou, criar agora
      if (isCreating && !currentOfferId) {
        await handleSaveToDatabase(draft);
      }

      // Flush: salvar tudo de uma vez
      await flushDraft();

      toast({
        title: isCreating ? "✅ Oferta Criada" : "✅ Oferta Atualizada",
        description: "Os dados foram salvos com sucesso.",
      });

      onSaved();

      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (error: any) {
      toast({
        title: "❌ Erro ao Salvar",
        description: error.message || "Falha ao salvar a oferta.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        "Você tem alterações não salvas. Deseja realmente descartar essas alterações?"
      );
      if (!confirmDiscard) return;
    }

    onOpenChange(false);
  };

  const uploadImage = async (file: File, type: 'card' | 'banner') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('offer-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('offer-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Erro no upload:', error);
      throw error;
    }
  };

  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingCard(true);
    try {
      const url = await uploadImage(file, 'card');
      if (cardImageUrlRef.current) {
        cardImageUrlRef.current.value = url;
      }
      setCardPreview(URL.createObjectURL(file));
      updateDraft('card_image_url', url);
      toast({
        title: "✅ Imagem carregada",
        description: "Imagem do card enviada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro no upload",
        description: error.message || "Falha ao enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingCard(false);
    }
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingBanner(true);
    try {
      const url = await uploadImage(file, 'banner');
      if (bannerImageUrlRef.current) {
        bannerImageUrlRef.current.value = url;
      }
      setBannerPreview(URL.createObjectURL(file));
      updateDraft('banner_image_url', url);
      toast({
        title: "✅ Imagem carregada",
        description: "Imagem do banner enviada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro no upload",
        description: error.message || "Falha ao enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{isCreating ? 'Criar Nova Oferta' : 'Editar Oferta'}</span>
            <div className="flex items-center gap-2">
              {isTyping && (
                <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                  Digitando...
                </span>
              )}
              {isSaving && (
                <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando rascunho...
                </span>
              )}
              {!isSaving && !isTyping && lastSavedAt && currentOfferId && (
                <span className="text-xs font-normal text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Salvo às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {!isSaving && !isTyping && !currentOfferId && isCreating && (
                <span className="text-xs font-normal text-gray-500 flex items-center gap-1">
                  Preencha os campos
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-6">
          <div className="space-y-3">
            <Label htmlFor="edit-title" className="text-sm font-medium flex items-center gap-1">
              Título da Oferta <span className="text-red-500">*</span>
            </Label>
            <input
              ref={titleRef}
              id="edit-title"
              type="text"
              defaultValue={offer?.title || ''}
              placeholder="Ex: Desconto de 50% em massagens relaxantes"
              className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              onInput={(e) => updateDraft('title', (e.target as HTMLInputElement).value)}
              autoComplete="off"
              spellCheck={false}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              data-lov-ignore="true"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="edit-subtitle" className="text-sm font-medium">
              Subtítulo
            </Label>
            <input
              ref={subtitleRef}
              id="edit-subtitle"
              type="text"
              defaultValue={offer?.subtitle || ''}
              placeholder="Ex: Válido para todas as sessões"
              className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              onInput={(e) => updateDraft('subtitle', (e.target as HTMLInputElement).value)}
              autoComplete="off"
              spellCheck={false}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              data-lov-ignore="true"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="edit-description" className="text-sm font-medium">
              Descrição Completa
            </Label>
            <textarea
              ref={descriptionRef}
              id="edit-description"
              defaultValue={offer?.description || ''}
              placeholder="Descreva os detalhes da oferta, condições, validade, etc..."
              rows={5}
              className="flex min-h-[120px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y"
              onInput={(e) => updateDraft('description', (e.target as HTMLTextAreaElement).value)}
              autoComplete="off"
              spellCheck={false}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              data-lov-ignore="true"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-3">
              <Label htmlFor="edit-original-price" className="text-sm font-medium">
                Preço Original (R$)
              </Label>
               <input
                ref={originalPriceRef}
                id="edit-original-price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={offer?.original_price || ''}
                placeholder="0"
                className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                onInput={(e) => updateDraft('original_price', parseFloat((e.target as HTMLInputElement).value) || 0)}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="edit-price" className="text-sm font-medium flex items-center gap-1">
                Preço da Oferta (R$) <span className="text-red-500">*</span>
              </Label>
               <input
                ref={priceRef}
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={offer?.price || ''}
                placeholder="0"
                className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                onInput={(e) => updateDraft('price', parseFloat((e.target as HTMLInputElement).value) || 0)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Desconto Calculado
              </Label>
              <div className="flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-lg font-semibold text-primary">
                {offer?.discount_percent || 0}%
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="edit-city" className="text-sm font-medium">
              Cidade
            </Label>
            <input
              ref={cityRef}
              id="edit-city"
              type="text"
              defaultValue={offer?.city || ''}
              placeholder="Ex: Gramado, Canela..."
              className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              onInput={(e) => updateDraft('city', (e.target as HTMLInputElement).value)}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="edit-company" className="text-sm font-medium flex items-center gap-1">
              Parceiro <span className="text-red-500">*</span>
            </Label>
            <select
              ref={companyRef}
              id="edit-company"
              defaultValue={offer?.company_id || ''}
              className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              onChange={(e) => updateDraft('company_id', e.target.value)}
            >
              <option value="">Selecione um parceiro</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.trade_name || company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="edit-category" className="text-sm font-medium">
                Categoria
              </Label>
              <select
                ref={categoryRef}
                id="edit-category"
                defaultValue={offer?.category || ''}
                className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                onChange={(e) => updateDraft('category', e.target.value)}
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Status da Oferta
              </Label>
              <div className="flex items-center h-11 space-x-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-white">
                <input
                  ref={isActiveRef}
                  id="edit-is-active"
                  type="checkbox"
                  defaultChecked={offer?.is_active !== false}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
                  onChange={(e) => updateDraft('is_active', e.target.checked)}
                />
                <Label htmlFor="edit-is-active" className="text-sm font-normal cursor-pointer">
                  Oferta Ativa
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="edit-card-image" className="text-sm font-medium flex items-center gap-1">
                Imagem do Card <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2">
                <input
                  ref={cardFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCardImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cardFileInputRef.current?.click()}
                  disabled={uploadingCard}
                  className="w-full h-11"
                >
                  {uploadingCard ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Escolher arquivo
                    </>
                  )}
                </Button>
                <input
                  ref={cardImageUrlRef}
                  type="url"
                  defaultValue={offer?.card_image_url || ''}
                  placeholder="URL da imagem"
                  className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  onInput={(e) => updateDraft('card_image_url', (e.target as HTMLInputElement).value)}
                />
                {(cardPreview || offer?.card_image_url) && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={cardPreview || offer?.card_image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {cardPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setCardPreview(null);
                          if (cardImageUrlRef.current) cardImageUrlRef.current.value = '';
                          updateDraft('card_image_url', '');
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="edit-banner-image" className="text-sm font-medium flex items-center gap-1">
                Imagem do Banner <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2">
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleBannerImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => bannerFileInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="w-full h-11"
                >
                  {uploadingBanner ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Escolher arquivo
                    </>
                  )}
                </Button>
                <input
                  ref={bannerImageUrlRef}
                  type="url"
                  defaultValue={offer?.banner_image_url || ''}
                  placeholder="URL da imagem"
                  className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  onInput={(e) => updateDraft('banner_image_url', (e.target as HTMLInputElement).value)}
                />
                {(bannerPreview || offer?.banner_image_url) && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={bannerPreview || offer?.banner_image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {bannerPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setBannerPreview(null);
                          if (bannerImageUrlRef.current) bannerImageUrlRef.current.value = '';
                          updateDraft('banner_image_url', '');
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-11 px-6 rounded-lg"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="h-11 px-6 rounded-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isCreating ? 'Criar Oferta' : 'Salvar Alterações'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
