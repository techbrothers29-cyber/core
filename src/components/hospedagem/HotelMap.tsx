import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Star } from "lucide-react";
import type { Hotel } from "@/pages/Hospedagem";
import { HOTEL_DESTINATIONS } from "@/data/hotel-destinations";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const MAX_ZOOM = 17;
const MAX_MAP_MARKERS = 120;
const MAP_DRAG_PAN_OPTIONS = {
  linearity: 0.18,
  maxSpeed: 1800,
  deceleration: 2600,
};

interface HotelMapProps {
  hotels: Hotel[];
  destination: string;
  destinationLabel: string;
  onHotelClick: (hotel: Hotel) => void;
  /** Classes do bloco externo (padrão: "mb-4"). */
  wrapperClassName?: string;
  /** Altura/forma da caixa do mapa (padrão: 180px no celular, 220px no desktop). */
  mapClassName?: string;
  /** Mostra o título "Explore ... no Mapa" acima do mapa (padrão: sim). */
  showTitle?: boolean;
}

const PricePin = memo(({ price, isTest, isSelected }: { price: number; isTest?: boolean; isSelected?: boolean }) => (
  <div
    className={`
      px-2 py-1 rounded-lg shadow-md text-xs font-bold whitespace-nowrap cursor-pointer
      hover:scale-110
      ${isSelected
        ? "bg-foreground text-background scale-110 ring-2 ring-primary"
        : isTest
          ? "bg-amber-500 text-white"
          : "bg-primary text-primary-foreground"
      }
    `}
  >
    {price > 0 ? `R$ ${Math.round(price)}` : "Consultar"}
  </div>
));

PricePin.displayName = "PricePin";

