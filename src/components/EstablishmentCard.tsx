import React, { memo } from "react";
import { Star, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { Establishment } from "@/data/novaxs-establishments";
import { prefetchEstabelecimento } from "@/lib/route-prefetch";
import CardImage from "@/components/CardImage";
import { establishmentPath } from "@/lib/establishment-slug";
import { useInViewport } from "@/hooks/useInViewport";

interface EstablishmentCardProps {
  establishment: Establishment;
}

const EstablishmentCard = memo(({ establishment }: EstablishmentCardProps) => {
  const navigate = useNavigate();
  const { ref: ringRef, inView } = useInViewport<HTMLDivElement>();
  const { name, displayName, image, rating, minPrice, minPriceOldValue, productCount, category, partnerType, companyId } = establishment;
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

  const categoryLabel = category === "entretenimento" ? "Entretenimento" : "Gastronomia";

  const targetPath = partnerType === 'bahofertas' && companyId
    ? `/parceiro/${companyId}/ofertas`
    : establishmentPath(displayName || name);

  return (
    <div
      ref={ringRef}
      data-ring-active={inView ? "true" : "false"}
      className="card-light-ring fluid-card group cursor-pointer active:scale-[0.98] h-full flex flex-col"
      onClick={() => navigate(targetPath)}
      onMouseEnter={partnerType === 'bahofertas' ? undefined : prefetchEstabelecimento}
      onTouchStart={partnerType === 'bahofertas' ? undefined : prefetchEstabelecimento}
    >
      <div className="card-light-ring-content flex flex-col h-full flex-1">
      <div className="relative h-48 overflow-hidden bg-muted">
        {image ? (
          <CardImage
            src={image}
            alt={label}
            width={480}
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 90vw"
            hoverZoom
            forceCover={fillExistingPhoto}
            className={fillExistingPhoto ? "object-[center_42%]" : undefined}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Sem imagem</p>
          </div>
        )}



        <Badge variant="secondary" className="absolute top-3 right-3 bg-background/90 text-foreground backdrop-blur-sm text-xs">
          {categoryLabel}
        </Badge>

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent h-20" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5">
            <Star className="w-3.5 h-3.5 fill-warning text-warning" />
            <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-white/80">{productCount} opções</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold text-base line-clamp-1 mb-1">{label}</h3>
        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3">
          <MapPin className="w-3.5 h-3.5" />
          <span>Serra Gaúcha</span>
        </div>

        <div className="mb-3 min-h-[3.25rem] flex flex-col justify-end">
          <span className="text-xs text-muted-foreground line-through mr-1 empty:hidden">
            {formattedOldPrice ? `De: ${formattedOldPrice}` : ""}
          </span>
          <span className="text-xs text-muted-foreground block">A partir de</span>
          <p className="text-lg font-extrabold text-primary leading-tight">{formattedPrice}</p>
        </div>

        <Button
          variant="default"
          size="sm"
          className="w-full font-semibold mt-auto"
          onClick={(e) => {
            e.stopPropagation();
            navigate(targetPath);
          }}
        >
          Ver ofertas
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      </div>
    </div>
  );
});

EstablishmentCard.displayName = "EstablishmentCard";
export default EstablishmentCard;
