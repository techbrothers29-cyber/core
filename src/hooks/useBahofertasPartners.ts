import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  classifyEstablishment,
  type Establishment,
  type OfferProduct,
} from "@/data/novaxs-establishments";

interface BahCompany {
  id: string;
  name: string;
  trade_name: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category_id: string | null;
}

interface BahOffer {
  id: string;
  company_id: string;
  title: string;
  subtitle: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  card_image_url: string | null;
  banner_image_url: string | null;
  category: string | null;
  is_active: boolean;
  carousel_primary: boolean | null;
  carousel_secondary: boolean | null;
  carousel_tertiary: boolean | null;
}

interface BahOverride {
  company_id: string;
  custom_name: string | null;
  custom_image_url: string | null;
  custom_banner_url: string | null;
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

interface BahData {
  companies: BahCompany[];
  offers: BahOffer[];
  overrides: BahOverride[];
}

async function fetchBahofertasData(): Promise<BahData> {
  const [compRes, offerRes, ovRes] = await Promise.all([
    supabase
      .from('companies')
      .select('id,name,trade_name,logo_url,banner_url,category_id')
      .eq('is_active', true)
      .eq('is_verified', true)
      .eq('approval_status', 'approved'),
    supabase
      .from('offers')
      .select('id,company_id,title,subtitle,price,original_price,discount_percent,card_image_url,banner_image_url,category,is_active,carousel_primary,carousel_secondary,carousel_tertiary')
      .eq('is_active', true),
    supabase
      .from('bahofertas_establishment_overrides')
      .select('company_id,custom_name,custom_image_url,custom_banner_url,custom_description,carousel_primary,carousel_secondary,carousel_tertiary,is_visible,display_order,about_text,includes_included,includes_not_included,important_notes,banner_position,latitude,longitude,address_label'),
  ]);

  return {
    companies: (compRes.data || []) as BahCompany[],
    offers: (offerRes.data || []) as BahOffer[],
    overrides: (ovRes.data || []) as unknown as BahOverride[],
  };
}

interface UseBahofertasPartnersReturn {
  establishments: Establishment[];
  offers: OfferProduct[];
  loading: boolean;
}

export function useBahofertasPartners(): UseBahofertasPartnersReturn {
  const { data, isLoading } = useQuery({
    queryKey: ["bahofertas-partners"],
    queryFn: fetchBahofertasData,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const establishments = useMemo<Establishment[]>(() => {
    if (!data) return [];
    const ovMap = new Map(data.overrides.map(o => [o.company_id, o]));
    const offersByCompany = new Map<string, BahOffer[]>();
    for (const o of data.offers) {
      if (!offersByCompany.has(o.company_id)) offersByCompany.set(o.company_id, []);
      offersByCompany.get(o.company_id)!.push(o);
    }

    const result: Establishment[] = [];
    for (const c of data.companies) {
      const ov = ovMap.get(c.id);
      // Visibility: if override exists and is_visible=false, hide. Default visible.
      if (ov && ov.is_visible === false) continue;

      const compOffers = offersByCompany.get(c.id) || [];
      // Skip companies without active offers — nothing to show on home
      if (compOffers.length === 0) continue;

      const minPrice = Math.round(Math.min(...compOffers.map(o => Number(o.price))) * 100);
      const firstImage =
        ov?.custom_image_url ||
        c.logo_url ||
        compOffers.find(o => o.card_image_url)?.card_image_url ||
        compOffers.find(o => o.banner_image_url)?.banner_image_url ||
        '';

      const displayName = ov?.custom_name || c.trade_name || c.name;
      const category = classifyEstablishment(displayName);

      result.push({
        id: `bah-${c.id}`,
        name: displayName,
        displayName: ov?.custom_name || null,
        category,
        image: firstImage,
        rating: 4.7,
        minPrice,
        productCount: compOffers.length,
        products: [], // not used for Bah Ofertas — navigation goes to /parceiro/:id/ofertas
        // Establishment-level carousel flag = override OR any offer flagged for that carousel
        carouselPrimary: ov?.carousel_primary || compOffers.some(o => o.carousel_primary),
        carouselSecondary: ov?.carousel_secondary || compOffers.some(o => o.carousel_secondary),
        carouselTertiary: ov?.carousel_tertiary || compOffers.some(o => o.carousel_tertiary),
        aboutText: ov?.about_text ?? null,
        includesIncluded: ov?.includes_included ?? null,
        includesNotIncluded: ov?.includes_not_included ?? null,
        importantNotes: ov?.important_notes ?? null,
        galleryImages: [],
        bannerImage: ov?.custom_banner_url ?? null,
        bannerPosition: ov?.banner_position ?? null,
        latitude: ov?.latitude ?? null,
        longitude: ov?.longitude ?? null,
        addressLabel: ov?.address_label ?? null,
        partnerType: 'bahofertas',
        companyId: c.id,
      });
    }
    return result;
  }, [data]);

  const offers = useMemo<OfferProduct[]>(() => {
    if (!data) return [];
    const ovMap = new Map(data.overrides.map(o => [o.company_id, o]));
    const compMap = new Map(data.companies.map(c => [c.id, c]));

    const result: OfferProduct[] = [];
    for (const o of data.offers) {
      const c = compMap.get(o.company_id);
      if (!c) continue;
      const ov = ovMap.get(o.company_id);
      if (ov && ov.is_visible === false) continue;

      const priceCents = Math.round(Number(o.price) * 100);
      const oldPriceCents = o.original_price
        ? Math.round(Number(o.original_price) * 100)
        : priceCents;
      const discountPercent = o.discount_percent ?? (
        oldPriceCents > priceCents
          ? Math.round(((oldPriceCents - priceCents) / oldPriceCents) * 100)
          : 0
      );

      const establishmentName = ov?.custom_name || c.trade_name || c.name;

      result.push({
        id: `bah-offer-${o.id}`,
        name: o.title,
        establishmentName,
        establishmentId: `bah-${c.id}`,
        rating: 4.7,
        price: priceCents,
        oldPrice: oldPriceCents,
        discountPercent,
        image: o.card_image_url || o.banner_image_url || ov?.custom_image_url || c.logo_url || '',
        type: o.subtitle || o.category || '',
        partnerType: 'bahofertas',
        companyId: c.id,
        carouselPrimary: o.carousel_primary ?? undefined,
        carouselSecondary: o.carousel_secondary ?? undefined,
        carouselTertiary: o.carousel_tertiary ?? undefined,
      });
    }
    return result;
  }, [data]);

  return {
    establishments,
    offers,
    loading: isLoading,
  };
}
