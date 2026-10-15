import React from "react";
import { Building2, Grid3x3 } from "lucide-react";

interface Props {
  photos: string[];
  hotelName: string;
  city: string;
  /** Abre o diálogo com todas as fotos, começando pela foto indicada. */
  onOpenPhotos: (index: number) => void;
}

const MAX_VISIBLE = 5;

/** Grade de colunas e quais quadros ocupam as duas linhas, conforme a quantidade de fotos. */
function layoutFor(count: number): { cols: string; tall: number[] } {
  switch (count) {
    case 1:
      return { cols: "grid-cols-1", tall: [0] };
    case 2:
      return { cols: "grid-cols-2", tall: [0, 1] };
    case 3:
      return { cols: "grid-cols-[2fr_1fr]", tall: [0] };
    case 4:
      return { cols: "grid-cols-[2fr_1fr_1fr]", tall: [0, 1] };
    default:
      return { cols: "grid-cols-[2fr_1fr_1fr]", tall: [0] };
  }
}

/**
 * Galeria do tablet/desktop: foto grande à esquerda (duas linhas) + até 4 menores.
 * Com menos de 5 fotos a grade se adapta, sem quadros vazios.
 */
const HotelDetailGallery: React.FC<Props> = ({ photos, hotelName, city, onOpenPhotos }) => {
  const visible = photos.slice(0, MAX_VISIBLE);

  if (visible.length === 0) {
    return (
      <div className="h-[260px] lg:h-[368px] rounded-2xl bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Building2 className="w-10 h-10" aria-hidden="true" />
        <span className="text-sm">Fotos indisponíveis no momento</span>
      </div>
    );
  }

  const { cols, tall } = layoutFor(visible.length);
  const hasMore = photos.length > visible.length;

  return (
    <div className={`relative grid ${cols} grid-rows-2 gap-2 h-[320px] lg:h-[368px] xl:h-[420px] rounded-2xl overflow-hidden`}>
      {visible.map((src, i) => (
        <button
          key={`${src}-${i}`}
          type="button"
          onClick={() => onOpenPhotos(i)}
          aria-label={`Ampliar foto ${i + 1} do ${hotelName}`}
          className={`group relative min-w-0 min-h-0 overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
            tall.includes(i) ? "row-span-2" : ""
          }`}
        >
          <img
            src={src}
            alt={i === 0 ? `${hotelName} - ${city}` : `${hotelName} - foto ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 w-full h-full object-cover transition-[filter] duration-200 group-hover:brightness-90"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
          />
        </button>
      ))}

      {hasMore && (
        <button
          type="button"
          onClick={() => onOpenPhotos(0)}
          className="absolute right-4 bottom-4 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-[#dddddd] bg-white text-sm font-semibold text-foreground shadow-sm hover:bg-[#f7f7f7] transition-colors"
        >
          <Grid3x3 className="w-4 h-4" aria-hidden="true" />
          Ver todas as fotos
        </button>
      )}
    </div>
  );
};

export default HotelDetailGallery;
