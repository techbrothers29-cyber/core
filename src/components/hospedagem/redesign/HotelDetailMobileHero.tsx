import React from "react";
import { Building2, ChevronLeft, Heart, Share } from "lucide-react";

interface Props {
  photo?: string;
  photoCount: number;
  hotelName: string;
  city: string;
  isFavorite: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
  onOpenPhotos: () => void;
}

const ROUND_BTN =
  "w-11 h-11 rounded-full bg-white text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.25)] inline-flex items-center justify-center active:scale-95 transition-transform";

/**
 * Topo do celular: foto em tela cheia (300px) com os botões redondos por cima.
 * O cabeçalho global fica escondido nesta rota no celular, então o "voltar" mora aqui.
 */
const HotelDetailMobileHero: React.FC<Props> = ({
  photo,
  photoCount,
  hotelName,
  city,
  isFavorite,
  onBack,
  onShare,
  onToggleFavorite,
  onOpenPhotos,
}) => {
  const canOpen = photoCount > 0;

  return (
    <div className="relative h-[300px] w-full overflow-hidden bg-[#e7e2ea]">
      {photo ? (
        <button
          type="button"
          onClick={onOpenPhotos}
          disabled={!canOpen}
          aria-label={`Ver fotos do ${hotelName}`}
          className="absolute inset-0 w-full h-full"
        >
          <img
            src={photo}
            alt={`${hotelName} - ${city}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
          />
        </button>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/90" aria-hidden="true">
          <Building2 className="w-12 h-12" />
        </div>
      )}

      {/* Leve sombra no topo para os botões brancos não sumirem em fotos claras */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" aria-hidden="true" />

      <div className="absolute left-4 top-[calc(12px+env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} aria-label="Voltar" className={ROUND_BTN}>
          <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="absolute right-4 top-[calc(12px+env(safe-area-inset-top))] flex gap-2.5">
        <button type="button" onClick={onShare} aria-label="Compartilhar" className={ROUND_BTN}>
          <Share className="w-[18px] h-[18px]" strokeWidth={1.9} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
          aria-pressed={isFavorite}
          className={ROUND_BTN}
        >
          <Heart
            className={`w-[18px] h-[18px] ${isFavorite ? "fill-primary text-primary" : ""}`}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </button>
      </div>

      {photoCount > 1 && (
        <span
          className="pointer-events-none absolute right-4 bottom-[34px] rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white"
          aria-hidden="true"
        >
          1 / {photoCount}
        </span>
      )}
    </div>
  );
};

export default HotelDetailMobileHero;
