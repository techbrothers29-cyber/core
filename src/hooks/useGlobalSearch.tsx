import React, { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeInBrazil } from "@/lib/supabase-region";
import { cleanProductName } from "@/lib/product-name-cleaner";
import { slugify } from "@/lib/seo";
import { dedupeNovaxsProducts, getCanonicalProductId } from "@/lib/novaxs-product-dedupe";
import {
  groupByEstablishment,
  classifyEstablishment,
  type Establishment,
  type NovaxsProduct,
} from "@/data/novaxs-establishments";
import {
  normalizeNovaxsText,
  resolveIntegratedEstablishmentByName,
  searchIntegratedEstablishments,
} from "@/data/novaxs-catalog";
import { establishmentPath } from "@/lib/establishment-slug";
import {
  applyOverrides,
  normalizeNovaxsEstablishmentId,
  type EstablishmentOverride,
  type ProductOverride,
  type GalleryImage,
} from "@/hooks/useNovaxsEstablishments";

interface NovaxsOverrideCache {
  establishments: EstablishmentOverride[];
  products: ProductOverride[];
  gallery: GalleryImage[];
}

interface PublicCompanyResult {
  id: string;
  name?: string | null;
  trade_name?: string | null;
  description?: string | null;
  logo_url?: string | null;
  category_id?: string | null;
}

interface RawNovaxsProduct {
  id?: string | number | null;
  path?: string | number | null;
  name?: string | null;
  shortName?: string | null;
  type?: string | null;
  price?: string | number | null;
  available?: string | number | null;
  image?: string | null;
  supplierName?: string | null;
  oldValue?: string | number | null;
  token?: string | null;
  schedules?: NovaxsProduct["schedules"];
  select_date?: boolean;
  dates?: string[];
  products?: NovaxsProduct[];
  memo?: string | null;
  htmlMemo?: string | null;
  cancellationPolicies?: string | null;
}

type HotelImage = string | { url?: unknown };

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "offer" | "partner" | "coupon" | "region" | "hotel" | "ticket" | "entertainment" | "restaurant" | "service";
  image?: string | null;
  url: string;
  category?: string;
}