const HotelPopupCard = memo(({ hotel, onViewDetails }: { hotel: Hotel; onViewDetails: () => void }) => (
  <div
    className="flex overflow-hidden cursor-pointer w-[260px]"
    onClick={onViewDetails}
  >
    <div className="w-24 h-24 flex-shrink-0">
      <img
        src={hotel.image}
        alt={hotel.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <div className="flex flex-col justify-center gap-0.5 p-2.5 min-w-0 flex-1">
      <h4 className="text-[13px] font-semibold text-foreground truncate leading-tight">{hotel.name}</h4>
      <div className="flex items-center gap-1">
        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
        <span className="text-xs font-medium text-foreground">{hotel.rating || "–"}</span>
        {hotel.reviewCount > 0 && (
          <span className="text-[11px] text-muted-foreground">({hotel.reviewCount.toLocaleString("pt-BR")})</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground truncate">{hotel.propertyType}</p>
      <p className="text-[13px] font-bold text-foreground mt-0.5">
        {hotel.price > 0
          ? `R$ ${Math.round(hotel.pricePerNight || hotel.price)}`
          : "Consultar"}
        {hotel.price > 0 && <span className="text-[10px] font-normal text-muted-foreground"> /noite</span>}
      </p>
    </div>
  </div>
));

HotelPopupCard.displayName = "HotelPopupCard";

const HotelMarker = memo(({
  hotel,
  isSelected,
  onSelect,
}: {
  hotel: Hotel;
  isSelected: boolean;
  onSelect: (hotel: Hotel) => void;
}) => (
  <Marker
    latitude={hotel.latitude!}
    longitude={hotel.longitude!}
    anchor="bottom"
    onClick={(e: any) => {
      // Stop the click from reaching the map (which clears the selection)
      e?.originalEvent?.stopPropagation?.();
      onSelect(hotel);
    }}
  >
    <PricePin
      price={hotel.pricePerNight || hotel.price}
      isTest={hotel.isTestHotel}
      isSelected={isSelected}
    />
  </Marker>
));

HotelMarker.displayName = "HotelMarker";

const HotelMap = ({
  hotels,
  destination,
  destinationLabel,
  onHotelClick,
  wrapperClassName = "mb-4",
  mapClassName = "rounded-xl h-[180px] lg:h-[220px]",
  showTitle = true,
}: HotelMapProps) => {
  const mapRef = useRef<MapRef>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const initialFitDone = useRef(false);

  const hotelsWithCoords = useMemo(
    () => hotels
      .filter((h) =>
        h.latitude != null && h.longitude != null &&
        Number.isFinite(h.latitude) && Number.isFinite(h.longitude) &&
        Math.abs(h.latitude) <= 90 && Math.abs(h.longitude) <= 180
      )
      .slice(0, MAX_MAP_MARKERS),
    [hotels]
  );

  const center = useMemo(() => {

    if (hotelsWithCoords.length > 0) {
      const avgLat = hotelsWithCoords.reduce((s, h) => s + (h.latitude || 0), 0) / hotelsWithCoords.length;
      const avgLng = hotelsWithCoords.reduce((s, h) => s + (h.longitude || 0), 0) / hotelsWithCoords.length;
      return { lat: avgLat, lng: avgLng };
    }
    return HOTEL_DESTINATIONS.find((item) => item.value === destination)?.center || HOTEL_DESTINATIONS[0].center;
  }, [destination, hotelsWithCoords]);

  const initialBounds = useMemo(() => {
    if (hotelsWithCoords.length < 2) return undefined;
    const lngs = hotelsWithCoords.map((hotel) => hotel.longitude as number);
    const lats = hotelsWithCoords.map((hotel) => hotel.latitude as number);
    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ] as [[number, number], [number, number]];
  }, [hotelsWithCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || hotelsWithCoords.length === 0) return;
    if (!initialFitDone.current) {
      initialFitDone.current = true;
      return;
    }
    setSelectedHotel(null);

    if (hotelsWithCoords.length === 1) {
      map.flyTo({
        center: [hotelsWithCoords[0].longitude!, hotelsWithCoords[0].latitude!],
        zoom: 14,
        duration: 0,
        essential: true,
      });
      return;
    }

    const lngs = hotelsWithCoords.map((h) => h.longitude!);
    const lats = hotelsWithCoords.map((h) => h.latitude!);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 40, maxZoom: 15, duration: 0, essential: true } as any
    );
  }, [hotelsWithCoords, isReady]);


  // 1º toque mostra o cartão do hotel; tocar no cartão abre a página (evita abrir o hotel errado num toque impreciso).
  const handleMarkerSelect = useCallback((hotel: Hotel) => setSelectedHotel(hotel), []);


  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.resize();
    try {
      map.dragRotate.disable();
      map.touchPitch.disable();
      map.touchZoomRotate.enable();
      map.touchZoomRotate.disableRotation();
      map.dragPan.enable();
      map.scrollZoom.enable();
    } catch {
      // ignore
    }

    const canvas = map.getCanvas();
    const canvasContainer = map.getCanvasContainer();
    canvas.style.touchAction = "none";
    canvas.style.willChange = "transform";
    canvasContainer.style.touchAction = "none";
    (canvasContainer.style as any).webkitUserSelect = "none";
    (canvasContainer.style as any).webkitTouchCallout = "none";

    setIsReady(true);
  }, []);

  // Graceful fallback: if mapbox fails (WebGL unavailable, token/network error),
  // hide the map instead of leaving the skeleton pulsing forever or crashing the page.
  const handleMapError = useCallback((event: any) => {
    console.warn("[HotelMap] map error:", event?.error?.message || event);
    setMapFailed(true);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedHotel(null);
  }, []);


  if (!MAPBOX_TOKEN || hotelsWithCoords.length === 0 || mapFailed) return null;

  return (
    <div className={wrapperClassName}>
      {showTitle && (
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Explore {destinationLabel || "a região"} no Mapa
          </h3>
        </div>
      )}
      <div
        className={`relative overflow-hidden border border-border shadow-sm w-full select-none bg-muted/40 ${mapClassName}`}
        style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        data-map-gesture-zone="true"
      >
        {!isReady && (
          <div className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-muted/60 via-muted/30 to-muted/60" />
        )}
        <div
          className="absolute inset-0"
        >
        <Map
          ref={mapRef}

          initialViewState={{
            latitude: center.lat,
            longitude: center.lng,
            zoom: 14,
            bounds: initialBounds,
            fitBoundsOptions: { padding: 40, maxZoom: 15 },
          }}
          maxZoom={MAX_ZOOM}
          style={{ width: "100%", height: "100%" }}
          mapStyle={MAP_STYLE}
          mapboxAccessToken={MAPBOX_TOKEN}
          attributionControl={false}
          reuseMaps
          cooperativeGestures={false}
          dragPan={MAP_DRAG_PAN_OPTIONS}
          dragRotate={false}
          touchPitch={false}
          touchZoomRotate={{ around: "center" }}
          scrollZoom={true}
          pitchWithRotate={false}
          onLoad={handleMapLoad}
          onError={handleMapError}
          onClick={handleMapClick}
        >
          {hotelsWithCoords.map((hotel) => (
            <HotelMarker
              key={hotel.id}
              hotel={hotel}
              isSelected={selectedHotel?.id === hotel.id}
              onSelect={handleMarkerSelect}
            />
          ))}

          {selectedHotel && (
            <Popup
              latitude={selectedHotel.latitude!}
              longitude={selectedHotel.longitude!}
              anchor="bottom"
              offset={[0, -32] as any}
              closeButton={false}
              closeOnClick={false}
              className="hotel-map-popup"
            >
              <HotelPopupCard
                hotel={selectedHotel}
                onViewDetails={() => {
                  onHotelClick(selectedHotel);
                  setSelectedHotel(null);
                }}
              />
            </Popup>
          )}
        </Map>
        </div>
      </div>
    </div>

  );
};

export default HotelMap;
