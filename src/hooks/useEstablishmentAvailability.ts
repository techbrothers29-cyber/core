import React, { useEffect, useMemo } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { differenceInCalendarDays } from "date-fns";
// invokeInBrazil removido: calendário serve 100% do cache do banco.
import { supabase } from "@/integrations/supabase/client";
import { cleanProductName } from "@/lib/product-name-cleaner";
import type { NovaxsProduct } from "@/data/novaxs-establishments";
import { normalizeNovaxsText, resolveIntegratedEstablishmentByName } from "@/data/novaxs-catalog";
import { getCanonicalProductId, isGenericProductTitle } from "@/lib/novaxs-product-dedupe";

function formatDateForNovaxs(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function fallbackEstablishmentId(name: string): string {
  return `est-${normalizeNovaxsText(name || "outros")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")}`;
}

function buildEstablishmentId(supplierName: string): string {
  return resolveIntegratedEstablishmentByName(supplierName)?.id || fallbackEstablishmentId(supplierName);
}

// Returns ALL plausible establishment ids for a given supplier name. The rest
// of the app (useNovaxsEstablishments) groups establishments using the raw
// supplier slug (e.g. "Grupo Dreams - Combos" -> "est-grupo-dreams---combos"),
// while the catalog can map several supplier variants to a single canonical id
// (e.g. "Grupo Dreams" -> "est-grupo-dreams"). We accept either form so the
// calendar matches whichever id the page resolved to.
function buildEstablishmentIdCandidates(supplierName: string): string[] {
  const ids = new Set<string>();
  const catalogId = resolveIntegratedEstablishmentByName(supplierName)?.id;
  if (catalogId) ids.add(catalogId);
  ids.add(fallbackEstablishmentId(supplierName));
  // Admin-only / virtual establishments arrive in the cache with the
  // establishment id already set as the supplierName (e.g. "est-nativitaten").
  // Accept it as-is so those synthetic products still match their calendar.
  if (typeof supplierName === "string" && /^est-/i.test(supplierName.trim())) {
    ids.add(supplierName.trim().toLowerCase());
  }
  return Array.from(ids);
}

function normalizeEstablishmentId(id: string): string {
  return normalizeNovaxsText(id || "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function isSameEstablishmentId(left: string, right: string): boolean {
  return normalizeEstablishmentId(left) === normalizeEstablishmentId(right);
}

function supplierMatchesEstablishment(supplierName: string, establishmentId: string): boolean {
  const target = normalizeEstablishmentId(establishmentId);
  return buildEstablishmentIdCandidates(supplierName).some(
    (candidate) => normalizeEstablishmentId(candidate) === target,
  );
}

// In-memory TTL para validar revalidação dentro da mesma navegação.
const CACHE_TTL = 15 * 60_000;
// Persistência longa em localStorage para que o calendário pinte
// instantaneamente em reloads e navegações futuras (até dezembro).
const PERSIST_TTL = 24 * 60 * 60_000; // 24h
// v4: localStorage persistente (antes sessionStorage v3).
const STORAGE_PREFIX = "novaxs-day-cache-v4:";


const dateCache = new Map<string, { data: NovaxsProduct[]; ts: number }>();

type TimespanEntry = {
  date?: string;
  available?: string | number;
  value?: string | number;
  cost?: string | number;
  custo?: string | number;
  priceCents?: number;
};

type TimespanProduct = Omit<NovaxsProduct, "available" | "dates"> & {
  dates?: TimespanEntry[];
  available?: string | number;
};

type RawNovaxsApiProduct = Omit<Partial<NovaxsProduct>, "available" | "dates" | "id" | "path" | "price"> & {
  id?: string | number;
  path?: string | number;
  price?: string | number;
  available?: string | number;
  dates?: TimespanEntry[];
};

function readSessionCache(dateStr: string): NovaxsProduct[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dateStr);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: NovaxsProduct[]; ts: number };
    if (Date.now() - parsed.ts > PERSIST_TTL) {
      localStorage.removeItem(STORAGE_PREFIX + dateStr);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSessionCache(dateStr: string, data: NovaxsProduct[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + dateStr, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage cheio: limpa chaves antigas do prefixo e tenta novamente.
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
      }
      keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(STORAGE_PREFIX + dateStr, JSON.stringify({ data, ts: Date.now() }));
    } catch {
      // desiste silenciosamente
    }
  }
}

