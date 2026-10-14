import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import SEOHead from "@/components/SEOHead";
import CategoryNav from "@/components/CategoryNav";
import Footer from "@/components/Footer";
import HotelSearchBar from "@/components/hospedagem/HotelSearchBar";
import type { RoomGuests } from "@/components/hospedagem/HotelSearchBar";
import HotelFilters from "@/components/hospedagem/HotelFilters";
import HotelCard from "@/components/hospedagem/HotelCard";
import HotelCardCompact from "@/components/hospedagem/HotelCardCompact";
import MobileFilterChips, { SortMode, sortHotels } from "@/components/hospedagem/MobileFilterChips";
import SearchLoadingState from "@/components/hospedagem/SearchLoadingState";
import heroImage from "@/assets/hospedagem-hero.jpg";
import { useHotelSearch } from "@/hooks/useHotelSearch";
import { HOTEL_DESTINATIONS } from "@/data/hotel-destinations";

import { formatDateForApi } from "@/lib/date";
import { useMemo } from "react";
import { Loader2, Building2, MapPin, FlaskConical, Star, TreePine, Plane, Hotel as HotelIcon, Luggage, Search as SearchIcon, X } from "lucide-react";
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

  const { hotels, setHotels, isLoading, error, search, destinationLabel, setDestinationLabel, resetSearch } = useHotelSearch();
  const selectedDestination = HOTEL_DESTINATIONS.find((item) => item.value === destination) || HOTEL_DESTINATIONS[0];

  // Restore state: first from navigation state (checkout back), then from sessionStorage (category nav)
  useEffect(() => {
    const navState = location.state as any;
    if (navState?.hotel) {
      setSelectedHotel(navState.hotel);
    }

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
    }

    if (navState) {
      window.history.replaceState({}, document.title);
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
        checkOut: checkOut?.toISOString()
      });
    }
  }, [hotels, destinationLabel, destination, checkIn, checkOut]);

  // Normalize room payload to avoid runtime crashes from stale/non-array state
  const safeRooms = Array.isArray(rooms) ? rooms : [{ adults: 2, children: [] }];

  // Compute totals for passing to detail modal
  const totalAdults = safeRooms.reduce((sum, r) => sum + r.adults, 0);
  const allChildren = safeRooms.flatMap((r) => r.children);

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

  const handleSearch = () => {
    setHotelNameSearch("");
    // Start downloading the map while the hotel search is in flight.
    void import("@/components/hospedagem/HotelMap");
    // Use the same visible dates for search and availability. Without dates,
    // the server picks defaults but the detail panel cannot request rooms.
    const arrival = checkIn || new Date();
    if (!checkIn) arrival.setDate(arrival.getDate() + 1);
    const departure = checkOut && checkOut > arrival ? checkOut : new Date(arrival);
    if (!checkOut || checkOut <= arrival) departure.setDate(departure.getDate() + (checkIn ? 1 : 6));
    setCheckIn(arrival);
    setCheckOut(departure);
    search({
      destination,
      checkIn: formatDateForApi(arrival),
      checkOut: formatDateForApi(departure),
      rooms: safeRooms,
      residency,
      filters,
      testMode: isTestMode
    });
    // Scroll to results section after triggering the search
    requestAnimationFrame(() => {
      const el = resultsRef.current;
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
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

    // Map serp_filter ids → keywords found in hotel.amenities (PT/EN)
    const amenityKeywords: Record<string, string[]> = {
      has_breakfast: ['café da manhã', 'breakfast'],
      has_internet: ['wi-fi', 'wifi', 'internet'],
      has_parking: ['estacionamento', 'parking'],
      air_conditioning: ['ar-condicionado', 'ar condicionado', 'air condition'],
    };

    const filtered = hotels.filter((hotel) => {
      if (filters.price_from != null && hotel.price < filters.price_from) return false;
      if (filters.price_to != null && hotel.price > filters.price_to) return false;
      if (filters.star_rating?.length) {
        if (!filters.star_rating.includes(Math.floor(hotel.rating))) return false;
      }
      if (filters.kind?.length) {
        if (!filters.kind.some((k) => hotel.propertyType?.toLowerCase().includes(k.toLowerCase()))) return false;
      }
      if (filters.serp_filter?.length) {
        const amenitiesLower = (hotel.amenities || []).map((a) => String(a).toLowerCase());
        const matchesAll = filters.serp_filter.every((id) => {
          const keywords = amenityKeywords[id] || [];
          return keywords.some((kw) => amenitiesLower.some((a) => a.includes(kw)));
        });
        if (!matchesAll) return false;
      }
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

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }} />
          <div className="absolute inset-0 bg-black/60" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-8 animate-[fadeInUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both]">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
                 Hospedagens no Sul do Brasil
              </h1>
              <p className="text-white/80 text-lg max-w-xl mx-auto">
                Encontre hotéis, pousadas e chalés com preços exclusivos
              </p>
              {isTestMode &&
              <Badge variant="outline" className="mt-3 border-amber-400 text-amber-300 bg-amber-500/10">
                  <FlaskConical className="h-3 w-3 mr-1" />
                  Modo de Teste — Hotel de certificação carregado
                </Badge>
              }
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <div className="container mx-auto px-4 relative z-20 -mt-8 animate-[fadeInUp_0.6s_cubic-bezier(0.22,1,0.36,1)_both] [animation-delay:0.08s]">
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

        {/* Results */}
        <section ref={resultsRef} className="container mx-auto px-4 py-8 scroll-mt-20">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Desktop sidebar filters — hidden on mobile via CSS */}
            <aside className="hidden lg:block w-full lg:w-72 flex-shrink-0">
              <HotelFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onApplyFilters={handleSearch} />

            </aside>

            <main className="flex-1">
              {(destinationLabel || isTestMode) &&
              <div className="mb-4 flex items-start gap-2.5 border-l-2 border-primary bg-primary/5 px-3 py-2.5 text-sm md:items-center md:bg-transparent md:px-0 md:py-0">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary md:mt-0" />
                  <span className="min-w-0 leading-snug text-muted-foreground">
                    {filteredHotels.length > 0 ?
                    <>
                        <strong className="font-semibold text-foreground">{filteredHotels.length} hospedagens</strong>
                        <span> encontradas ao redor de </span>
                      </> :
                    'Resultados para: '}
                    <strong className="font-semibold text-foreground">{isTestMode ? 'Hotel de Teste (Certificação)' : destinationLabel}</strong>
                </span>
              </div>
              }

              {/* Search by hotel name */}
              {hotels.length > 0 &&
              <div className="mb-4">
                <div className="relative w-full md:max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    aria-label={`Buscar hospedagem pelo nome em ${destinationLabel || selectedDestination.label}`}
                    value={hotelNameSearch}
                    onChange={(e) => setHotelNameSearch(e.target.value)}
                    placeholder={`Buscar hospedagem pelo nome em ${destinationLabel || selectedDestination.label}…`}
                    className="w-full h-11 pl-9 pr-9 rounded-lg bg-card border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors"
                  />
                  {hotelNameSearch && (
                    <button
                      type="button"
                      onClick={() => setHotelNameSearch("")}
                      aria-label="Limpar busca"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {hotelNameSearch.trim() !== "" && filteredHotels.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhuma hospedagem encontrada para “{hotelNameSearch.trim()}”.
                  </p>
                )}
              </div>
              }


              {/* Mobile filter chips — visible only on mobile */}
              {hotels.length > 0 &&
              <div className="lg:hidden">
                  <MobileFilterChips
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onOpenFilters={() => setShowMobileFilters(true)}
                  sortMode={sortMode}
                  onSortChange={setSortMode} />

                </div>
              }

              {/* Map — both mobile and desktop */}
              {hotels.length > 0 && showMap && hasMapResults &&
              <Suspense fallback={<div className="h-[180px] lg:h-[220px] rounded-lg bg-muted animate-pulse mb-4" />}>
                  <HotelMap
                    hotels={filteredHotels}
                    destination={destination}
                    destinationLabel={destinationLabel}
                    onHotelClick={(hotel) => setSelectedHotel(hotel)} />
                </Suspense>
              }

              {isLoading ?
              <SearchLoadingState /> :
              error ?
              <div className="text-center py-20">
                  <p className="text-destructive mb-2">{error}</p>
                  <p className="text-muted-foreground text-sm">Tente ajustar sua busca</p>
                </div> :
              hotels.length === 0 ?
              <div className="py-12" /> :
              filteredHotels.length === 0 ?
              <div className="text-center py-16">
                  <p className="text-muted-foreground">Nenhuma hospedagem encontrada com os filtros selecionados.</p>
                  <p className="text-sm text-muted-foreground mt-1">Tente ajustar seus filtros</p>
                </div> :

              <>
                  {/* Desktop: standard grid with full cards */}
                  <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-6 fluid-stagger">
                    {filteredHotels.map((hotel, index) => {
                    const firstRealHotelIndex = filteredHotels.findIndex((item) => !item.isTestHotel);
                    return (
                      <HotelCard
                        key={hotel.id}
                        hotel={hotel}
                        onClick={() => setSelectedHotel(hotel)}
                        isBestPrice={firstRealHotelIndex !== -1 && index === firstRealHotelIndex} />);


                  })}
                  </div>
                  {/* Mobile: 2-col compact cards */}
                  <div className="grid grid-cols-2 gap-3 mt-3 md:hidden fluid-stagger">
                    {filteredHotels.map((hotel, index) => {
                    const firstRealHotelIndex = filteredHotels.findIndex((item) => !item.isTestHotel);
                    return (
                      <HotelCardCompact
                        key={hotel.id}
                        hotel={hotel}
                        onClick={() => setSelectedHotel(hotel)}
                        isBestPrice={firstRealHotelIndex !== -1 && index === firstRealHotelIndex} />);


                  })}
                  </div>
                </>
              }
            </main>
          </div>
        </section>

        {/* Mobile filters sheet */}
        <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col p-4 overflow-hidden">
            <SheetHeader className="shrink-0">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain mt-4 pb-8"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
            >
              <HotelFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                sortMode={sortMode}
                onSortChange={setSortMode}
                onApplyFilters={() => {
                  handleSearch();
                  setShowMobileFilters(false);
                }} />

            </div>
          </SheetContent>
        </Sheet>

        <Footer />
        <CategoryNav />
      </div>

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
