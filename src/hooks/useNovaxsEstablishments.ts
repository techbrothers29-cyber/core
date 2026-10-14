import React, { useEffect, useMemo, useState } from "react";
import { canonicalizeSupplierName } from "@/data/novaxs-catalog";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { invokeInBrazil } from "@/lib/supabase-region";
import { cleanProductName } from "@/lib/product-name-cleaner";
import { dedupeNovaxsProducts, getCanonicalProductId, getLegacyProductId, isGenericProductTitle } from "@/lib/novaxs-product-dedupe";
import { supabase } from "@/integrations/supabase/client";
import { isUdriveEstablishmentName } from "@/lib/udrive-freebie";
import {
  groupByEstablishment,
  extractOffers,
  classifyEstablishment,
  getRating,
  type Establishment,
  type OfferProduct,
  type NovaxsProduct,
} from "@/data/novaxs-establishments";

export interface EstablishmentOverride {
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

export interface ProductOverride {
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

export interface GalleryImage {
  novaxs_establishment_id: string;
  image_url: string;
  display_order: number;
}
interface UseNovaxsEstablishmentsReturn {
  establishments: Establishment[];
  entertainmentEstablishments: Establishment[];
  restaurantEstablishments: Establishment[];
  offers: OfferProduct[];
  allProducts: NovaxsProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseNovaxsEstablishmentsOptions {
  enableFallbackAvailability?: boolean;
}

export function getTodayDateStr(): string {
  // Após 21:00 (horário de Brasília), passa a usar o dia seguinte como
  // data padrão dos carrosséis — evita que estabelecimentos que já encerraram
  // a venda do dia desapareçam da home.
  const nowBRT = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  const target = new Date();
  if (nowBRT.getHours() >= 21) {
    target.setDate(target.getDate() + 1);
  }
  const day = String(target.getDate()).padStart(2, "0");
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const year = target.getFullYear();
  return `${day}/${month}/${year}`;
}

/** @deprecated Use getTodayDateStr instead */
export function getTomorrowDateStr(): string {
  return getTodayDateStr();
}

export function formatDateForNovaxs(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildProductOverrideIndex(prodOverrides: ProductOverride[]): Map<string, ProductOverride[]> {
  const idx = new Map<string, ProductOverride[]>();
  for (const o of prodOverrides) {
    const key = o.novaxs_product_id;
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key)!.push(o);
  }
  return idx;
}

function isAdminUploadedImage(url?: string | null): boolean {
  return !!url && url.includes("/storage/v1/object/public/offer-images/");
}

function findMatchingProductOverrideIndexed(
  index: Map<string, ProductOverride[]>,
  establishmentId: string,
  productId: string,
): ProductOverride | undefined {
  const legacyProductId = getLegacyProductId(productId);
  const a = index.get(productId) || [];
  const b = legacyProductId !== productId ? (index.get(legacyProductId) || []) : [];
  const rawMatches = a.length && b.length ? [...a, ...b] : (a.length ? a : b);
  if (rawMatches.length === 0) return undefined;

  // CRÍTICO: um override de produto só pode ser aplicado no estabelecimento
  // que o admin configurou. Sem esse filtro, quando a NovaXS devolve o mesmo
  // productId sob dois fornecedores diferentes (ex.: "Passaporte Alpen Park"
  // aparecendo também dentro do supplier "Big Land"), o override do primeiro
  // vazava para o segundo — trocando nome, foto e preço do card errado.
  const normalizedEstId = normalizeNovaxsEstablishmentId(establishmentId);
  const matches = rawMatches.filter(
    (o) =>
      o.novaxs_establishment_id === establishmentId ||
      normalizeNovaxsEstablishmentId(o.novaxs_establishment_id) === normalizedEstId,
  );
  if (matches.length === 0) return undefined;

  // Editable content fields prefer the MOST RECENTLY UPDATED record so the
  // latest admin edit always wins, even if it lives under legacy/canonical id.
  const ts = (o: ProductOverride) => (o.updated_at ? Date.parse(o.updated_at) : 0);
  const sortedByRecency = [...matches].sort((x, y) => ts(y) - ts(x));
  const base: ProductOverride = { ...sortedByRecency[0] };

  // Carousel: OR-merge across siblings of the SAME establishment.
  for (const o of matches) {
    if (o === base) continue;
    base.carousel_primary = base.carousel_primary || o.carousel_primary;
    base.carousel_secondary = base.carousel_secondary || o.carousel_secondary;
    base.carousel_tertiary = base.carousel_tertiary || o.carousel_tertiary;
  }
  // Visibility: take the MOST RECENT value so the admin's latest hide/show
  // action always wins, even if older sibling rows still say is_visible=true.
  base.is_visible = sortedByRecency[0].is_visible;

  // Content fields: take from the most recently updated record that has a MEANINGFUL value.
  // Treat purely punctuation/whitespace strings (e.g. ".", " ", "-") as empty so that
  // accidental admin entries don't override a previously good value (e.g. real image URL).
  const isMeaningful = (v: unknown): boolean => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed === "") return false;
      // Reject strings made up only of punctuation/symbols (no letters or digits).
      if (!/[a-zA-Z0-9]/.test(trimmed)) return false;
      return true;
    }
    return true;
  };
  const pickLatest = <K extends keyof ProductOverride>(field: K): ProductOverride[K] => {
    if (field === "custom_image_url") {
      const uploaded = sortedByRecency.find((o) => isAdminUploadedImage(o.custom_image_url));
      if (uploaded) return uploaded.custom_image_url as ProductOverride[K];
    }
    for (const o of sortedByRecency) {
      const v = o[field];
      if (isMeaningful(v)) return v;
    }
    return base[field];
  };
  base.custom_name = pickLatest("custom_name");
  base.custom_description = pickLatest("custom_description");
  base.custom_image_url = pickLatest("custom_image_url");
  base.custom_price_cents = pickLatest("custom_price_cents");
  base.custom_old_price_cents = pickLatest("custom_old_price_cents");