export const useGlobalSearch = (query: string, enabled = true) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || !enabled) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const wildcard = `%${trimmed}%`;
        const lowerTrimmed = trimmed.toLowerCase();
        const normalizedQuery = normalizeNovaxsText(trimmed);
        const allResults: SearchResult[] = [];

        const [hotelsByNameRes, hotelsByCityRes] = await Promise.all([
          // Hotéis / pousadas por nome ou endereço (ex.: "Laghetto", "Pousada do Sol")
          supabase
            .from("etg_hotels")
            .select("hid, name, city, star_rating, images")
            .or(`name.ilike.${wildcard},address.ilike.${wildcard}`)
            .limit(6),

          // Hotéis por cidade (ex.: "Gramado", "Canela")
          supabase
            .from("etg_hotels")
            .select("hid, name, city, star_rating, images")
            .ilike("city", wildcard)
            .limit(4),
        ]);

        // --- Offers, Partners, Coupons, Regions: removidos da busca pública ---
        // A busca agora retorna apenas hospedagens e estabelecimentos/produtos NovaXS
        // ativos em pelo menos um carrossel pelo admin.


        // --- Hotels (name + address matches first, then city matches; deduped by hid) ---
        const combinedHotels = [
          ...(hotelsByNameRes.data || []),
          ...(hotelsByCityRes.data || []),
        ];
        const seenHids = new Set<string>();
        const uniqueHotels = combinedHotels.filter((h) => {
          if (!h?.hid || seenHids.has(h.hid)) return false;
          seenHids.add(h.hid);
          return true;
        });

        uniqueHotels.slice(0, 8).forEach((h) => {
          const images = Array.isArray(h.images) ? (h.images as HotelImage[]) : [];
          const firstImage = images.length > 0 ? images[0] : null;
          const rawUrl = typeof firstImage === "string" ? firstImage : typeof firstImage?.url === "string" ? firstImage.url : null;
          const imageUrl = getHotelThumbnailUrl(rawUrl);
          allResults.push({
            id: h.hid,
            title: h.name,
            subtitle: `${h.city}${h.star_rating ? ` • ${h.star_rating}★` : ""}`,
            type: "hotel",
            image: imageUrl,
            url: `/hospedagem/hotel/${h.hid}/${slugify(h.name || "hotel")}`,
          });
        });

        // --- NovaXS Establishments (override-aware, real-time synced) ---
        // IMPORTANTE: só mostra estabelecimentos explicitamente ATIVADOS pelo admin
        // (override existente com is_visible = true).
        try {
          await ensureNovaxsOverridesCached(queryClient);
          const adminVisibleIds = getAdminVisibleNovaxsIds(queryClient);
          const adminHiddenIds = getAdminHiddenNovaxsIds(queryClient);
          const establishments = getOverrideAwareEstablishments(queryClient);
          const visibleFallbackIds = getVisibleNovaxsFallbackIds(queryClient);
          const overrideImageMap = getNovaxsOverrideImageMap(queryClient);

          if (establishments && establishments.length > 0) {
            const onlyAdminActive = establishments.filter(
              (est) => isAdminVisibleNovaxsEstablishment(est, adminVisibleIds, adminHiddenIds)
            );
            searchNovaxsEstablishments(onlyAdminActive, normalizedQuery, allResults, visibleFallbackIds, overrideImageMap);
          } else {
            // No cached data — try fetching
            await fetchAndCacheNovaxsProducts(queryClient);
            const freshEstablishments = getOverrideAwareEstablishments(queryClient);
            if (freshEstablishments && freshEstablishments.length > 0) {
              const onlyAdminActive = freshEstablishments.filter(
                (est) => isAdminVisibleNovaxsEstablishment(est, adminVisibleIds, adminHiddenIds)
              );
              searchNovaxsEstablishments(onlyAdminActive, normalizedQuery, allResults, visibleFallbackIds, overrideImageMap);
            } else {
              pushCatalogFallbackResults([], normalizedQuery, allResults, visibleFallbackIds, overrideImageMap);
            }
          }
        } catch (novaxsErr) {
          console.error("NovaXS search error:", novaxsErr);
          pushCatalogFallbackResults([], normalizedQuery, allResults, new Set<string>(), {});
        }

        // --- Parceiros Bah Ofertas (restaurantes, parques, serviços) ativos pelo admin ---
        try {
          await searchBahofertasPartners(queryClient, normalizedQuery, allResults);
        } catch (bahErr) {
          console.error("Bah Ofertas partner search error:", bahErr);
        }

        setResults(allResults);

      } catch (err) {
        console.error("Global search error:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, enabled, queryClient]);

  return { results, isSearching };
};

function getHotelThumbnailUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null;

  return rawUrl
    .replace("{size}", "240x240")
    .replace("/max1280x900/", "/240x240/");
}

/**
 * Reads cached products + overrides from React Query and returns
 * override-applied establishments (respecting visibility, custom images, etc.)
 */
function getOverrideAwareEstablishments(queryClient: ReturnType<typeof useQueryClient>): Establishment[] | null {
  const products = queryClient.getQueryData<NovaxsProduct[]>(["novaxs-products"]);
  if (!products || products.length === 0) return null;

  const rawEstablishments = groupByEstablishment(products);

  const overrides = queryClient.getQueryData<{
    establishments: EstablishmentOverride[];
    products: ProductOverride[];
    gallery: GalleryImage[];
  }>(["novaxs-overrides"]);

  if (overrides) {
    return applyOverrides(rawEstablishments, overrides.establishments, overrides.products, overrides.gallery);
  }

  return rawEstablishments;
}

