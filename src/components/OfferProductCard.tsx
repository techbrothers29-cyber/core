import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { OfferProduct } from "@/data/novaxs-establishments";
import { prefetchEstabelecimento } from "@/lib/route-prefetch";
import { establishmentPath } from "@/lib/establishment-slug";

interface OfferProductCardProps {
  offer: OfferProduct;
}

const OfferProductCard = ({ offer }: OfferProductCardProps) => {
  const navigate = useNavigate();

  const priceFormatted = (offer.price / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const oldPriceFormatted = (offer.oldPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const targetPath = offer.partnerType === 'bahofertas' && offer.companyId
    ? `/parceiro/${offer.companyId}/ofertas`
    : establishmentPath(offer.establishmentName);
  const buyPath = offer.partnerType === 'bahofertas' && offer.companyId
    ? `/parceiro/${offer.companyId}/ofertas`
    : `/ingressos`;

  return (
    <div
      className="bg-card rounded-xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-[var(--transition-smooth)] overflow-hidden group cursor-pointer"
      onClick={() => navigate(targetPath)}
      onMouseEnter={offer.partnerType === 'bahofertas' ? undefined : prefetchEstabelecimento}
      onTouchStart={offer.partnerType === 'bahofertas' ? undefined : prefetchEstabelecimento}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {offer.image ? (
          <img
            src={offer.image}
            alt={offer.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Sem imagem</p>
          </div>
        )}

        {offer.discountPercent > 0 && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground font-bold text-sm px-3 py-1">
            -{offer.discountPercent}%
          </Badge>
        )}

        {offer.type && (
          <Badge variant="secondary" className="absolute top-3 right-3 bg-background/90 text-foreground backdrop-blur-sm text-xs">
            {offer.type}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-base line-clamp-2 mb-1">{offer.name}</h3>
        <p className="text-muted-foreground text-sm mb-2 line-clamp-1">{offer.establishmentName}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <Star className="w-4 h-4 fill-warning text-warning" />
          <span className="font-semibold text-sm">{offer.rating.toFixed(1)}</span>
        </div>

        {/* Pricing */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl font-extrabold text-foreground">{priceFormatted}</span>
          {offer.oldPrice > offer.price && (
            <span className="text-sm text-muted-foreground line-through">{oldPriceFormatted}</span>
          )}
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="w-full font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            navigate(buyPath);
          }}
        >
          <ShoppingCart className="w-4 h-4 mr-1.5" />
          Comprar
        </Button>
      </div>
    </div>
  );
};

export default OfferProductCard;