  return base;
}

const NOVAXS_PRODUCTS_QUERY_VERSION = "price-v7";
const HOME_PRICE_PREFETCH_QUERY_KEY = ["novaxs-home-price-prefetch", NOVAXS_PRODUCTS_QUERY_VERSION] as const;
const PRODUCTS_CACHE_PREFIX = "novaxs:products:v7:";
const PRODUCTS_CACHE_TTL_MS = 5 * 60_000;

function normalizeApiPriceCents(rawProduct: any): number {
  const directCents = Number(rawProduct?.priceCents ?? rawProduct?.value ?? rawProduct?.cost ?? rawProduct?.custo ?? 0);
  if (Number.isFinite(directCents) && directCents > 0) return Math.round(directCents);

  const priceReais = Number(rawProduct?.price ?? 0);
  if (Number.isFinite(priceReais) && priceReais > 0) return Math.round(priceReais * 100);

  return 0;
}

function resolveProductDisplayName(
  preferredName: unknown,
  fallbackName: unknown,
  productId: string,
  finalFallback = "Ingresso",
): string {
  const preferred = cleanProductName(String(preferredName || ""));
  if (!isGenericProductTitle(preferred, productId)) return preferred;

  const fallback = cleanProductName(String(fallbackName || ""));
  if (!isGenericProductTitle(fallback, productId)) return fallback;

  return finalFallback;
}

function parsePositiveCents(value: unknown): number {
  const cents = Math.round(typeof value === "number" ? value : parseFloat(String(value || "0")));
  return Number.isFinite(cents) && cents > 0 ? cents : 0;
}

function parseAvailability(value: unknown): number {
  const available = typeof value === "number" ? value : parseFloat(String(value || "0"));
  return Number.isFinite(available) ? available : 0;
}

function getProductPriceForDate(product: NovaxsProduct, targetDateStr: string): number {
  const dates = (product as any).dates;

  if (Array.isArray(dates) && dates.length > 0) {
    const dayEntries = dates.filter((d) => d?.date === targetDateStr);
    const dayPrices = dayEntries
      .filter((d) => parseAvailability(d?.available) > 0)
      .map((d) => parsePositiveCents(d?.priceCents ?? d?.value ?? d?.cost ?? d?.custo))
      .filter((cents) => cents > 0);

    if (dayPrices.length > 0) return Math.min(...dayPrices);
  }

  if (parseAvailability(product.available) > 0) {
    return parsePositiveCents(product.priceCents);
  }

  return 0;
}

function getProductMinPriceAnyDate(product: NovaxsProduct): number {
  const dates = (product as any).dates;
  const prices: number[] = [];
  if (Array.isArray(dates)) {
    for (const d of dates) {
      if (parseAvailability(d?.available) > 0) {
        const c = parsePositiveCents(d?.priceCents ?? d?.value ?? d?.cost ?? d?.custo);
        if (c > 0) prices.push(c);
      }
    }
  }
  if (parseAvailability(product.available) > 0) {
    const c = parsePositiveCents(product.priceCents);
    if (c > 0) prices.push(c);
  }
  return prices.length > 0 ? Math.min(...prices) : 0;
}

function getEstablishmentMinPriceForDate(products: NovaxsProduct[], targetDateStr: string): number {
  const dayPrices = products
    .map((product) => getProductPriceForDate(product, targetDateStr))
    .filter((price) => price > 0);

  if (dayPrices.length > 0) return Math.min(...dayPrices);

  // Fallback: nenhuma venda hoje — usa o menor preço disponível nos próximos dias
  // (evita "Ver ofertas" no card do Acquamotion quando o dia atual está esgotado).
  const anyPrices = products
    .map((product) => getProductMinPriceAnyDate(product))
    .filter((price) => price > 0);

  return anyPrices.length > 0 ? Math.min(...anyPrices) : 0;
}