async function ensureNovaxsOverridesCached(queryClient: ReturnType<typeof useQueryClient>) {
  const cached = queryClient.getQueryData<NovaxsOverrideCache>(["novaxs-overrides"]);
  if (cached) return cached;

  const [estResult, prodResult, galleryResult] = await Promise.all([
    supabase
      .from("novaxs_establishment_overrides")
      .select("novaxs_establishment_id,custom_name,custom_banner_url,custom_image_url,custom_description,carousel_primary,carousel_secondary,carousel_tertiary,is_visible,display_order,about_text,includes_included,includes_not_included,important_notes,banner_position,latitude,longitude,address_label"),
    supabase
      .from("novaxs_product_overrides")
      .select("novaxs_product_id,novaxs_establishment_id,custom_name,custom_description,custom_image_url,custom_price_cents,is_visible"),
    supabase
      .from("novaxs_establishment_gallery")
      .select("novaxs_establishment_id,image_url,display_order")
      .order("display_order", { ascending: true }),
  ]);

  const overrideData: NovaxsOverrideCache = {
    establishments: (estResult.data || []) as EstablishmentOverride[],
    products: (prodResult.data || []) as ProductOverride[],
    gallery: (galleryResult.data || []) as GalleryImage[],
  };

  queryClient.setQueryData(["novaxs-overrides"], overrideData);
  return overrideData;
}

function isInAnyCarousel(o: EstablishmentOverride & { carousel_primary?: boolean; carousel_secondary?: boolean; carousel_tertiary?: boolean }) {
  return Boolean(o.carousel_primary || o.carousel_secondary || o.carousel_tertiary);
}

function getVisibleNovaxsFallbackIds(queryClient: ReturnType<typeof useQueryClient>) {
  const overrides = queryClient.getQueryData<NovaxsOverrideCache>(["novaxs-overrides"]);

  return new Set(
    (overrides?.establishments || [])
      .filter((override) => override.is_visible && isInAnyCarousel(override))
      .map((override) => override.custom_name || override.novaxs_establishment_id)
  );
}

/**
 * Returns IDs/nomes de estabelecimentos NovaXS ativados pelo admin em pelo menos
 * um dos carrosseis (principal / secundário / terciário).
 */
function getAdminVisibleNovaxsIds(queryClient: ReturnType<typeof useQueryClient>) {
  const overrides = queryClient.getQueryData<NovaxsOverrideCache>(["novaxs-overrides"]);
  const ids = new Set<string>();
  (overrides?.establishments || [])
    .filter((o) => o.is_visible && isInAnyCarousel(o))
    .forEach((o) => {
      if (o.novaxs_establishment_id) ids.add(o.novaxs_establishment_id);
      if (o.custom_name) ids.add(o.custom_name);
    });
  return ids;
}

function getAdminHiddenNovaxsIds(queryClient: ReturnType<typeof useQueryClient>) {
  const overrides = queryClient.getQueryData<NovaxsOverrideCache>(["novaxs-overrides"]);
  const ids = new Set<string>();
  (overrides?.establishments || [])
    .filter((o) => !o.is_visible)
    .forEach((o) => {
      if (o.novaxs_establishment_id) ids.add(normalizeNovaxsEstablishmentId(o.novaxs_establishment_id));
      if (o.custom_name) ids.add(normalizeNovaxsEstablishmentId(o.custom_name));
    });
  return ids;
}

function isAdminVisibleNovaxsEstablishment(
  establishment: Establishment,
  visibleIds: Set<string>,
  hiddenIds: Set<string>,
) {
  const keys = [establishment.id, establishment.name, establishment.displayName]
    .filter(Boolean)
    .map((key) => normalizeNovaxsEstablishmentId(key));

  if (keys.some((key) => hiddenIds.has(key))) return false;
  return keys.some((key) => visibleIds.has(key) || visibleIds.has(establishment.id) || visibleIds.has(establishment.name));
}

/**
 * Mapa de imagens customizadas por id e por custom_name do estabelecimento.
 */
function getNovaxsOverrideImageMap(queryClient: ReturnType<typeof useQueryClient>): Record<string, string> {
  const overrides = queryClient.getQueryData<NovaxsOverrideCache>(["novaxs-overrides"]);
  const map: Record<string, string> = {};
  (overrides?.establishments || []).forEach((o) => {
    if (!o.custom_image_url) return;
    if (o.novaxs_establishment_id) map[o.novaxs_establishment_id] = o.custom_image_url;
    if (o.custom_name) map[o.custom_name] = o.custom_image_url;
  });
  return map;
}

/**
 * Fetches NovaXS products and caches them if not already cached.
 */
