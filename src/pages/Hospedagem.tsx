import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { hotelPagePath } from "@/lib/hotel-page";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import HomeBottomNav from "@/components/home/HomeBottomNav";
import { HOME_CONTAINER } from "@/components/home/layout";
import HotelSearchBar from "@/components/hospedagem/HotelSearchBar";
import type { RoomGuests } from "@/components/hospedagem/HotelSearchBar";
import HotelFilters, { hotelHasAmenity, nightlyPrice } from "@/components/hospedagem/HotelFilters";
import { type SortMode, sortHotels } from "@/components/hospedagem/MobileFilterChips";
import SearchLoadingState from "@/components/hospedagem/SearchLoadingState";
import HotelResultCard from "@/components/hospedagem/redesign/HotelResultCard";
import HotelFilterChips from "@/components/hospedagem/redesign/HotelFilterChips";
import { useHotelSearch } from "@/hooks/useHotelSearch";
import { HOTEL_DESTINATIONS } from "@/data/hotel-destinations";
import HospedagemIdle from "@/components/hospedagem/HospedagemIdle";

import { formatDateForApi } from "@/lib/date";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, FlaskConical, Search as SearchIcon, X, ChevronLeft, SlidersHorizontal, Map as MapIcon, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Lazy-load heavy components: HotelMap pulls in mapbox-gl (~500KB) and
// HotelDetailModal is only needed when the user opens a hotel.
const HotelMap = lazy(() => import("@/components/hospedagem/HotelMap"));
const HotelDetailModal = lazy(() => import("@/components/hospedagem/HotelDetailModal"));

export interface HotelFilters {
  star_rating?: number[];
  kind?: string[];
  price_from?: number;
  price_to?: number;
  serp_filter?: string[];
  free_cancellation?: boolean;
}

export interface Hotel {
  id: string;
  name: string;
  location: string;
  image: string;
  images?: string[];
  rating: number;
  reviewCount: number;
  price: number;
  pricePerNight?: number;
  nights?: number;
  originalPrice?: number;
  currency: string;
  checkin: string;
  checkout: string;
  guests: number;
  amenities: string[];
  propertyType: string;
  freeCancellation: boolean;
  priceUnavailable?: boolean;
  bookHash?: string | null;
  matchHash?: string | null;
  isTestHotel?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

const SEARCH_STATE_KEY = 'hospedagem_search_state';

// Sem token o HotelMap não renderiza nada; evita reservar espaço/botão para o mapa.
const HAS_MAPBOX = Boolean(import.meta.env.VITE_MAPBOX_TOKEN);

/** true quando a janela tem pelo menos `px` de largura (valor certo já no 1º render). */
const useMinWidth = (px: number) => {
  const query = `(min-width: ${px}px)`;
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : true
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
};

// Posição da lista ao abrir um hotel, para voltar exatamente onde o usuário estava.
const LIST_VIEW_KEY = 'hospedagem_list_view';

const saveSearchState = (data: any) => {
  try {sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(data));} catch {}
};

const loadSearchState = () => {
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {return null;}
};

const isRealAvailableHotel = (hotel: Hotel) => {
  const hasRealEtgId = /^\d+$/.test(String(hotel.id));
  const hasRealPhoto = Array.isArray(hotel.images) && hotel.images.length > 0 && hotel.image !== '/placeholder.svg';
  const hasLivePrice = !hotel.priceUnavailable && Number(hotel.price) > 0;
  return hasRealEtgId && hasRealPhoto && hasLivePrice && !hotel.isTestHotel;
};

