import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { OfferProduct } from "@/data/novaxs-establishments";
import { prefetchEstabelecimento } from "@/lib/route-prefetch";
import { establishmentPath } from "@/lib/establishment-slug";

interface OfferProductCardCompactProps {
  offer: OfferProduct;
}

const OfferProductCardCompact = ({ offer }: OfferProductCardCompactProps) => {
  const navigate = useNavigate();

  const priceFormatted = (offer.price / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const oldPriceFormatted = (offer.oldPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const targetPath = offer.partnerType === 'bahofertas' && offer.companyId
    ? `/parceiro/${offer.companyId}/ofertas`
    : establishmentPath(offer.establishmentName);

  return (
    <div
      className="bg-card rounded-xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => navigate(targetPath)}
      onMouseEnter={offer.partnerType === 'bahofertas' ? undefined : prefetchEstabelecimento}
      onTouchStart={offer.partnerType === 'bahofertas' ? undefined : prefetchEstabelecimento}
    >
      {/* Image */}
      <div className="relative h-28 overflow-hidden">
        {offer.image ? (
          <img src={offer.image} alt={offer.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <p className="text-muted-foreground text-xs">Sem imagem</p>
          </div>
        )}
        {offer.discountPercent > 0 && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5">
            -{offer.discountPercent}%
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h3 className="font-semibold text-sm line-clamp-1 text-foreground">{offer.name}</h3>
        <p className="text-muted-foreground text-[10px] line-clamp-1 mt-0.5">{offer.establishmentName}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 fill-warning text-warning" />
          <span className="text-xs font-semibold">{offer.rating.toFixed(1)}</span>
        </div>

        {/* Pricing */}
        <div className="mt-1.5 flex flex-col gap-0.5">
          {offer.oldPrice > offer.price && (
            <span className="text-xs text-muted-foreground line-through">{oldPriceFormatted}</span>
          )}
          <span className="text-sm font-bold text-primary leading-tight">{priceFormatted}</span>
        </div>
      </div>
    </div>
  );
};

export default OfferProductCardCompact;