async function fetchAndCacheNovaxsProducts(queryClient: ReturnType<typeof useQueryClient>) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = String(tomorrow.getDate()).padStart(2, "0");
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const year = tomorrow.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  const { data: novaxsData } = await invokeInBrazil("novaxs-search-products", { date: dateStr });
  if (novaxsData?.products) {
    const novaxsProducts = dedupeNovaxsProducts((novaxsData.products as RawNovaxsProduct[]).map((p): NovaxsProduct => {
      const canonicalProductId = getCanonicalProductId({ id: String(p.id || p.path || ""), path: String(p.path || p.id || "") });
      const price = Number(p.price || 0);

      return {
        ...p,
        id: canonicalProductId,
        path: canonicalProductId,
        name: cleanProductName(p.name || ""),
        shortName: cleanProductName(p.shortName || p.name || ""),
        type: p.type || "",
        price,
        priceCents: Math.round(price * 100),
        available: Number(p.available || 0),
        image: p.image || "",
        supplierName: p.supplierName || "",
        oldValue: p.oldValue ? Math.round(Number(p.oldValue)) : undefined,
        token: p.token || "",
        schedules: p.schedules || [],
        memo: p.memo || "",
        htmlMemo: p.htmlMemo || "",
        cancellationPolicies: p.cancellationPolicies || "",
      };
    }));
    queryClient.setQueryData(["novaxs-products"], novaxsProducts);
  }
}

/**
 * Searches override-applied establishments and their products.
 */
function searchNovaxsEstablishments(
  establishments: Establishment[],
  normalizedQuery: string,
  allResults: SearchResult[],
  visibleFallbackIds: Set<string>,
  overrideImageMap: Record<string, string>
) {
  const matchedEstablishments = establishments
    .filter((est) => normalizeNovaxsText(est.name).includes(normalizedQuery))
    .slice(0, 6);

  matchedEstablishments.forEach((est) => {
    allResults.push(
      toEstablishmentSearchResult(
        est,
        `${est.productCount} produtos • A partir de R$ ${(est.minPrice / 100).toFixed(2).replace(".", ",")}`,
        overrideImageMap
      )
    );
  });

  pushCatalogFallbackResults(establishments, normalizedQuery, allResults, visibleFallbackIds, overrideImageMap, matchedEstablishments.length);

  // Search individual products within visible establishments
  const allVisibleProducts = establishments.flatMap((est) => est.products);
  const matchedProducts = allVisibleProducts
    .filter((p) => normalizeNovaxsText(p.name || p.shortName || "").includes(normalizedQuery))
    .slice(0, 4);

  matchedProducts.forEach((p) => {
    allResults.push({
      id: `novaxs-${p.id || p.path}`,
      title: p.name || p.shortName,
      subtitle: p.supplierName || "Serra Gaúcha",
      type: "ticket",
      image: p.image || null,
      url: establishmentPath(p.supplierName || "Outros"),
    });
  });
}

function pushCatalogFallbackResults(
  liveEstablishments: Establishment[],
  normalizedQuery: string,
  allResults: SearchResult[],
  visibleFallbackIds: Set<string>,
  overrideImageMap: Record<string, string>,
  usedSlots = 0
) {
  const liveCanonicalNames = new Set(
    liveEstablishments.map((est) => resolveIntegratedEstablishmentByName(est.name)?.name || est.name)
  );

  const fallbackResults = searchIntegratedEstablishments(normalizedQuery)
    .filter((est) => {
      const canonical = resolveIntegratedEstablishmentByName(est.name);
      const fallbackKey = canonical?.name || est.name;
      return visibleFallbackIds.has(fallbackKey) || visibleFallbackIds.has(est.id);
    })
    .filter((est) => !liveCanonicalNames.has(est.name))
    .slice(0, Math.max(0, 6 - usedSlots));

  fallbackResults.forEach((est) => {
    allResults.push(toEstablishmentSearchResult(est, "Integrado no Bah Ofertas • consulte disponibilidade", overrideImageMap));
  });
}

function toEstablishmentSearchResult(est: Establishment, subtitle: string, overrideImageMap: Record<string, string> = {}): SearchResult {
  const categoryTypeMap: Record<string, SearchResult["type"]> = {
    entretenimento: "entertainment",
    restaurante: "restaurant",
    servicos: "service",
  };

  const customImage = overrideImageMap[est.id] || overrideImageMap[est.name];

  return {
    id: est.id,
    title: est.name,
    subtitle,
    type: categoryTypeMap[est.category] || "entertainment",
    image: customImage || est.image || null,
    url: establishmentPath(est.name),

  };
}

