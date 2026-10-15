import React, { useState } from "react";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface Props {
  hotelName: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}

const hasCoords = (lat?: number | null, lng?: number | null): boolean =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  !(lat === 0 && lng === 0);

/**
 * "Localização": mapa pequeno (imagem estática do Mapbox, leve e sem prender a rolagem)
 * + endereço. Sem coordenadas, mostra só o endereço.
 */
const HotelDetailLocation: React.FC<Props> = ({ hotelName, address, latitude, longitude }) => {
  const [mapFailed, setMapFailed] = useState(false);
  const coords = hasCoords(latitude, longitude);
  const lat = Number(latitude);
  const lng = Number(longitude);

  const showMap = coords && !!MAPBOX_TOKEN && !mapFailed;
  const mapSrc = showMap
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+d91f26(${lng},${lat})/${lng},${lat},14,0/640x260@2x?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`
    : "";
  const mapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : "";

  return (
    <div>
      {showMap && (
        <>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir a localização do ${hotelName} no Google Maps`}
            className="block h-[130px] md:h-[200px] rounded-[14px] overflow-hidden bg-[#e9edef]"
          >
            <img
              src={mapSrc}
              alt={`Mapa com a localização do ${hotelName}`}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setMapFailed(true)}
            />
          </a>
          <p className="m-0 mt-1 text-[10px] text-muted-foreground text-right">© Mapbox © OpenStreetMap</p>
        </>
      )}
      <div className={`flex items-start gap-1.5 text-sm text-muted-foreground ${showMap ? "mt-1.5" : ""}`}>
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{address}</span>
      </div>
      {coords && !showMap && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-foreground underline underline-offset-2"
        >
          Ver no mapa
        </a>
      )}
    </div>
  );
};

export default HotelDetailLocation;
