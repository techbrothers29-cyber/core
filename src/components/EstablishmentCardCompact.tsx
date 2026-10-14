import React, { memo } from "react";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Establishment } from "@/data/novaxs-establishments";
import { prefetchEstabelecimento } from "@/lib/route-prefetch";
import CardImage from "@/components/CardImage";
import { establishmentPath } from "@/lib/establishment-slug";
import { useInViewport } from "@/hooks/useInViewport";

interface EstablishmentCardCompactProps {
  establishment: Establishment;
}

const EstablishmentCardCompact = memo(({ establishment }: EstablishmentCardCompactProps) => {
  const navigate = useNavigate();
  const { ref: ringRef, inView } = useInViewport<HTMLDivElement>();
  const { name, displayName, image, rating, minPrice, minPriceOldValue, partnerType, companyId } = establishment;
  const label = displayName || name;
  const fillExistingPhoto = companyId === "93e66d28-2de1-45a3-b4c5-8c9aeb50f027";
  const isAcquamotion = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .includes("acquamotion");
  const displayPrice = minPrice > 0 ? minPrice : (isAcquamotion ? 12950 : 0);

  const formattedPrice = displayPrice > 0
    ? (displayPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "Ver ofertas";
  const formattedOldPrice = minPriceOldValue && minPriceOldValue > displayPrice && displayPrice > 0
    ? (minPriceOldValue / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  const targetPath = partnerType === 'bahofertas' && companyId
    ? `/parceiro/${companyId}/ofertas`
    : establishmentPath(displayName || name);

  return (
    <div
      ref={ringRef}
      data-ring-active={inView ? "true" : "false"}
      className="card-light-ring cursor-pointer active:scale-[0.97] transition-transform duration-200 h-full flex flex-col"
      onClick={() => navigate(targetPath)}
      onMouseEnter={partnerType === 'bahofertas' ? undefined : prefetchEstabelecimento}
      onTouchStart={partnerType === 'bahofertas' ? undefined : prefetchEstabelecimento}
    >
      <div className="card-light-ring-content flex flex-col h-full flex-1">
      <div className="relative h-28 overflow-hidden bg-muted">
        {image ? (
          <CardImage
            src={image}
            alt={label}
            width={320}
            sizes="45vw"
            imgWidth={240}
            imgHeight={112}
            forceCover={fillExistingPhoto}
            className={fillExistingPhoto ? "object-[center_42%]" : undefined}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <p className="text-muted-foreground text-xs">Sem imagem</p>
          </div>
        )}


      </div>

      <div className="p-2.5 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm line-clamp-1 text-foreground">{label}</h3>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 fill-warning text-warning" />
          <span className="text-xs font-semibold">{rating.toFixed(1)}</span>
        </div>
        <div className="mt-1.5 min-h-[2.75rem] flex flex-col justify-end">
          <span className="text-[10px] text-muted-foreground line-through block empty:hidden">
            {formattedOldPrice ? `De: ${formattedOldPrice}` : ""}
          </span>
          <span className="text-[10px] text-muted-foreground">A partir de</span>
          <p className="text-sm font-bold text-primary leading-tight">{formattedPrice}</p>
        </div>
      </div>
      </div>
    </div>
  );
});

EstablishmentCardCompact.displayName = "EstablishmentCardCompact";
export default EstablishmentCardCompact;