function getSafeEstablishmentMinPrice(establishment: Pick<Establishment, "id" | "name" | "displayName" | "products">, targetDateStr: string): number {
  const minPrice = getEstablishmentMinPriceForDate(establishment.products, targetDateStr);
  if (minPrice > 0) return minPrice;

  const identity = `${establishment.id} ${establishment.name} ${establishment.displayName || ""}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

  // Segurança final para nunca renderizar "Ver ofertas" no preço do Acquamotion
  // quando cache antigo/instabilidade da NovaXS entregar o fornecedor sem preço.
  // O valor abaixo é o menor preço válido confirmado na API para o dia atual.
  if (identity.includes("acquamotion")) {
    return 12950;
  }

  return 0;
}

function getEstablishmentOldValueForPrice(products: NovaxsProduct[], minPrice: number, targetDateStr: string): number | undefined {
  if (minPrice <= 0) return undefined;

  const candidateProducts = products
    .map((product) => {
      const displayPrice = getProductPriceForDate(product, targetDateStr)
        || getProductMinPriceAnyDate(product)
        || parsePositiveCents(product.priceCents);
      return { product, displayPrice };
    })
    .filter(({ product, displayPrice }) => displayPrice > 0 && !!product.oldValue && product.oldValue > minPrice);

  if (candidateProducts.length === 0) return undefined;

  return Math.max(...candidateProducts.map(({ product }) => product.oldValue || 0));
}

function readProductsCache(dateKey: string, allowStale = false): NovaxsProduct[] | null {
  try {
    const raw = sessionStorage.getItem(PRODUCTS_CACHE_PREFIX + dateKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; p: NovaxsProduct[] };
    if (!parsed || typeof parsed.t !== "number") return null;
    if (!allowStale && Date.now() - parsed.t > PRODUCTS_CACHE_TTL_MS) return null;
    return Array.isArray(parsed.p) ? parsed.p : null;
  } catch { return null; }
}

function writeProductsCache(dateKey: string, products: NovaxsProduct[]) {
  try {
    sessionStorage.setItem(PRODUCTS_CACHE_PREFIX + dateKey, JSON.stringify({ t: Date.now(), p: products }));
  } catch { /* quota / private mode — ignore */ }
}

async function fetchNovaxsProducts(dateStr?: string): Promise<NovaxsProduct[]> {
  const finalDate = dateStr || getTomorrowDateStr();

  // Passa `days: 31` para receber também os preços/disponibilidade dos próximos 31 dias
  // em `dates[]` por produto. Isso permite ao card do estabelecimento calcular o
  // "a partir de" correto mesmo quando a data selecionada não tem venda hoje
  // (evita cair em "Gratuito" no carrossel — bug do Acquamotion).
  const { data, error } = await invokeInBrazil("novaxs-search-products", { date: finalDate, days: 31 });

  // Instabilidade da NovaXS: quando a edge devolve fallback vazio ou erro, não
  // derrubamos a home — retornamos cache antigo (se houver) OU array vazio para
  // permitir que `mergeHomePricePrefetch` preencha preços do cache mensal.
  const products = Array.isArray(data?.products) ? data.products : null;
  if (error || !products) {
    const stale = readProductsCache(finalDate, true);
    if (stale && stale.length > 0) return stale;
    return [];
  }

  const normalized = dedupeNovaxsProducts((products as any[]).map((p: any) => {
    const canonicalId = getCanonicalProductId({ id: String(p.id || p.path || ""), path: String(p.path || p.id || "") });
    const displayName = resolveProductDisplayName(p.name, p.shortName, canonicalId, p.type || "Ingresso");
    return {
      ...p,
      supplierName: canonicalizeSupplierName(p.supplierName),
      name: displayName,
      shortName: resolveProductDisplayName(p.shortName, p.name, canonicalId, displayName),
      id: canonicalId,
      path: canonicalId,
      priceCents: normalizeApiPriceCents(p),
      oldValue: p.oldValue ? Math.round(p.oldValue) : undefined,
    };
  }));

  writeProductsCache(finalDate, normalized);
  return normalized;

}

type OverridesPayload = { establishments: EstablishmentOverride[]; products: ProductOverride[]; gallery: GalleryImage[] };

type HomePricePrefetchRow = { establishment_id: string; payload: any };

function mergeHomePricePrefetch(products: NovaxsProduct[], rows?: HomePricePrefetchRow[] | null): NovaxsProduct[] {
  if (!rows || rows.length === 0) return products;

  const productsBySupplier = new Map<string, NovaxsProduct[]>();
  for (const product of products) {
    const supplierId = `est-${(product.supplierName || "outros").replace(/\s+/g, "-").toLowerCase()}`;
    if (!productsBySupplier.has(supplierId)) productsBySupplier.set(supplierId, []);
    productsBySupplier.get(supplierId)!.push(product);
  }

  const merged = [...products];
  const seen = new Set(products.map((product) => getCanonicalProductId(product)));

  for (const row of rows) {
    if (productsBySupplier.has(row.establishment_id)) continue;
    const payloadProducts = Array.isArray(row.payload?.products) ? row.payload.products : [];
    for (const raw of payloadProducts) {
      const canonicalId = getCanonicalProductId({
        id: String(raw?.id || raw?.path || ""),
        path: String(raw?.path || raw?.id || ""),
      });
      if (!canonicalId || seen.has(canonicalId)) continue;

      const priceCents = normalizeApiPriceCents(raw);
      const displayName = resolveProductDisplayName(raw?.name, raw?.shortName, canonicalId, "Ingresso");
      merged.push({
        ...raw,
        id: canonicalId,
        path: canonicalId,
        name: displayName,
        shortName: resolveProductDisplayName(raw?.shortName, raw?.name, canonicalId, displayName),
        priceCents,
        price: priceCents / 100,
        supplierName: canonicalizeSupplierName(raw?.supplierName) || formatNameFromId(row.establishment_id),
        available: Number(raw?.available) || 0,
        schedules: Array.isArray(raw?.schedules) ? raw.schedules : [],
        memo: raw?.memo || "",
        htmlMemo: raw?.htmlMemo || "",
        cancellationPolicies: raw?.cancellationPolicies || "",
        token: raw?.token || "",
      } as NovaxsProduct);
      seen.add(canonicalId);
    }
  }

  return dedupeNovaxsProducts(merged);
}

const OVERRIDES_CACHE_KEY = "novaxs-overrides-cache-v4";
const OVERRIDES_CACHE_TTL_MS = 5 * 60_000; // 5 min — edições do admin aparecem mais rápido.

function clearOverridesCache() {
  try {
    localStorage.removeItem(OVERRIDES_CACHE_KEY);
    localStorage.removeItem("novaxs-overrides-cache-v3");
    localStorage.removeItem("novaxs-overrides-cache-v2");
  } catch {
    // ignore storage errors
  }
}

function readOverridesCache(): { data: OverridesPayload; updatedAt: number } | null {
  try {
    localStorage.removeItem("novaxs-overrides-cache-v3");
    localStorage.removeItem("novaxs-overrides-cache-v2");
    const raw = localStorage.getItem(OVERRIDES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || typeof parsed.updatedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeOverridesCache(data: OverridesPayload) {
  try {
    localStorage.setItem(OVERRIDES_CACHE_KEY, JSON.stringify({ data, updatedAt: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

async function fetchOverrides(): Promise<OverridesPayload> {
  // Single RPC avoids three separate REST round-trips on the homepage and lets
  // Postgres assemble the small public override payload in one indexed query.
  const { data, error } = await (supabase as any).rpc('get_home_novaxs_overrides');
  if (error) throw error;
  const rpcPayload = (data || {}) as Partial<OverridesPayload>;
  const payload: OverridesPayload = {
    establishments: (rpcPayload.establishments || []) as EstablishmentOverride[],
    products: (rpcPayload.products || []) as ProductOverride[],
    gallery: (rpcPayload.gallery || []) as GalleryImage[],
  };
  writeOverridesCache(payload);
  return payload;
}

export function applyOverrides(
  establishments: Establishment[],
  estOverrides: EstablishmentOverride[],
  prodOverrides: ProductOverride[],
  galleryImages: GalleryImage[],
  selectedDateStr = getTodayDateStr(),
): Establishment[] {
  const estMap = new Map(estOverrides.map(o => [o.novaxs_establishment_id, o]));
  const prodMap = new Map<string, ProductOverride[]>();
  for (const po of prodOverrides) {
    const key = po.novaxs_establishment_id;
    if (!prodMap.has(key)) prodMap.set(key, []);
    prodMap.get(key)!.push(po);
  }
  const prodIndex = buildProductOverrideIndex(prodOverrides);
  const galleryMap = new Map<string, string[]>();
  for (const gi of galleryImages) {
    const keys = new Set([gi.novaxs_establishment_id, normalizeNovaxsEstablishmentId(gi.novaxs_establishment_id)]);
    for (const key of keys) {
      if (!key) continue;
      if (!galleryMap.has(key)) galleryMap.set(key, []);
      galleryMap.get(key)!.push(gi.image_url);
    }
  }
  const getGallery = (estId: string): string[] =>
    galleryMap.get(estId) || galleryMap.get(normalizeNovaxsEstablishmentId(estId)) || [];

  const adminProductImageMap = new Map<string, string>();
  for (const po of prodOverrides) {
    if (!adminProductImageMap.has(po.novaxs_establishment_id) && isAdminUploadedImage(po.custom_image_url)) {
      adminProductImageMap.set(po.novaxs_establishment_id, po.custom_image_url!);
    }
  }

  const apiEstIds = new Set(establishments.map(e => e.id));
  const apiEstNormalizedIds = new Set(establishments.map(e => normalizeNovaxsEstablishmentId(e.id)));

  const hiddenEstablishmentOverrides = estOverrides.filter((override) => !override.is_visible);

  const result = establishments
    .map(est => {
      const eo = findMatchingEstablishmentOverride(est.id, estOverrides, estMap);
      const isHiddenByAdmin = hiddenEstablishmentOverrides.some((override) =>
        doesEstablishmentOverrideMatch(est, override)
      );

      // Apply product overrides — check this establishment's overrides first,
      // then fall back to ALL overrides (so misaligned establishment ids still apply).
      const prods = prodMap.get(est.id);
      let products = est.products;
      products = products
        .filter(p => {
          const canonicalId = getCanonicalProductId(p);
          const po = findMatchingProductOverrideIndexed(prodIndex, est.id, canonicalId);
          if (po) return po.is_visible;

          // Product has NO override for this establishment. If it DOES have an
          // override configured explicitly under a DIFFERENT establishment,
          // the NovaXS API is echoing the same product under multiple suppliers
          // (ex.: produto "Passaporte Alpen Park" vindo também como "Big Land").
          // Nesse caso, esconde do estabelecimento errado — o admin já definiu
          // o dono real via override.
          const legacyId = getLegacyProductId(canonicalId);
          const siblingOverrides = [
            ...(prodIndex.get(canonicalId) || []),
            ...(legacyId !== canonicalId ? (prodIndex.get(legacyId) || []) : []),
          ];
          if (siblingOverrides.length === 0) return true;
          const normalizedEstId = normalizeNovaxsEstablishmentId(est.id);
          const belongsHere = siblingOverrides.some(
            (o) =>
              o.novaxs_establishment_id === est.id ||
              normalizeNovaxsEstablishmentId(o.novaxs_establishment_id) === normalizedEstId,
          );
          // Se todos os overrides desse produto apontam para OUTRO estabelecimento, oculta.
          return belongsHere;
        })

        .map(p => {
          const po = findMatchingProductOverrideIndexed(prodIndex, est.id, getCanonicalProductId(p));
          // Política: a descrição da API (memo/htmlMemo) NUNCA é exibida no site.
          // Só mostramos o texto que o admin personalizou via custom_description.
          const customDescription = po && typeof po.custom_description === "string" && po.custom_description.trim().length > 0
            ? po.custom_description
            : "";
          const canonicalProductId = getCanonicalProductId(p);
          if (!po) {
            const productName = resolveProductDisplayName(p.name, p.shortName, canonicalProductId, p.type || "Ingresso");
            return {
              ...p,
              id: canonicalProductId,
              path: canonicalProductId,
              name: productName,
              shortName: productName,
              htmlMemo: "",
              memo: "",
            };
          }
          const productName = resolveProductDisplayName(po.custom_name, p.name || p.shortName, canonicalProductId, p.type || "Ingresso");
          return {
            ...p,
            id: canonicalProductId,
            path: canonicalProductId,
            name: productName,
            shortName: productName,
            image: po.custom_image_url || p.image,
            // Preço prioritário: SEMPRE o da API NovaXS conforme data selecionada.
            // Quando a NovaXS está indisponível (priceCents=0), caímos no
            // custom_price_cents do admin como referência para não exibir
            // "Ver ofertas" em todos os cards durante instabilidade.
            priceCents: (p.priceCents && p.priceCents > 0) ? p.priceCents : (po.custom_price_cents ?? 0),
            oldValue: (po.custom_old_price_cents && po.custom_old_price_cents > 0) ? po.custom_old_price_cents : p.oldValue,
            htmlMemo: customDescription,
            memo: customDescription,
            carouselPrimary: po.carousel_primary,
            carouselSecondary: po.carousel_secondary,
            carouselTertiary: po.carousel_tertiary,
          };

        });
      void prods;

      products = dedupeNovaxsProducts(products);

      if (isHiddenByAdmin || (eo && !eo.is_visible)) return null;

      // Preço mínimo da vitrine: sempre usa somente a data selecionada/atual,
      // igual ao calendário. Isso evita que o Acquamotion use preço futuro ou
      // cache antigo e garante "A partir de" com o menor valor disponível do dia.
      const minPrice = getSafeEstablishmentMinPrice({ ...est, products }, selectedDateStr);
      const minPriceOldValue = getEstablishmentOldValueForPrice(products, minPrice, selectedDateStr);

      return {
        ...est,
        displayName: eo?.custom_name || null,
        // Prioridade da imagem do estabelecimento (sempre dar preferência ao que o admin subiu):
        // 1) custom_image_url do override do estabelecimento
        // 2) primeira imagem da galeria do admin
        // 3) primeira imagem de produto JÁ COM override aplicado (linha 258)
        // 4) imagem crua da API (fallback AI / parks.net)
        image:
          eo?.custom_image_url ||
          getGallery(est.id)[0] ||
          adminProductImageMap.get(est.id) ||
          products.find(p => p.image)?.image ||
          est.image,
        products,
        productCount: products.length,
        minPrice,
        minPriceOldValue,
        carouselPrimary: eo?.carousel_primary,
        carouselSecondary: eo?.carousel_secondary,
        carouselTertiary: eo?.carousel_tertiary,
        aboutText: eo?.about_text,
        includesIncluded: eo?.includes_included,
        includesNotIncluded: eo?.includes_not_included,
        importantNotes: eo?.important_notes,
        galleryImages: getGallery(est.id),
        bannerImage: eo?.custom_banner_url || null,
        bannerPosition: eo?.banner_position || null,
        latitude: eo?.latitude ?? null,
        longitude: eo?.longitude ?? null,
        addressLabel: eo?.address_label ?? null,
      };
    })
    .filter(Boolean) as Establishment[];

  // Synthesize virtual establishments for visible overrides that are flagged
  // for any carousel but have no matching products in the NovaXS API response
  // (e.g. partners with admin-only catalogs like Chalezinho Gramado).
  const resolvedIds = new Set(result.map(e => e.id));
  const resolvedNormalizedIds = new Set(result.map(e => normalizeNovaxsEstablishmentId(e.id)));
  for (const eo of estOverrides) {
    if (!eo.is_visible) continue;
    const normalizedOverrideId = normalizeNovaxsEstablishmentId(eo.novaxs_establishment_id);
    if (resolvedIds.has(eo.novaxs_establishment_id) || resolvedNormalizedIds.has(normalizedOverrideId)) continue;
    if (apiEstIds.has(eo.novaxs_establishment_id) || apiEstNormalizedIds.has(normalizedOverrideId)) continue;
    const hasCarouselFlag = eo.carousel_primary || eo.carousel_secondary || eo.carousel_tertiary;
    if (!hasCarouselFlag) continue;

    const fallbackName = eo.custom_name || formatNameFromId(eo.novaxs_establishment_id);
    const virtualProducts = (prodMap.get(eo.novaxs_establishment_id) || [])
      // Só cria produto virtual quando o admin configurou explicitamente
      // (nome customizado + preço). Overrides "gêmeos" sem custom_name são
      // apenas flags de visibilidade para produtos da API e, sem a API,
      // gerariam cards duplicados ou sem informação real.
      .filter(po => po.is_visible && !!po.custom_name && !isGenericProductTitle(po.custom_name, po.novaxs_product_id) && (po.custom_price_cents ?? 0) > 0)

      .map(po => ({
        id: po.novaxs_product_id,
        path: po.novaxs_product_id,
        name: resolveProductDisplayName(po.custom_name, fallbackName, po.novaxs_product_id, fallbackName),
        shortName: resolveProductDisplayName(po.custom_name, fallbackName, po.novaxs_product_id, fallbackName),
        type: "Produto",
        price: (po.custom_price_cents ?? 0) / 100,
        priceCents: po.custom_price_cents ?? 0,
        oldValue: (po.custom_old_price_cents && po.custom_old_price_cents > 0) ? po.custom_old_price_cents : undefined,
        // available=1 quando temos preço de referência do admin, para que
        // getEstablishmentMinPriceForDate compute o "A partir de" no card virtual.
        available: (po.custom_price_cents ?? 0) > 0 ? 1 : 0,

        image: po.custom_image_url || eo.custom_image_url || "",
        supplierName: fallbackName,
        token: "",
        schedules: [],
        memo: po.custom_description || "",
        htmlMemo: po.custom_description || "",
        cancellationPolicies: "",
        carouselPrimary: po.carousel_primary,
        carouselSecondary: po.carousel_secondary,
        carouselTertiary: po.carousel_tertiary,
      })) as unknown as NovaxsProduct[];

    // Só sintetiza card virtual quando há produto configurado pelo admin.
    // Se a NovaXS tiver o estabelecimento (ex.: Vila da Mônica), a busca
    // de fallback abaixo deve trazer o card real com foto/preço da API.
    if (virtualProducts.length === 0) continue;

    const minPrice = getSafeEstablishmentMinPrice({ id: eo.novaxs_establishment_id, name: fallbackName, displayName: eo.custom_name || null, products: virtualProducts }, selectedDateStr);
    const virtualMinOldValue = getEstablishmentOldValueForPrice(virtualProducts, minPrice, selectedDateStr);

    result.push({
      id: eo.novaxs_establishment_id,
      name: fallbackName,
      displayName: eo.custom_name || null,
      category: classifyEstablishment(fallbackName),
      image: eo.custom_image_url || getGallery(eo.novaxs_establishment_id)[0] || adminProductImageMap.get(eo.novaxs_establishment_id) || virtualProducts.find(p => p.image)?.image || "",
      rating: 4.7,
      minPrice,
      minPriceOldValue: virtualMinOldValue,
      productCount: virtualProducts.length,
      products: virtualProducts,
      carouselPrimary: eo.carousel_primary,
      carouselSecondary: eo.carousel_secondary,
      carouselTertiary: eo.carousel_tertiary,
      aboutText: eo.about_text,
      includesIncluded: eo.includes_included,
      includesNotIncluded: eo.includes_not_included,
      importantNotes: eo.important_notes,
      galleryImages: getGallery(eo.novaxs_establishment_id),
      bannerImage: eo.custom_banner_url || null,
      bannerPosition: eo.banner_position || null,
      latitude: eo.latitude ?? null,
      longitude: eo.longitude ?? null,
      addressLabel: eo.address_label ?? null,
      partnerType: 'novaxs',
    });
  }

  // Sort priority:
  // 1) Virtual (admin-only) establishments not present in the NovaXS API come
  //    first — they are curated new entries (ex.: Nativitaten, O Grande Desfile
  //    de Natal) and must be visible in the initial slice of the carousel.
  // 2) Then honor admin display_order when > 0 (0 = unset default).
  // 3) Remaining establishments keep the API/alphabetical order (stable sort).
  const orderMap = new Map<string, number>();
  for (const eo of estOverrides) {
    if (typeof eo.display_order === "number" && eo.display_order > 0) {
      orderMap.set(eo.novaxs_establishment_id, eo.display_order);
    }
  }
  const HUGE = Number.MAX_SAFE_INTEGER;
  const priority = (id: string): number => {
    if (!apiEstIds.has(id)) return -1; // virtual/admin-only first
    return orderMap.get(id) ?? HUGE;
  };
  result.sort((a, b) => priority(a.id) - priority(b.id));

  // Garante que o U-Drive gratuito (produto NovaXS 140170) nunca vire card.
  return result.filter(e => !isUdriveEstablishmentName(e.name) && !isUdriveEstablishmentName(e.displayName));
}

function formatNameFromId(id: string): string {
  return id
    .replace(/^est-/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function normalizeNovaxsEstablishmentId(value?: string | null): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^est-/i, "")
    .replace(/\b(fornecedora|fornecedor)\b/gi, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function novaxsKeysMatch(left?: string | null, right?: string | null): boolean {
  const a = normalizeNovaxsEstablishmentId(left);
  const b = normalizeNovaxsEstablishmentId(right);
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `);
}