function normalizeTimespanDate(dateValue?: string): string | null {
  if (!dateValue || typeof dateValue !== "string") return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
    return dateValue;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-");
    return `${day}/${month}/${year}`;
  }

  return null;
}

const inflightTimespan = new Map<string, Promise<TimespanProduct[]>>();

async function fetchProductsForTimespanCached(startDateStr: string, days: number): Promise<TimespanProduct[]> {
  // Política de cache-only: o calendário do estabelecimento é servido 100%
  // pelo `novaxs_month_availability_cache` (populado pelo cron warm-availability).
  // Aqui NÃO chamamos mais a NovaXS — o fallback antigo (`novaxs-search-products`)
  // era responsável pelas rajadas de 10+ POSTs por navegação em parceiros sem
  // linha de cache (ex.: Hector Ferrovia Secreta). Se o mês não estiver no
  // cache, o calendário fica sem preços preenchidos até o próximo warm.
  const cacheKey = `${startDateStr}:${days}`;
  const cached = dateCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as TimespanProduct[];

  const fromSession = readSessionCache(cacheKey);
  if (fromSession) {
    dateCache.set(cacheKey, { data: fromSession, ts: Date.now() });
    return fromSession as TimespanProduct[];
  }

  dateCache.set(cacheKey, { data: [], ts: Date.now() });
  return [];
}

const MAX_DAYS_AHEAD = 365;
// Cobrimos exatamente o mês visível em UMA única chamada (NovaXS aceita até
// 31 dias por request). Os meses seguintes são pré-buscados em background via
// PREFETCH_MONTHS_AHEAD, então a navegação para frente continua instantânea
// sem martelar a NovaXS com 5+ chamadas paralelas a cada paint — o que estava
// causando 504 Gateway Timeout e a lentidão relatada nos parques (Parksnet).
const MIN_HORIZON_DAYS = 31;
// Pré-carrega todos os meses até janeiro do ano seguinte (mín 3 meses
// à frente) para o calendário ficar instantâneo em qualquer mês.
function monthsAheadUntilJanuaryNext(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  // Até janeiro do próximo ano: (12 - month) meses. Mín 3.
  return Math.max(3, 12 - month);
}
const PREFETCH_MONTHS_AHEAD = monthsAheadUntilJanuaryNext();

const AVAILABILITY_QUERY_VERSION = "v9";

function extendToMinHorizon(end: Date): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minEnd = new Date(today);
  minEnd.setDate(minEnd.getDate() + MIN_HORIZON_DAYS - 1);
  return end < minEnd ? minEnd : end;
}

export type DayPriceMap = Record<string, number>; // dateKey "dd/mm/yyyy" -> minPriceCents
export type ProductDayPriceMap = Record<string, Record<string, number>>; // productId -> dateKey -> priceCents

type MonthAvailabilityResult = { dates: string[]; prices: DayPriceMap; productPrices: ProductDayPriceMap; products: NovaxsProduct[] };

type MonthCachePayload = {
  dates?: string[];
  prices?: DayPriceMap;
  productPrices?: ProductDayPriceMap;
  products?: NovaxsProduct[];
};

type MonthCacheRow = {
  establishment_id?: string;
  payload?: MonthCachePayload | null;
  updated_at?: string;
};

type AvailabilityProductOverride = {
  novaxs_product_id: string;
  novaxs_establishment_id: string;
  custom_name: string | null;
  custom_description: string | null;
  custom_image_url: string | null;
  custom_price_cents: number | null;
  is_visible: boolean;
};

function canonicalProductIdFromOverride(productId: string): string {
  return getCanonicalProductId({ id: productId, path: productId } as Pick<NovaxsProduct, "id" | "path">);
}

