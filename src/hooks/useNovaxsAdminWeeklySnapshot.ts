import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cleanProductName } from "@/lib/product-name-cleaner";
import { invokeInBrazil } from "@/lib/supabase-region";
import { supabase } from "@/integrations/supabase/client";
import {
  groupByEstablishment,
  type Establishment,
  type NovaxsProduct,
} from "@/data/novaxs-establishments";

// NovaXS getProductsByTimespan suporta no máximo 31 dias por chamada
export const WEEKLY_BALANCE_DAYS = 31;

interface NovaxsDateEntry {
  date: string;
  value?: string | number;
  cost?: number;
  custo?: number;
  priceCents?: number;
  available?: number;
  token?: string;
  schedules?: any[];
}

interface WeeklySnapshotData {
  weekDates: string[];
  weeklyProducts: NovaxsProduct[];
  weeklyEstablishments: Establishment[];
  todayEstablishments: Establishment[];
}

function formatDateForNovaxs(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildEstablishmentId(supplierName: string): string {
  return `est-${(supplierName || "outros").replace(/\s+/g, "-").toLowerCase()}`;
}

function buildWeekDates(startDate: Date): string[] {
  return Array.from({ length: WEEKLY_BALANCE_DAYS }, (_, index) => {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + index);
    return formatDateForNovaxs(nextDate);
  });
}

function normalizeProduct(rawProduct: any, overrideDate?: NovaxsDateEntry): NovaxsProduct {
  // Quando temos uma data específica do array dates[], usamos seus valores
  // (preço, disponibilidade, token, schedules) em vez dos valores de topo.
  const priceCents = overrideDate
    ? (overrideDate.priceCents ?? Number(overrideDate.value ?? overrideDate.cost ?? 0))
    : (typeof rawProduct.priceCents === "number"
        ? rawProduct.priceCents
        : Math.round((Number(rawProduct.price) || 0) * 100));

  const numericPrice = priceCents / 100;
  const available = overrideDate
    ? Number(overrideDate.available ?? 0)
    : (typeof rawProduct.available === "number" ? rawProduct.available : parseFloat(rawProduct.available || "0"));
  const token = overrideDate?.token ?? rawProduct.token ?? "";
  const schedules = overrideDate?.schedules ?? rawProduct.schedules ?? [];

  return {
    ...rawProduct,
    id: String(rawProduct.id || rawProduct.path || ""),
    path: String(rawProduct.path || rawProduct.id || ""),
    name: cleanProductName(rawProduct.name || ""),
    shortName: cleanProductName(rawProduct.shortName || rawProduct.name || ""),
    price: numericPrice,
    priceCents,
    oldValue: rawProduct.oldValue ? Math.round(Number(rawProduct.oldValue)) : undefined,
    available,
    image: rawProduct.image || "",
    supplierName: rawProduct.supplierName || "",
    token,
    schedules: Array.isArray(schedules) ? schedules : [],
    products: Array.isArray(rawProduct.products) ? rawProduct.products : [],
    memo: rawProduct.memo || "",
    htmlMemo: rawProduct.htmlMemo || "",
    cancellationPolicies: rawProduct.cancellationPolicies || "",
    dates: Array.isArray(rawProduct.dates) ? rawProduct.dates : undefined,
  };
}

