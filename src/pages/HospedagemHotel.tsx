import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";
import { loadHotelSearchState, type HotelPageState, type HotelRoomGuests } from "@/lib/hotel-page";

const HotelDetailModal = lazy(() => import("@/components/hospedagem/HotelDetailModal"));

const DEFAULT_ROOMS: HotelRoomGuests[] = [{ adults: 2, children: [] }];

/**
 * Página própria de cada hospedagem aberta a partir da busca.
 * Usa exatamente o mesmo conteúdo e fluxo de reserva do antigo pop-up
 * (HotelDetailModal em modo página): quartos, tarifas, políticas e checkout.
 * Os dados da busca chegam pela navegação; ao recarregar, vêm da última busca salva.
 */
const HospedagemHotel = () => {
  const { hotelId = "" } = useParams<{ hotelId: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const data = useMemo<HotelPageState | null>(() => {
    const nav = location.state as HotelPageState | null;
    const saved = loadHotelSearchState();
    const id = decodeURIComponent(hotelId);
    const hotel =
      (nav?.hotel && String(nav.hotel.id) === id ? nav.hotel : null) ||
      saved?.searchResults?.find((h: any) => String(h?.id) === id) ||
      null;
    if (!hotel) return null;
    return {
      hotel,
      checkIn: nav?.checkIn ?? saved?.checkIn,
      checkOut: nav?.checkOut ?? saved?.checkOut,
      rooms: nav?.rooms ?? saved?.rooms,
      adults: nav?.adults,
      children: nav?.children,
      searchResults: nav?.searchResults ?? saved?.searchResults,
      destinationLabel: nav?.destinationLabel ?? saved?.destinationLabel,
      destination: nav?.destination ?? saved?.destination,
    };
  }, [hotelId, location.state]);

  // Sem dados da busca não há como mostrar quartos e preços: volta para a busca.
  useEffect(() => {
    if (!data) navigate("/hospedagem", { replace: true });
  }, [data, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hotelId]);

  // Barra fixa no celular ("Ver quartos") some quando a área de quartos já está na tela.
  const [bookingVisible, setBookingVisible] = useState(false);
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let tries = 0;
    const attach = () => {
      const el = document.getElementById("hotel-booking");
      if (!el) {
        if (tries++ < 40) timer = window.setTimeout(attach, 250);
        return;
      }
      observer = new IntersectionObserver(([entry]) => setBookingVisible(entry.isIntersecting), { threshold: 0.05 });
      observer.observe(el);
    };
    let timer = window.setTimeout(attach, 0);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [hotelId]);

  if (!data) return null;

  const rooms = Array.isArray(data.rooms) && data.rooms.length > 0 ? data.rooms : null;
  const roomGuests: HotelRoomGuests[] = rooms ?? (
    typeof data.adults === "number"
      ? [{ adults: data.adults, children: Array.isArray(data.children) ? data.children : [] }]
      : DEFAULT_ROOMS
  );
  const adults = roomGuests.reduce((sum, r) => sum + (r.adults || 0), 0);
  const children = roomGuests.flatMap((r) => r.children || []);
  const nightly = Number(data.hotel.pricePerNight || data.hotel.price || 0);
  const nightlyLabel = nightly > 0 && !data.hotel.priceUnavailable
    ? nightly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;
  const scrollToRooms = () =>
    document.getElementById("hotel-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const mobileBar = (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#ebebeb] bg-background px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 font-jakarta transition-transform duration-200 ${
        bookingVisible ? "translate-y-full" : "translate-y-0"
      }`}
      aria-hidden={bookingVisible}
    >
      <div className="min-w-0 leading-tight">
        {nightlyLabel ? (
          <>
            <span className="block text-xs text-muted-foreground">a partir de</span>
            <b className="text-lg font-bold text-foreground">{nightlyLabel}</b>
            <span className="text-xs text-muted-foreground"> / noite</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Veja os quartos disponíveis</span>
        )}
      </div>
      <button
        type="button"
        onClick={scrollToRooms}
        tabIndex={bookingVisible ? -1 : 0}
        className="h-12 shrink-0 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground"
      >
        Ver quartos
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2">
        <button
          type="button"
          onClick={() => navigate("/hospedagem")}
          className="inline-flex items-center gap-1 min-h-[44px] pr-3 text-sm font-semibold text-foreground hover:underline"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          Voltar aos resultados
        </button>
      </div>
      <div className="sm:px-6 pb-28 md:pb-10">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              Carregando hospedagem…
            </div>
          }
        >
          <HotelDetailModal
            asPage
            hotel={data.hotel}
            checkIn={data.checkIn ? new Date(data.checkIn) : undefined}
            checkOut={data.checkOut ? new Date(data.checkOut) : undefined}
            adults={adults}
            children={children}
            roomGuests={roomGuests}
            onClose={() => navigate("/hospedagem", { state: { openSearch: true } })}
            searchResults={data.searchResults}
            destinationLabel={data.destinationLabel}
            destination={data.destination}
          />
        </Suspense>
      </div>
      <Footer />
      {typeof document !== "undefined" ? createPortal(mobileBar, document.body) : mobileBar}
    </div>
  );
};

export default HospedagemHotel;
