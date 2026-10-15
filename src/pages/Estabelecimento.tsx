import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import SEOHead from "@/components/SEOHead";
import SEOContentBlock from "@/components/SEOContentBlock";
import {
  buildEstablishmentSeo,
  buildEstablishmentFaq,
  jsonLdLocalBusiness,
  jsonLdBreadcrumb,
  jsonLdItemList,
  jsonLdProduct,
  jsonLdFaq,
  absoluteUrl,
  slugify,
  resolveEstablishmentCity,
  resolveEstablishmentAddress,
} from "@/lib/seo";
import Footer from "@/components/Footer";
import HomeBottomNav from "@/components/home/HomeBottomNav";
import OfferRoundButton from "@/components/offer/redesign/OfferRoundButton";
import { useOfferActions } from "@/components/offer/redesign/useOfferActions";
import EstablishmentInfoSections from "@/components/establishment/redesign/EstablishmentInfoSections";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Star,
  MapPin,
  ArrowLeft,
  ShoppingCart,
  Filter,
  Images,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Heart,
  Share,
  X,
} from "lucide-react";
import { useNovaxsEstablishments, applyOverrides } from "@/hooks/useNovaxsEstablishments";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dedupeNovaxsProducts, getCanonicalProductId, isGenericProductTitle } from "@/lib/novaxs-product-dedupe";
import { useSelectedDate } from "@/components/GlobalDatePicker";
import ParksnetCalendar from "@/components/establishment/ParksnetCalendar";
import MobileBuyDrawer from "@/components/establishment/MobileBuyDrawer";
import SeatMapModal from "@/components/establishment/SeatMapModal";
import { VenueSectorMap } from "@/components/establishment/VenueMap";
import { detectVenueFromEstablishment } from "@/data/venue-seat-layouts";
import type { SeatMapSeat } from "@/hooks/useNovaxsSpaces";
import { getProductDescription } from "@/data/novaxs-establishments";
import type { NovaxsProduct } from "@/data/novaxs-establishments";
import { resolveIntegratedEstablishmentByName, normalizeNovaxsText } from "@/data/novaxs-catalog";
import { supabase } from "@/integrations/supabase/client";

import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";
import { useIsMobile } from "@/hooks/use-mobile";
import ManualSchedulingNotice from "@/components/ManualSchedulingNotice";
import { useEstablishmentAvailability } from "@/hooks/useEstablishmentAvailability";

import MiniVideoPlayer from "@/components/establishment/MiniVideoPlayer";
import nativitatenVideoAsset from "@/assets/nativitaten-video.mp4.asset.json";
import garfoBombachaVideoAsset from "@/assets/garfo-e-bombacha-video.mp4.asset.json";

const ESTABLISHMENT_VIDEOS: Record<string, string> = {
  "est-nativitaten": nativitatenVideoAsset.url,
  "est-natal-luz": nativitatenVideoAsset.url,
  "est-o-grande-desfile-de-natal": nativitatenVideoAsset.url,
  "est-grande-desfile-de-natal": nativitatenVideoAsset.url,
  "est-garfo-e-bombacha": garfoBombachaVideoAsset.url,
};

function getEstablishmentVideoUrl(
  establishment?: { id?: string; displayName?: string; name?: string } | null,
): string | null {
  if (!establishment) return null;
  const id = establishment.id || "";
  const label = (establishment.displayName || establishment.name || "").toLowerCase();

  if (ESTABLISHMENT_VIDEOS[id]) return ESTABLISHMENT_VIDEOS[id];
  if (label.includes("nativitaten")) return ESTABLISHMENT_VIDEOS["est-nativitaten"];
  if (
    label.includes("natal luz") ||
    label.includes("grande desfile") ||
    label.includes("desfile de natal")
  )
    return ESTABLISHMENT_VIDEOS["est-natal-luz"];
  if (label.includes("garfo") && label.includes("bombacha"))
    return ESTABLISHMENT_VIDEOS["est-garfo-e-bombacha"];

  return null;
}
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prefetchCheckout } from "@/lib/route-prefetch";
import { establishmentPath, establishmentSlug, slugKey } from "@/lib/establishment-slug";

// Estabelecimentos com assentos numerados via getSpaces (Nativitaten / Grande Desfile).
const SEAT_MAP_ESTABLISHMENT_IDS = new Set([
  "est-nativitaten",
  "est-natal-luz",
  "est-o-grande-desfile-de-natal",
  "est-grande-desfile-de-natal",
]);

function isSeatMapEstablishment(est?: { id?: string; displayName?: string; name?: string } | null): boolean {
  if (!est) return false;
  if (est.id && SEAT_MAP_ESTABLISHMENT_IDS.has(est.id)) return true;
  const label = `${est.displayName || ""} ${est.name || ""}`.toLowerCase();
  return label.includes("nativitaten") || label.includes("grande desfile");
}

// Orientação ParksNet: no Nativitaten somente o VIP tem assento numerado.
// No Grande Desfile TODOS os setores (Cadeiras A–D, Arquibancadas A–D e TEA)
// possuem mapa numerado — a API getSpaces devolve os lugares de cada bloco.
function productRequiresSeatSelection(
  est: { id?: string; displayName?: string; name?: string } | null | undefined,
  product?: { name?: string } | null,
): boolean {
  if (!isSeatMapEstablishment(est)) return false;
  const name = (product?.name || "").toLowerCase();
  if (!name) return false;
  const estLabel = `${est?.id || ""} ${est?.displayName || ""} ${est?.name || ""}`.toLowerCase();
  const isDesfile = estLabel.includes("desfile") || estLabel.includes("natal-luz") || estLabel.includes("natal luz");
  if (isDesfile) {
    return /cadeiras?\s*[abcd]\b/.test(name) || /arquibancada\s*[abcd]\b/.test(name) || /\btea\b/.test(name);
  }
  // Nativitaten: PCD, acompanhante e TEA seguem compra normal (sem mapa).
  if (/\bpcd\b|acompanhante|\btea\b/.test(name)) return false;
  return /\bvip\b/.test(name);
}





const MANUAL_SCHEDULING_KEYWORDS = [
  "agendamento após",
  "após a compra",
  "entrará em contato",
  "necessário realizar agendamento",
  "confirme a programação",
  "escolha do local se dará por agendamento",
];

type SeasonalProductOverride = {
  novaxs_product_id: string;
  novaxs_establishment_id: string;
  custom_name: string | null;
  custom_description: string | null;
  custom_image_url: string | null;
  custom_price_cents: number | null;
  is_visible: boolean;
  carousel_primary?: boolean;
  carousel_secondary?: boolean;
  carousel_tertiary?: boolean;
};

function needsManualScheduling(product: NovaxsProduct): boolean {
  const hasSchedules = product.schedules && product.schedules.length > 0;
  if (hasSchedules) return false;
  const memo = (product.htmlMemo || product.memo || "").toLowerCase();
  return MANUAL_SCHEDULING_KEYWORDS.some((kw) => memo.includes(kw));
}

/**
 * Disponibilidade/preço por data.
 * `productPrices` só contém datas com `available > 0` (ver useEstablishmentAvailability),
 * então a ausência da data significa produto esgotado/indisponível naquele dia.
 */
function getProductDayMap(
  productPrices: import("@/hooks/useEstablishmentAvailability").ProductDayPriceMap | undefined,
  product: { id?: string | number | null; path?: string | null },
): Record<string, number> | undefined {
  if (!productPrices) return undefined;
  const rawKey = String(product.id ?? product.path ?? "");
  if (!rawKey) return undefined;
  const canonicalKey = rawKey.startsWith("products/") ? rawKey : `products/${rawKey.replace(/^\/+/, "")}`;
  return productPrices[canonicalKey] || productPrices[rawKey];
}

function getProductDayPrice(
  productPrices: import("@/hooks/useEstablishmentAvailability").ProductDayPriceMap | undefined,
  product: { id?: string | number | null; path?: string | null },
  date: Date | null,
): { price: number | null; hasCalendar: boolean } {
  const map = getProductDayMap(productPrices, product);
  const hasCalendar = !!map && Object.keys(map).length > 0;
  if (!date || !hasCalendar) return { price: null, hasCalendar };
  const value = map![format(date, "dd/MM/yyyy")];
  return { price: typeof value === "number" && value > 0 ? value : null, hasCalendar };
}