function isGenericName(name: string, productId: string): boolean {
  const legacyId = productId.replace(/^products\//, "").trim().toLowerCase();
  const normalized = (name || "").trim().toLowerCase();
  return !normalized || normalized === legacyId || /^\d+$/.test(normalized);
}

/**
 * O cache mensal só guarda preços por produto/data — sem nome, imagem ou tipo.
 * Aqui recuperamos os metadados: primeiro pelos overrides do admin e, se ainda
 * restarem nomes genéricos (apenas o ID), com uma única chamada à API NovaXS.
 */
async function hydrateProductMetadata(
  products: NovaxsProduct[],
  startDate: string,
  days: number,
): Promise<void> {
  const byLegacyId = new Map<string, NovaxsProduct[]>();
  for (const product of products) {
    const legacyId = String(product.id || product.path).replace(/^products\//, "");
    if (!byLegacyId.has(legacyId)) byLegacyId.set(legacyId, []);
    byLegacyId.get(legacyId)!.push(product);
  }

  try {
    const { data: overrides } = await supabase
      .from("novaxs_product_overrides")
      .select("novaxs_product_id, custom_name, custom_image_url");

    for (const row of (overrides || []) as any[]) {
      const legacyId = String(row.novaxs_product_id || "").replace(/^products\//, "");
      const targets = byLegacyId.get(legacyId);
      if (!targets) continue;
      for (const target of targets) {
        if (row.custom_name) {
          target.name = cleanProductName(row.custom_name);
          target.shortName = target.name;
        }
        if (row.custom_image_url && !target.image) target.image = row.custom_image_url;
      }
    }
  } catch {
    // Sem overrides: segue para a API
  }

  const stillGeneric = products.filter((p) =>
    isGenericName(p.name, String(p.id || p.path)),
  );
  if (stillGeneric.length === 0) return;

  try {
    const { data } = await invokeInBrazil<{ products?: any[] }>(
      "novaxs-search-products",
      { date: startDate, days },
    );
    const apiProducts = Array.isArray(data?.products) ? data!.products! : [];
    const metaById = new Map<string, any>();
    for (const raw of apiProducts) {
      const legacyId = String(raw.id || raw.path || "").replace(/^products\//, "");
      if (legacyId) metaById.set(legacyId, raw);
    }

    for (const product of stillGeneric) {
      const legacyId = String(product.id || product.path).replace(/^products\//, "");
      const meta = metaById.get(legacyId);
      if (!meta) continue;
      const realName = cleanProductName(meta.name || meta.shortName || "");
      if (realName) {
        product.name = realName;
        product.shortName = cleanProductName(meta.shortName || meta.name || realName);
      }
      if (!product.image && meta.image) product.image = meta.image;
      if (!product.type && meta.type) product.type = meta.type;
      // supplierName é mantido (vem do cache) para não quebrar o agrupamento
    }
  } catch {
    // API indisponível: mantém o que temos
  }
}


async function fetchSnapshotInOneCall(weekDates: string[]): Promise<WeeklySnapshotData> {
  const startDate = weekDates[0];
  const days = weekDates.length;

  // Prioridade 1: servir do cache do banco (populado pelo cron warm-availability).
  // Assim o painel admin abre sem gerar carga na NovaXS. A API só é chamada
  // se o cache estiver totalmente vazio (situação excepcional).
  const now = new Date();
  const monthKeys = Array.from(new Set([0, 1].map((offset) => {
    const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
  })));

  const { data: cacheRows } = await supabase
    .from("novaxs_month_availability_cache")
    .select("establishment_id, payload")
    .in("month_key", monthKeys);

  const dateSet = new Set(weekDates);

  if (Array.isArray(cacheRows) && cacheRows.length > 0) {
    // Reconstrói produtos/estabelecimentos a partir do cache. Não temos
    // metadata rica (nome/imagem por produto) no payload — o admin verá
    // preços e disponibilidade agregados por estabelecimento, o suficiente
    // para o snapshot semanal sem tocar na NovaXS.
    const weeklyProducts: NovaxsProduct[] = [];
    const todayKey = weekDates[0];

    for (const row of cacheRows as any[]) {
      const payload = row.payload || {};
      const productPrices = payload.productPrices || {};
      const availableDates: string[] = Array.isArray(payload.dates) ? payload.dates : [];
      const weekAvailable = availableDates.filter((d) => dateSet.has(d));
      if (weekAvailable.length === 0) continue;

      for (const [productId, priceByDate] of Object.entries(productPrices as Record<string, Record<string, number>>)) {
        const weekPrices = Object.entries(priceByDate)
          .filter(([d]) => dateSet.has(d))
          .map(([, cents]) => Number(cents))
          .filter((c) => c > 0);
        if (weekPrices.length === 0) continue;
        const minCents = Math.min(...weekPrices);
        weeklyProducts.push({
          id: productId,
          path: productId,
          name: cleanProductName(productId.replace(/^products\//, "")),
          shortName: cleanProductName(productId.replace(/^products\//, "")),
          type: "",
          price: minCents / 100,
          priceCents: minCents,
          available: weekAvailable.length,
          currency: "BRL",
          image: "",
          minAmount: 1,
          supplierName: row.establishment_id.replace(/^est-/, "").replace(/-/g, " "),
          schedules: [],
          products: [],
          form: [],
          token: "",
          memo: "",
          htmlMemo: "",
          cancellationPolicies: "",
          category: "",
          destination: "",
          years: "",
          oldValue: undefined,
          dates: undefined,
        } as unknown as NovaxsProduct);
      }
    }

    if (weeklyProducts.length > 0) {
      // O cache não guarda metadados (nome/imagem/tipo). Hidrata a partir dos
      // overrides do admin e, se ainda houver nomes genéricos (só o ID),
      // busca os metadados reais na API uma única vez.
      await hydrateProductMetadata(weeklyProducts, startDate, days);

      const todayProducts = weeklyProducts.filter((p) => {
        const row = (cacheRows as any[]).find((r) => r.establishment_id.replace(/^est-/, "").replace(/-/g, " ") === p.supplierName);
        const payload = row?.payload || {};
        const dates: string[] = Array.isArray(payload.dates) ? payload.dates : [];
        return dates.includes(todayKey);
      });
      return {
        weekDates,
        weeklyProducts,
        weeklyEstablishments: groupByEstablishment(weeklyProducts),
        todayEstablishments: groupByEstablishment(todayProducts),
      };
    }
  }


  // Fallback: cache totalmente vazio → chama a API uma única vez.
  const { data, error } = await invokeInBrazil<{ products?: any[] }>(
    "novaxs-search-products",
    { date: startDate, days },
  );

  if (error || !data?.products) {
    throw new Error("Não foi possível montar o balanço da NovaXS.");
  }

  const rawProducts = data.products;
  const productsByDate = new Map<string, NovaxsProduct[]>();
  weekDates.forEach((d) => productsByDate.set(d, []));
  const weeklyMap = new Map<string, NovaxsProduct>();

  for (const raw of rawProducts) {
    const datesArray: NovaxsDateEntry[] = Array.isArray(raw.dates) ? raw.dates : [];
    const baseProduct = normalizeProduct(raw, datesArray[0]);
    for (const entry of datesArray) {
      if (!entry?.date || !dateSet.has(entry.date)) continue;
      productsByDate.get(entry.date)!.push(normalizeProduct(raw, entry));
    }
    const productKey = `${buildEstablishmentId(baseProduct.supplierName)}:${baseProduct.id || baseProduct.path}`;
    const existing = weeklyMap.get(productKey);
    const validPrices = datesArray
      .map((d) => Number(d.priceCents ?? d.value ?? d.cost ?? 0))
      .filter((c) => c > 0);
    const minCents = validPrices.length ? Math.min(...validPrices) : baseProduct.priceCents;
    const maxAvailable = datesArray.reduce(
      (acc, d) => Math.max(acc, Number(d.available ?? 0)),
      baseProduct.available || 0,
    );
    const aggregated: NovaxsProduct = {
      ...baseProduct,
      price: minCents / 100,
      priceCents: minCents,
      available: maxAvailable,
      dates: datesArray as any,
    };
    if (!existing) weeklyMap.set(productKey, aggregated);
    else weeklyMap.set(productKey, {
      ...existing,
      image: existing.image || aggregated.image,
      price: aggregated.price > 0 && (existing.price === 0 || aggregated.price < existing.price) ? aggregated.price : existing.price,
      priceCents: aggregated.priceCents > 0 && (existing.priceCents === 0 || aggregated.priceCents < existing.priceCents) ? aggregated.priceCents : existing.priceCents,
      available: Math.max(existing.available || 0, aggregated.available || 0),
      dates: aggregated.dates ?? existing.dates,
    });
  }

  const weeklyProducts = Array.from(weeklyMap.values());
  const todayProducts = productsByDate.get(weekDates[0]) || [];

  return {
    weekDates,
    weeklyProducts,
    weeklyEstablishments: groupByEstablishment(weeklyProducts),
    todayEstablishments: groupByEstablishment(todayProducts),
  };
}

export function useNovaxsAdminWeeklySnapshot() {
  const startDate = useMemo(() => {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    return baseDate;
  }, []);

  const weekDates = useMemo(() => buildWeekDates(startDate), [startDate]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<WeeklySnapshotData>({
    queryKey: ["novaxs-admin-weekly-snapshot", weekDates[0], weekDates[weekDates.length - 1]],
    queryFn: () => fetchSnapshotInOneCall(weekDates),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
  });

  return {
    weekDates,
    weeklyProducts: data?.weeklyProducts || [],
    weeklyEstablishments: data?.weeklyEstablishments || [],
    todayEstablishments: data?.todayEstablishments || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