function getLegacyProductId(productId: string): string {
  return productId.replace(/^products\//, "");
}

function resolveAvailabilityProductName(name: string | null | undefined, productId: string, fallback = "Ingresso"): string {
  const cleaned = cleanProductName(name || "");
  return isGenericProductTitle(cleaned, productId) ? fallback : cleaned;
}

function sanitizeAvailabilityProducts(products: NovaxsProduct[]): NovaxsProduct[] {
  return products.map((product) => {
    const canonicalId = getCanonicalProductId(product);
    const productName = resolveAvailabilityProductName(product.name || product.shortName, canonicalId, product.type || "Ingresso");
    return {
      ...product,
      id: canonicalId,
      path: canonicalId,
      name: productName,
      shortName: productName,
    };
  });
}

function mergeProductsByCanonical(products: NovaxsProduct[]): NovaxsProduct[] {
  const byId = new Map<string, NovaxsProduct>();
  for (const product of products) {
    const canonicalId = getCanonicalProductId(product);
    if (!canonicalId) continue;
    const existing = byId.get(canonicalId);
    if (!existing || (product.priceCents || 0) > 0 || !(existing.priceCents > 0)) {
      byId.set(canonicalId, { ...product, id: canonicalId, path: canonicalId });
    }
  }
  return Array.from(byId.values());
}

function buildAvailabilityFromProductOverrides(
  establishmentId: string,
  productOverrides: AvailabilityProductOverride[],
  rows: MonthCacheRow[],
): MonthAvailabilityResult | null {
  const visibleOverrides = productOverrides.filter(
    (override) => override.is_visible && override.novaxs_establishment_id === establishmentId,
  );
  if (visibleOverrides.length === 0 || rows.length === 0) return null;

  const dates = new Set<string>();
  const prices: DayPriceMap = {};
  const productPrices: ProductDayPriceMap = {};
  const products: NovaxsProduct[] = [];

  for (const override of visibleOverrides) {
    const canonicalId = canonicalProductIdFromOverride(override.novaxs_product_id);
    if (!canonicalId) continue;
    const legacyId = getLegacyProductId(canonicalId);
    const perDate: Record<string, number> = {};

    for (const row of rows) {
      const rowProductPrices = row.payload?.productPrices || {};
      const sourceMaps = [rowProductPrices[canonicalId], rowProductPrices[legacyId]].filter(Boolean) as Record<string, number>[];
      for (const sourceMap of sourceMaps) {
        for (const [dateKey, rawCents] of Object.entries(sourceMap)) {
          const cents = Math.round(typeof rawCents === "number" ? rawCents : parseFloat(String(rawCents || "0")));
          if (!(cents > 0)) continue;
          if (perDate[dateKey] == null || cents < perDate[dateKey]) perDate[dateKey] = cents;
        }
      }
    }

    const datePrices = Object.values(perDate).filter((value) => value > 0);
    const fallbackPrice = Math.round(override.custom_price_cents || 0);
    const minPrice = datePrices.length > 0 ? Math.min(...datePrices) : fallbackPrice;
    if (!(minPrice > 0)) continue;

    productPrices[canonicalId] = perDate;
    for (const [dateKey, cents] of Object.entries(perDate)) {
      dates.add(dateKey);
      if (prices[dateKey] == null || cents < prices[dateKey]) prices[dateKey] = cents;
    }

    const productName = resolveAvailabilityProductName(override.custom_name, canonicalId);
    products.push({
      id: canonicalId,
      path: canonicalId,
      name: productName,
      shortName: productName,
      type: "Ingresso",
      price: minPrice / 100,
      priceCents: minPrice,
      available: 1,
      image: override.custom_image_url || "",
      supplierName: establishmentId,
      token: "",
      schedules: [],
      memo: override.custom_description || "",
      htmlMemo: override.custom_description || "",
      cancellationPolicies: "",
    });
  }

  if (dates.size === 0 && products.length === 0) return null;
  return {
    dates: Array.from(dates),
    prices,
    productPrices,
    products: mergeProductsByCanonical(products),
  };
}

async function fetchMonthAvailability(
  establishmentId: string,
  monthStart: Date,
  monthEnd: Date,
  onPartial?: (partial: MonthAvailabilityResult) => void,
): Promise<MonthAvailabilityResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + MAX_DAYS_AHEAD);

  const effectiveStart = monthStart < today ? today : monthStart;
  const extendedMonthEnd = extendToMinHorizon(monthEnd);
  const effectiveEnd = extendedMonthEnd > horizon ? horizon : extendedMonthEnd;

  if (effectiveStart > effectiveEnd) return { dates: [], prices: {}, productPrices: {}, products: [] };

  // Estratégia híbrida: primeiro pedaço pequeno (7 dias) para o calendário
  // pintar preços rapidamente, e o restante (até 24 dias) em streaming. Isso
  // resolve a lentidão relatada (ex.: Acquamotion levando ~6s para sair de
  // "Gratuito") sem aumentar o número total de chamadas além de 2.
  const FAST_CHUNK = 7;
  const MAX_CHUNK = 31;
  const totalSpan = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;

  const chunkWindows: { start: Date; span: number }[] = [];
  let cursor = 0;
  while (cursor < totalSpan) {
    const chunkStart = new Date(effectiveStart);
    chunkStart.setDate(chunkStart.getDate() + cursor);
    const span = Math.min(cursor === 0 ? FAST_CHUNK : MAX_CHUNK, totalSpan - cursor);
    chunkWindows.push({ start: chunkStart, span });
    cursor += span;
  }


  // Shared accumulators across chunks.
  const availableDates = new Set<string>();
  const dayPrices: DayPriceMap = {};
  const productPrices: ProductDayPriceMap = {};
  const establishmentProducts: NovaxsProduct[] = [];
  const seenProductIds = new Set<string>();
  const seenChunkProducts = new Map<string, TimespanProduct>();

  const addPrice = (dateKey: string, priceCents: number) => {
    if (priceCents <= 0) return;
    if (dayPrices[dateKey] == null || priceCents < dayPrices[dateKey]) {
      dayPrices[dateKey] = priceCents;
    }
  };

  const addProductPrice = (productId: string, dateKey: string, priceCents: number) => {
    if (!productId || priceCents <= 0) return;
    if (!productPrices[productId]) productPrices[productId] = {};
    productPrices[productId][dateKey] = priceCents;
  };

  const ingestChunk = (chunkProducts: TimespanProduct[]) => {
    for (const cp of chunkProducts) {
      const key = String(cp.id ?? cp.path ?? cp.name ?? "");
      const existing = seenChunkProducts.get(key);
      if (existing) {
        existing.dates = [...(existing.dates || []), ...(cp.dates || [])];
      } else {
        seenChunkProducts.set(key, { ...cp, dates: [...(cp.dates || [])] });
      }

      if (!supplierMatchesEstablishment(cp.supplierName, establishmentId)) continue;
      const name = cp.name || "";
      if (name.includes(" + ")) continue;

      const productKey = getCanonicalProductId(cp) || String(cp.id ?? cp.path ?? "");
      if (productKey && !seenProductIds.has(productKey)) {
        seenProductIds.add(productKey);
        establishmentProducts.push(cp as unknown as NovaxsProduct);
      }

      if (Array.isArray(cp.dates) && cp.dates.length > 0) {
        for (const entry of cp.dates) {
          const normalizedDate = normalizeTimespanDate(entry.date);
          if (!normalizedDate) continue;
          const availableCount = typeof entry.available === "number" ? entry.available : parseFloat(String(entry.available || "0"));
          if (availableCount > 0) {
            availableDates.add(normalizedDate);
            const rawValue = entry.priceCents ?? entry.value ?? entry.cost ?? entry.custo;
            const priceCents = typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue || "0"));
            const rounded = Math.round(priceCents);
            addPrice(normalizedDate, rounded);
            addProductPrice(productKey, normalizedDate, rounded);
          }
        }
      } else {
        const topLevelAvailable = typeof cp.available === "number" ? cp.available : parseFloat(String(cp.available || "0"));
        if (topLevelAvailable > 0) {
          const fallbackKey = formatDateForNovaxs(effectiveStart);
          availableDates.add(fallbackKey);
          addPrice(fallbackKey, (cp as NovaxsProduct).priceCents || 0);
          addProductPrice(productKey, fallbackKey, (cp as NovaxsProduct).priceCents || 0);
        }
      }
    }
  };

  const snapshot = (): MonthAvailabilityResult => ({
    dates: Array.from(availableDates),
    prices: { ...dayPrices },
    productPrices: { ...productPrices },
    products: [...establishmentProducts],
  });

  // Dispara todos os chunks em paralelo e aguarda TODOS antes de resolver.
  // Antes, o primeiro chunk (7 dias) resolvia sozinho — o calendário então
  // marcava todos os demais dias do mês como "fechados" por ~1s até o segundo
  // chunk chegar, gerando o flash visual relatado nos parques. O ganho de
  // latência do streaming era irrelevante porque o cache do servidor
  // (novaxs_month_availability_cache) já semeia os preços no primeiro paint.
  const chunkPromises = chunkWindows.map(({ start, span }) =>
    fetchProductsForTimespanCached(formatDateForNovaxs(start), span),
  );

  const allChunks = await Promise.all(chunkPromises.map((p) => p.catch(() => [] as TimespanProduct[])));
  for (const chunk of allChunks) ingestChunk(chunk);

  const finalSnapshot = snapshot();
  onPartial?.(finalSnapshot);
  return finalSnapshot;
}

