import { lazy, Suspense, useEffect, useMemo } from "react";
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

  if (!data) return null;

  const rooms = Array.isArray(data.rooms) && data.rooms.length > 0 ? data.rooms : null;
  const roomGuests: HotelRoomGuests[] = rooms ?? (
    typeof data.adults === "number"
      ? [{ adults: data.adults, children: Array.isArray(data.children) ? data.children : [] }]
      : DEFAULT_ROOMS
  );
  const adults = roomGuests.reduce((sum, r) => sum + (r.adults || 0), 0);
  const children = roomGuests.flatMap((r) => r.children || []);

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
      <div className="sm:px-6 pb-10">
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
            onClose={() => navigate("/hospedagem")}
            searchResults={data.searchResults}
            destinationLabel={data.destinationLabel}
            destination={data.destination}
          />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
};

export default HospedagemHotel;
