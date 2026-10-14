import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Clock, CheckCircle, XCircle, AlertTriangle, Search, Check, X, Eye, DollarSign, Star, Plus, Edit, Trash2, Image, Layout, Store, Package, MoreHorizontal, Shuffle, Settings, Loader2, ChevronDown, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UncontrolledOfferEditor } from './UncontrolledOfferEditor';
import { NovaxsProductsSection } from './NovaxsProductsSection';

interface OfferStats {
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  totalViews: number;
  totalSales: number;
}

// Interface for RPC offer data
interface OfferRpcData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  original_price: number;
  discount_percent: number;
  category: string;
  city: string;
  is_active: boolean;
  is_featured: boolean;
  card_image_url: string;
  banner_image_url: string;
  created_at: string;
  updated_at: string;
  company_id: string;
  company_name: string;
  company_trade_name: string;
  company_is_verified: boolean;
  company_approval_status: string;
}

interface Company {
  id: string;
  name: string;
  trade_name?: string;
  is_verified: boolean;
  is_active: boolean;
  approval_status?: string;
}

interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  mobile_image_url?: string;
  desktop_image_url?: string;
  is_active: boolean;
  display_order?: number;
}

interface CarouselPartner {
  id: string;
  name: string;
  discount_percent: number;
  rating: number;
  image_url?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  is_active: boolean;
  display_order: number;
}

interface CarouselSettings {
  hero: {
    auto_rotation: boolean;
    rotation_interval: number;
    is_random_order: boolean;
  };
  partners: {
    auto_rotation: boolean;
    rotation_interval: number;
    is_random_order: boolean;
  };
  offers: {
    auto_rotation: boolean;
    rotation_interval: number;
    is_random_order: boolean;
  };
  secondary: {
    auto_rotation: boolean;
    rotation_interval: number;
    is_random_order: boolean;
  };
  tertiary: {
    auto_rotation: boolean;
    rotation_interval: number;
    is_random_order: boolean;
  };
}

interface OfferFormData {
  title: string;
  subtitle: string;
  description: string;
  price: number;
  original_price: number;
  discount_percent: number;
  category: string;
  city: string;
  company_id: string;
  card_image_url: string;
  banner_image_url: string;
}

interface Offer {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  price: number;
  original_price?: number;
  discount_percent?: number;
  is_active: boolean;
  featured_order: number;
  created_at: string;
  card_image_url?: string;
  banner_image_url?: string;
  city?: string;
  category?: string;
  company_id: string;
  companies?: {
    name: string;
    trade_name?: string;
    is_verified: boolean;
    approval_status?: string;
  };
}