/** Próxima data com disponibilidade real para o produto (a partir de hoje). */
function getNextAvailableDay(
  productPrices: import("@/hooks/useEstablishmentAvailability").ProductDayPriceMap | undefined,
  product: { id?: string | number | null; path?: string | null },
  fromDate: Date | null,
): { date: Date; priceCents: number } | null {
  const map = getProductDayMap(productPrices, product);
  if (!map) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const base = fromDate ? new Date(fromDate) : new Date(today);
  base.setHours(0, 0, 0, 0);

  const entries = Object.entries(map)
    .map(([key, value]) => {
      const [d, m, y] = key.split("/").map((n) => parseInt(n, 10));
      if (!d || !m || !y) return null;
      return { date: new Date(y, m - 1, d), priceCents: typeof value === "number" ? value : 0 };
    })
    .filter((e): e is { date: Date; priceCents: number } => !!e && e.priceCents > 0 && e.date.getTime() >= today.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return entries.find((e) => e.date.getTime() > base.getTime()) ?? entries[0] ?? null;
}



// Mesmo container das páginas novas (hotel/oferta).
const DETAIL_CONTAINER = "w-full max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12";

const Estabelecimento = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { selectedDate, setSelectedDate } = useSelectedDate();

  // Após 21:00 (horário de Brasília), o calendário do estabelecimento deve
  // assumir o próximo dia como data padrão — só roda uma vez na montagem
  // e apenas se a data atual for "hoje" (não sobrescreve escolha do usuário).
  useEffect(() => {
    try {
      const nowBRT = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      );
      if (nowBRT.getHours() >= 21) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const current = new Date(selectedDate);
        current.setHours(0, 0, 0, 0);
        if (current.getTime() === today.getTime()) {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          setSelectedDate(tomorrow);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Habilita fallback de disponibilidade: se o estabelecimento não tem produtos
  // na data selecionada, busca os próximos dias disponíveis. Sem isso, clicar
  // em um card que apareceu na categoria via fallback resulta em "não encontrado".
  const { establishments, loading } = useNovaxsEstablishments(selectedDate, {
    enableFallbackAvailability: true,
  });
  const [stableEstablishment, setStableEstablishment] = useState<(typeof establishments)[0] | null>(null);

  // Pre-warm checkout chunk during idle time — most users hit the cart next.
  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    const idle = w.requestIdleCallback;
    if (idle) {
      idle(() => prefetchCheckout());
    } else {
      const t = setTimeout(() => prefetchCheckout(), 1500);
      return () => clearTimeout(t);
    }
  }, []);
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<NovaxsProduct | null>(null);
  // Fluxo de assentos numerados (Nativitaten / Grande Desfile)
  const [seatModal, setSeatModal] = useState<{
    product: NovaxsProduct;
    productPath: string;
    date: Date;
    schedule: string | null;
    priceCents: number;
  } | null>(null);
  const isMobile = useIsMobile();
  const { addItem } = useCart();
  const { toast } = useToast();

  // Allow ProductCard's "Comprar" button to open the date drawer (mobile)
  // Optionally receives a product via event.detail to drive the schedule step.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ product?: NovaxsProduct } | undefined>;
      setDrawerProduct(ce.detail?.product ?? null);
      setDrawerOpen(true);
    };
    window.addEventListener("bah:open-date-drawer", handler);
    return () => window.removeEventListener("bah:open-date-drawer", handler);
  }, []);

  const handleDrawerConfirm = ({
    date,
    schedule,
    quantity,
  }: {
    date: Date;
    schedule: string | null;
    quantity: number;
  }) => {
    if (!drawerProduct) {
      setDrawerOpen(false);
      return;
    }
    // Preço/disponibilidade sempre da data escolhida — evita vender por um
    // valor antigo ou vender um dia esgotado.
    const dayInfo = getProductDayPrice(productPrices, drawerProduct, date);
    if (dayInfo.hasCalendar && dayInfo.price == null) {
      toast({
        title: "Ingresso esgotado",
        description: `${drawerProduct.name} não está disponível em ${format(date, "dd/MM/yyyy")}.`,
        variant: "destructive",
      });
      return;
    }
    // Assentos numerados: o drawer confirma data/horário e abre o mapa de assentos.
    if (productRequiresSeatSelection(displayEstablishment, drawerProduct)) {
      openSeatMapFor(drawerProduct, date, schedule, dayInfo.price ?? drawerProduct.priceCents);
      setDrawerOpen(false);
      return;
    }
    const product = drawerProduct;
    const unitPriceCents = dayInfo.price ?? product.priceCents;
    const dateStr = format(date, "yyyy-MM-dd");
    const novaxsMeta = {
      source: 'novaxs' as const,
      productId: product.id ?? product.path,
      productPath: product.path,
      priceToken: (product as any).token || undefined,
      establishmentId: displayEstablishment?.id,
      establishmentName: displayEstablishment?.displayName || displayEstablishment?.name,
      date: dateStr,
      schedule: schedule || null,
    };
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: `${product.id?.toString() || product.path}-${dateStr}${schedule ? `-${schedule}` : ""}${quantity > 1 ? `-${i + 1}` : ""}`,
        title: product.name,
        subtitle: schedule
          ? `${format(date, "dd/MM/yyyy")} — ${schedule}`
          : format(date, "dd/MM/yyyy"),
        price: unitPriceCents / 100,
        originalPrice: unitPriceCents / 100,

        discountPercent: 0,
        imageUrl: product.image || "",
        category: product.type || "Entretenimento",
        selectedSchedule: schedule || undefined,
        selectedDate: dateStr,
        requiresSchedule: !!(product.schedules && product.schedules.length > 0),
        metadata: novaxsMeta,
      });
    }
    toast({
      title: "Adicionado ao carrinho",
      description: `${product.name}${schedule ? ` — ${format(date, "dd/MM/yyyy")} ${schedule}` : ` — ${format(date, "dd/MM/yyyy")}`}${quantity > 1 ? ` (x${quantity})` : ""}`,
    });
    setDrawerOpen(false);
  };

  const openSeatMapFor = (product: NovaxsProduct, date: Date, schedule: string | null, priceCents: number) => {
    const raw = String(product.path ?? product.id ?? "");
    const productPath = raw.startsWith("products/") ? raw : `products/${raw.replace(/^\/+/, "")}`;
    setSeatModal({ product, productPath, date, schedule, priceCents });
  };

  const handleSeatConfirm = (seats: SeatMapSeat[]) => {
    if (!seatModal) return;
    const { product, date, schedule, priceCents } = seatModal;
    const dateStr = format(date, "yyyy-MM-dd");
    seats.forEach((seat) => {
      addItem({
        id: `${product.id?.toString() || product.path}-${dateStr}-seat-${seat.id}`,
        title: product.name,
        subtitle: `${format(date, "dd/MM/yyyy")} · Fila ${seat.fila ?? "—"}, Assento ${seat.lugar ?? seat.label}`,
        price: priceCents / 100,
        originalPrice: priceCents / 100,
        discountPercent: 0,
        imageUrl: product.image || "",
        category: product.type || "Entretenimento",
        selectedDate: dateStr,
        selectedSchedule: schedule || undefined,
        requiresSchedule: !!(product.schedules && product.schedules.length > 0),
        metadata: {
          source: 'novaxs' as const,
          productId: product.id ?? product.path,
          productPath: product.path,
          priceToken: (product as any).token || undefined,
          establishmentId: displayEstablishment?.id,
          establishmentName: displayEstablishment?.displayName || displayEstablishment?.name,
          date: dateStr,
          schedule: schedule || null,
          seat: {
            idmapa_assento_fis: seat.idmapa_assento_fis,
            idmapa_fis: seat.idmapa_fis,
            idmapa_bloco_fis: seat.idmapa_bloco_fis,
            label: seat.label,
            fila: seat.fila,
            lugar: seat.lugar,
          },
        },
      });
    });
    toast({
      title: `${seats.length} assento${seats.length > 1 ? "s" : ""} adicionado${seats.length > 1 ? "s" : ""}`,
      description: `${product.name} — ${format(date, "dd/MM/yyyy")}`,
      duration: 3000,
    });
    setSeatModal(null);
  };

  // Fallback: compra sem assento — o sistema do Natal Luz marca aleatoriamente.
  const handleSeatFallback = () => {
    if (!seatModal) return;
    const { product, date, schedule, priceCents } = seatModal;
    const dateStr = format(date, "yyyy-MM-dd");
    addItem({
      id: `${product.id?.toString() || product.path}-${dateStr}${schedule ? `-${schedule}` : ""}`,
      title: product.name,
      subtitle: schedule ? `${format(date, "dd/MM/yyyy")} — ${schedule}` : format(date, "dd/MM/yyyy"),
      price: priceCents / 100,
      originalPrice: priceCents / 100,
      discountPercent: 0,
      imageUrl: product.image || "",
      category: product.type || "Entretenimento",
      selectedSchedule: schedule || undefined,
      selectedDate: dateStr,
      requiresSchedule: !!(product.schedules && product.schedules.length > 0),
      metadata: {
        source: 'novaxs' as const,
        productId: product.id ?? product.path,
        productPath: product.path,
        priceToken: (product as any).token || undefined,
        establishmentId: displayEstablishment?.id,
        establishmentName: displayEstablishment?.displayName || displayEstablishment?.name,
        date: dateStr,
        schedule: schedule || null,
      },
    });
    toast({
      title: "Adicionado ao carrinho",
      description: `${product.name} — ${format(date, "dd/MM/yyyy")} (assento marcado automaticamente)`,
      duration: 3000,
    });
    setSeatModal(null);
  };

  const establishment = useMemo(() => {
    const routeName = decodeURIComponent(name || "");
    const normalizedRouteName = normalizeNovaxsText(routeName);
    const routeKey = slugKey(routeName);

    const liveMatch = establishments.find((item) => {
      const canonical = resolveIntegratedEstablishmentByName(item.name);
      return (
        normalizeNovaxsText(item.name) === normalizedRouteName ||
        normalizeNovaxsText(item.displayName || "") === normalizedRouteName ||
        normalizeNovaxsText(canonical?.name || "") === normalizedRouteName ||
        slugKey(item.name) === routeKey ||
        (item.displayName ? slugKey(item.displayName) === routeKey : false) ||
        (canonical?.name ? slugKey(canonical.name) === routeKey : false)
      );
    });

    return liveMatch || resolveIntegratedEstablishmentByName(routeName) || undefined;
  }, [establishments, name]);


  // Keep a stable reference so the page shell doesn't flash on date change.
  // Guarda por id evita loop infinito: `establishment` recebe uma nova referência
  // a cada re-render (applyOverrides devolve objetos novos), então sem esse
  // check o setState reentra no useEffect indefinidamente (Maximum update depth).
  useEffect(() => {
    if (!establishment) return;
    setStableEstablishment((prev) => (prev?.id === establishment.id ? prev : establishment));
  }, [establishment]);

  // Use live data when available, fall back to last known
  const displayEstablishment = establishment || stableEstablishment;
  const productsLoading = loading && !!displayEstablishment;

  // Estabelecimentos sazonais: só operam em meses específicos.
  // Natal Luz / Nativitaten / O Grande Desfile → out (9), nov (10), dez (11) e jan (0).
  const SEASONAL_ALLOWED_MONTHS: Record<string, number[]> = {
    "est-natal-luz": [9, 10, 11, 0],
    "est-nativitaten": [9, 10, 11, 0],
    "est-o-grande-desfile-de-natal": [9, 10, 11, 0],
    "est-grande-desfile-de-natal": [9, 10, 11, 0],
  };

  const currentEstId =
    displayEstablishment?.id ||
    (name ? `est-${decodeURIComponent(name).replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const allowedMonths = currentEstId ? SEASONAL_ALLOWED_MONTHS[currentEstId] : undefined;

  const { data: seasonalProductOverrides = [] } = useQuery<SeasonalProductOverride[]>({
    queryKey: ["novaxs-seasonal-product-overrides", currentEstId],
    queryFn: async () => {
      if (!currentEstId) return [];
      const { data, error } = await (supabase as any).rpc("get_home_novaxs_overrides");
      if (error) return [];
      return ((data?.products || []) as SeasonalProductOverride[]).filter(
        (po) => po.is_visible && po.novaxs_establishment_id === currentEstId,
      );
    },
    enabled: Boolean(currentEstId && allowedMonths),
    staleTime: 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: "always",
  });

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const base = new Date();
    if (!allowedMonths || allowedMonths.includes(base.getMonth())) return base;
    for (let i = 1; i <= 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      if (allowedMonths.includes(d.getMonth())) return d;
    }
    return base;
  });
  // Eventos sazonais que a NovaXS agrupa sob "Natal Luz" possuem calendário
  // próprio no cache (datas oficiais de cada espetáculo). Sem esse redirect o
  // Grande Desfile / Nativitaten herdavam as datas somadas do Natal Luz.
  const availabilityIdOverride = useMemo(() => {
    const label = `${decodeURIComponent(name || "")} ${displayEstablishment?.name || ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (label.includes("grande desfile")) return "est-o-grande-desfile-de-natal";
    if (label.includes("nativitaten")) return "est-nativitaten";
    return undefined;
  }, [name, displayEstablishment?.name]);

  const establishmentIdForAvailability = availabilityIdOverride || currentEstId;

  const {
    availableDates,
    dayPrices,
    productPrices,
    monthlyProducts,
    loading: availabilityLoading,
    hasResolvedMonth,
  } = useEstablishmentAvailability(establishmentIdForAvailability, calendarMonth);

  // Se o estabelecimento é sazonal e a data selecionada está fora dos meses
  // permitidos, ajusta para o primeiro dia do primeiro mês válido — assim
  // os produtos exibidos batem com o período em que o estabelecimento opera.
  // Idempotente e reage a `selectedDate`: o GlobalDatePicker reseta a data
  // para "hoje" a cada mudança de rota (inclusive em instâncias vizinhas, ex.:
  // o FloatingDateButton), e esse reset roda DEPOIS deste efeito por causa da
  // ordem de montagem (filho antes do pai). Depender de `selectedDate` faz o
  // ajuste sazonal se reaplicar e "vencer" essa corrida, levando o usuário
  // direto ao primeiro mês disponível ao visitar a página no mobile.
  useEffect(() => {
    if (!allowedMonths || allowedMonths.length === 0) return;
    if (allowedMonths.includes(selectedDate.getMonth())) return;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      if (allowedMonths.includes(d.getMonth())) {
        setSelectedDate(d);
        setCalendarMonth(d);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedMonths?.join(","), selectedDate]);





  // Posiciona automaticamente no primeiro dia disponível do estabelecimento
  // quando a data atual não tem disponibilidade. Idempotente: se a data já é
  // disponível, não faz nada; caso contrário pula para a data mais próxima.
  // Reage a `selectedDate` para se curar caso outra instância do
  // GlobalDatePicker (ex.: FloatingDateButton no mobile) resete a data para
  // "hoje" após este efeito, garantindo que o usuário caia numa data válida.
  useEffect(() => {
    if (!currentEstId) return;
    if (!hasResolvedMonth || !availableDates || availableDates.size === 0) return;

    const toKey = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

    if (availableDates.has(toKey(selectedDate))) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsed = Array.from(availableDates)
      .map((key) => {
        const [dd, mm, yyyy] = key.split("/").map(Number);
        if (!dd || !mm || !yyyy) return null;
        return new Date(yyyy, mm - 1, dd);
      })
      .filter((d): d is Date => Boolean(d) && d!.getTime() >= today.getTime())
      .sort((a, b) => a.getTime() - b.getTime());

    const first = parsed[0];
    if (!first) return;
    setSelectedDate(first);
    const firstMonth = new Date(first.getFullYear(), first.getMonth(), 1);
    setCalendarMonth((prev) =>
      prev.getFullYear() === firstMonth.getFullYear() && prev.getMonth() === firstMonth.getMonth()
        ? prev
        : firstMonth,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEstId, hasResolvedMonth, availableDates, selectedDate]);



  // Merge "monthly" products (the establishment's full catalog visible across
  // the current month) into the displayed establishment, so the page lists
  // every product offered — not only those available on the selected date.
  const queryClient = useQueryClient();
  const mergedDisplayEstablishment = useMemo(() => {
    if (!displayEstablishment) return displayEstablishment;

    // Build a synthetic establishment with the union of products and let
    // applyOverrides handle visibility / custom name / image / description.
    const overrides = queryClient.getQueryData<{
      establishments: Parameters<typeof applyOverrides>[1];
      products: Parameters<typeof applyOverrides>[2];
      gallery: Parameters<typeof applyOverrides>[3];
    }>(["novaxs-overrides"]);

    const adminScopedProducts: NovaxsProduct[] = [];
    if (currentEstId && seasonalProductOverrides.length > 0) {
      for (const po of seasonalProductOverrides) {
        const canonicalId = getCanonicalProductId({ id: po.novaxs_product_id, path: po.novaxs_product_id } as NovaxsProduct);
        if (!canonicalId) continue;
        const legacyId = canonicalId.replace(/^products\//, "");
        const priceMap = productPrices[canonicalId] || productPrices[legacyId] || {};
        const datePrices = Object.values(priceMap).filter((value) => value > 0);
        const minPrice = datePrices.length > 0 ? Math.min(...datePrices) : (po.custom_price_cents ?? 0);
        // Preço do dia selecionado tem prioridade sobre o "a partir de" do mês.
        const dayPrice = selectedDate ? priceMap[format(selectedDate, "dd/MM/yyyy")] : undefined;
        const basePrice = typeof dayPrice === "number" && dayPrice > 0 ? dayPrice : minPrice;
        if (!(basePrice > 0)) continue;

        const productName = po.custom_name && !isGenericProductTitle(po.custom_name, canonicalId)
          ? po.custom_name
          : "Ingresso";
        adminScopedProducts.push({
          id: canonicalId,
          path: canonicalId,
          name: productName,
          shortName: productName,
          type: "Ingresso",
          price: basePrice / 100,
          priceCents: basePrice,
          available: typeof dayPrice === "number" && dayPrice > 0 ? 1 : 0,

          image: po.custom_image_url || displayEstablishment.image || "",
          supplierName: displayEstablishment.name,
          token: "",
          schedules: [],
          memo: po.custom_description || "",
          htmlMemo: po.custom_description || "",
          cancellationPolicies: "",
          carouselPrimary: po.carousel_primary,
          carouselSecondary: po.carousel_secondary,
          carouselTertiary: po.carousel_tertiary,
        });
      }
    }

    const seasonalAdminProducts = allowedMonths && adminScopedProducts.length > 0
      ? dedupeNovaxsProducts(adminScopedProducts)
      : [];

    if ((!monthlyProducts || monthlyProducts.length === 0) && seasonalAdminProducts.length === 0) {
      return displayEstablishment;
    }

    const existingIds = new Set(displayEstablishment.products.map((p) => getCanonicalProductId(p)));
    const extras = monthlyProducts
      .filter((p) => {
        const cid = getCanonicalProductId(p);
        return cid && !existingIds.has(cid);
      })
      .map((p) => ({ ...p, supplierName: displayEstablishment.name }));

    const productsWithSeasonalCatalog = dedupeNovaxsProducts([
      ...displayEstablishment.products,
      ...extras,
      ...seasonalAdminProducts,
    ]);

    if (extras.length === 0 && seasonalAdminProducts.length === 0) return displayEstablishment;

    const synthetic = {
      ...displayEstablishment,
      products: productsWithSeasonalCatalog,
    };

    if (!overrides) return synthetic;

    const scopedWithOverrides = applyOverrides(
      [synthetic],
      overrides.establishments,
      overrides.products,
      overrides.gallery,
    );
    const withOverrides = scopedWithOverrides.find((item) => item.id === synthetic.id);
    return withOverrides || synthetic;
  }, [displayEstablishment, monthlyProducts, queryClient, currentEstId, productPrices, allowedMonths?.join(","), seasonalProductOverrides, selectedDate]);

  const heroImage = useMemo(() => {
    if (!mergedDisplayEstablishment) return "";
    return (
      mergedDisplayEstablishment.bannerImage || mergedDisplayEstablishment.galleryImages?.[0] || mergedDisplayEstablishment.image || ""
    );
  }, [mergedDisplayEstablishment]);

  const productTypes = useMemo(() => {
    if (!mergedDisplayEstablishment) return [];
    const types = new Set(mergedDisplayEstablishment.products.map((p) => p.type || "Geral"));
    return ["todos", ...Array.from(types)];
  }, [mergedDisplayEstablishment]);

  // Venue com mapa de setores próprio (Nativitaten / Grande Desfile).
  const pageVenue = useMemo(
    () => (isSeatMapEstablishment(displayEstablishment) ? detectVenueFromEstablishment(displayEstablishment) : null),
    [displayEstablishment]
  );

  const filteredProducts = useMemo(() => {
    if (!mergedDisplayEstablishment) return [];
    // Esconde produtos sem preço (priceCents=0) para não exibir "Gratuito"
    // em ingressos pagos quando a API NovaXS está instável e não devolve valor.
    // Passa por dedupe final para colapsar quaisquer overrides "gêmeos"
    // (ex.: `137385` + `products/137385`) que possam ter escapado de merges anteriores.
    const priced = dedupeNovaxsProducts(mergedDisplayEstablishment.products).filter((p) => (p.priceCents ?? 0) > 0);
    const byType = typeFilter === "todos" ? priced : priced.filter((p) => (p.type || "Geral") === typeFilter);
    if (!sectorFilter || !pageVenue) return byType;
    const sectorDef = pageVenue.sectors.find((s) => s.id === sectorFilter);
    if (!sectorDef) return byType;
    return byType.filter((p) => sectorDef.productMatch.test(p.name || ""));
  }, [mergedDisplayEstablishment, typeFilter, sectorFilter, pageVenue]);

  // O clique sempre filtra os produtos. No Nativitaten o VIP abre o mapa direto;
  // no Grande Desfile cada setor tem vários tipos de ingresso, então apenas
  // filtramos a lista e o mapa abre ao escolher o ingresso desejado.
  const handleSectorClick = (sectorId: string) => {
    if (sectorFilter === sectorId) {
      setSectorFilter(null);
      return;
    }
    setSectorFilter(sectorId);
    const sectorDef = pageVenue?.sectors.find((s) => s.id === sectorId);
    if (!sectorDef?.sellable || !mergedDisplayEstablishment) return;
    const sectorProducts = dedupeNovaxsProducts(mergedDisplayEstablishment.products)
      .filter((p) => (p.priceCents ?? 0) > 0)
      .filter((p) => sectorDef.productMatch.test(p.name || ""));
    // Prioriza um ingresso realmente disponível na data selecionada.
    const product =
      sectorProducts.find((p) => {
        const info = getProductDayPrice(productPrices, p, selectedDate);
        return !info.hasCalendar || info.price != null;
      }) || sectorProducts[0];
    if (product && pageVenue?.id === "desfile") return;

    if (!product) {
      toast({
        title: `Setor ${sectorDef.label} indisponível`,
        description: "Nenhum ingresso deste setor foi encontrado no momento.",
      });
      return;
    }
    if (!productRequiresSeatSelection(displayEstablishment, product)) return;
    if (!selectedDate) {
      if (isMobile) {
        // O drawer confirma data/horário e abre o mapa de assentos em seguida.
        setDrawerProduct(product);
        setDrawerOpen(true);
      } else {
        toast({
          title: "Selecione uma data",
          description: "Escolha o dia no calendário para ver os assentos disponíveis.",
        });
      }
      return;
    }
    const dayInfo = getProductDayPrice(productPrices, product, selectedDate);
    if (dayInfo.hasCalendar && dayInfo.price == null) {
      toast({
        title: `Setor ${sectorDef.label} esgotado`,
        description: `Não há ingressos deste setor em ${format(selectedDate, "dd/MM/yyyy")}.`,
        variant: "destructive",
      });
      return;
    }
    openSeatMapFor(product, selectedDate, product.schedules?.[0] ?? null, dayInfo.price ?? product.priceCents);

  };


  // Voltar / compartilhar / favoritar (visual novo). Hooks ficam antes dos
  // retornos antecipados. Favorito usa a mesma chave da Home: `est:<id>`.
  const favLabel = displayEstablishment ? displayEstablishment.displayName || displayEstablishment.name : "";
  const favMinPrice = displayEstablishment?.minPrice ?? 0;
  const favItem = displayEstablishment
    ? {
        key: `est:${displayEstablishment.id}`,
        title: favLabel,
        image: displayEstablishment.image || heroImage || undefined,
        path: establishmentPath(favLabel),
        subtitle: "Serra Gaúcha",
        rating: displayEstablishment.rating,
        priceLabel:
          favMinPrice > 0
            ? `A partir de ${(favMinPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
            : undefined,
      }
    : null;
  const { goBack, share, toggleFav, favorited } = useOfferActions(
    favItem,
    favLabel,
    favLabel ? absoluteUrl(`/estabelecimento/${establishmentSlug(favLabel)}`) : typeof window !== "undefined" ? window.location.href : "",
  );

  // Only show full skeleton on initial load (no cached establishment)
  if (loading && !displayEstablishment) {
    return (
      <div className="min-h-screen overflow-x-clip bg-background font-jakarta">
        <Skeleton className="h-[230px] w-full rounded-none md:hidden" />
        <main className={`${DETAIL_CONTAINER} relative -mt-[22px] rounded-t-[22px] bg-background pt-6 pb-8 md:mt-0 md:rounded-none md:pt-4`}>
          <Skeleton className="hidden h-[200px] w-full rounded-2xl md:block mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        </main>
        <Footer />
        <HomeBottomNav />
      </div>
    );
  }

  if (!displayEstablishment) {
    return (
      <div className="min-h-screen overflow-x-clip bg-background font-jakarta">
        <main className={`${DETAIL_CONTAINER} py-16 text-center`}>
          <h1 className="text-2xl font-bold mb-4">Estabelecimento não encontrado</h1>
          <p className="text-muted-foreground mb-6">O estabelecimento que você procura não está disponível.</p>
          <Button className="h-12 rounded-xl px-6" onClick={() => navigate("/")}>Voltar ao início</Button>
        </main>
        <Footer />
        <HomeBottomNav />
      </div>
    );
  }

  const displayLabel = displayEstablishment.displayName || displayEstablishment.name;

  const estCity = resolveEstablishmentCity(displayEstablishment.addressLabel, displayLabel);
  const seo = buildEstablishmentSeo({
    name: displayLabel,
    city: estCity,
    category: displayEstablishment.category,
    about: displayEstablishment.aboutText,
    productCount: mergedDisplayEstablishment?.products?.length || 0,
    minPrice: displayEstablishment.minPrice,
  });
  const canonicalPath = `/estabelecimento/${establishmentSlug(displayLabel)}`;
  const productsForSchema = (mergedDisplayEstablishment?.products || []).slice(0, 10);

  // Internal linking (backlinks): similar establishments (same category) and
  // trending ones (admin primary carousel), each redirecting to its own page.
  const otherEstablishments = establishments.filter((e) => e.id !== displayEstablishment.id);
  const trendingEstablishments = otherEstablishments.filter((e) => e.carouselPrimary).slice(0, 3);
  const similarEstablishments = otherEstablishments
    .filter(
      (e) =>
        e.category === displayEstablishment.category &&
        !trendingEstablishments.some((t) => t.id === e.id),
    )
    .slice(0, 4);
  const establishmentHref = (e: { name: string; displayName?: string | null }) =>
    establishmentPath(e.displayName || e.name);
  const isRestaurant = displayEstablishment.category === "restaurante";
  const internalLinks = [
    ...trendingEstablishments.map((e) => ({
      to: establishmentHref(e),
      label: `${isRestaurant ? "Reserve no" : "Ingressos"} ${e.displayName || e.name}`,
    })),
    ...similarEstablishments.map((e) => ({
      to: establishmentHref(e),
      label: `${isRestaurant ? "Reserve no" : "Ingressos"} ${e.displayName || e.name}`,
    })),
    { to: "/hospedagem", label: `Hotéis em ${estCity}` },
    { to: "/entretenimento", label: `Passeios em ${estCity}` },
    { to: "/restaurantes", label: `Restaurantes em ${estCity}` },
    ...(estCity !== "Gramado" ? [{ to: "/hoteis-em-gramado", label: "Hotéis em Gramado" }] : []),
    ...(estCity !== "Canela" ? [{ to: "/hoteis-em-canela", label: "Hotéis em Canela" }] : []),
  ].filter((link, index, arr) => arr.findIndex((l) => l.to === link.to) === index);

  const ratingLabel = Number(displayEstablishment.rating || 0).toFixed(1).replace(".", ",");

  // Lista de produtos: linhas (eventos com setores) ou cartões com foto (demais).
  // Mesmo ProductCard, mesmas props e mesma lógica de compra nos dois formatos.
  const productList = (
    <div className="relative">
      {/* Loading overlay — only covers products, not the whole page */}
      {productsLoading && (
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Atualizando produtos…</span>
          </div>
        </div>
      )}
      {pageVenue ? (
        <ul className="m-0 list-none p-0">
          {filteredProducts.map((product, index) => (
            <li key={product.id || product.path}>
              <ProductCard
                variant="row"
                product={product}
                index={index}
                selectedDate={selectedDate}
                productPrices={productPrices}
                establishmentId={displayEstablishment?.id}
                establishmentName={displayEstablishment?.displayName || displayEstablishment?.name}
                requiresSeatSelection={productRequiresSeatSelection(displayEstablishment, product)}
                onOpenSeatMap={openSeatMapFor}
              />
            </li>
          ))}
          {filteredProducts.length === 0 && (productsLoading || loading || availabilityLoading || !hasResolvedMonth) && (
            <>
              {[...Array(4)].map((_, i) => (
                <li key={`prod-skel-${i}`} className="border-t border-[#ebebeb] py-4">
                  <Skeleton className="h-5 w-full rounded-md" />
                </li>
              ))}
            </>
          )}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id || product.path}
              product={product}
              index={index}
              selectedDate={selectedDate}
              productPrices={productPrices}
              establishmentId={displayEstablishment?.id}
              establishmentName={displayEstablishment?.displayName || displayEstablishment?.name}
              requiresSeatSelection={productRequiresSeatSelection(displayEstablishment, product)}
              onOpenSeatMap={openSeatMapFor}
            />
          ))}
          {/* Enquanto a API ainda está respondendo e não temos produtos do estabelecimento,
              mostramos skeletons em vez de "Nenhum produto encontrado" — evita confundir
              o visitante que entra direto na página. */}
          {filteredProducts.length === 0 && (productsLoading || loading || availabilityLoading || !hasResolvedMonth) && (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={`prod-skel-${i}`} className="h-56 rounded-2xl" />
              ))}
            </>
          )}
        </div>
      )}

      {filteredProducts.length === 0 && !productsLoading && !loading && !availabilityLoading && hasResolvedMonth && (
        <div className="text-center py-12">
          {sectorFilter && pageVenue ? (
            <>
              <p className="text-muted-foreground">
                Nenhum ingresso do setor{" "}
                <strong>{pageVenue.sectors.find((s) => s.id === sectorFilter)?.label}</strong>{" "}
                disponível para esta data.
              </p>
              <button
                type="button"
                onClick={() => setSectorFilter(null)}
                className="mt-3 min-h-[44px] text-sm font-semibold text-primary underline underline-offset-4"
              >
                Ver todos os setores
              </button>
            </>
          ) : (
            <p className="text-muted-foreground">Nenhum produto encontrado para este filtro.</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-background font-jakarta text-foreground">
      <SEOHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonical={canonicalPath}
        image={heroImage || displayEstablishment.image}
        type="place"
        city={estCity}
        latitude={displayEstablishment.latitude}
        longitude={displayEstablishment.longitude}
        jsonLd={[
          jsonLdLocalBusiness({
            name: displayLabel,
            url: absoluteUrl(canonicalPath),
            image: heroImage || displayEstablishment.image,
            description: displayEstablishment.aboutText || seo.description,
            city: estCity,
            address: resolveEstablishmentAddress(displayEstablishment.addressLabel),
            latitude: displayEstablishment.latitude,
            longitude: displayEstablishment.longitude,
            category: displayEstablishment.category,
            // Sem aggregateRating: o sistema não possui avaliações reais coletadas.
            rating: null,
            reviewCount: null,

          }),
          jsonLdBreadcrumb([
            { name: "Início", url: absoluteUrl("/") },
            { name: displayEstablishment.category === "restaurante" ? "Restaurantes" :
                    displayEstablishment.category === "entretenimento" ? "Entretenimento" :
                    displayEstablishment.category === "servicos" ? "Serviços" : "Estabelecimentos",
              url: absoluteUrl(`/${displayEstablishment.category === "restaurante" ? "restaurantes" : displayEstablishment.category || ""}`) },
            { name: displayLabel, url: absoluteUrl(canonicalPath) },
          ]),
          ...(productsForSchema.length > 0 ? [jsonLdItemList(productsForSchema.map(p => ({
            name: p.name,
            url: absoluteUrl(canonicalPath),
            image: p.image,
          })))] : []),
          // Product + Offer somente quando existe preço real cadastrado/retornado pela API
          ...productsForSchema
            .filter((p: any) => Number(p?.priceCents) > 0)
            .map((p: any) =>
              jsonLdProduct({
                name: p.name,
                url: absoluteUrl(canonicalPath),
                image: p.image || heroImage || displayEstablishment.image,
                description: p.description || undefined,
                brand: displayLabel,
                priceCents: Number(p.priceCents),
                oldPriceCents:
                  Number(p?.oldPriceCents) > Number(p?.priceCents) ? Number(p.oldPriceCents) : undefined,
                category: displayEstablishment.category || undefined,
              }),
            ),

          jsonLdFaq(buildEstablishmentFaq({
            name: displayLabel,
            city: estCity,
            category: displayEstablishment.category,
            minPriceCents: displayEstablishment.minPrice,
          })),
        ]}
      />

      {/* Foto de ponta a ponta com botões redondos (celular). O cabeçalho global
          fica escondido nesta rota no celular, então o "voltar" mora aqui. */}
      <div className="relative h-[230px] w-full overflow-hidden bg-muted md:hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={displayLabel}
            className="h-full w-full object-cover animate-in fade-in duration-500"
            style={{ objectPosition: displayEstablishment.bannerPosition || "center" }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        {/* Leve sombra no topo para os botões brancos não sumirem em fotos claras */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" aria-hidden="true" />
        <div className="absolute left-4 top-[max(14px,env(safe-area-inset-top))]">
          <OfferRoundButton onClick={goBack} aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </OfferRoundButton>
        </div>
        <div className="absolute right-4 top-[max(14px,env(safe-area-inset-top))] flex gap-2.5">
          <OfferRoundButton onClick={share} aria-label="Compartilhar">
            <Share className="h-[18px] w-[18px]" aria-hidden="true" />
          </OfferRoundButton>
          <OfferRoundButton
            onClick={toggleFav}
            aria-label={favorited ? "Remover dos favoritos" : "Salvar nos favoritos"}
            aria-pressed={favorited}
          >
            <Heart className={cn("h-[18px] w-[18px]", favorited && "fill-primary text-primary")} aria-hidden="true" />
          </OfferRoundButton>
        </div>
      </div>

      {/* Folha branca que sobe sobre a foto no celular; no desktop é o container da página */}
      <main className={`${DETAIL_CONTAINER} relative -mt-[22px] rounded-t-[22px] bg-background pt-6 pb-8 md:mt-0 md:rounded-none md:pt-4 md:pb-12`}>
        {/* Capa (tablet e desktop) */}
        <div className="relative hidden h-[200px] overflow-hidden rounded-2xl bg-muted md:block">
          {heroImage ? (
            <img
              src={heroImage}
              alt={displayLabel}
              className="h-full w-full object-cover animate-in fade-in duration-500"
              style={{ objectPosition: displayEstablishment.bannerPosition || "center" }}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" aria-hidden="true" />
          <button
            type="button"
            onClick={goBack}
            className="absolute left-4 top-4 inline-flex h-11 items-center gap-1 rounded-full border border-[#dddddd] bg-white pl-3 pr-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-[#f7f7f7] active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </button>
          <div className="absolute right-4 top-4 flex gap-2">
            <button
              type="button"
              onClick={share}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dddddd] bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-[#f7f7f7]"
            >
              <Share className="h-4 w-4" aria-hidden="true" />
              Compartilhar
            </button>
            <button
              type="button"
              onClick={toggleFav}
              aria-pressed={favorited}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dddddd] bg-white px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-[#f7f7f7]"
            >
              <Heart className={cn("h-4 w-4", favorited && "fill-primary text-primary")} aria-hidden="true" />
              {favorited ? "Salvo" : "Salvar"}
            </button>
          </div>
          <div className="absolute bottom-5 left-6 right-6 text-white">
            {/* O <h1> real fica no bloco do celular (indexação mobile-first); aqui é um título equivalente */}
            <p role="heading" aria-level={1} className="m-0 text-[32px] font-extrabold leading-tight break-words drop-shadow-sm">
              {displayLabel}
            </p>
            <p className="m-0 mt-1 flex items-center gap-1 text-sm text-white/95">
              <Star className="h-3.5 w-3.5 fill-white text-white" aria-hidden="true" />
              <span>{ratingLabel}</span>
              <span aria-hidden="true">·</span>
              <span>Serra Gaúcha</span>
            </p>
          </div>
        </div>

        {/* Título (celular) */}
        <div className="md:hidden">
          <h1 className="m-0 text-[22px] font-bold leading-tight break-words">{displayLabel}</h1>
          <p className="m-0 mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3 w-3 fill-foreground text-foreground" aria-hidden="true" />
            <span>{ratingLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Serra Gaúcha</span>
          </p>
          {pageVenue && displayEstablishment.minPrice > 0 && (
            <p className="m-0 mt-2 text-sm text-muted-foreground">
              A partir de{" "}
              <span className="text-base font-bold text-foreground">
                {(displayEstablishment.minPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>
          )}
        </div>

        {/* Gallery */}
        {displayEstablishment.galleryImages && displayEstablishment.galleryImages.length > 0 && (
          <div className="mt-4 md:mt-3.5">
            <GalleryStrip images={displayEstablishment.galleryImages} name={displayLabel} />
          </div>
        )}

        {/* Filtros por tipo */}
        {productTypes.length > 2 && (
          <div
            role="group"
            aria-label="Filtrar produtos por tipo"
            className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide md:mx-0 md:mt-6 md:px-0"
          >
            {productTypes.map((type) => {
              const active = typeFilter === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-colors md:h-10",
                    active
                      ? "border-[#222222] bg-[#222222] text-white"
                      : "border-[#dddddd] bg-white text-foreground hover:border-[#222222]",
                  )}
                >
                  {type === "todos" ? "Todos" : type}
                </button>
              );
            })}
          </div>
        )}

        {/* Duas colunas a partir do tablet: produtos + "Informações" */}
        <div className="mt-4 flex flex-col gap-6 md:mt-6 md:flex-row md:items-start lg:gap-8">
          <div className="min-w-0 flex-1">
            {pageVenue ? (
              /* Mapa de setores clicável (Nativitaten / Grande Desfile) + lista de ingressos */
              <section
                aria-labelledby="venue-sector-title"
                className="border-t border-[#ebebeb] pt-4 md:rounded-2xl md:border md:border-[#dddddd] md:p-5 md:shadow-[0_6px_20px_rgba(0,0,0,0.08)] lg:p-6"
              >
                <h2 id="venue-sector-title" className="m-0 text-base font-semibold text-foreground md:text-lg md:font-extrabold">
                  <span className="md:hidden">Selecione o setor</span>
                  <span className="hidden md:inline">Selecione o setor desejado clicando no mapa abaixo</span>
                </h2>
                <p className="m-0 mt-0.5 text-[13px] text-muted-foreground md:mt-1 md:text-sm">
                  Toque em um setor colorido para ver os assentos disponíveis.
                </p>

                <div className="mt-3 flex flex-col md:mt-3.5">
                  <div
                    className="rounded-2xl bg-[#f3f6f8] p-2 md:p-3"
                    data-map-gesture-zone="true"
                    style={{ touchAction: "pan-y" }}
                  >
                    <VenueSectorMap
                      venue={pageVenue}
                      activeSectorId={sectorFilter}
                      onSectorClick={handleSectorClick}
                      className="h-auto w-full max-h-[240px] sm:max-h-[340px] lg:max-h-[420px] rounded-lg"
                    />
                  </div>
                  {/* Setores: no celular, pílulas roláveis acima do mapa; no desktop, legenda abaixo */}
                  <div
                    role="group"
                    aria-label="Setores"
                    className="order-first -mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide md:order-none md:mx-0 md:mb-0 md:mt-3.5 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
                  >
                    {pageVenue.sectors.filter((s) => s.sellable).map((s) => {
                      const active = sectorFilter === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleSectorClick(s.id)}
                          className={cn(
                            "inline-flex h-11 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-colors md:h-9 md:px-3",
                            active
                              ? "border-[#222222] bg-[#222222] text-white"
                              : "border-[#dddddd] bg-white text-foreground hover:border-[#222222]",
                          )}
                        >
                          <span className="h-[9px] w-[9px] shrink-0 rounded-full md:h-2.5 md:w-2.5" style={{ background: s.color }} aria-hidden="true" />
                          {s.label}
                          {active && <X className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 md:mt-[18px]">{productList}</div>
              </section>
            ) : (
              productList
            )}

            {/* Informações (celular): cartões com borda clara abaixo dos produtos */}
            <section className="mt-8 md:hidden" aria-labelledby="info-title-mobile">
              <h2 id="info-title-mobile" className="m-0 mb-2.5 text-lg font-bold text-foreground">Informações</h2>
              <EstablishmentInfoSections establishment={displayEstablishment} variant="cards" />
            </section>
          </div>

          {/* Sidebar — calendário + informações (tablet e desktop) */}
          <aside className="hidden w-[300px] shrink-0 md:block lg:w-[340px] xl:w-[380px]" aria-labelledby="info-title-desktop">
            <h2 id="info-title-desktop" className="m-0 mb-3 text-lg font-extrabold text-foreground">Informações</h2>
            <div className="space-y-4 lg:sticky lg:top-4">
              {/* Embrulha o calendário (compartilhado com outras páginas) só para o visual novo */}
              <div className="[&>div]:max-w-none [&>div]:rounded-2xl [&>div]:border-[#dddddd] [&>div]:p-5 [&>div]:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
                <ParksnetCalendar
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  minPriceCents={displayEstablishment.minPrice}
                  availableDates={availableDates}
                  dayPrices={dayPrices}
                  availabilityLoading={availabilityLoading}
                  hasResolvedMonth={hasResolvedMonth}
                  onMonthChange={setCalendarMonth}
                  allowedMonths={allowedMonths}
                />
              </div>
              <EstablishmentInfoSections establishment={displayEstablishment} variant="list" />
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile buy/date drawer (shared for floating button and product 'Comprar') */}
      {isMobile && (
        <MobileBuyDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          product={drawerProduct}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          minPriceCents={displayEstablishment.minPrice}
          availableDates={availableDates}
          dayPrices={dayPrices}
          productPrices={productPrices}
          availabilityLoading={availabilityLoading}
          hasResolvedMonth={hasResolvedMonth}
          onMonthChange={setCalendarMonth}
          allowedMonths={allowedMonths}
          onConfirm={handleDrawerConfirm}
        />
      )}

      {/* Mapa de assentos numerados (Nativitaten / Grande Desfile) */}
      {seatModal && (
        <SeatMapModal
          open={!!seatModal}
          onOpenChange={(open) => { if (!open) setSeatModal(null); }}
          productName={seatModal.product.name}
          productPath={seatModal.productPath}
          date={format(seatModal.date, "dd/MM/yyyy")}
          dateLabel={format(seatModal.date, "d 'de' MMMM", { locale: ptBR })}
          priceCents={seatModal.priceCents}
          onConfirm={handleSeatConfirm}
          onFallback={handleSeatFallback}
        />
      )}

      <SEOContentBlock
        heading={`Sobre ${displayLabel} em ${estCity}`}
        paragraphs={[
          displayEstablishment.aboutText ||
            `${displayLabel} é um dos parceiros do Bah Ofertas em ${estCity}, na Serra Gaúcha. Aqui você encontra ingressos, vouchers e experiências com preços abaixo do balcão, sem taxa de conveniência, com voucher digital entregue por e-mail imediatamente após o pagamento.`,
          `Compre ${displayEstablishment.category === "restaurante" ? "sua reserva" : "seu ingresso"} para ${displayLabel} com antecedência e evite filas no balcão. O Bah Ofertas é a plataforma local da Serra Gaúcha, com atendimento próximo e parcerias diretas com os principais estabelecimentos de ${estCity}.`,
        ]}
        bullets={[
          "Confirmação imediata por e-mail",
          "Pagamento em PIX, cartão (até 12x) ou voucher",
          "Sem taxa de conveniência",
          "Suporte local em Gramado e Canela",
        ]}
        faq={buildEstablishmentFaq({
          name: displayLabel,
          city: estCity,
          category: displayEstablishment.category,
          minPriceCents: displayEstablishment.minPrice,
        })}
        internalLinks={internalLinks}
      />

      {(() => {
        const videoUrl = getEstablishmentVideoUrl(displayEstablishment);
        return videoUrl ? <MiniVideoPlayer videoUrl={videoUrl} title={displayLabel} /> : null;
      })()}

      <Footer />
      <HomeBottomNav />
    </div>
  );
};

function ProductCard({ product, index, selectedDate, productPrices, establishmentId, establishmentName, requiresSeatSelection, onOpenSeatMap, variant = "card" }: { variant?: "card" | "row"; product: NovaxsProduct; index: number; selectedDate: Date | null; productPrices?: import("@/hooks/useEstablishmentAvailability").ProductDayPriceMap; establishmentId?: string; establishmentName?: string; requiresSeatSelection?: boolean; onOpenSeatMap?: (product: NovaxsProduct, date: Date, schedule: string | null, priceCents: number) => void }) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const selectedSchedule: string | null = null;

  // Instant price lookup from the cached month availability — switches immediately when the date changes,
  // without waiting for the full product list to refetch.
  const dayInfo = useMemo(
    () => getProductDayPrice(productPrices, product, selectedDate),
    [selectedDate, productPrices, product.id, product.path],
  );
  const instantPriceCents = dayInfo.price;
  // Sem preço na data escolhida, mas com calendário conhecido = esgotado nesse dia.
  const unavailableToday = dayInfo.hasCalendar && !!selectedDate && instantPriceCents == null;

  // Muitos produtos só operam em dias específicos (ex.: shows de sexta/sábado).
  // Em vez de marcar como "Esgotado", oferecemos a próxima data com vagas.
  const nextAvailable = useMemo(
    () => (unavailableToday ? getNextAvailableDay(productPrices, product, selectedDate) : null),
    [unavailableToday, productPrices, product.id, product.path, selectedDate],
  );
  const { setSelectedDate } = useSelectedDate();
  const isSoldOut = unavailableToday && !nextAvailable;

  const displayPriceCents = instantPriceCents ?? nextAvailable?.priceCents ?? product.priceCents;

  const priceFormatted = (displayPriceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const oldPriceCents = (product as any).oldValue && (product as any).oldValue > displayPriceCents
    ? (product as any).oldValue as number
    : null;
  const oldPriceFormatted = oldPriceCents
    ? (oldPriceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;
  const rawDescription = getProductDescription(product);
  const cleanDescription = rawDescription
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sanitizedHtml = DOMPurify.sanitize(rawDescription);

  const hasSchedules = product.schedules && product.schedules.length > 0;
  const isManualScheduling = needsManualScheduling(product);

  // Ready to add when: no schedule needed, OR a date is picked, OR manual scheduling
  const readyToAdd =
    !hasSchedules || isManualScheduling || !!selectedDate;

  // Mobile: clicking "Comprar" always opens the buy drawer with this product
  // (date → schedule → quantity → add).
  // Desktop: first click expands the card; second click adds to cart.
  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isSoldOut) {
      toast({
        title: "Ingresso esgotado",
        description: `${product.name} não está disponível em ${format(selectedDate!, "dd/MM/yyyy")}. Escolha outra data.`,
        variant: "destructive",
      });
      return;
    }

    // Produto não opera na data escolhida: leva o usuário para a próxima data com vagas.
    if (unavailableToday && nextAvailable) {
      setSelectedDate(nextAvailable.date);
      toast({
        title: `Data alterada para ${format(nextAvailable.date, "dd/MM/yyyy")}`,
        description: `${product.name} está disponível nessa data. Toque em Comprar novamente para continuar.`,
      });
      return;
    }




    // Assentos numerados (Nativitaten / Grande Desfile): abre o mapa de assentos.
    if (requiresSeatSelection) {
      if (!selectedDate) {
        toast({
          title: "Selecione uma data",
          description: "Escolha o dia no calendário para ver o mapa de assentos.",
          variant: "destructive",
        });
        return;
      }
      onOpenSeatMap?.(product, selectedDate, product.schedules?.[0] ?? null, displayPriceCents);
      return;
    }

    if (isMobile) {
      setExpanded(true);
      window.dispatchEvent(
        new CustomEvent("bah:open-date-drawer", { detail: { product } })
      );
      return;
    }

    if (!expanded) {
      setExpanded(true);
      return;
    }

    if (hasSchedules && !selectedDate) {
      toast({
        title: "Selecione uma data",
        description: "Escolha uma data antes de adicionar ao carrinho.",
        variant: "destructive",
      });
      return;
    }

    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;

    addItem({
      id: `${product.id?.toString() || product.path}${dateStr ? `-${dateStr}` : ""}${selectedSchedule ? `-${selectedSchedule}` : ""}`,
      title: product.name,
      subtitle: selectedSchedule
        ? `${dateStr ? format(selectedDate!, "dd/MM/yyyy") + " — " : ""}${selectedSchedule}`
        : product.type || undefined,
      price: displayPriceCents / 100,
      originalPrice: displayPriceCents / 100,
      discountPercent: 0,
      imageUrl: product.image || "",
      category: product.type || "Entretenimento",
      selectedSchedule: selectedSchedule || undefined,
      selectedDate: dateStr,
      requiresSchedule: hasSchedules,
      manualScheduling: isManualScheduling,
      metadata: {
        source: 'novaxs' as const,
        productId: product.id ?? product.path,
        productPath: product.path,
        priceToken: (product as any).token || undefined,
        establishmentId,
        establishmentName,
        date: dateStr || '',
        schedule: selectedSchedule || null,
      },
    });

    toast({
      title: "Adicionado ao carrinho",
      description: selectedSchedule
        ? `${product.name} — ${dateStr ? format(selectedDate!, "dd/MM/yyyy") + " " : ""}${selectedSchedule}`
        : product.name,
    });
  };

  // Detalhes que aparecem ao expandir (descrição completa + aviso de agendamento manual).
  const expandedDetails = (
    <>
      {expanded && cleanDescription ? (
        <div
          className="text-xs text-muted-foreground mb-3 prose prose-xs max-w-none [&_p]:mb-1 [&_ul]:mb-1 [&_li]:mb-0.5 animate-in fade-in duration-200"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      ) : null}
      {expanded && isManualScheduling && (
        <div className="mb-3 animate-in fade-in duration-200">
          <ManualSchedulingNotice />
        </div>
      )}
    </>
  );

  // Linha de ingresso (eventos com setores — Nativitaten / Grande Desfile):
  // nome à esquerda; preço em negrito + "Comprar" à direita; divisória fina.
  if (variant === "row") {
    return (
      <div
        className="border-t border-[#ebebeb] animate-in fade-in duration-300"
        style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
      >
        <div className="flex items-center justify-between gap-3 py-2.5 md:py-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="min-h-[44px] min-w-0 flex-1 text-left"
          >
            <span className="block text-sm font-medium leading-snug text-foreground md:text-[15px] md:font-semibold">
              {product.name}
            </span>
            {isSoldOut ? (
              <span className="mt-0.5 block text-xs font-semibold text-destructive">
                Esgotado{selectedDate ? ` em ${format(selectedDate, "dd/MM/yyyy")}` : ""}
              </span>
            ) : nextAvailable ? (
              <span className="mt-0.5 block text-xs font-medium text-amber-600">
                Próxima data: {format(nextAvailable.date, "dd/MM/yyyy")}
              </span>
            ) : null}
          </button>

          <div className="flex shrink-0 items-center gap-3 md:gap-3.5">
            {!isSoldOut && displayPriceCents > 0 ? (
              <div className="text-right leading-tight">
                {oldPriceFormatted && (
                  <div className="text-[11px] text-muted-foreground line-through">De: {oldPriceFormatted}</div>
                )}
                <span className="text-[15px] font-bold text-foreground md:text-base">{priceFormatted}</span>
              </div>
            ) : !isSoldOut ? (
              <span className="text-sm font-semibold text-muted-foreground">Consultar preço</span>
            ) : null}

            {isSoldOut ? (
              <Button size="sm" variant="secondary" disabled className="h-11 rounded-full px-4 text-[13px] md:h-10">
                Indisponível
              </Button>
            ) : displayPriceCents > 0 ? (
              <Button
                size="sm"
                className="h-11 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 md:h-10 md:px-[18px] md:text-sm"
                onClick={handleBuyClick}
              >
                {nextAvailable ? "Ver data" : "Comprar"}
              </Button>
            ) : null}
          </div>
        </div>
        {(expanded && (cleanDescription || isManualScheduling)) ? <div className="pb-1">{expandedDetails}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={`bg-card rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer transition-shadow hover:shadow-[0_4px_18px_rgba(0,0,0,0.12)] ${expanded ? "ring-1 ring-primary/20" : ""}`}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
      onClick={() => setExpanded(!expanded)}
    >
      {product.image && (
        <div className="relative overflow-hidden transition-all duration-300 h-[170px] md:h-48">
          <img
            src={product.image}
            alt={product.name}
            className={`w-full h-full object-cover ${isSoldOut ? "opacity-50 grayscale" : ""}`}
            loading="lazy"
          />
          {isSoldOut && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground shadow">
              Esgotado
            </span>
          )}
          {!isSoldOut && nextAvailable && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-amber-700 shadow">
              Disponível em {format(nextAvailable.date, "dd/MM")}
            </span>
          )}

        </div>
      )}
      <div className="px-3.5 pt-3 pb-3.5">
        <h3 className="m-0 font-semibold text-sm mb-1 line-clamp-2 text-foreground">{product.name}</h3>
        {cleanDescription && !expanded ? (
          <p className="m-0 text-xs text-muted-foreground line-clamp-2 mb-2.5">{cleanDescription}</p>
        ) : null}
        {expandedDetails}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {isSoldOut ? (
              <>
                <div className="text-[10px] text-muted-foreground leading-none mb-0.5">
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""}
                </div>
                <span className="text-base font-bold text-destructive">Esgotado</span>
              </>
            ) : displayPriceCents > 0 ? (
              <>
                {nextAvailable && (
                  <div className="text-[10px] text-amber-600 font-medium leading-none mb-0.5">
                    Próxima data: {format(nextAvailable.date, "dd/MM/yyyy")}
                  </div>
                )}
                {oldPriceFormatted && (
                  <div className="text-[11px] text-muted-foreground line-through leading-none">De: {oldPriceFormatted}</div>
                )}
                {oldPriceFormatted && (
                  <div className="text-[10px] text-muted-foreground leading-none mt-0.5">A partir de</div>
                )}
                <span className="text-[17px] font-bold text-primary">{priceFormatted}</span>
              </>
            ) : (
              <span className="text-base font-bold text-muted-foreground">Consultar preço</span>
            )}

          </div>
          {isSoldOut ? (
            <Button size="sm" variant="secondary" disabled className="h-11 shrink-0 rounded-full px-4 text-[13px] md:h-9">
              Indisponível
            </Button>
          ) : displayPriceCents > 0 ? (
            <Button
              size="sm"
              className="h-11 shrink-0 gap-1.5 rounded-full px-4 text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground md:h-9"
              onClick={handleBuyClick}
            >
              <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
              {nextAvailable ? "Ver data" : "Comprar"}
            </Button>
          ) : null}

        </div>

      </div>
    </div>
  );
}

function GalleryStrip({ images, name }: { images: string[]; name: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedImage = selectedIndex !== null ? images[selectedIndex] ?? null : null;
  const setSelectedImage = (url: string | null) => {
    if (url === null) {
      setSelectedIndex(null);
      return;
    }
    const idx = images.indexOf(url);
    setSelectedIndex(idx >= 0 ? idx : null);
  };
  const showPrev = () => {
    setSelectedIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  };
  const showNext = () => {
    setSelectedIndex((i) => (i === null ? null : (i + 1) % images.length));
  };
  // Keyboard navigation while lightbox is open
  useEffect(() => {
    if (selectedIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
      else if (e.key === "Escape") setSelectedIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex]);

  // Zoom + pan + swipe state for lightbox
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: "none" | "pan" | "pinch" | "swipe";
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    startDist: number;
    startZoom: number;
    moved: number;
  }>({ mode: "none", startX: 0, startY: 0, startPanX: 0, startPanY: 0, startDist: 0, startZoom: 1, moved: 0 });

  // Reset zoom when image changes or closes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    pointersRef.current.clear();
  }, [selectedIndex]);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    if (selectedIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedIndex]);

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onLightboxPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 2) {
      gestureRef.current.mode = "pinch";
      gestureRef.current.startDist = distance(pts[0], pts[1]);
      gestureRef.current.startZoom = zoom;
    } else if (pts.length === 1) {
      gestureRef.current.mode = zoom > 1 ? "pan" : "swipe";
      gestureRef.current.startX = e.clientX;
      gestureRef.current.startY = e.clientY;
      gestureRef.current.startPanX = pan.x;
      gestureRef.current.startPanY = pan.y;
      gestureRef.current.moved = 0;
    }
  };

  const onLightboxPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    if (gestureRef.current.mode === "pinch" && pts.length >= 2) {
      const d = distance(pts[0], pts[1]);
      const ratio = d / (gestureRef.current.startDist || 1);
      const next = Math.min(4, Math.max(1, gestureRef.current.startZoom * ratio));
      setZoom(next);
      if (next === 1) setPan({ x: 0, y: 0 });
    } else if (gestureRef.current.mode === "pan" && zoom > 1) {
      const dx = e.clientX - gestureRef.current.startX;
      const dy = e.clientY - gestureRef.current.startY;
      setPan({ x: gestureRef.current.startPanX + dx, y: gestureRef.current.startPanY + dy });
    } else if (gestureRef.current.mode === "swipe") {
      gestureRef.current.moved = Math.max(
        gestureRef.current.moved,
        Math.abs(e.clientX - gestureRef.current.startX)
      );
    }
  };

  const onLightboxPointerUp = (e: React.PointerEvent) => {
    const pt = pointersRef.current.get(e.pointerId);
    pointersRef.current.delete(e.pointerId);
    if (gestureRef.current.mode === "swipe" && pt && zoom === 1) {
      const dx = e.clientX - gestureRef.current.startX;
      const dy = e.clientY - gestureRef.current.startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) showNext();
        else showPrev();
      }
    }
    if (pointersRef.current.size === 0) {
      gestureRef.current.mode = "none";
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      gestureRef.current.mode = zoom > 1 ? "pan" : "swipe";
      gestureRef.current.startX = remaining.x;
      gestureRef.current.startY = remaining.y;
      gestureRef.current.startPanX = pan.x;
      gestureRef.current.startPanY = pan.y;
    }
  };

  const handleDoubleTapZoom = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };
  const dragState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    moved: 0,
    lastX: 0,
    lastT: 0,
    startT: 0,
    velocity: 0,
    targetScroll: 0,
    rafId: 0 as number,
    momentumId: 0 as number,
    tapIndex: null as number | null,
    captured: false,
    pointerId: 0,
  });

  const cancelMomentum = () => {
    if (dragState.current.momentumId) {
      cancelAnimationFrame(dragState.current.momentumId);
      dragState.current.momentumId = 0;
    }
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    cancelMomentum();
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    // On touch devices, let native scroll + native click handle everything.
    // Custom pointer capture interferes with tap-to-open on mobile.
    if (e.pointerType === "touch") return;
    cancelMomentum();
    const s = dragState.current;
    s.isDown = true;
    s.startX = e.clientX;
    s.lastX = e.clientX;
    s.lastT = performance.now();
    s.startT = performance.now();
    s.scrollLeft = el.scrollLeft;
    s.targetScroll = el.scrollLeft;
    s.moved = 0;
    s.velocity = 0;
    s.captured = false;
    s.pointerId = e.pointerId;
    // Save which thumbnail was tapped at pointer-down — robust against
    // pointer-capture redirecting subsequent events to the container.
    const node = e.target as HTMLElement | null;
    const btn = node?.closest?.("[data-gallery-image]") as HTMLElement | null;
    const idxAttr = btn?.getAttribute("data-gallery-index");
    s.tapIndex = idxAttr != null ? parseInt(idxAttr, 10) : null;
    el.style.cursor = "grabbing";
    el.style.scrollBehavior = "auto";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const s = dragState.current;
    if (!el || !s.isDown) return;
    const now = performance.now();
    const dt = Math.max(1, now - s.lastT);
    const instVel = (e.clientX - s.lastX) / dt; // px/ms
    // Smooth velocity (low-pass)
    s.velocity = s.velocity * 0.7 + instVel * 0.3;
    s.lastX = e.clientX;
    s.lastT = now;

    const dx = e.clientX - s.startX;
    s.moved = Math.max(s.moved, Math.abs(dx));

    // Only capture the pointer once the user actually drags (>6px). This way,
    // pure taps still fire the child <button>'s native click on mobile.
    if (!s.captured && s.moved > 6) {
      try {
        el.setPointerCapture(s.pointerId);
        s.captured = true;
      } catch {
        // ignore
      }
    }

    if (!s.captured) return; // not a drag yet — let click happen naturally

    s.targetScroll = s.scrollLeft - dx;
    if (!s.rafId) {
      s.rafId = requestAnimationFrame(() => {
        s.rafId = 0;
        if (scrollRef.current) scrollRef.current.scrollLeft = s.targetScroll;
      });
    }
  };

  const startMomentum = () => {
    const el = scrollRef.current;
    const s = dragState.current;
    if (!el) return;
    let v = s.velocity * 16; // convert px/ms to px/frame (~60fps)
    const friction = 0.93;
    const step = () => {
      if (Math.abs(v) < 0.4 || !scrollRef.current) {
        s.momentumId = 0;
        return;
      }
      scrollRef.current.scrollLeft -= v;
      v *= friction;
      s.momentumId = requestAnimationFrame(step);
    };
    s.momentumId = requestAnimationFrame(step);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const s = dragState.current;
    if (!el || !s.isDown) return;
    s.isDown = false;
    el.style.cursor = "grab";
    if (s.captured) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    const elapsed = performance.now() - s.startT;
    // Treat as a tap: small movement AND short duration. Open the thumbnail
    // captured at pointer-down — bypasses elementFromPoint quirks on mobile.
    if (s.moved < 8 && elapsed < 500 && s.tapIndex != null) {
      const url = images[s.tapIndex];
      s.tapIndex = null;
      if (url) {
        setSelectedImage(url);
        return;
      }
    }
    s.tapIndex = null;
    if (s.captured && Math.abs(s.velocity) > 0.05) startMomentum();
    s.captured = false;
  };

  return (
    <>
      <div className="-mx-5 md:mx-0">
        <div className="relative group" data-map-gesture-zone="true">
          <button
            onClick={() => scroll("left")}
            aria-label="Imagem anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full border border-[#dddddd] bg-white shadow-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hidden md:flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div
            ref={scrollRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
            onWheel={cancelMomentum}
            style={{
              touchAction: "pan-x",
              cursor: "grab",
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorX: "contain",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-0 px-5 md:gap-2.5 md:px-0 select-none [&::-webkit-scrollbar]:hidden"
          >
            {images.map((url, i) => (
              <button
                key={i}
                type="button"
                data-gallery-image=""
                data-gallery-index={i}
                data-image-url={url}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  // Desktop / mouse fallback. On mobile the pointerup handler
                  // already opens the lightbox via dragState.tapIndex, so this
                  // only fires when the browser dispatched a real native click
                  // (no pointer capture was taken). Guard against re-opening
                  // mid-drag.
                  if (dragState.current.moved < 8) {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedImage(url);
                  }
                }}
                style={{
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                aria-label={`Ampliar foto ${i + 1} de ${name}`}
                className="shrink-0 rounded-xl overflow-hidden h-[88px] w-[120px] md:h-[110px] md:w-[190px] md:rounded-2xl bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform hover:scale-[1.02] cursor-pointer touch-manipulation"
              >
                <img
                  src={url}
                  alt={`${name} - Foto ${i + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => scroll("right")}
            aria-label="Próxima imagem"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full border border-[#dddddd] bg-white shadow-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hidden md:flex"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && selectedIndex !== null && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          style={{
            width: "100vw",
            height: "100dvh",
            top: 0,
            left: 0,
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
          onClick={() => setSelectedIndex(null)}
        >
          <button
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white/90 hover:text-white text-xl sm:text-2xl font-bold z-20 bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(null);
            }}
            aria-label="Fechar"
          >
            ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 sm:p-3 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 sm:p-3 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                aria-label="Próxima imagem"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 text-white/90 text-xs sm:text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                {selectedIndex + 1} / {images.length}
              </div>
            </>
          )}
          <div
            className="relative flex items-center justify-center overflow-hidden touch-none select-none"
            style={{ width: "100vw", height: "100dvh" }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleDoubleTapZoom();
            }}
            onPointerDown={onLightboxPointerDown}
            onPointerMove={onLightboxPointerMove}
            onPointerUp={onLightboxPointerUp}
            onPointerCancel={onLightboxPointerUp}
          >
            <img
              src={selectedImage}
              alt={`${name} - Foto ${selectedIndex + 1}`}
              onClick={(e) => e.stopPropagation()}
              className="object-contain rounded-lg select-none transition-transform duration-100 ease-out will-change-transform"
              style={{
                maxWidth: "100vw",
                maxHeight: "100dvh",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                touchAction: "none",
                cursor: zoom > 1 ? "grab" : "zoom-in",
              }}
              draggable={false}
            />
          </div>
          {/* Zoom controls */}
          <div
            className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="text-white/90 hover:text-white w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-lg font-bold disabled:opacity-40"
              onClick={() => {
                const next = Math.max(1, +(zoom - 0.5).toFixed(2));
                setZoom(next);
                if (next === 1) setPan({ x: 0, y: 0 });
              }}
              aria-label="Diminuir zoom"
              disabled={zoom <= 1}
            >
              −
            </button>
            <span className="text-white/90 text-xs w-10 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="text-white/90 hover:text-white w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-lg font-bold disabled:opacity-40"
              onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(2)))}
              aria-label="Aumentar zoom"
              disabled={zoom >= 4}
            >
              +
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default Estabelecimento;