/* ------------------------------------------------------------------ *
 * Parceiros Bah Ofertas (restaurantes, parques e serviços)
 * Só entram na busca se estiverem ativos no site pelo admin:
 * empresa aprovada/ativa, override não oculto e presente em algum
 * carrossel (principal / secundário / terciário).
 * ------------------------------------------------------------------ */
interface BahPartnerRow {
  id: string;
  name: string;
  trade_name: string | null;
  logo_url: string | null;
}

async function searchBahofertasPartners(
  queryClient: ReturnType<typeof useQueryClient>,
  normalizedQuery: string,
  allResults: SearchResult[],
) {
  const cacheKey = ["global-search-bah-partners"];
  let cached = queryClient.getQueryData<{
    companies: BahPartnerRow[];
    offers: any[];
    overrides: any[];
  }>(cacheKey);

  if (!cached) {
    const [compRes, offerRes, ovRes] = await Promise.all([
      supabase
        .from("companies")
        .select("id,name,trade_name,logo_url")
        .eq("is_active", true)
        .eq("is_verified", true)
        .eq("approval_status", "approved"),
      supabase
        .from("offers")
        .select("id,company_id,title,price,card_image_url,banner_image_url,is_active,carousel_primary,carousel_secondary,carousel_tertiary")
        .eq("is_active", true),
      supabase
        .from("bahofertas_establishment_overrides")
        .select("company_id,custom_name,custom_image_url,is_visible,carousel_primary,carousel_secondary,carousel_tertiary"),
    ]);

    cached = {
      companies: (compRes.data || []) as BahPartnerRow[],
      offers: offerRes.data || [],
      overrides: ovRes.data || [],
    };
    queryClient.setQueryData(cacheKey, cached);
  }

  const ovMap = new Map(cached.overrides.map((o: any) => [o.company_id, o]));
  const offersByCompany = new Map<string, any[]>();
  for (const o of cached.offers) {
    if (!offersByCompany.has(o.company_id)) offersByCompany.set(o.company_id, []);
    offersByCompany.get(o.company_id)!.push(o);
  }

  const matches: SearchResult[] = [];

  for (const c of cached.companies) {
    const ov: any = ovMap.get(c.id);
    if (ov && ov.is_visible === false) continue;

    const compOffers = offersByCompany.get(c.id) || [];
    if (compOffers.length === 0) continue;

    const inCarousel =
      Boolean(ov?.carousel_primary || ov?.carousel_secondary || ov?.carousel_tertiary) ||
      compOffers.some((o) => o.carousel_primary || o.carousel_secondary || o.carousel_tertiary);
    if (!inCarousel) continue;

    const displayName = ov?.custom_name || c.trade_name || c.name;
    const normalizedName = normalizeNovaxsText(displayName);
    const matchedOffers = compOffers.filter((o) =>
      normalizeNovaxsText(String(o.title || "")).includes(normalizedQuery),
    );

    if (!normalizedName.includes(normalizedQuery) && matchedOffers.length === 0) continue;

    const category = classifyEstablishment(displayName);
    const typeMap: Record<string, SearchResult["type"]> = {
      restaurante: "restaurant",
      entretenimento: "entertainment",
      servicos: "service",
    };

    const minPrice = Math.min(...compOffers.map((o) => Number(o.price) || 0));

    matches.push({
      id: `bah-${c.id}`,
      title: displayName,
      subtitle: `${compOffers.length} oferta${compOffers.length > 1 ? "s" : ""} • A partir de R$ ${minPrice.toFixed(2).replace(".", ",")}`,
      type: typeMap[category] || "partner",
      image:
        ov?.custom_image_url ||
        c.logo_url ||
        compOffers.find((o) => o.card_image_url)?.card_image_url ||
        compOffers.find((o) => o.banner_image_url)?.banner_image_url ||
        null,
      url: `/parceiro/${c.id}/ofertas`,
    });
  }

  matches.slice(0, 6).forEach((m) => allResults.push(m));
}