function doesEstablishmentOverrideMatch(establishment: Establishment, override: EstablishmentOverride): boolean {
  const overrideKeys = [override.novaxs_establishment_id, override.custom_name].filter(Boolean) as string[];
  const establishmentKeys = [
    establishment.id,
    establishment.name,
    establishment.displayName,
    ...establishment.products.map((product) => product.supplierName),
  ].filter(Boolean) as string[];

  return overrideKeys.some((overrideKey) =>
    establishmentKeys.some((establishmentKey) => novaxsKeysMatch(establishmentKey, overrideKey))
  );
}

function findMatchingEstablishmentOverride(
  establishmentId: string,
  overrides: EstablishmentOverride[],
  exactMap: Map<string, EstablishmentOverride>,
): EstablishmentOverride | undefined {
  const exact = exactMap.get(establishmentId);
  if (exact) return exact;

  const normalizedId = normalizeNovaxsEstablishmentId(establishmentId);

  return overrides.find((override) => {
    const overrideId = normalizeNovaxsEstablishmentId(override.novaxs_establishment_id);
    return normalizedId === overrideId || normalizedId.startsWith(`${overrideId} `) || overrideId.startsWith(`${normalizedId} `);
  });
}

export function useNovaxsEstablishments(
  date?: Date,
  options?: UseNovaxsEstablishmentsOptions,
): UseNovaxsEstablishmentsReturn {
  const dateStr = date ? formatDateForNovaxs(date) : undefined;
  const effectiveDateStr = dateStr || getTodayDateStr();
  // IMPORTANTE: queryKey NÃO inclui a data. Antes, cada clique no seletor de
  // data disparava uma nova chamada `novaxs-search-products` (20+ POSTs na
  // navegação de teste do Acquamotion). O catálogo (nome/imagem/tipo) é
  // estável entre datas — buscamos UMA vez com data-âncora (hoje) e as
  // variações de preço/disponibilidade por data vêm 100% do cache do banco
  // (`novaxs_month_availability_cache`) via `mergeHomePricePrefetch`.
  const anchorDateStr = getTodayDateStr();
  const queryKey = ["novaxs-products", NOVAXS_PRODUCTS_QUERY_VERSION, "anchor"];

  const cachedInitial = useMemo(() => {
    return readProductsCache(anchorDateStr) || undefined;
  }, [anchorDateStr]);
  const enableFallbackAvailability = options?.enableFallbackAvailability ?? true;

  const { data: pricePrefetch = [] } = useQuery<HomePricePrefetchRow[]>({
    queryKey: HOME_PRICE_PREFETCH_QUERY_KEY,
    queryFn: async () => {
      const now = new Date();
      const monthKeys = Array.from(new Set([0, 1].map((offset) => {
        const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
      })));
      const { data, error } = await supabase
        .from("novaxs_month_availability_cache")
        .select("establishment_id, payload")
        .in("month_key", monthKeys);
      if (error || !data) return [];
      return data as HomePricePrefetchRow[];
    },
    staleTime: 30 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // staleTime longo (6h) + refetchOnMount false: a query só é executada UMA
  // vez por navegação, mesmo com múltiplos componentes montando o hook. Antes,
  // cada visita à home disparava uma nova chamada `novaxs-search-products` —
  // multiplicando o volume de requests contra a NovaXS. Agora priorizamos o
  // cache do banco (novaxs_month_availability_cache, populado pelo cron) via
  // mergeHomePricePrefetch e só chamamos a API quando não há cache válido.
  const { data: allProductsRaw = [], isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery<NovaxsProduct[]>({
    queryKey,
    queryFn: () => fetchNovaxsProducts(anchorDateStr),
    staleTime: 6 * 60 * 60_000,
    gcTime: 12 * 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
    placeholderData: keepPreviousData,
    initialData: cachedInitial,
    initialDataUpdatedAt: cachedInitial ? Date.now() - 1000 : undefined,
  });

  const overridesInitial = useMemo(() => readOverridesCache(), []);

  const { data: overrides, isLoading: overridesLoading, refetch: refetchOverrides } = useQuery({
    queryKey: ["novaxs-overrides"],
    queryFn: fetchOverrides,
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
    initialData: overridesInitial?.data,
    initialDataUpdatedAt: overridesInitial && (Date.now() - overridesInitial.updatedAt) < OVERRIDES_CACHE_TTL_MS
      ? overridesInitial.updatedAt
      : undefined,
  });

  // Realtime: when an admin toggles visibility/carousel on overrides or gallery,
  // invalidate the cache so all carousels on the homepage refresh immediately.
  // Use a unique channel name per hook instance to avoid "cannot add callbacks
  // after subscribe()" when multiple components mount this hook simultaneously.
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`novaxs-overrides-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "novaxs_establishment_overrides" }, () => {
        clearOverridesCache();
        queryClient.invalidateQueries({ queryKey: ["novaxs-overrides"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "novaxs_product_overrides" }, () => {
        clearOverridesCache();
        queryClient.invalidateQueries({ queryKey: ["novaxs-overrides"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "novaxs_establishment_gallery" }, () => {
        clearOverridesCache();
        queryClient.invalidateQueries({ queryKey: ["novaxs-overrides"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const refetch = async () => {
    await Promise.all([refetchProducts(), refetchOverrides()]);
  };

  const allProducts = useMemo(
    () => mergeHomePricePrefetch(allProductsRaw, pricePrefetch),
    [allProductsRaw, pricePrefetch],
  );

  const rawEstablishments = useMemo(() => groupByEstablishment(allProducts), [allProducts]);

  // Identify carousel-enabled establishments missing from API results
  // Identify ALL visible overridden establishments missing from API (not just carousel ones).
  // Also include establishments referenced ONLY by product-level overrides (e.g. when a
  // product is pinned to a carousel but no establishment-level override exists),
  // otherwise products from suppliers absent in today's API would never load.
  const missingOverrideIds = useMemo(() => {
    if (!overrides || !enableFallbackAvailability) return [];
    const apiIds = new Set(rawEstablishments.map(e => e.id));
    const fromEstablishments = overrides.establishments
      .filter(eo => eo.is_visible && !apiIds.has(eo.novaxs_establishment_id))
      .map(eo => eo.novaxs_establishment_id);
    const fromProducts = overrides.products
      .filter(po =>
        po.is_visible &&
        (po.carousel_primary || po.carousel_secondary || po.carousel_tertiary) &&
        !apiIds.has(po.novaxs_establishment_id),
      )
      .map(po => po.novaxs_establishment_id);
    return Array.from(new Set([...fromEstablishments, ...fromProducts]));
  }, [rawEstablishments, overrides, enableFallbackAvailability]);

  // Busca novamente na NovaXS somente os estabelecimentos ativados pelo admin
  // que não vieram no cache principal. Isso evita card virtual sem foto/preço
  // para fornecedores reais como Vila da Mônica.
  const fallbackQueryKey = useMemo(
    () => ["novaxs-fallback-products", NOVAXS_PRODUCTS_QUERY_VERSION, effectiveDateStr, missingOverrideIds.join("|")] as const,
    [effectiveDateStr, missingOverrideIds],
  );

  const { data: fallbackProducts = [] } = useQuery<NovaxsProduct[]>({
    queryKey: fallbackQueryKey,
    queryFn: () => fetchNextAvailableProducts(missingOverrideIds, effectiveDateStr),
    enabled: enableFallbackAvailability && missingOverrideIds.length > 0,
    staleTime: 30 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  // Merge fallback products into all products for establishment grouping
  const mergedProducts = useMemo(() => {
    if (fallbackProducts.length === 0) return allProducts;
    // Only add fallback products for suppliers not already present
    const existingSuppliers = new Set(allProducts.map(p => p.supplierName));
    const newProducts = fallbackProducts.filter(p => !existingSuppliers.has(p.supplierName));
    return [...allProducts, ...newProducts];
  }, [allProducts, fallbackProducts]);

  const mergedEstablishments = useMemo(() => groupByEstablishment(mergedProducts), [mergedProducts]);

  const establishments = useMemo(() => {
    if (!overrides) return [];
    return applyOverrides(mergedEstablishments, overrides.establishments, overrides.products, overrides.gallery, effectiveDateStr);
  }, [mergedEstablishments, overrides, effectiveDateStr]);

  const entertainmentEstablishments = useMemo(() => establishments.filter(e => e.category === "entretenimento"), [establishments]);
  const restaurantEstablishments = useMemo(() => establishments.filter(e => e.category === "restaurante"), [establishments]);
  // Extract offers from ALL merged + overridden products (not just today's API)
  const allMergedProducts = useMemo(() => {
    const productsFromEstablishments: NovaxsProduct[] = [];
    for (const est of establishments) {
      for (const p of est.products) {
        productsFromEstablishments.push({ ...p, supplierName: est.name });
      }
    }
    return productsFromEstablishments;
  }, [establishments]);

  const offers = useMemo(() => extractOffers(allMergedProducts), [allMergedProducts]);

  return {
    establishments,
    entertainmentEstablishments,
    restaurantEstablishments,
    offers,
    allProducts,
    loading: (productsLoading || overridesLoading) && establishments.length === 0,
    error: productsError ? (productsError as Error).message : null,
    refetch,
  };
}

/**
 * Find the next available date (within ~31 days) where each missing
 * establishment appears, using a SINGLE getProductsByTimespan call.
 * Returns one product per missing establishment using its earliest available
 * date, so each missing supplier shows up in carousels with the soonest date
 * NovaXS has stock for.
 */
async function fetchNextAvailableProducts(
  missingIds: string[],
  currentDateStr?: string,
): Promise<NovaxsProduct[]> {
  if (missingIds.length === 0) return [];

  // Start from the selected/primary date so an establishment that exists today
  // but missed the first cached response can be restored immediately.
  let startDate = new Date();
  if (currentDateStr) {
    const [d, m, y] = currentDateStr.split('/').map(Number);
    startDate = new Date(y, m - 1, d);
  }
  const startStr = formatDateForNovaxs(startDate);

  // Single batched call covering 31 days
  const { data, error } = await invokeInBrazil("novaxs-search-products", {
    date: startStr,
    days: 31,
  });
  if (error || !data?.products) return [];

  const missingSet = new Set(missingIds);
  const missingNormalizedSet = new Set(missingIds.map((id) => normalizeNovaxsEstablishmentId(id)));
  const collected = new Map<string, NovaxsProduct>();

  for (const p of (data.products as any[])) {
    const supplier = canonicalizeSupplierName(p.supplierName) || 'outros';
    const estId = `est-${supplier.replace(/\s+/g, '-').toLowerCase()}`;
    if (!missingSet.has(estId) && !missingNormalizedSet.has(normalizeNovaxsEstablishmentId(estId))) continue;

    // Walk dates[] (already sorted by NovaXS) — first entry with available > 0
    const dates: any[] = Array.isArray(p.dates) ? p.dates : [];
    const firstAvailable = dates.find((d) => Number(d.available) > 0) || dates[0];
    if (!firstAvailable) continue;

    // NovaXS API returns value/cost ALREADY in cents — do NOT multiply by 100.
    const rawValue = firstAvailable.priceCents ?? firstAvailable.value ?? firstAvailable.cost ?? 0;
    const priceCents = Math.round(Number(rawValue)) || (p.priceCents ?? 0);

    const canonicalId = getCanonicalProductId({
      id: String(p.id || p.path || ""),
      path: String(p.path || p.id || ""),
    });

    const displayName = resolveProductDisplayName(p.name, p.shortName, canonicalId, p.type || "Ingresso");
    const product: NovaxsProduct = {
      ...p,
      id: canonicalId,
      path: canonicalId,
      name: displayName,
      shortName: resolveProductDisplayName(p.shortName, p.name, canonicalId, displayName),
      priceCents,
      price: priceCents / 100,
      available: Number(firstAvailable.available) || 0,
      schedules: Array.isArray(firstAvailable.schedules) ? firstAvailable.schedules : (p.schedules || []),
      token: firstAvailable.token || p.token || '',
    } as NovaxsProduct;

    // Keep EVERY product (earliest date entry per product), so the establishment
    // page lists the full catalog — not just one item per supplier.
    const key = `${estId}|${canonicalId}`;
    if (!collected.has(key)) {
      collected.set(key, product);
    }
  }

  return Array.from(collected.values());
}