export const OffersManagement = () => {
  const [stats, setStats] = useState<OfferStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    totalViews: 0,
    totalSales: 0
  });
  const [offers, setOffers] = useState<Offer[]>([]);
  const [featuredHomeOffers, setFeaturedHomeOffers] = useState<any[]>([]);
  const [secondaryFeaturedOffers, setSecondaryFeaturedOffers] = useState<any[]>([]);
  const [tertiaryFeaturedOffers, setTertiaryFeaturedOffers] = useState<any[]>([]);
  const [offerCarouselStatus, setOfferCarouselStatus] = useState<Record<string, {primary: boolean, secondary: boolean, tertiary: boolean}>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [bannerSlides, setBannerSlides] = useState<BannerSlide[]>([]);
  const [carouselPartners, setCarouselPartners] = useState<CarouselPartner[]>([]);
  const [carouselSettings, setCarouselSettings] = useState<CarouselSettings>({
    hero: { auto_rotation: true, rotation_interval: 2000, is_random_order: false },
    partners: { auto_rotation: true, rotation_interval: 3000, is_random_order: false },
    offers: { auto_rotation: true, rotation_interval: 3000, is_random_order: false },
    secondary: { auto_rotation: true, rotation_interval: 3000, is_random_order: false },
    tertiary: { auto_rotation: true, rotation_interval: 3000, is_random_order: false }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('offers');

  // Form states
  const [isCreateOfferOpen, setIsCreateOfferOpen] = useState(false);
  const [isEditOfferOpen, setIsEditOfferOpen] = useState(false);
  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [isCreateBannerOpen, setIsCreateBannerOpen] = useState(false);
  const [isEditPartnerOpen, setIsEditPartnerOpen] = useState(false);
  const [isCreatePartnerOpen, setIsCreatePartnerOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [includeTextInBanner, setIncludeTextInBanner] = useState(true);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [editingBanner, setEditingBanner] = useState<BannerSlide | null>(null);
  const [editingPartner, setEditingPartner] = useState<CarouselPartner | null>(null);
  
  // Estado controlado para edição de banner
  const [bannerFormData, setBannerFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    is_active: true,
    desktopFile: null as File | null,
    mobileFile: null as File | null,
  });

  // Estado para formulário de criação de ofertas
  const [localOfferFormData, setLocalOfferFormData] = useState<OfferFormData>({
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
    banner_image_url: ''
  });

  // Controla quando modal está aberto para desabilitar realtime
  const realtimeChannelsRef = useRef<any[]>([]);
  const isModalOpen = isCreateOfferOpen || isEditOfferOpen;

  const { toast } = useToast();

  // Handler for form data changes (for create form only)
  const handleFormChange = (field: keyof OfferFormData, value: any) => {
    setLocalOfferFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handlers for create form
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange('title', e.target.value);
  };

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange('subtitle', e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleFormChange('description', e.target.value);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange('price', parseFloat(e.target.value) || 0);
  };

  const handleOriginalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange('original_price', parseFloat(e.target.value) || 0);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange('city', e.target.value);
  };

  const handleCompanyChange = (value: string) => {
    handleFormChange('company_id', value);
  };

  const handleCategoryChange = (value: string) => {
    handleFormChange('category', value);
  };

  // Calculate real stats when offers data changes
  useEffect(() => {
    if (offers.length > 0) {
      const pending = offers.filter(o => !o.is_active).length;
      const approved = offers.filter(o => o.is_active && o.companies?.is_verified).length;
      const flagged = offers.filter(o => o.companies && !o.companies.is_verified).length;
      const rejected = offers.filter(o => o.companies?.approval_status === 'rejected').length;
      
      // Load sales data
      const loadSalesData = async () => {
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('status', 'completed');
        
        const totalSales = transactionsData?.length || 0;
        
        setStats({
          pending,
          approved,
          rejected,
          flagged,
          totalViews: 0, // Could be calculated from analytics if available
          totalSales
        });
      };
      
      loadSalesData();
    }
  }, [offers]);

  // Gerenciar listeners de realtime: pausar quando modal abrir
  useEffect(() => {
    // Pause realtime when edit modal is open
    if (isEditOfferOpen) {
      // Desinscrever de todos os canais quando modal de edição abrir
      console.log('Realtime paused - edit modal open');
      realtimeChannelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      realtimeChannelsRef.current = [];
    } else {
      // Reinscrever quando modal fechar - sincroniza com página inicial
      const offersChannel = supabase
        .channel('offers-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
          console.log('Sincronizando ofertas com página inicial...');
          loadOffersData();
          loadFeaturedHomeOffers();
        })
        .subscribe();

      const companiesChannel = supabase
        .channel('companies-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
          console.log('Sincronizando empresas...');
          loadCompaniesData();
          loadFeaturedHomeOffers(); // Recarrega ofertas quando empresa muda
        })
        .subscribe();

      const bannerChannel = supabase
        .channel('banner-slides-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'banner_slides' }, () => {
          console.log('Sincronizando banner slides...');
          loadBannerSlidesData();
        })
        .subscribe();

      const partnersChannel = supabase
        .channel('carousel-partners-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_partners' }, () => {
          console.log('Sincronizando parceiros do carrossel...');
          loadCarouselPartnersData();
        })
        .subscribe();

      const featuredOffersChannel = supabase
        .channel('featured-offers-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'featured_offers' }, () => {
          console.log('Sincronizando ofertas em destaque (3 carrosséis)...');
          loadOffersData();
          loadFeaturedHomeOffers();
        })
        .subscribe();

      realtimeChannelsRef.current = [
        offersChannel,
        companiesChannel,
        bannerChannel,
        partnersChannel,
        featuredOffersChannel
      ];
      
      console.log('Realtime ativo - sincronizado com página inicial');
    }

    return () => {
      realtimeChannelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      realtimeChannelsRef.current = [];
    };
  }, [isEditOfferOpen]);

  // Carregar dados iniciais
  useEffect(() => {
    loadOffersData();
    loadCompaniesData();
    loadBannerSlidesData();
    loadCarouselPartnersData();
    loadCarouselSettingsData();
    loadFeaturedHomeOffers();
  }, []);

  const loadFeaturedHomeOffers = async () => {
    try {
      console.log('🔄 Sincronizando todos os carrosséis da página inicial...');
      
      // Carregar todos em paralelo para melhor performance
      const [primaryResult, secondaryResult, tertiaryResult, featuredResult] = await Promise.all([
        // Carrossel principal (FeaturedSection)
        supabase.rpc('get_home_featured_offers'),
        // Carrossel secundário (SecondaryFeaturedSection)
        supabase.rpc('get_secondary_featured_offers'),
        // Carrossel terciário (TertiaryFeaturedSection)
        supabase.rpc('get_tertiary_featured_offers'),
        // Status de todas as ofertas em destaque
        supabase
          .from('featured_offers')
          .select('offer_id, carousel_section, is_active')
      ]);

      // Atualizar carrossel principal
      if (primaryResult.error) {
        console.error('❌ Erro ao carregar carrossel principal:', primaryResult.error);
      } else {
        setFeaturedHomeOffers(primaryResult.data || []);
        console.log('✅ Carrossel principal sincronizado:', primaryResult.data?.length || 0, 'ofertas');
      }

      // Atualizar carrossel secundário
      if (secondaryResult.error) {
        console.error('❌ Erro ao carregar carrossel secundário:', secondaryResult.error);
      } else {
        setSecondaryFeaturedOffers(secondaryResult.data || []);
        console.log('✅ Carrossel secundário sincronizado:', secondaryResult.data?.length || 0, 'ofertas');
      }

      // Atualizar carrossel terciário
      if (tertiaryResult.error) {
        console.error('❌ Erro ao carregar carrossel terciário:', tertiaryResult.error);
      } else {
        setTertiaryFeaturedOffers(tertiaryResult.data || []);
        console.log('✅ Carrossel terciário sincronizado:', tertiaryResult.data?.length || 0, 'ofertas');
      }

      // Criar mapa de status dos carrosséis
      if (!featuredResult.error && featuredResult.data) {
        const statusMap: Record<string, {primary: boolean, secondary: boolean, tertiary: boolean}> = {};
        
        featuredResult.data.forEach((item: any) => {
          if (!statusMap[item.offer_id]) {
            statusMap[item.offer_id] = { primary: false, secondary: false, tertiary: false };
          }
          if (item.is_active) {
            if (item.carousel_section === 'primary') {
              statusMap[item.offer_id].primary = true;
            } else if (item.carousel_section === 'secondary') {
              statusMap[item.offer_id].secondary = true;
            } else if (item.carousel_section === 'tertiary') {
              statusMap[item.offer_id].tertiary = true;
            }
          }
        });

        setOfferCarouselStatus(statusMap);
      }
    } catch (error) {
      console.error('Erro ao carregar ofertas em destaque:', error);
    }
  };

  const loadCompaniesData = async () => {
    setCompaniesLoading(true);
    try {
      // Primeiro tenta usar a função segura para admin
      const { data: secureData, error: secureError } = await supabase
        .rpc('get_company_admin_data_secure');
      
      if (secureData && secureData.length > 0) {
        setCompanies(secureData.map((company: any) => ({
          id: company.id,
          name: company.name,
          trade_name: company.trade_name,
          is_verified: company.is_verified,
          is_active: company.is_active,
          approval_status: company.approval_status
        })));
        return;
      }

      // Fallback para função pública se a segura não retornar dados
      const { data: publicData, error: publicError } = await supabase
        .rpc('get_public_company_marketplace_info');
      
      if (publicError) throw publicError;
      
      if (publicData && publicData.length > 0) {
        setCompanies(publicData.map((company: any) => ({
          id: company.id,
          name: company.name,
          trade_name: company.trade_name,
          is_verified: true, // Dados públicos só incluem verificados
          is_active: true,
          approval_status: 'approved'
        })));
      } else {
        console.warn('Nenhum parceiro encontrado');
        setCompanies([]);
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Load banner slides data from Supabase
  const loadBannerSlidesData = async () => {
    try {
      const { data, error } = await supabase
        .from('banner_slides')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setBannerSlides(data || []);
    } catch (error) {
      console.error('Erro ao carregar banner slides:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar os banner slides",
        variant: "destructive",
      });
    }
  };

  // Load carousel partners data from Supabase
  const loadCarouselPartnersData = async () => {
    try {
      const { data, error } = await supabase
        .from('carousel_partners')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setCarouselPartners(data || []);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
      toast({
        title: "Erro", 
        description: "Falha ao carregar os parceiros do carrossel",
        variant: "destructive",
      });
    }
  };

  // Load carousel settings from Supabase
  const loadCarouselSettingsData = async () => {
    try {
      const { data, error } = await supabase
        .from('carousel_settings')
        .select('*');

      if (error) throw error;

      const settings = data?.reduce((acc, setting) => {
        acc[setting.carousel_type as keyof CarouselSettings] = {
          auto_rotation: setting.auto_rotation,
          rotation_interval: setting.rotation_interval,
          is_random_order: setting.is_random_order
        };
        return acc;
      }, {} as CarouselSettings);

      setCarouselSettings(settings || {
        hero: { auto_rotation: true, rotation_interval: 2000, is_random_order: false },
        partners: { auto_rotation: true, rotation_interval: 3000, is_random_order: false },
        offers: { auto_rotation: true, rotation_interval: 3000, is_random_order: false },
        secondary: { auto_rotation: true, rotation_interval: 3000, is_random_order: false },
        tertiary: { auto_rotation: true, rotation_interval: 3000, is_random_order: false }
      });
    } catch (error) {
      console.error('Erro ao carregar configurações do carrossel:', error);
    }
  };

  const loadOffersData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Carregando ofertas do banco de dados...');
      
      // Use the new secure RPC function to get offers data
      const { data: offersData, error: offersError } = await supabase
        .rpc('get_offers_admin_data');

      if (offersError) {
        console.error('❌ Erro na função RPC:', offersError);
        console.log('Tentando consulta direta como fallback...');
        
        // Fallback to direct query without companies join to avoid RLS issues
        const { data: directOffersData, error: directError } = await supabase
          .from('offers')
          .select('*')
          .order('created_at', { ascending: false });

        if (directError) {
          console.error('❌ Erro na consulta direta:', directError);
          setOffers([]);
          toast({
            title: "Erro ao Carregar Ofertas",
            description: "Não foi possível carregar as ofertas. Verifique suas permissões.",
            variant: "destructive",
          });
          return;
        }
        
        console.log(`✅ ${directOffersData?.length || 0} ofertas carregadas via consulta direta`);
        
        // Get company info separately using secure function
        const companyIds = [...new Set(directOffersData?.map((o: any) => o.company_id).filter(Boolean))];
        let companiesMap = new Map();
        
        if (companyIds.length > 0) {
          const { data: companiesData } = await supabase
            .rpc('get_company_admin_data_secure');
          
          companiesData?.forEach((company: any) => {
            companiesMap.set(company.id, company);
          });
          console.log(`✅ ${companiesData?.length || 0} empresas carregadas`);
        }
        
        // Convert direct query data to the expected format
        const convertedDirectOffers = (directOffersData || []).map((offer: any) => {
          const company = companiesMap.get(offer.company_id);
          
          // Validar dados essenciais
          if (!offer.title || offer.title.trim() === '') {
            console.warn('⚠️ Oferta sem título encontrada:', offer.id);
          }
          
          return {
            ...offer,
            featured_order: offer.featured_order || 0,
            company_name: company?.name || 'Empresa não encontrada',
            company_trade_name: company?.trade_name,
            company_is_verified: company?.is_verified || false,
            company_approval_status: company?.approval_status || 'pending',
            is_featured: offer.featured_order > 0,
            companies: company ? {
              name: company.name,
              trade_name: company.trade_name,
              is_verified: company.is_verified,
              approval_status: company.approval_status
            } : {
              name: 'Empresa não encontrada',
              trade_name: '',
              is_verified: false,
              approval_status: 'pending'
            }
          };
        });

        setOffers(convertedDirectOffers);
        console.log('✅ Ofertas processadas e carregadas com sucesso');
      } else {
        console.log(`✅ ${offersData?.length || 0} ofertas carregadas via RPC`);
        
        // Convert RPC data to the expected Offer format
        const convertedOffers = (offersData as OfferRpcData[])?.map((offer: OfferRpcData) => {
          // Validar dados essenciais
          if (!offer.title || offer.title.trim() === '') {
            console.warn('⚠️ Oferta sem título encontrada:', offer.id);
          }
          
          return {
            ...offer,
            featured_order: offer.is_featured ? 1 : 0,
            companies: {
              name: offer.company_name || 'Empresa não encontrada',
              trade_name: offer.company_trade_name,
              is_verified: offer.company_is_verified || false,
              approval_status: offer.company_approval_status || 'pending'
            }
          };
        }) || [];

        setOffers(convertedOffers);
        console.log('✅ Ofertas RPC processadas e carregadas com sucesso');
      }

      // Load featured offers data for carousel management (without problematic joins)
      const { data: featuredOffersData, error: featuredError } = await supabase
        .from('featured_offers')
        .select('*')
        .order('display_order', { ascending: true });

      if (featuredError) {
        console.warn('⚠️ Nenhuma oferta em destaque configurada');
      } else {
        console.log(`✅ ${featuredOffersData?.length || 0} ofertas em destaque carregadas`);
      }
      
      // Get sales data from transactions (optional)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed');

      const totalSales = transactionsData?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
      console.log(`💰 Total de vendas: R$ ${totalSales.toFixed(2)}`);
      
    } catch (error) {
      console.error('❌ Erro crítico ao carregar ofertas:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar as ofertas. Tente recarregar a página.",
        variant: "destructive",
      });
      setOffers([]);
    } finally {
      setLoading(false);
      console.log('✅ Carregamento de ofertas concluído');
    }
  };

  const resetOfferForm = () => {
    const emptyForm = {
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
      banner_image_url: ''
    };
    setLocalOfferFormData(emptyForm);
  };

  const handleCreateOffer = async () => {
    // Validação dos campos obrigatórios usando estado local
    if (!localOfferFormData.title.trim()) {
      toast({
        title: "Erro de Validação",
        description: "O título da oferta é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!localOfferFormData.company_id) {
      toast({
        title: "Erro de Validação", 
        description: "Selecione um estabelecimento.",
        variant: "destructive",
      });
      return;
    }

    if (localOfferFormData.price <= 0) {
      toast({
        title: "Erro de Validação",
        description: "O preço da oferta deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (!localOfferFormData.card_image_url || !localOfferFormData.banner_image_url) {
      toast({
        title: "Erro de Validação",
        description: "É necessário fazer upload das imagens do card e do banner.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Remove discount_percent do objeto pois é uma coluna gerada automaticamente
      const { discount_percent, ...offerData } = localOfferFormData;
      
      console.log('Dados da oferta sendo enviados:', offerData);
      console.log('URLs das imagens:', {
        card: offerData.card_image_url,
        banner: offerData.banner_image_url
      });
      
      // Use RPC function to bypass RLS and ensure admin can create offers
      const { data: newOfferId, error } = await supabase
        .rpc('create_offer_admin', {
          company_id: offerData.company_id,
          title: offerData.title,
          price: offerData.price,
          card_image_url: offerData.card_image_url,
          banner_image_url: offerData.banner_image_url,
          subtitle: offerData.subtitle || null,
          description: offerData.description || null,
          original_price: offerData.original_price || null,
          category: offerData.category || null,
          city: offerData.city || null,
          is_active: false
        });

      if (error) throw error;

      toast({
        title: "Oferta Criada",
        description: "Nova oferta foi criada e está aguardando aprovação.",
      });
      
      setIsCreateOfferOpen(false);
      resetOfferForm();
      loadOffersData();
    } catch (error) {
      console.error('Erro ao criar oferta:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar a oferta. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleOfferSaved = async () => {
    // Recarregar todas as listas de ofertas
    await Promise.all([
      loadOffersData(),
      loadFeaturedHomeOffers()
    ]);
  };

  const openEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setIsEditOfferOpen(true);
  };

  // Handler to remove banner
  const handleRemoveBanner = async (banner: BannerSlide) => {
    try {
      const { error } = await supabase
        .from('banner_slides')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;

      toast({
        title: "Banner Removido",
        description: `Banner "${banner.title}" foi removido com sucesso.`,
      });
      
      loadBannerSlidesData();
    } catch (error) {
      console.error('Erro ao remover banner:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover o banner",
        variant: "destructive",
      });
    }
  };

  // Handler to edit banner
  const handleEditBanner = (banner: BannerSlide) => {
    setEditingBanner(banner);
    setBannerFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      is_active: banner.is_active,
      desktopFile: null,
      mobileFile: null,
    });
    setIsEditBannerOpen(true);
  };

  // Handler to save banner changes
  const handleSaveBanner = async (banner: BannerSlide) => {
    try {
      setUploadingImage(true);
      
      let desktopImageUrl = banner.desktop_image_url || banner.image_url;
      let mobileImageUrl = banner.mobile_image_url || banner.image_url;

      // Upload desktop image if file selected
      if (bannerFormData.desktopFile) {
        const file = bannerFormData.desktopFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `banner-desktop-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);
        
        desktopImageUrl = publicUrl;
      }

      // Upload mobile image if file selected
      if (bannerFormData.mobileFile) {
        const file = bannerFormData.mobileFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `banner-mobile-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('banners')
          .getPublicUrl(fileName);
        
        mobileImageUrl = publicUrl;
      }

      // Salvar com valores atuais do formulário (permite campos vazios)
      const updateData = {
        title: bannerFormData.title,
        subtitle: bannerFormData.subtitle,
        description: bannerFormData.description,
        desktop_image_url: desktopImageUrl,
        mobile_image_url: mobileImageUrl,
        image_url: desktopImageUrl, // Fallback
        is_active: bannerFormData.is_active,
        updated_at: new Date().toISOString()
      };
      
      console.log('Salvando banner com dados:', updateData);

      const { error } = await supabase
        .from('banner_slides')
        .update(updateData)
        .eq('id', banner.id);

      if (error) throw error;

      toast({
        title: "Banner Atualizado",
        description: "As alterações do banner foram salvas com sucesso.",
      });
      
      setIsEditBannerOpen(false);
      setEditingBanner(null);
      loadBannerSlidesData();
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar as alterações do banner",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handler to edit partner
  const handleEditPartner = (partner: CarouselPartner) => {
    setEditingPartner(partner);
    setIsEditPartnerOpen(true);
  };

  // Handler to create new partner
  const handleCreatePartner = async () => {
    try {
      const newPartner = {
        name: (document.getElementById('new-partner-name') as HTMLInputElement).value,
        discount_percent: parseInt((document.getElementById('new-partner-discount') as HTMLInputElement).value) || 0,
        rating: parseFloat((document.getElementById('new-partner-rating') as HTMLInputElement).value) || 5.0,
        image_url: (document.getElementById('new-partner-image') as HTMLInputElement).value || null,
        address: (document.getElementById('new-partner-address') as HTMLInputElement).value || null,
        phone: (document.getElementById('new-partner-phone') as HTMLInputElement).value || null,
        website: (document.getElementById('new-partner-website') as HTMLInputElement).value || null,
        description: (document.getElementById('new-partner-description') as HTMLTextAreaElement).value || null,
        is_active: (document.getElementById('new-partner-active') as HTMLInputElement).checked,
        display_order: carouselPartners.length + 1
      };

      const { error } = await supabase
        .from('carousel_partners')
        .insert([newPartner]);

      if (error) throw error;

      toast({
        title: "Parceiro Criado",
        description: `O parceiro "${newPartner.name}" foi adicionado ao carrossel.`,
      });
      
      setIsCreatePartnerOpen(false);
      loadCarouselPartnersData();
    } catch (error) {
      console.error('Erro ao criar parceiro:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar o parceiro",
        variant: "destructive",
      });
    }
  };

  // Toggle slide status
  const handleToggleSlideStatus = async (slide: BannerSlide) => {
    try {
      const { error } = await supabase
        .from('banner_slides')
        .update({ 
          is_active: !slide.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', slide.id);

      if (error) throw error;

      // Update local state
      setBannerSlides(prev => 
        prev.map(s => 
          s.id === slide.id 
            ? { ...s, is_active: !s.is_active }
            : s
        )
      );

      toast({
        title: slide.is_active ? "Slide desativado" : "Slide ativado",
        description: `O slide "${slide.title}" foi ${slide.is_active ? 'desativado' : 'ativado'} com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao alterar status do slide:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do slide.",
        variant: "destructive",
      });
    }
  };

  // Handler to save partner changes
  const handleSavePartner = async (partner: CarouselPartner) => {
    try {
      const nameElement = document.getElementById('partner-name') as HTMLInputElement;
      const discountElement = document.getElementById('partner-discount') as HTMLInputElement;
      const ratingElement = document.getElementById('partner-rating') as HTMLInputElement;
      const imageElement = document.getElementById('partner-image-url') as HTMLInputElement;
      const activeElement = document.getElementById('partner-active') as HTMLInputElement;

      const { error } = await supabase
        .from('carousel_partners')
        .update({
          name: nameElement?.value || partner.name,
          discount_percent: parseInt(discountElement?.value?.replace('%', '') || partner.discount_percent.toString()),
          rating: parseFloat(ratingElement?.value || partner.rating.toString()),
          image_url: imageElement?.value || partner.image_url,
          is_active: activeElement?.checked ?? partner.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', partner.id);

      if (error) throw error;

      toast({
        title: "Parceiro Atualizado",
        description: `As informações do parceiro foram atualizadas com sucesso.`,
      });
      
      setIsEditPartnerOpen(false);
      loadCarouselPartnersData();
    } catch (error) {
      console.error('Erro ao salvar parceiro:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar as alterações do parceiro",
        variant: "destructive",
      });
    }
  };

  // Handler to remove partner
  const handleRemovePartner = async (partner: CarouselPartner) => {
    try {
      const { error } = await supabase
        .from('carousel_partners')
        .delete()
        .eq('id', partner.id);

      if (error) throw error;

      toast({
        title: "Parceiro Removido",
        description: `Parceiro "${partner.name}" foi removido do carrossel.`,
      });
      
      loadCarouselPartnersData();
    } catch (error) {
      console.error('Erro ao remover parceiro:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover o parceiro",
        variant: "destructive",
      });
    }
  };

  // Handler to change rotation time
  const handleChangeRotationTime = async (carouselType: keyof CarouselSettings, interval: number) => {
    try {
      const { error } = await supabase
        .from('carousel_settings')
        .update({
          rotation_interval: interval,
          auto_rotation: true,
          updated_at: new Date().toISOString()
        })
        .eq('carousel_type', carouselType);

      if (error) throw error;

      toast({
        title: "Configuração Atualizada",
        description: `Tempo de rotação do ${carouselType} alterado para ${interval / 1000} segundos`,
      });
      
      loadCarouselSettingsData();
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar a configuração do carrossel",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewBanner = () => {
    setIsCreateBannerOpen(true);
  };

  const handleUploadAndCreateBanner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadingImage(true);

    try {
      const formData = new FormData(event.currentTarget);
      const desktopFile = formData.get('banner-image-desktop') as File;
      const mobileFile = formData.get('banner-image-mobile') as File;
      const title = includeTextInBanner ? (formData.get('banner-title') as string) : '';
      const subtitle = includeTextInBanner ? (formData.get('banner-subtitle') as string) : '';
      const description = includeTextInBanner ? (formData.get('banner-description') as string) : '';
      const isActive = formData.get('banner-active') === 'on';

      // Validação: sempre exigir ambas as imagens, e campos de texto apenas se includeTextInBanner for true
      if (!desktopFile || !mobileFile) {
        toast({
          title: "Erro",
          description: "Selecione imagens para desktop e mobile",
          variant: "destructive",
        });
        return;
      }

      if (includeTextInBanner && (!title || !subtitle || !description)) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos de texto ou desative a opção de texto",
          variant: "destructive",
        });
        return;
      }

      // Upload da imagem desktop para o Supabase Storage
      const desktopFileExt = desktopFile.name.split('.').pop();
      const desktopFileName = `desktop-${Date.now()}-${Math.random().toString(36).substring(2)}.${desktopFileExt}`;
      const desktopFilePath = `${desktopFileName}`;

      const { error: desktopUploadError } = await supabase.storage
        .from('banners')
        .upload(desktopFilePath, desktopFile);

      if (desktopUploadError) throw desktopUploadError;

      // Upload da imagem mobile para o Supabase Storage
      const mobileFileExt = mobileFile.name.split('.').pop();
      const mobileFileName = `mobile-${Date.now()}-${Math.random().toString(36).substring(2)}.${mobileFileExt}`;
      const mobileFilePath = `${mobileFileName}`;

      const { error: mobileUploadError } = await supabase.storage
        .from('banners')
        .upload(mobileFilePath, mobileFile);

      if (mobileUploadError) throw mobileUploadError;

      // Obter as URLs públicas das imagens
      const { data: { publicUrl: desktopPublicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(desktopFilePath);

      const { data: { publicUrl: mobilePublicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(mobileFilePath);

      // Obter a próxima ordem de exibição
      const { data: existingSlides, error: countError } = await supabase
        .from('banner_slides')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      if (countError) throw countError;

      const nextOrder = existingSlides && existingSlides.length > 0 
        ? existingSlides[0].display_order + 1 
        : 1;

      // Criar o novo slide no banco de dados
      const { error: insertError } = await supabase
        .from('banner_slides')
        .insert({
          title,
          subtitle,
          description,
          image_url: desktopPublicUrl, // Fallback
          desktop_image_url: desktopPublicUrl,
          mobile_image_url: mobilePublicUrl,
          is_active: isActive,
          display_order: nextOrder
        });

      if (insertError) throw insertError;

      toast({
        title: "Slide Criado",
        description: "O novo slide foi adicionado com sucesso ao carrossel!",
      });

      setIsCreateBannerOpen(false);
      setIncludeTextInBanner(true); // Reset para próxima vez
      loadBannerSlidesData();
    } catch (error) {
      console.error('Erro ao criar slide:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar o novo slide. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Handler to toggle random order
  const handleToggleRandomOrder = async (carouselType: keyof CarouselSettings) => {
    try {
      const currentRandomOrder = carouselSettings[carouselType]?.is_random_order || false;
      
      const { error } = await supabase
        .from('carousel_settings')
        .update({
          is_random_order: !currentRandomOrder,
          updated_at: new Date().toISOString()
        })
        .eq('carousel_type', carouselType);

      if (error) throw error;

      toast({
        title: "Configuração Atualizada",
        description: `Ordem ${!currentRandomOrder ? 'aleatória ativada' : 'sequencial ativada'} para ${carouselType}`,
      });
      
      loadCarouselSettingsData();
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar a configuração do carrossel",
        variant: "destructive",
      });
    }
  };

  const handleApproveOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: true })
        .eq('id', offerId);

      if (error) throw error;

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        action: 'approve_offer',
        entity_type: 'offer',
        entity_id: offerId,
        description: 'Oferta aprovada e ativada pelo admin',
      });

      toast({
        title: "Oferta Aprovada",
        description: "A oferta foi aprovada e está agora ativa.",
      });
      
      loadOffersData();
    } catch (error) {
      console.error('Erro ao aprovar oferta:', error);
      toast({
        title: "Erro",
        description: "Falha ao aprovar a oferta",
        variant: "destructive",
      });
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: false })
        .eq('id', offerId);

      if (error) throw error;

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        action: 'reject_offer',
        entity_type: 'offer',
        entity_id: offerId,
        description: `Oferta rejeitada pelo admin. ${rejectReason ? 'Motivo: ' + rejectReason : ''}`,
      });

      toast({
        title: "Oferta Rejeitada",
        description: "A oferta foi rejeitada e desativada.",
      });
      
      loadOffersData();
      setSelectedOffer(null);
      setRejectReason('');
    } catch (error) {
      console.error('Erro ao rejeitar oferta:', error);
      toast({
        title: "Erro",
        description: "Falha ao rejeitar a oferta",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (offerId: string, carouselSection: 'primary' | 'secondary' | 'tertiary', isActive: boolean) => {
    try {
      if (isActive) {
        // Adicionar à featured_offers
        const { error } = await supabase
          .from('featured_offers')
          .insert({
            offer_id: offerId,
            carousel_section: carouselSection,
            is_active: true,
            display_order: 1
          });

        if (error) throw error;
      } else {
        // Remover da featured_offers
        const { error } = await supabase
          .from('featured_offers')
          .delete()
          .eq('offer_id', offerId)
          .eq('carousel_section', carouselSection);

        if (error) throw error;
      }

      toast({
        title: isActive ? "Oferta Destacada" : "Destaque Removido",
        description: `A oferta foi ${isActive ? 'adicionada ao' : 'removida do'} ${carouselSection === 'primary' ? 'carrossel principal' : 'carrossel secundário'}.`,
      });
      
      await loadOffersData();
      await loadFeaturedHomeOffers();
    } catch (error) {
      console.error('Erro ao alterar destaque:', error);
      toast({
        title: "Erro",
        description: "Falha ao alterar o destaque da oferta",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: "Oferta Excluída",
        description: "A oferta foi excluída permanentemente.",
      });
      
      loadOffersData();
    } catch (error) {
      console.error('Erro ao excluir oferta:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir a oferta",
        variant: "destructive",
      });
    }
  };

  const filteredOffers = useMemo(() => {
    return offers.filter(offer => {
      // Mostrar TODAS as ofertas, incluindo as sem título (admin precisa ver e corrigir)
      if (!offer.title || offer.title.trim() === '') {
        console.warn('⚠️ Oferta sem título encontrada (será exibida para correção):', offer.id);
      }
      
      const matchesSearch = !searchTerm || 
                           (offer.title && offer.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           offer.companies?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && offer.is_active) ||
                           (statusFilter === 'inactive' && !offer.is_active) ||
                           (statusFilter === 'featured' && offer.featured_order > 0);

      const matchesCategory = categoryFilter === 'all' || offer.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [offers, searchTerm, statusFilter, categoryFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getStatusBadge = (offer: Offer) => {
    // Prioridade máxima: dados inválidos
    if (!offer.title || offer.title.trim() === '') {
      return <Badge variant="destructive" className="text-xs">⚠️ SEM TÍTULO - CORRIGIR</Badge>;
    }
    if (!offer.companies?.is_verified) {
      return <Badge variant="destructive" className="text-xs">Empresa não verificada</Badge>;
    }
    if (offer.is_active && offer.featured_order > 0) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Destaque Ativo</Badge>;
    }
    if (offer.is_active) {
      return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Ativo na Página</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Aguardando Aprovação</Badge>;
  };

  const categories = ['all', 'Bem-estar', 'Barbearia', 'Gastronomia', 'Hospedagem', 'Serviços'];

  // Removido o retorno antecipado para evitar desmontar o formulário durante carregamentos
  // O indicador de carregamento será mostrado apenas na lista de ofertas para não interromper a digitação.

  const OfferForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="company" className="text-sm font-semibold flex items-center gap-1">
            Estabelecimento 
            <span className="text-destructive">*</span>
          </Label>
          <Select value={localOfferFormData.company_id} onValueChange={handleCompanyChange}>
            <SelectTrigger className="min-h-[48px] sm:min-h-[44px] transition-all duration-200">
              <SelectValue placeholder="Selecione um estabelecimento" />
            </SelectTrigger>
            <SelectContent>
              {companiesLoading ? (
                <SelectItem value="loading" disabled>
                  Carregando parceiros...
                </SelectItem>
              ) : companies.length === 0 ? (
                <SelectItem value="empty" disabled>
                  Nenhum parceiro encontrado
                </SelectItem>
              ) : (
                // Organizar por status de verificação e depois por nome
                companies
                  .sort((a, b) => {
                    // Parceiros verificados primeiro
                    if (a.is_verified && !b.is_verified) return -1;
                    if (!a.is_verified && b.is_verified) return 1;
                    // Depois ordenar alfabeticamente
                    return a.name.localeCompare(b.name);
                  })
                  .map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {company.trade_name || company.name}
                        </span>
                        {company.trade_name && company.name !== company.trade_name && (
                          <span className="text-xs text-muted-foreground">
                            {company.name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          {company.is_verified ? (
                            <span className="text-green-600">✓ Verificado</span>
                          ) : (
                            <span className="text-orange-600">⚠ Não verificado</span>
                          )}
                          {company.approval_status && (
                            <span className={`${
                              company.approval_status === 'approved' ? 'text-green-600' :
                              company.approval_status === 'rejected' ? 'text-red-600' :
                              'text-yellow-600'
                            }`}>
                              • {company.approval_status === 'approved' ? 'Aprovado' :
                                 company.approval_status === 'rejected' ? 'Rejeitado' :
                                 'Pendente'}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-semibold">Categoria</Label>
          <Select value={localOfferFormData.category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="min-h-[48px] sm:min-h-[44px] transition-all duration-200">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.filter(cat => cat !== 'all').map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-1">
          Título da Oferta 
          <span className="text-destructive">*</span>
        </Label>
          <Input
            key="offer-title-input"
            id="title"
            value={localOfferFormData.title}
            onChange={handleTitleChange}
            placeholder="Ex: Desconto de 50% em massagens relaxantes"
            className="w-full text-base sm:text-sm min-h-[48px] sm:min-h-[44px] px-4 py-2 transition-all duration-200"
            autoComplete="off"
          />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitle" className="text-sm font-semibold">Subtítulo</Label>
          <Input
            key="offer-subtitle-input"
            id="subtitle"
            value={localOfferFormData.subtitle}
            onChange={handleSubtitleChange}
            placeholder="Ex: Válido para todas as sessões"
            className="w-full text-base sm:text-sm min-h-[48px] sm:min-h-[44px] px-4 py-2 transition-all duration-200"
            autoComplete="off"
          />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-semibold">Descrição Completa</Label>
          <Textarea
            key="offer-description-textarea"
            id="description"
            value={localOfferFormData.description}
            onChange={handleDescriptionChange}
            placeholder="Descreva os detalhes da oferta, condições, validade, etc..."
            rows={5}
            className="w-full text-base sm:text-sm min-h-[120px] px-4 py-3 resize-y transition-all duration-200"
            autoComplete="off"
          />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="original_price" className="text-sm font-semibold">Preço Original (R$)</Label>
          <Input
            id="original_price"
            type="number"
            step="0.01"
            min="0"
            value={localOfferFormData.original_price}
            onChange={handleOriginalPriceChange}
            placeholder="150.00"
            className="min-h-[48px] sm:min-h-[44px] px-4 transition-all duration-200"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="price" className="text-sm font-semibold flex items-center gap-1">
            Preço da Oferta (R$) 
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={localOfferFormData.price}
            onChange={handlePriceChange}
            placeholder="75.00"
            className="min-h-[48px] sm:min-h-[44px] px-4 transition-all duration-200"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Desconto Calculado</Label>
          <div className="min-h-[48px] sm:min-h-[44px] flex items-center justify-center px-4 border rounded-md bg-muted/50 font-bold text-lg text-primary">
            {localOfferFormData.original_price > 0 
              ? `${Math.round(((localOfferFormData.original_price - localOfferFormData.price) / localOfferFormData.original_price) * 100)}%`
              : '0%'
            }
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city" className="text-sm font-semibold">Cidade</Label>
        <Input
          id="city"
          value={localOfferFormData.city}
          onChange={handleCityChange}
          placeholder="Ex: Gramado, Canela..."
          className="min-h-[48px] sm:min-h-[44px] px-4 transition-all duration-200"
          autoComplete="off"
          spellCheck={false}
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          data-lov-ignore="true"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label htmlFor="card_image" className="text-sm font-semibold flex items-center gap-1">
            Imagem do Card
            <span className="text-destructive">*</span>
          </Label>
          <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
            <Input
              id="card_image"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadingImage(true);
                  try {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('cards')
                      .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                      });

                    if (uploadError) throw uploadError;

                    // Get the public URL from Supabase
                    const { data: { publicUrl } } = supabase.storage
                      .from('cards')
                      .getPublicUrl(fileName);

                    handleFormChange('card_image_url', publicUrl);

                    toast({
                      title: "Sucesso!",
                      description: "Imagem do card enviada com sucesso.",
                    });
                  } catch (error) {
                    console.error('Erro ao fazer upload:', error);
                    toast({
                      title: "Erro",
                      description: "Falha ao enviar a imagem. Tente novamente.",
                      variant: "destructive",
                    });
                  } finally {
                    setUploadingImage(false);
                  }
                }
              }}
              disabled={uploadingImage}
              className="cursor-pointer"
            />
            {uploadingImage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando imagem do card...
              </div>
            )}
            {localOfferFormData.card_image_url && !uploadingImage && (
              <div className="mt-3">
                <img 
                  src={localOfferFormData.card_image_url}
                  alt="Preview do card" 
                  className="w-full max-w-xs rounded-lg border"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="banner_image" className="text-sm font-semibold flex items-center gap-1">
            Imagem do Banner
            <span className="text-destructive">*</span>
          </Label>
          <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
            <Input
              id="banner_image"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadingImage(true);
                  try {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('banners')
                      .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                      });

                    if (uploadError) throw uploadError;

                    // Get the public URL from Supabase
                    const { data: { publicUrl } } = supabase.storage
                      .from('banners')
                      .getPublicUrl(fileName);

                    handleFormChange('banner_image_url', publicUrl);

                    toast({
                      title: "Sucesso!",
                      description: "Imagem do banner enviada com sucesso.",
                    });
                  } catch (error) {
                    console.error('Erro ao fazer upload:', error);
                    toast({
                      title: "Erro",
                      description: "Falha ao enviar a imagem. Tente novamente.",
                      variant: "destructive",
                    });
                  } finally {
                    setUploadingImage(false);
                  }
                }
              }}
              disabled={uploadingImage}
              className="cursor-pointer"
            />
            {uploadingImage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando imagem do banner...
              </div>
            )}
            {localOfferFormData.banner_image_url && !uploadingImage && (
              <div className="mt-3">
                <img 
                  src={localOfferFormData.banner_image_url}
                  alt="Preview do banner" 
                  className="w-full max-w-md rounded-lg border"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Gestão de Ofertas</h2>
          <p className="text-muted-foreground">Controle completo das ofertas e banners da plataforma</p>
        </div>
        
        <Dialog open={isCreateOfferOpen} onOpenChange={setIsCreateOfferOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {resetOfferForm(); setIsCreateOfferOpen(true);}}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Oferta
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="offers">Ofertas</TabsTrigger>
          <TabsTrigger value="carousel">Carrossel</TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="space-y-6">
          {/* Featured Home Offers Section */}
          {featuredHomeOffers.length > 0 && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Star className="h-5 w-5 fill-current" />
                  Ofertas em Destaque - Página Inicial
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Sincronizado com FeaturedSection • {featuredHomeOffers.length} ofertas ativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredHomeOffers.map((offer) => (
                    <Card key={offer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video relative bg-muted">
                        {offer.card_image_url ? (
                          <img 
                            src={offer.card_image_url} 
                            alt={offer.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-purple-600">
                          Destaque
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{offer.title}</h3>
                        {offer.subtitle && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{offer.subtitle}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              R$ {offer.price.toFixed(2)}
                            </p>
                            {offer.original_price && (
                              <p className="text-sm text-muted-foreground line-through">
                                R$ {offer.original_price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {offer.discount_percent && (
                            <Badge variant="destructive" className="text-base px-3 py-1">
                              -{offer.discount_percent}%
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground">
                            <Store className="h-4 w-4 inline mr-1" />
                            {offer.company_name}
                          </p>
                          {offer.category && (
                            <Badge variant="outline" className="mt-2">
                              {offer.category}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Clicou em editar oferta:', offer);
                              // Criar objeto Offer compatível
                              const offerToEdit: Offer = {
                                id: offer.id,
                                company_id: offer.company_id,
                                title: offer.title,
                                subtitle: offer.subtitle || '',
                                description: '',
                                price: offer.price,
                                original_price: offer.original_price || 0,
                                discount_percent: offer.discount_percent || 0,
                                category: offer.category || '',
                                city: '',
                                card_image_url: offer.card_image_url || '',
                                banner_image_url: offer.banner_image_url || '',
                                is_active: true,
                                featured_order: 0,
                                created_at: '',
                                companies: {
                                  name: offer.company_name,
                                  is_verified: offer.company_is_verified
                                }
                              };
                              
                              console.log('Abrindo modal com oferta:', offerToEdit);
                              openEditOffer(offerToEdit);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Secondary Featured Offers Section */}
          {secondaryFeaturedOffers.length > 0 && (
            <Card className="border-secondary/30 bg-gradient-to-br from-secondary/5 to-secondary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-secondary-foreground">
                  <Star className="h-5 w-5 fill-current" />
                  Ofertas Secundárias - Página Inicial
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Sincronizado com SecondaryFeaturedSection • {secondaryFeaturedOffers.length} ofertas ativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {secondaryFeaturedOffers.map((offer) => (
                    <Card key={offer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video relative bg-muted">
                        {offer.card_image_url ? (
                          <img 
                            src={offer.card_image_url} 
                            alt={offer.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-secondary">
                          Secundário
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{offer.title}</h3>
                        {offer.subtitle && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{offer.subtitle}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              R$ {offer.price.toFixed(2)}
                            </p>
                            {offer.original_price && (
                              <p className="text-sm text-muted-foreground line-through">
                                R$ {offer.original_price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {offer.discount_percent && (
                            <Badge variant="destructive" className="text-base px-3 py-1">
                              -{offer.discount_percent}%
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tertiary Featured Offers Section */}
          {tertiaryFeaturedOffers.length > 0 && (
            <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent-foreground">
                  <Star className="h-5 w-5 fill-current" />
                  Ofertas Terciárias - Página Inicial
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Sincronizado com TertiaryFeaturedSection • {tertiaryFeaturedOffers.length} ofertas ativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tertiaryFeaturedOffers.map((offer) => (
                    <Card key={offer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video relative bg-muted">
                        {offer.card_image_url ? (
                          <img 
                            src={offer.card_image_url} 
                            alt={offer.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-accent">
                          Terciário
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{offer.title}</h3>
                        {offer.subtitle && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{offer.subtitle}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              R$ {offer.price.toFixed(2)}
                            </p>
                            {offer.original_price && (
                              <p className="text-sm text-muted-foreground line-through">
                                R$ {offer.original_price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          {offer.discount_percent && (
                            <Badge variant="destructive" className="text-base px-3 py-1">
                              -{offer.discount_percent}%
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* NovaXS Products Section */}
          {!isCreateOfferOpen && !isEditOfferOpen && (
            <NovaxsProductsSection />
          )}

          {/* Offers List */}
          {!isCreateOfferOpen && !isEditOfferOpen && (
            <div className="space-y-4">
              {filteredOffers.map((offer) => (
                <Card key={offer.id} className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-2 sm:p-4 lg:p-6">
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                      {/* Offer Image */}
                      <div className="w-full lg:w-48 h-32 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {offer.card_image_url ? (
                          <img 
                            src={offer.card_image_url} 
                            alt={offer.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Gift className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Offer Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                              {offer.title || '⚠️ [SEM TÍTULO - CLIQUE EM EDITAR PARA CORRIGIR]'}
                            </h3>
                            <p className="text-sm text-muted-foreground">{offer.companies?.name}</p>
                            {offer.subtitle && (
                              <p className="text-sm text-muted-foreground mt-1">{offer.subtitle}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {getStatusBadge(offer)}
                            {offer.featured_order > 0 && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                <Star className="w-3 h-3 mr-1" />
                                Destaque
                              </Badge>
                            )}
                          </div>
                        </div>

                        {offer.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {offer.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-4 text-sm mb-3">
                          <div className="text-xs sm:text-sm">
                            <span className="text-muted-foreground block sm:inline">Preço Original:</span>
                            <span className="ml-0 sm:ml-1 font-medium line-through block sm:inline">
                              {formatCurrency(offer.original_price || offer.price * 1.5)}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm">
                            <span className="text-muted-foreground block sm:inline">Preço Oferta:</span>
                            <span className="ml-0 sm:ml-1 font-bold text-green-600 block sm:inline">
                              {formatCurrency(offer.price)}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm">
                            <span className="text-muted-foreground block sm:inline">Desconto:</span>
                            <span className="ml-0 sm:ml-1 font-medium text-orange-600 block sm:inline">
                              {offer.discount_percent || Math.round(((offer.original_price || offer.price * 1.5) - offer.price) / (offer.original_price || offer.price * 1.5) * 100)}%
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm">
                            <span className="text-muted-foreground block sm:inline">Categoria:</span>
                            <span className="ml-0 sm:ml-1 font-medium block sm:inline">
                              {offer.category || 'Sem categoria'}
                            </span>
                          </div>
                        </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              Criada em {formatDate(offer.created_at)}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={offerCarouselStatus[offer.id]?.primary || false}
                                  onCheckedChange={(checked) => handleToggleFeatured(offer.id, 'primary', checked)}
                                />
                                <Label className="text-xs">Principal</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={offerCarouselStatus[offer.id]?.secondary || false}
                                  onCheckedChange={(checked) => handleToggleFeatured(offer.id, 'secondary', checked)}
                                />
                                <Label className="text-xs">Secundário</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={offerCarouselStatus[offer.id]?.tertiary || false}
                                  onCheckedChange={(checked) => handleToggleFeatured(offer.id, 'tertiary', checked)}
                                />
                                <Label className="text-xs">Terciário</Label>
                              </div>
                            </div>
                          </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex lg:flex-col gap-2 lg:w-40">
                        {!offer.is_active ? (
                          <Button 
                            onClick={() => handleApproveOffer(offer.id)}
                            className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-2 sm:px-3"
                            disabled={!offer.companies?.is_verified}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Aprovar & Ativar
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => setSelectedOffer(offer)}
                            variant="outline"
                            className="flex-1 lg:flex-none text-xs sm:text-sm px-2 sm:px-3"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Desativar
                          </Button>
                        )}
                        
                        <Button 
                          onClick={() => openEditOffer(offer)}
                          variant="outline" 
                          className="flex-1 lg:flex-none text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>

                        <Button 
                          onClick={() => handleDeleteOffer(offer.id)}
                          variant="destructive" 
                          size="sm"
                          className="flex-1 lg:flex-none text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

            </div>
          )}
        </TabsContent>

        <TabsContent value="carousel" className="space-y-6">
          <div className="space-y-8">
            {/* Carrossel Principal (Slides do Topo) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="w-5 h-5" />
                  Carrossel Principal (Slides do Topo)
                </CardTitle>
                <p className="text-muted-foreground">
                  Gerencie os slides principais que aparecem no hero banner da página inicial
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Slides Ativos</h4>
                    <Button size="sm" onClick={handleCreateNewBanner}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Slide
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {bannerSlides.map((slide, index) => (
                      <div key={slide.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-16 bg-muted rounded overflow-hidden">
                            {slide.image_url ? (
                              <img 
                                src={slide.image_url} 
                                alt={slide.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{slide.title}</h4>
                            <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                            <p className="text-xs text-muted-foreground">{slide.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={slide.is_active} 
                              onCheckedChange={() => handleToggleSlideStatus(slide)}
                            />
                            <Badge variant={slide.is_active ? "default" : "secondary"}>
                              {slide.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBanner(slide)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveBanner(slide)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Configurações do banner principal</span>
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant={carouselSettings.hero?.auto_rotation ? "default" : "outline"} 
                              size="sm"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Auto-rotação: {(carouselSettings.hero?.rotation_interval || 2000) / 1000}s
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('hero', 3000)}>
                              3 segundos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('hero', 6000)}>
                              6 segundos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('hero', 10000)}>
                              10 segundos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                          variant={carouselSettings.hero?.is_random_order ? "default" : "outline"} 
                          size="sm"
                          onClick={() => handleToggleRandomOrder('hero')}
                        >
                          <Shuffle className="w-4 h-4 mr-2" />
                          Ordem aleatória
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carrossel de Ofertas (Seção Ofertas) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Carrossel Primário
                </CardTitle>
                <p className="text-muted-foreground">
                  Ofertas que aparecem no primeiro carrossel "Bah Tá Barato na Serra Gaúcha"
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                    <strong>Nota:</strong> Para adicionar ou remover ofertas deste carrossel, use os switches "Carrossel Principal" na aba "Ofertas".
                  </div>
                  
                  {featuredHomeOffers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {featuredHomeOffers.map((offer) => (
                        <div key={offer.id} className="border rounded-lg p-4">
                          <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                            {offer.card_image_url && (
                              <img 
                                src={offer.card_image_url}
                                alt={offer.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <h4 className="font-medium">{offer.title}</h4>
                          <p className="text-sm text-muted-foreground">{offer.subtitle}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-primary">
                              R$ {offer.price?.toFixed(2)}
                            </span>
                            <Badge variant="secondary">{offer.category}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma oferta no carrossel principal. Adicione ofertas usando os switches na aba "Ofertas".
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Configurações do carrossel</span>
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant={carouselSettings.offers?.auto_rotation ? "default" : "outline"} 
                              size="sm"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Auto-rotação: {(carouselSettings.offers?.rotation_interval || 3000) / 1000}s
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('offers', 3000)}>
                              3 segundos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('offers', 6000)}>
                              6 segundos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('offers', 10000)}>
                              10 segundos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                          variant={carouselSettings.offers?.is_random_order ? "default" : "outline"} 
                          size="sm"
                          onClick={() => handleToggleRandomOrder('offers')}
                        >
                          <Shuffle className="w-4 h-4 mr-2" />
                          Ordem aleatória
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carrossel Secundário de Ofertas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Carrossel Secundário de Ofertas
                </CardTitle>
                <p className="text-muted-foreground">
                  Ofertas que aparecem no segundo carrossel "Mais Ofertas Exclusivas"
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-900">
                          Como adicionar ofertas ao carrossel secundário:
                        </p>
                        <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                          <li>Vá para a aba <strong>"Ofertas"</strong> acima</li>
                          <li>Encontre a oferta que deseja adicionar</li>
                          <li>Ative o switch <strong>"Secundário"</strong> na oferta</li>
                          <li>A oferta aparecerá automaticamente aqui e no site</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                  
                  {secondaryFeaturedOffers.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="outline" className="text-sm">
                          {secondaryFeaturedOffers.length} ofertas ativas no carrossel
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {secondaryFeaturedOffers.map((offer, index) => (
                          <div key={offer.id} className="border rounded-lg p-4 relative">
                            <Badge className="absolute top-2 right-2 z-10" variant="default">
                              #{index + 1}
                            </Badge>
                            <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                              {offer.card_image_url ? (
                                <img 
                                  src={offer.card_image_url}
                                  alt={offer.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Image className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium line-clamp-1">{offer.title}</h4>
                              {offer.subtitle && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{offer.subtitle}</p>
                              )}
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-lg font-bold text-primary">
                                  R$ {offer.price?.toFixed(2)}
                                </span>
                                {offer.category && (
                                  <Badge variant="secondary">{offer.category}</Badge>
                                )}
                              </div>
                              {offer.company_name && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                                  <Store className="w-3 h-3" />
                                  <span className="line-clamp-1">{offer.company_name}</span>
                                  {offer.company_is_verified && (
                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p>Nenhuma oferta no carrossel secundário.</p>
                      <p className="text-sm">Adicione ofertas usando os switches na aba "Ofertas".</p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Configurações do carrossel</span>
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant={carouselSettings.secondary?.auto_rotation ? "default" : "outline"} 
                              size="sm"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Auto-rotação: {(carouselSettings.secondary?.rotation_interval || 3000) / 1000}s
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('secondary', 3000)}>
                              3 segundos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('secondary', 6000)}>
                              6 segundos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleChangeRotationTime('secondary', 10000)}>
                              10 segundos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                          variant={carouselSettings.secondary?.is_random_order ? "default" : "outline"} 
                          size="sm"
                          onClick={() => handleToggleRandomOrder('secondary')}
                        >
                          <Shuffle className="w-4 h-4 mr-2" />
                          Ordem aleatória
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carrossel Terciário de Ofertas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Carrossel Terciário de Ofertas
                </CardTitle>
                <p className="text-muted-foreground">
                  Ofertas que aparecem no terceiro carrossel "Ofertas Selecionadas"
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                    <strong>Nota:</strong> Para adicionar ou remover ofertas deste carrossel, use os switches "Terciário" na aba "Ofertas".
                  </div>
                  
                  {tertiaryFeaturedOffers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tertiaryFeaturedOffers.map((offer) => (
                        <div key={offer.id} className="border rounded-lg p-4">
                          <div className="aspect-video bg-muted rounded-lg mb-3 overflow-hidden">
                            {offer.card_image_url && (
                              <img 
                                src={offer.card_image_url}
                                alt={offer.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <h4 className="font-medium">{offer.title}</h4>
                          <p className="text-sm text-muted-foreground">{offer.subtitle}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold text-primary">
                              R$ {offer.price?.toFixed(2)}
                            </span>
                            <Badge variant="secondary">{offer.category}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma oferta no carrossel terciário. Adicione ofertas usando os switches na aba "Ofertas".
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Carrossel de Parceiros (Seção Parceiros) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Carrossel de Parceiros (Seção Parceiros)
                </CardTitle>
                <CardDescription>
                  Gerencie os parceiros que aparecem no carrossel da seção parceiros
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Parceiros no Carrossel</h4>
                    <Button size="sm" onClick={() => setIsCreatePartnerOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Parceiro
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {carouselPartners.map((partner, index) => (
                      <Card key={partner.id} className="border group hover:shadow-md transition-all">
                        <CardContent className="p-3">
                          <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                            <Store className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <h4 className="font-medium text-xs mb-1 line-clamp-2">{partner.name}</h4>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-primary">{partner.discount_percent}%</span>
                            <Badge variant={partner.is_active ? "default" : "secondary"} className="text-xs">
                              {partner.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-muted-foreground">{partner.rating}</span>
                            </div>
                          </div>
                           <div className="flex gap-1">
                             <Button variant="outline" size="sm" className="text-xs px-2 py-1 flex-1" onClick={() => handleEditPartner(partner)} aria-label={`Editar parceiro ${partner?.name || ''}`.trim()}>
                               <Edit className="w-3 h-3" />
                             </Button>
                             <Button variant="outline" size="sm" className="text-xs px-2 py-1" onClick={() => handleRemovePartner(partner)} aria-label={`Mais ações para parceiro ${partner?.name || ''}`.trim()}>
                               <MoreHorizontal className="w-3 h-3" />
                             </Button>
                           </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Configurações do carrossel</span>
                          <div className="flex gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant={carouselSettings.partners?.auto_rotation ? "default" : "outline"} 
                                  size="sm"
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Auto-rotação: {(carouselSettings.partners?.rotation_interval || 3000) / 1000}s
                                  <ChevronDown className="w-4 h-4 ml-2" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleChangeRotationTime('partners', 3000)}>
                                  3 segundos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeRotationTime('partners', 6000)}>
                                  6 segundos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangeRotationTime('partners', 10000)}>
                                  10 segundos
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button 
                              variant={carouselSettings.partners?.is_random_order ? "default" : "outline"} 
                              size="sm"
                              onClick={() => handleToggleRandomOrder('partners')}
                            >
                              <Shuffle className="w-4 h-4 mr-2" />
                              Ordem aleatória
                            </Button>
                          </div>
                        </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Create Offer Dialog - With Draft Autosave */}
      <UncontrolledOfferEditor
        open={isCreateOfferOpen}
        onOpenChange={(open) => {
          setIsCreateOfferOpen(open);
        }}
        offer={null}
        onSaved={handleOfferSaved}
      />

      {/* Edit Offer Dialog - With Draft Autosave */}
      <UncontrolledOfferEditor
        open={isEditOfferOpen}
        onOpenChange={(open) => {
          setIsEditOfferOpen(open);
          if (!open) setEditingOffer(null);
        }}
        offer={editingOffer ? {
          id: editingOffer.id,
          title: editingOffer.title,
          subtitle: editingOffer.subtitle || '',
          description: editingOffer.description || '',
          price: editingOffer.price,
          original_price: editingOffer.original_price || 0,
          discount_percent: editingOffer.discount_percent || 0,
          category: editingOffer.category || '',
          city: editingOffer.city || '',
          company_id: editingOffer.company_id,
          card_image_url: editingOffer.card_image_url || '',
          banner_image_url: editingOffer.banner_image_url || '',
          is_active: editingOffer.is_active ?? true
        } : null}
        onSaved={handleOfferSaved}
      />

      {/* Edit Banner Dialog */}
      <Dialog open={isEditBannerOpen} onOpenChange={(open) => {
        setIsEditBannerOpen(open);
        if (!open) setEditingBanner(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Editar Banner</DialogTitle>
            <DialogDescription>
              Edite o slide do banner principal
            </DialogDescription>
          </DialogHeader>
          {editingBanner && (
            <div className="space-y-4 px-1">
              <div>
                <Label htmlFor="banner-title">Título</Label>
                <Input
                  id="banner-title"
                  value={bannerFormData.title}
                  onChange={(e) => setBannerFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: TWO FOR ONE"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="banner-subtitle">Subtítulo</Label>
                <Input
                  id="banner-subtitle"
                  value={bannerFormData.subtitle}
                  onChange={(e) => setBannerFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Ex: ON ALL PIZZAS"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="banner-description">Descrição</Label>
                <Input
                  id="banner-description"
                  value={bannerFormData.description}
                  onChange={(e) => setBannerFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: FREE DRINKS WITH ANY ENTRÉE"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="banner-image-desktop-file">Imagem Desktop</Label>
                <Input
                  id="banner-image-desktop-file"
                  type="file"
                  accept="image/*"
                  className="mt-1.5"
                  onChange={(e) => setBannerFormData(prev => ({ 
                    ...prev, 
                    desktopFile: e.target.files?.[0] || null 
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dimensão recomendada: 1200×250px (exibido em 250px de altura no desktop)
                </p>
                {editingBanner.desktop_image_url && !bannerFormData.desktopFile && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Imagem atual mantida
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="banner-image-mobile-file">Imagem Mobile</Label>
                <Input
                  id="banner-image-mobile-file"
                  type="file"
                  accept="image/*"
                  className="mt-1.5"
                  onChange={(e) => setBannerFormData(prev => ({ 
                    ...prev, 
                    mobileFile: e.target.files?.[0] || null 
                  }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dimensão recomendada: 600×160px (exibido em 160px de altura no mobile)
                </p>
                {editingBanner.mobile_image_url && !bannerFormData.mobileFile && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Imagem atual mantida
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="banner-active"
                  checked={bannerFormData.is_active}
                  onCheckedChange={(checked) => setBannerFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="banner-active">Banner Ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditBannerOpen(false);
                setEditingBanner(null);
              }}
              className="w-full sm:w-auto"
              disabled={uploadingImage}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => editingBanner && handleSaveBanner(editingBanner)}
              className="w-full sm:w-auto"
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Partner Dialog */}
      <Dialog open={isEditPartnerOpen} onOpenChange={setIsEditPartnerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Parceiro</DialogTitle>
            <DialogDescription>
              Edite as informações do parceiro no carrossel
            </DialogDescription>
          </DialogHeader>
          {editingPartner && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="partner-name">Nome do Estabelecimento</Label>
                <Input
                  id="partner-name"
                  defaultValue={editingPartner.name}
                  placeholder="Ex: Restaurante Sabor Baiano"
                />
              </div>
              <div>
                <Label htmlFor="partner-discount">Desconto (%)</Label>
                <Input
                  id="partner-discount"
                  defaultValue={editingPartner.discount_percent}
                  placeholder="35"
                />
              </div>
              <div>
                <Label htmlFor="partner-rating">Avaliação</Label>
                <Input
                  id="partner-rating"
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  defaultValue={editingPartner.rating}
                  placeholder="4.8"
                />
              </div>
              <div>
                <Label htmlFor="partner-image">Imagem do Parceiro</Label>
                <div className="space-y-2">
                  <Input
                    id="partner-image-file"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingImage(true);
                        try {
                          const fileExt = file.name.split('.').pop();
                          const fileName = `partner-${Date.now()}.${fileExt}`;
                          
                          const { error: uploadError, data } = await supabase.storage
                            .from('banners')
                            .upload(fileName, file);

                          if (uploadError) throw uploadError;

                          const { data: { publicUrl } } = supabase.storage
                            .from('banners')
                            .getPublicUrl(fileName);

                          // Update the image URL input with the uploaded file URL
                          const imageUrlInput = document.getElementById('partner-image-url') as HTMLInputElement;
                          if (imageUrlInput) {
                            imageUrlInput.value = publicUrl;
                          }

                          toast({
                            title: "Sucesso!",
                            description: "Imagem enviada com sucesso.",
                          });
                        } catch (error) {
                          console.error('Erro ao fazer upload:', error);
                          toast({
                            title: "Erro",
                            description: "Falha ao enviar a imagem. Tente novamente.",
                            variant: "destructive",
                          });
                        } finally {
                          setUploadingImage(false);
                        }
                      }
                    }}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando imagem...
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Ou insira uma URL diretamente:
                  </div>
                  <Input
                    id="partner-image-url"
                    defaultValue={editingPartner.image_url}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="partner-active"
                  defaultChecked={editingPartner.is_active}
                />
                <Label htmlFor="partner-active">Parceiro Ativo no Carrossel</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPartnerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => editingPartner && handleSavePartner(editingPartner)}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Offer Dialog */}
      {selectedOffer && (
        <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Oferta</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja rejeitar a oferta "{selectedOffer.title}"?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reject-reason">Motivo da Rejeição (Opcional)</Label>
                <Textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Descreva o motivo da rejeição..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedOffer(null)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleRejectOffer(selectedOffer.id)}
              >
                Rejeitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Banner Dialog */}
      <Dialog open={isCreateBannerOpen} onOpenChange={setIsCreateBannerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Slide do Banner</DialogTitle>
            <DialogDescription>
              Adicione um novo slide ao carrossel principal com upload de imagem
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadAndCreateBanner} className="space-y-4">
            <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
              <Switch 
                id="include-text-toggle"
                checked={includeTextInBanner}
                onCheckedChange={setIncludeTextInBanner}
              />
              <Label htmlFor="include-text-toggle" className="font-medium">
                Incluir texto sobre a imagem
              </Label>
            </div>
            
            {includeTextInBanner && (
              <>
                <div>
                  <Label htmlFor="create-banner-title">Título</Label>
                  <Input
                    id="create-banner-title"
                    name="banner-title"
                    placeholder="Ex: TWO FOR ONE"
                    required={includeTextInBanner}
                  />
                </div>
                <div>
                  <Label htmlFor="create-banner-subtitle">Subtítulo</Label>
                  <Input
                    id="create-banner-subtitle"
                    name="banner-subtitle"
                    placeholder="Ex: ON ALL PIZZAS"
                    required={includeTextInBanner}
                  />
                </div>
                <div>
                  <Label htmlFor="create-banner-description">Descrição</Label>
                  <Input
                    id="create-banner-description"
                    name="banner-description"
                    placeholder="Ex: FREE DRINKS WITH ANY ENTRÉE"
                    required={includeTextInBanner}
                  />
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="create-banner-image-desktop">Imagem Desktop</Label>
              <Input
                id="create-banner-image-desktop"
                name="banner-image-desktop"
                type="file"
                accept="image/*"
                required
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: JPG, PNG, WEBP. Tamanho recomendado: 1200×250px (altura exibida: 250px)
              </p>
            </div>

            <div>
              <Label htmlFor="create-banner-image-mobile">Imagem Mobile</Label>
              <Input
                id="create-banner-image-mobile"
                name="banner-image-mobile"
                type="file"
                accept="image/*"
                required
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: JPG, PNG, WEBP. Tamanho recomendado: 600×160px (altura exibida: 160px no mobile)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="create-banner-active"
                name="banner-active"
                defaultChecked={true}
                className="rounded"
              />
              <Label htmlFor="create-banner-active">Banner Ativo</Label>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateBannerOpen(false);
                  setIncludeTextInBanner(true); // Reset para próxima vez
                }}
                disabled={uploadingImage}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadingImage}>
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Slide'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Partner Dialog */}
      <Dialog open={isCreatePartnerOpen} onOpenChange={setIsCreatePartnerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Parceiro</DialogTitle>
            <DialogDescription>
              Adicione um novo parceiro ao carrossel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-partner-name">Nome *</Label>
                <Input
                  id="new-partner-name"
                  placeholder="Nome do parceiro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-partner-discount">Desconto (%)</Label>
                <Input
                  id="new-partner-discount"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-partner-rating">Avaliação</Label>
                <Input
                  id="new-partner-rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="5.0"
                  defaultValue="5.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-partner-image">URL da Imagem</Label>
                <Input
                  id="new-partner-image"
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-partner-address">Endereço</Label>
              <Input
                id="new-partner-address"
                placeholder="Endereço do parceiro"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-partner-phone">Telefone</Label>
                <Input
                  id="new-partner-phone"
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-partner-website">Website</Label>
                <Input
                  id="new-partner-website"
                  placeholder="https://exemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-partner-description">Descrição</Label>
              <Textarea
                id="new-partner-description"
                placeholder="Descrição do parceiro"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="new-partner-active"
                defaultChecked={true}
              />
              <Label htmlFor="new-partner-active">Parceiro Ativo no Carrossel</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePartnerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePartner}>
              Criar Parceiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