const Hospedagem = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const isTestMode = searchParams.get('test') === 'true';

  const [destination, setDestination] = useState<string>("gramado");
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [rooms, setRooms] = useState<RoomGuests[]>([{ adults: 2, children: [] }]);
  const [residency, setResidency] = useState<string>("br");
  const [filters, setFilters] = useState<HotelFilters>({});
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hotelNameSearch, setHotelNameSearch] = useState("");
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const navigate = useNavigate();
  const isMobile = !useMinWidth(768);
  const isXl = useMinWidth(1280);

  const { hotels, setHotels, isLoading, error, search, destinationLabel, setDestinationLabel, resetSearch } = useHotelSearch();
  const selectedDestination = HOTEL_DESTINATIONS.find((item) => item.value === destination) || HOTEL_DESTINATIONS[0];

  // Restore state: first from navigation state (checkout back), then from sessionStorage (category nav)
  useEffect(() => {
    const navState = location.state as any;
    // Voltando do checkout: reabre a página do hotel (não mais o pop-up).
    const reopenHotel = navState?.hotel ? navState.hotel as Hotel : null;

    const source = navState?.searchResults ? navState : loadSearchState();
    if (source?.searchResults?.length) {
      const realSearchResults = source.searchResults.filter(isRealAvailableHotel);
      if (realSearchResults.length !== source.searchResults.length) {
        sessionStorage.removeItem(SEARCH_STATE_KEY);
      }
      setHotels(realSearchResults);
      if (source.destinationLabel) setDestinationLabel(source.destinationLabel);
      if (source.destination) setDestination(source.destination);
      if (source.checkIn) setCheckIn(new Date(source.checkIn));
      if (source.checkOut) setCheckOut(new Date(source.checkOut));
      if (Array.isArray(source.rooms) && source.rooms.length) setRooms(source.rooms);
      if (source.filters) setFilters(source.filters);
      if (source.sortMode) setSortMode(source.sortMode);
      if (source.hotelNameSearch) setHotelNameSearch(source.hotelNameSearch);
      // Voltando da página de um hotel: restaura a rolagem (e lista/mapa no celular).
      try {
        const view = JSON.parse(sessionStorage.getItem(LIST_VIEW_KEY) || "null");
        sessionStorage.removeItem(LIST_VIEW_KEY);
        if (view && Date.now() - view.at < 30 * 60_000) {
          if (view.mobileView === "map") setMobileView("map");
          const y = Number(view.scrollY) || 0;
          let tries = 0;
          const restore = () => {
            if (document.documentElement.scrollHeight >= y + window.innerHeight * 0.5 || tries++ > 20) {
              window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
            } else {
              window.setTimeout(restore, 50);
            }
          };
          window.setTimeout(restore, 0);
        }
      } catch {}
    }

    if (navState) {
      window.history.replaceState({}, document.title);
    }
    // Vindo de "Alterar datas ou hóspedes" na página do hotel: abre a busca no celular.
    if (navState?.openSearch && !window.matchMedia("(min-width: 768px)").matches) {
      setShowSearchSheet(true);
    }
    if (reopenHotel) {
      navigate(hotelPagePath(reopenHotel), {
        replace: true,
        state: {
          hotel: reopenHotel,
          checkIn: navState.checkIn,
          checkOut: navState.checkOut,
          adults: navState.adults,
          children: navState.children,
          searchResults: navState.searchResults,
          destinationLabel: navState.destinationLabel,
          destination: navState.destination,
        },
      });
    }
  }, []);

  // Persist search state to sessionStorage whenever results change
  useEffect(() => {
    if (hotels.length > 0) {
      saveSearchState({
        searchResults: hotels,
        destinationLabel,
        destination,
        checkIn: checkIn?.toISOString(),
        checkOut: checkOut?.toISOString(),
        rooms,
        filters,
        sortMode,
        hotelNameSearch,
      });
    }
  }, [hotels, destinationLabel, destination, checkIn, checkOut, rooms, filters, sortMode, hotelNameSearch]);

  // Normalize room payload to avoid runtime crashes from stale/non-array state
  const safeRooms = Array.isArray(rooms) ? rooms : [{ adults: 2, children: [] }];

  // Compute totals for passing to detail modal
  const totalAdults = safeRooms.reduce((sum, r) => sum + r.adults, 0);
  const allChildren = safeRooms.flatMap((r) => r.children);

  // Cada hospedagem abre na própria página (mesmo conteúdo e reserva do antigo pop-up).
  const openHotel = (hotel: Hotel) => {
    try {
      sessionStorage.setItem(LIST_VIEW_KEY, JSON.stringify({ scrollY: window.scrollY, mobileView, at: Date.now() }));
    } catch {}
    navigate(hotelPagePath(hotel), {
      state: {
        hotel,
        checkIn: checkIn?.toISOString(),
        checkOut: checkOut?.toISOString(),
        rooms: safeRooms,
        searchResults: hotels,
        destinationLabel,
        destination,
      },
    });
  };

  useEffect(() => {
    if (isTestMode) {
      const start = new Date();
      start.setDate(start.getDate() + 14);
      const end = new Date();
      end.setDate(end.getDate() + 15);

      if (!checkIn) setCheckIn(start);
      if (!checkOut) setCheckOut(end);
      setResidency('uz');
      setRooms([{ adults: 2, children: [5] }]);
    }
  }, [isTestMode]);

  const resultsRef = useRef<HTMLElement | null>(null);

  const handleSearch = (fromOverride?: Date, toOverride?: Date) => {
    const ci = fromOverride instanceof Date ? fromOverride : checkIn;
    const co = toOverride instanceof Date ? toOverride : checkOut;
    setHotelNameSearch("");
    // Start downloading the map while the hotel search is in flight.
    void import("@/components/hospedagem/HotelMap");
    void import("mapbox-gl");
    // Use the same visible dates for search and availability. Without dates,
    // the server picks defaults but the detail panel cannot request rooms.
    const arrival = ci || new Date();
    if (!ci) arrival.setDate(arrival.getDate() + 1);
    const departure = co && co > arrival ? co : new Date(arrival);
    if (!co || co <= arrival) departure.setDate(departure.getDate() + (ci ? 1 : 6));
    setCheckIn(arrival);
    setCheckOut(departure);
    search({
      destination,
      checkIn: formatDateForApi(arrival),
      checkOut: formatDateForApi(departure),
      rooms: safeRooms,
      residency,
      // Filtros são aplicados aqui no navegador sobre o resultado da busca: mudar um filtro
      // não gera nova consulta à RateHawk (limite de 10 buscas/min por região).
      filters: {},
      testMode: isTestMode
    });
    // Scroll to results section after triggering the search
    requestAnimationFrame(() => {
      // Mira nos chips de filtro (logo acima dos resultados) para eles não ficarem cortados sob o topo fixo
      const el = (resultsRef.current?.previousElementSibling as HTMLElement | null) ?? resultsRef.current;
      if (el) {
        const top = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - 72);
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  };

  const handleFilterChange = (newFilters: HotelFilters) => {
    setFilters(newFilters);
  };

  const handleDestinationChange = (value: string) => {
    if (value === destination) return;
    setDestination(value);
    setHotelNameSearch("");
    setSelectedHotel(null);
    resetSearch();
    try { sessionStorage.removeItem(SEARCH_STATE_KEY); } catch {}
  };

  // Client-side filtering for instant feedback
  const filteredHotels = useMemo(() => {
    if (hotels.length === 0) return hotels;

    const filtered = hotels.filter((hotel) => {
      // Preço por noite (o mesmo valor exibido nos cards)
      if (filters.price_from != null && nightlyPrice(hotel) < filters.price_from) return false;
      if (filters.price_to != null && nightlyPrice(hotel) > filters.price_to) return false;
      if (filters.free_cancellation && !hotel.freeCancellation) return false;
      if (filters.star_rating?.length) {
        if (!filters.star_rating.includes(Math.floor(hotel.rating))) return false;
      }
      if (filters.kind?.length) {
        if (!filters.kind.some((k) => hotel.propertyType?.toLowerCase().includes(k.toLowerCase()))) return false;
      }
      if (filters.serp_filter?.length && !filters.serp_filter.every((id) => hotelHasAmenity(hotel, id))) return false;
      return true;
    });
    const normalize = (v: string) =>
      v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const nameQuery = normalize(hotelNameSearch);
    const byName = nameQuery
      ? filtered.filter((hotel) => normalize(hotel.name ?? "").includes(nameQuery))
      : filtered;
    return sortHotels(byName, sortMode);
  }, [hotels, filters, sortMode, hotelNameSearch]);


  const hasMapResults = useMemo(
    () => filteredHotels.some((hotel) => hotel.latitude != null && hotel.longitude != null),
    [filteredHotels]
  );

  useEffect(() => {
    setShowMap(hasMapResults);
  }, [hasMapResults]);

  // Celular: volta para a lista quando não há mais hotéis com coordenadas.
  useEffect(() => {
    if (!hasMapResults || hotels.length === 0) setMobileView("list");
  }, [hasMapResults, hotels.length]);

  // ---------- Novo visual: dados derivados para o topo e os estados ----------
  const activeFilterCount =
    (filters.star_rating?.length || 0) +
    (filters.kind?.length || 0) +
    (filters.serp_filter?.length || 0) +
    (filters.free_cancellation ? 1 : 0) +
    (filters.price_from != null || filters.price_to != null ? 1 : 0) +
    (sortMode !== "default" ? 1 : 0);

  const totalChildren = allChildren.length;
  const guestSummary = [
    `${safeRooms.length} quarto${safeRooms.length > 1 ? "s" : ""}`,
    `${totalAdults} adulto${totalAdults > 1 ? "s" : ""}`,
    ...(totalChildren > 0 ? [`${totalChildren} criança${totalChildren > 1 ? "s" : ""}`] : []),
  ].join(", ");
  const datesSummary =
    checkIn && checkOut
      ? `${format(checkIn, "d MMM", { locale: ptBR })} – ${format(checkOut, "d MMM", { locale: ptBR })}`
      : checkIn
        ? format(checkIn, "d MMM", { locale: ptBR })
        : "Datas";

  const mapAvailable = hotels.length > 0 && hasMapResults && HAS_MAPBOX;

  // Baixa o mapa (≈400 KB) em segundo plano assim que há resultados, para o botão "Mapa" abrir na hora.
  useEffect(() => {
    if (!mapAvailable) return;
    // react-map-gl só busca o mapbox-gl (o arquivo grande) ao montar o mapa, então pré-carregamos os dois.
    const load = () => {
      void import("@/components/hospedagem/HotelMap");
      void import("mapbox-gl");
    };
    const idle = (window as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
    if (idle) idle(load);
    else setTimeout(load, 1500);
  }, [mapAvailable]);

  // Celular: o mapa é montado escondido logo após os resultados (em momento ocioso) e fica montado,
  // então o botão "Mapa" só troca a visibilidade — abre na hora, sem recriar o mapa a cada toque.
  const [mobileMapMounted, setMobileMapMounted] = useState(false);
  useEffect(() => {
    if (!isMobile || !mapAvailable || isLoading || mobileMapMounted) return;
    const idle = (window as any).requestIdleCallback as ((cb: () => void, o?: object) => number) | undefined;
    const mount = () => setMobileMapMounted(true);
    const id = idle ? idle(mount, { timeout: 4000 }) : window.setTimeout(mount, 2000);
    return () => {
      const cancel = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
      if (idle && cancel) cancel(id);
      else window.clearTimeout(id);
    };
  }, [isMobile, mapAvailable, isLoading, mobileMapMounted]);
  const desktopMapVisible = !isMobile && showMap && mapAvailable;
  const mobileMapVisible = isMobile && mobileView === "map" && mapAvailable && !isLoading;
  const showMobileInlineSearch = hotels.length === 0 && !isLoading;
  const firstRealHotelIndex = filteredHotels.findIndex((item) => !item.isTestHotel);

  const handleBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };

  const renderMap = (mapClassName: string, wrapperClassName = "") => (
    <Suspense fallback={<div className={`${mapClassName} bg-muted animate-pulse`} />}>
      <HotelMap
        hotels={filteredHotels}
        destination={destination}
        destinationLabel={destinationLabel}
        onHotelClick={(hotel) => openHotel(hotel)}
        wrapperClassName={wrapperClassName}
        mapClassName={mapClassName}
        showTitle={false} />
    </Suspense>
  );

  const renderResults = () => {
    if (isLoading) return <SearchLoadingState />;
    if (error) {
      return (
        <div className="text-center py-16 md:py-20">
          <p className="text-destructive mb-2">{error}</p>
          <p className="text-muted-foreground text-sm">Tente ajustar sua busca</p>
        </div>
      );
    }
    if (hotels.length === 0) {
      return (
        <HospedagemIdle
          destinationLabel={selectedDestination.label}
          onPickDates={(from, to) => handleSearch(from, to)}
        />
      );
    }
    if (filteredHotels.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Nenhuma hospedagem encontrada com os filtros selecionados.</p>
          <p className="text-sm text-muted-foreground mt-1">Tente ajustar seus filtros</p>
        </div>
      );
    }
    const mobileMap = isMobile && mapAvailable && (mobileMapMounted || mobileMapVisible) ? (
      <div
        aria-hidden={!mobileMapVisible}
        inert={!mobileMapVisible ? ("" as any) : undefined}
        className={mobileMapVisible ? "" : "fixed inset-x-4 top-0 -z-10 opacity-0 pointer-events-none"}
      >
        {renderMap("rounded-2xl h-[calc(100dvh-250px)] min-h-[320px]")}
      </div>
    ) : null;
    return (
      <>
      {mobileMap}
      <ul className={`m-0 p-0 list-none flex flex-col gap-6 md:gap-4 ${mobileMapVisible ? "hidden" : ""}`}>
        {filteredHotels.map((hotel, index) => (
          <li key={hotel.id}>
            <HotelResultCard
              hotel={hotel}
              onOpen={() => openHotel(hotel)}
              isBestPrice={firstRealHotelIndex !== -1 && index === firstRealHotelIndex}
              priority={index < 2} />
          </li>
        ))}
      </ul>
      </>
    );
  };

  const floatingMapButton =
    isMobile && mapAvailable && !isLoading && filteredHotels.length > 0 && !selectedHotel ?
    <button
      type="button"
      onClick={() => {
        setMobileView((v) => (v === "map" ? "list" : "map"));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-[calc(78px+env(safe-area-inset-bottom))] z-40 h-11 px-5 rounded-full bg-[#222222] text-white text-sm font-semibold flex items-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,0.3)] font-jakarta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        {mobileView === "map" ?
      <>Lista<List className="h-4 w-4" aria-hidden="true" /></> :
      <>Mapa<MapIcon className="h-4 w-4" aria-hidden="true" /></>
      }
      </button> :
    null;

  return (
    <>
      <SEOHead
        title={`Hotéis em ${selectedDestination.label} — Reserva online | Bah Ofertas`}
        description={`Encontre hotéis, pousadas e chalés em ${selectedDestination.label}. Compare preços, veja avaliações e reserve com desconto no Bah Ofertas.`}
        canonical="/hospedagem"
        keywords={`hotéis ${selectedDestination.label}, hospedagem ${selectedDestination.label}, pousadas ${selectedDestination.label}`}
        city={selectedDestination.label}
        latitude={selectedDestination.center.lat}
        longitude={selectedDestination.center.lng}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
             name: `Hotéis em ${selectedDestination.label}`,
            url: "https://bahofertas.com/hospedagem",
             description: `Reserva online de hotéis em ${selectedDestination.label}.`,
          },
        ]}
      />

      <div className="min-h-screen bg-background font-jakarta text-foreground">
        {/* Celular: topo próprio (o cabeçalho global fica oculto nesta rota) */}
        <div className="md:hidden sticky top-0 z-40 bg-background">
          <div className={`${HOME_CONTAINER} flex items-center gap-2.5 pt-2.5 pb-2`}>
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar"
              className="w-11 h-11 shrink-0 rounded-full border border-[#dddddd] bg-background flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ChevronLeft className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setShowSearchSheet(true)}
              aria-label={`Alterar busca: ${selectedDestination.label}, ${datesSummary}, ${guestSummary}`}
              className="flex-1 min-w-0 h-11 rounded-full border border-[#dddddd] shadow-[0_2px_6px_rgba(0,0,0,0.06)] px-[18px] flex flex-col justify-center text-left leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="block truncate text-[13px] font-semibold text-foreground">{selectedDestination.label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{datesSummary} · {guestSummary}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              aria-label={activeFilterCount > 0 ? `Filtros (${activeFilterCount} ativos)` : "Filtros"}
              className="relative w-11 h-11 shrink-0 rounded-full border border-[#dddddd] bg-background flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
              {activeFilterCount > 0 &&
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-[18px] text-center" aria-hidden="true">
                  {activeFilterCount}
                </span>
              }
            </button>
          </div>
        </div>

        <div className={HOME_CONTAINER}>
          {/* Barra de busca: sempre no desktop; no celular só antes da primeira busca */}
          <div className={`pt-3 md:pt-6 ${showMobileInlineSearch ? "" : "hidden md:block"}`}>
            <HotelSearchBar
              destination={destination}
              setDestination={handleDestinationChange}
              checkIn={checkIn}
              setCheckIn={setCheckIn}
              checkOut={checkOut}
              setCheckOut={setCheckOut}
              rooms={safeRooms}
              setRooms={setRooms}
              residency={residency}
              setResidency={setResidency}
              onSearch={handleSearch}
              isLoading={isLoading} />
          </div>

          {/* Chips de filtro + "Ver no mapa" */}
          <HotelFilterChips
            className="mt-2 md:mt-5"
            filters={filters}
            onFilterChange={handleFilterChange}
            sortMode={sortMode}
            onSortChange={setSortMode}
            onOpenAllFilters={() => setShowMobileFilters(true)}
            trailing={mapAvailable ?
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              aria-pressed={showMap}
              className="relative inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-[#1f1f1f] bg-[#1f1f1f] px-4 text-sm font-semibold text-white transition-colors hover:bg-black before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  <MapIcon className="h-4 w-4" aria-hidden="true" />
                  {showMap ? "Ocultar mapa" : "Ver no mapa"}
                </button> :
            undefined
            } />

          {/* Resultados */}
          <section ref={resultsRef} className="pt-3 md:pt-5 pb-10 md:pb-14 scroll-mt-20" aria-labelledby="hospedagem-titulo">
            <div className="mb-4 md:mb-5">
              <h1 id="hospedagem-titulo" className="m-0 text-[17px] md:text-2xl font-bold text-foreground">
                Hotéis e pousadas em {selectedDestination.label}
              </h1>
              {(destinationLabel || isTestMode) &&
              <p className="m-0 mt-1 text-sm text-muted-foreground">
                  {filteredHotels.length > 0 ?
                <>
                      <strong className="font-semibold text-foreground">{filteredHotels.length} {filteredHotels.length === 1 ? 'hospedagem' : 'hospedagens'}</strong>
                      <span> {filteredHotels.length === 1 ? 'encontrada' : 'encontradas'} ao redor de </span>
                    </> :
                'Resultados para: '}
                  <strong className="font-semibold text-foreground">{isTestMode ? 'Hotel de Teste (Certificação)' : destinationLabel}</strong>
                </p>
              }
              {isTestMode &&
              <Badge variant="outline" className="mt-2 border-amber-500 text-amber-700 bg-amber-500/10">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  Modo de Teste — Hotel de certificação carregado
                </Badge>
              }
            </div>

            {/* Busca pelo nome da hospedagem */}
            {hotels.length > 0 &&
            <div className="mb-5">
                <div className="relative w-full md:max-w-md">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                  type="text"
                  aria-label={`Buscar hospedagem pelo nome em ${destinationLabel || selectedDestination.label}`}
                  value={hotelNameSearch}
                  onChange={(e) => setHotelNameSearch(e.target.value)}
                  placeholder={`Buscar hospedagem pelo nome em ${destinationLabel || selectedDestination.label}…`}
                  className="w-full h-11 pl-10 pr-11 rounded-full bg-background border border-[#dddddd] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors" />

                  {hotelNameSearch &&
                <button
                  type="button"
                  onClick={() => setHotelNameSearch("")}
                  aria-label="Limpar busca"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                }
                </div>
                {hotelNameSearch.trim() !== "" && filteredHotels.length === 0 &&
              <p className="mt-2 text-sm text-muted-foreground">
                    Nenhuma hospedagem encontrada para “{hotelNameSearch.trim()}”.
                  </p>
              }
              </div>
            }

            {/* Mapa acima da lista em telas médias (sem espaço para a coluna lateral) */}
            {desktopMapVisible && !isXl && !isLoading && renderMap("rounded-2xl h-[360px]", "mb-5")}

            <div className="flex items-start gap-6">
              <div className="min-w-0 flex-1">{renderResults()}</div>
              {desktopMapVisible && isXl && !isLoading &&
              <aside className="w-[420px] shrink-0 sticky top-4" aria-label="Mapa das hospedagens">
                  {renderMap("rounded-2xl h-[calc(100vh-32px)] max-h-[760px]")}
                </aside>
              }
            </div>
          </section>
        </div>

        {/* Celular: editar a busca (destino, datas, hóspedes, nacionalidade) */}
        <Sheet open={showSearchSheet} onOpenChange={setShowSearchSheet}>
          <SheetContent side="bottom" className="max-h-[90vh] rounded-t-2xl flex flex-col p-4 overflow-hidden font-jakarta">
            <SheetHeader className="shrink-0 text-left">
              <SheetTitle>Alterar busca</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mt-3 pb-4">
              <HotelSearchBar
                destination={destination}
                setDestination={handleDestinationChange}
                checkIn={checkIn}
                setCheckIn={setCheckIn}
                checkOut={checkOut}
                setCheckOut={setCheckOut}
                rooms={safeRooms}
                setRooms={setRooms}
                residency={residency}
                setResidency={setResidency}
                onSearch={() => {
                  setShowSearchSheet(false);
                  handleSearch();
                }}
                isLoading={isLoading} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Painel completo de filtros (embaixo no celular, à direita no desktop) */}
        <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          <SheetContent
            side={isMobile ? "bottom" : "right"}
            className={isMobile ?
            "h-[88dvh] rounded-t-3xl flex flex-col p-0 pt-5 gap-0 overflow-hidden font-jakarta" :
            "w-full sm:max-w-[440px] flex flex-col p-0 pt-6 gap-0 overflow-hidden font-jakarta"}>
            <SheetHeader className="sr-only">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <HotelFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              hotels={hotels}
              resultCount={filteredHotels.length}
              sortMode={sortMode}
              onSortChange={setSortMode}
              onDone={() => setShowMobileFilters(false)} />
          </SheetContent>
        </Sheet>

        <Footer />
        <HomeBottomNav />
      </div>

      {floatingMapButton && (typeof document !== "undefined" ? createPortal(floatingMapButton, document.body) : floatingMapButton)}

      {selectedHotel &&
      <Suspense fallback={
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <span className="text-sm text-white/80">Carregando hotel…</span>
          </div>
        </div>
      }>
        <HotelDetailModal
          hotel={selectedHotel}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={totalAdults}
          children={allChildren}
          roomGuests={safeRooms}
          onClose={() => setSelectedHotel(null)}
          searchResults={hotels}
          destinationLabel={destinationLabel}
          destination={destination} />
      </Suspense>
      }
    </>);

};

export default Hospedagem;