export function useEstablishmentAvailability(
  establishmentId: string | undefined,
  visibleMonth?: Date,
) {
  const queryClient = useQueryClient();

  const month = useMemo(() => {
    const source = visibleMonth || new Date();
    return new Date(source.getFullYear(), source.getMonth(), 1);
  }, [visibleMonth?.getFullYear(), visibleMonth?.getMonth()]);

  const monthEnd = useMemo(() => new Date(month.getFullYear(), month.getMonth() + 1, 0), [month]);
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  // NOTA: removido o pré-fetch eager de chunks contra a NovaXS. O calendário
  // é pintado 100% do cache do banco (novaxs_month_availability_cache),
  // populado pelo cron warm-availability. Antes, cada visita disparava várias
  // chamadas paralelas à API NovaXS mesmo com cache presente — foi uma das
  // causas do volume de chamadas reportado pela NovaXS no incidente.




  // Synchronously read sessionStorage cache so the calendar shows prices on first paint
  // (avoids flash of empty calendar on reload / direct navigation).
  const initialData = useMemo(() => {
    if (!establishmentId) return undefined;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const horizon = new Date(today);
      horizon.setDate(horizon.getDate() + MAX_DAYS_AHEAD);
      const effectiveStart = month < today ? today : month;
      const extendedMonthEnd = extendToMinHorizon(monthEnd);
      const effectiveEnd = extendedMonthEnd > horizon ? horizon : extendedMonthEnd;
      if (effectiveStart > effectiveEnd) return undefined;
      const totalSpan = differenceInCalendarDays(effectiveEnd, effectiveStart) + 1;
      const FAST_CHUNK = 7;
      const MAX_CHUNK = 31;
      const cachedAll: TimespanProduct[] = [];
      let cursor = 0;
      while (cursor < totalSpan) {
        const chunkStart = new Date(effectiveStart);
        chunkStart.setDate(chunkStart.getDate() + cursor);
        const span = Math.min(cursor === 0 ? FAST_CHUNK : MAX_CHUNK, totalSpan - cursor);
        const cacheKey = `${formatDateForNovaxs(chunkStart)}:${span}`;
        const cached = readSessionCache(cacheKey) as TimespanProduct[] | null;
        if (cached && cached.length > 0) cachedAll.push(...cached);
        cursor += span;
      }

      if (cachedAll.length === 0) return undefined;


      const availableDates = new Set<string>();
      const prices: DayPriceMap = {};
      const productPrices: ProductDayPriceMap = {};

      for (const product of cachedAll) {
        if (!supplierMatchesEstablishment(product.supplierName, establishmentId)) continue;
        const name = product.name || "";
        if (name.includes(" + ")) continue;
        const productKey = getCanonicalProductId(product) || String(product.id ?? product.path ?? "");
        if (Array.isArray(product.dates) && product.dates.length > 0) {
          for (const entry of product.dates) {
            const normalized = normalizeTimespanDate(entry.date);
            if (!normalized) continue;
            const avail = typeof entry.available === "number" ? entry.available : parseFloat(String(entry.available || "0"));
            if (avail > 0) {
              availableDates.add(normalized);
              const rawValue = entry.priceCents ?? entry.value ?? entry.cost ?? entry.custo;
              const cents = Math.round(typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue || "0")));
              if (cents > 0) {
                if (prices[normalized] == null || cents < prices[normalized]) prices[normalized] = cents;
                if (productKey) {
                  if (!productPrices[productKey]) productPrices[productKey] = {};
                  productPrices[productKey][normalized] = cents;
                }
              }
            }
          }
        }
      }

      if (availableDates.size === 0) return undefined;
      return { dates: Array.from(availableDates), prices, productPrices };
    } catch {
      return undefined;
    }
  }, [establishmentId, monthKey]);

  const queryKey = useMemo(
    () => [AVAILABILITY_QUERY_VERSION, "establishment-availability-month", establishmentId, monthKey] as const,
    [establishmentId, monthKey],
  );

  // Server-side cache compartilhado (pré-aquecido por cron). Lê em paralelo
  // para que QUALQUER visitante — inclusive o primeiro do dia — veja o
  // calendário pintado em ~20ms, sem depender da NovaXS na primeira visita.
  const serverMonthKey = useMemo(
    () => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
    [month],
  );
  const { data: serverCache, isFetched: serverCacheFetched } = useQuery({
    queryKey: ["novaxs-month-cache", establishmentId, serverMonthKey],
    queryFn: async () => {
      if (!establishmentId) return null;
      const { data: exactRow, error: exactError } = await supabase
        .from("novaxs_month_availability_cache")
        .select("payload, updated_at")
        .eq("establishment_id", establishmentId)
        .eq("month_key", serverMonthKey)
        .maybeSingle();
      const exactCache = !exactError && exactRow ? (exactRow as MonthCacheRow) : null;

      const { data: overridesData } = await (supabase as any).rpc("get_home_novaxs_overrides");
      const productOverrides = ((overridesData?.products || []) as AvailabilityProductOverride[])
        .filter((override) => override.is_visible && override.novaxs_establishment_id === establishmentId);

      // Datas oficiais de operação do estabelecimento neste mês (populadas
      // pelo cron). Servem como fonte de verdade: o recorte por produto pode
      // conter preços em dias sem sessão (available = 0), o que fazia o
      // calendário abrir dias inexistentes (ex.: 24 e 29/10 no Grande Desfile).
      const operatingDates = Array.isArray(exactCache?.payload?.dates) ? exactCache!.payload!.dates! : [];

      const constrainToOperatingDates = (scoped: MonthCachePayload | null): MonthCachePayload | null => {
        if (!scoped) return scoped;
        if (operatingDates.length === 0) return scoped;
        const allowed = new Set(operatingDates);
        const dates = (scoped.dates || []).filter((d) => allowed.has(d));
        // Quando os produtos do admin ainda não têm preço no cache do mês, o
        // recorte vem sem datas — mantemos as datas de operação para o
        // calendário não zerar.
        return {
          ...scoped,
          dates: dates.length > 0 ? dates : operatingDates,
          prices: dates.length > 0 ? scoped.prices : (exactCache?.payload?.prices || scoped.prices),
        };
      };

      if (exactCache && productOverrides.length > 0) {
        const productScoped = constrainToOperatingDates(
          buildAvailabilityFromProductOverrides(establishmentId, productOverrides, [exactCache]),
        );
        if (productScoped && ((productScoped.dates?.length || 0) > 0 || (productScoped.products?.length || 0) > 0)) {
          return { payload: productScoped, updated_at: exactCache.updated_at || new Date().toISOString() };
        }
      }



      if (productOverrides.length > 0) {
        // Alguns eventos sazonais chegam no cache da NovaXS agrupados sob o
        // mesmo fornecedor (ex.: Natal Luz), mesmo com produtos separados no
        // admin. Quando isso acontecer, localizamos o mês pelo ID do produto e
        // remontamos somente as datas/preços daquele estabelecimento.
        const { data: monthRows, error: monthRowsError } = await supabase
          .from("novaxs_month_availability_cache")
          .select("establishment_id, payload, updated_at")
          .eq("month_key", serverMonthKey);
        if (!monthRowsError && Array.isArray(monthRows)) {
          const productScoped = constrainToOperatingDates(
            buildAvailabilityFromProductOverrides(establishmentId, productOverrides, monthRows as MonthCacheRow[]),
          );
          if (productScoped && ((productScoped.dates?.length || 0) > 0 || (productScoped.products?.length || 0) > 0)) {
            return { payload: productScoped, updated_at: new Date().toISOString() };
          }
        }

      }

      const exactPayload = exactCache?.payload;
      const exactHasContent = Boolean(
        (exactPayload?.dates && exactPayload.dates.length > 0) ||
        (exactPayload?.products && exactPayload.products.length > 0)
      );
      if (exactCache && exactHasContent) return exactCache;

      return exactCache;
    },
    enabled: !!establishmentId,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Quando o cache do servidor chega, semeia o React Query imediatamente
  // (a menos que a query já tenha dados mais ricos vindos da NovaXS).
  useEffect(() => {
    if (!serverCache?.payload) return;
    const payload = serverCache.payload;
    const seedDates = Array.isArray(payload.dates) ? payload.dates : [];
    const seedProducts = Array.isArray(payload.products) ? payload.products : [];
    if (seedDates.length === 0 && seedProducts.length === 0) return;
    queryClient.setQueryData<MonthAvailabilityResult>(queryKey, (prev) => {
      const seedResult: MonthAvailabilityResult = {
        dates: seedDates,
        prices: payload.prices || {},
        productPrices: payload.productPrices || {},
        products: mergeProductsByCanonical(sanitizeAvailabilityProducts([...(prev?.products || []), ...seedProducts])),
      };
      if (!prev) return seedResult;
      // Mantém o conjunto mais rico (mais datas/produtos).
      if ((prev.dates?.length || 0) >= seedDates.length && (prev.products?.length || 0) >= seedProducts.length) return prev;
      return seedResult;
    });
  }, [serverCache, queryKey, queryClient]);

  const mergedInitial = useMemo(() => {
    const payload = serverCache?.payload;
    const dates = Array.isArray(payload?.dates) ? payload.dates : [];
      const products = Array.isArray(payload?.products) ? sanitizeAvailabilityProducts(payload.products) : [];
    if (payload && (dates.length > 0 || products.length > 0)) {
      return {
        dates,
        prices: payload.prices || {},
        productPrices: payload.productPrices || {},
        products,
      } as MonthAvailabilityResult;
    }
    return initialData ? { ...initialData, products: [] } : undefined;
  }, [serverCache, initialData]);

  // Só chama a API NovaXS quando o cache do servidor está VAZIO para este mês.
  // Com cache presente (o caso normal, populado pelo cron), servimos direto do
  // banco — zero chamadas à NovaXS por visita.
  const { data, isLoading, isFetched } = useQuery<MonthAvailabilityResult>({
    queryKey,
    queryFn: () =>
      fetchMonthAvailability(establishmentId!, month, monthEnd, (partial) => {
        queryClient.setQueryData<MonthAvailabilityResult>(queryKey, (prev) => {
          if (!prev) return partial;
          if (partial.dates.length < prev.dates.length) return prev;
          return partial;
        });
      }),
    enabled: false, // desativado: 100% cache do banco (novaxs_month_availability_cache)
    staleTime: 60 * 60_000,
    gcTime: 2 * 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
    placeholderData: keepPreviousData,
    initialData: mergedInitial,
    initialDataUpdatedAt: mergedInitial ? Date.now() : undefined,
  });


  // Prefetch de meses seguintes: SÓ via cache do banco. Não tocamos mais a
  // NovaXS em background — o cron warm-availability já cobre isso no servidor.
  useEffect(() => {
    if (!establishmentId || !isFetched) return;
    let cancelled = false;
    const schedule = (cb: () => void, delay: number) => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(cb, { timeout: 300 });
      else setTimeout(cb, delay);
    };
    for (let offset = 1; offset <= PREFETCH_MONTHS_AHEAD; offset++) {
      const target = new Date(month.getFullYear(), month.getMonth() + offset, 1);
      const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
      schedule(() => {
        if (cancelled) return;
        queryClient.prefetchQuery({
          queryKey: ["novaxs-month-cache", establishmentId, key],
          queryFn: async () => {
            const { data, error } = await supabase
              .from("novaxs_month_availability_cache")
              .select("payload, updated_at")
              .eq("establishment_id", establishmentId)
              .eq("month_key", key)
              .maybeSingle();
            if (error || !data) return null;
            return data;
          },
          staleTime: 60 * 60_000,
        });
      }, 400 * offset);
    }
    return () => { cancelled = true; };
  }, [establishmentId, monthKey, isFetched, queryClient, month]);

  const availableDates = useMemo(() => new Set(data?.dates || []), [data]);
  const dayPrices = useMemo<DayPriceMap>(() => data?.prices || {}, [data]);
  const productPrices = useMemo<ProductDayPriceMap>(() => data?.productPrices || {}, [data]);
  const monthlyProducts = useMemo<NovaxsProduct[]>(() => data?.products || [], [data]);

  return {
    availableDates,
    dayPrices,
    productPrices,
    monthlyProducts,
    loading: isLoading,
    hasResolvedMonth: isFetched || serverCacheFetched || Boolean(data || initialData),
  };
}
