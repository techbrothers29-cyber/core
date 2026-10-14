import React, { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Marker, type MapRef, type MarkerDragEvent, type MapMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';
const MAX_ZOOM = 18;

interface AddressMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

/**
 * Mapa interativo para calibração fina da localização.
 * Usa o mesmo estilo visual do mapa de hospedagens (streets-v12, rounded-xl).
 * O admin pode arrastar o pino ou clicar no mapa para ajustar a posição exata.
 */
export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
  latitude,
  longitude,
  onChange,
}) => {
  const mapRef = useRef<MapRef>(null);
  const [pinPos, setPinPos] = useState({ lat: latitude, lng: longitude });

  // Sync incoming coords (e.g., after a search selection) and recenter the map
  useEffect(() => {
    if (
      Math.abs(pinPos.lat - latitude) < 1e-7 &&
      Math.abs(pinPos.lng - longitude) < 1e-7
    ) {
      return;
    }
    setPinPos({ lat: latitude, lng: longitude });
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  const handleMarkerDragEnd = useCallback(
    (e: MarkerDragEvent) => {
      const { lng, lat } = e.lngLat;
      setPinPos({ lat, lng });
      onChange(lat, lng);
    },
    [onChange]
  );

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      setPinPos({ lat, lng });
      onChange(lat, lng);
    },
    [onChange]
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-[180px] lg:h-[220px] bg-muted flex items-center justify-center rounded-xl border border-border">
        <p className="text-xs text-muted-foreground">Mapa indisponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative rounded-xl overflow-hidden border border-border shadow-sm h-[180px] lg:h-[220px]">
        <Map
          ref={mapRef}
          initialViewState={{
            latitude,
            longitude,
            zoom: 16,
          }}
          maxZoom={MAX_ZOOM}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          mapboxAccessToken={MAPBOX_TOKEN}
          attributionControl={false}
          onClick={handleMapClick}
          cursor="crosshair"
        >
          <Marker
            latitude={pinPos.lat}
            longitude={pinPos.lng}
            anchor="bottom"
            draggable
            onDragEnd={handleMarkerDragEnd}
          >
            <MapPin
              className="h-8 w-8 text-primary fill-primary drop-shadow-lg cursor-grab active:cursor-grabbing"
              strokeWidth={1.5}
            />
          </Marker>
        </Map>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Arraste o pino ou clique no mapa para ajustar a posição exata.
      </p>
    </div>
  );
};
