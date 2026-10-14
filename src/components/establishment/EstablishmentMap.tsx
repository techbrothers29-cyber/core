import { useRef } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair, Navigation } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const INITIAL_ZOOM = 15;
const INITIAL_PITCH = 0;
const INITIAL_BEARING = 0;

interface Props {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export default function EstablishmentMap({ name, latitude, longitude, address }: Props) {
  const mapRef = useRef<MapRef>(null);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-[180px] lg:h-[220px] bg-muted flex items-center justify-center rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">Mapa indisponível</p>
      </div>
    );
  }

  const handleRecenter = () => {
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      duration: 800,
    });
  };

  const handleNavigate = () => {
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const addressQuery = (address || name)?.trim();
    // Use the exact address as destination (with coords as fallback hint), so the
    // navigation app routes the user to the establishment's real street address.
    const destinationGoogle = addressQuery
      ? `${encodeURIComponent(addressQuery)}`
      : `${latitude},${longitude}`;
    const destinationApple = addressQuery
      ? encodeURIComponent(addressQuery)
      : `${latitude},${longitude}`;
    const url = isIOS
      ? `https://maps.apple.com/?daddr=${destinationApple}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${destinationGoogle}&destination_place_id=&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleStyleLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    map.stop();
    map.jumpTo({
      center: [longitude, latitude],
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
    });
    map.resize();

    try {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.touchPitch.enable();
      map.dragRotate.enable();
      map.keyboard.enable();
    } catch {
      // Ignore se algum handler não estiver disponível
    }

    try {
      map.setFog({
        color: "rgb(255,255,255)",
        "high-color": "rgb(255,255,255)",
        "horizon-blend": 0.02,
      });
    } catch {
      // setFog may not be available on all styles; ignore.
    }

    const canvas = map.getCanvas();
    const canvasContainer = map.getCanvasContainer();
    const resetCursor = () => {
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvasContainer.style.touchAction = "none";

    map.on("mousedown", () => {
      canvas.style.cursor = "grabbing";
    });
    map.on("touchstart", () => {
      canvas.style.cursor = "grabbing";
    });
    map.on("mouseup", resetCursor);
    map.on("touchend", resetCursor);
    map.on("touchcancel", resetCursor);
    map.on("dragend", resetCursor);
    map.on("pitchend", resetCursor);
    map.on("rotateend", resetCursor);
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border shadow-sm h-[180px] lg:h-[220px] w-full select-none"
      style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      data-map-gesture-zone="true"
    >
      <Map
        key={`${latitude}:${longitude}`}
        ref={mapRef}
        initialViewState={{
          latitude,
          longitude,
          zoom: INITIAL_ZOOM,
          pitch: INITIAL_PITCH,
          bearing: INITIAL_BEARING,
        }}
        minZoom={3}
        maxZoom={20}
        maxPitch={75}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        scrollZoom
        doubleClickZoom
        dragPan
        dragRotate
        touchZoomRotate={{ around: "center" }}
        touchPitch
        pitchWithRotate
        cooperativeGestures={false}
        onLoad={handleStyleLoad}
      >
        <NavigationControl position="top-right" showCompass={false} visualizePitch />
        <Marker latitude={latitude} longitude={longitude} anchor="bottom">
          <div
            className="px-3 py-1.5 rounded-full bg-background text-foreground text-[12px] font-semibold border border-border shadow-md max-w-[180px] truncate transition-transform hover:scale-110 cursor-pointer"
            title={name}
          >
            {name}
          </div>
        </Marker>
      </Map>

      <button
        type="button"
        onClick={handleRecenter}
        aria-label="Voltar para a localização do estabelecimento"
        title="Voltar para a localização"
        className="absolute right-[10px] top-[82px] z-10 h-[29px] w-[29px] flex items-center justify-center rounded-[4px] bg-background border border-border/60 shadow-sm hover:bg-accent transition-colors"
      >
        <Crosshair className="h-4 w-4 text-foreground" strokeWidth={2} />
      </button>

      <button
        type="button"
        onClick={handleNavigate}
        aria-label="Iniciar navegação até o estabelecimento"
        title="Navegar até aqui"
        className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:opacity-90 active:scale-95 transition"
      >
        <Navigation className="h-3.5 w-3.5" strokeWidth={2.5} />
        Navegar
      </button>
    </div>
  );
}
