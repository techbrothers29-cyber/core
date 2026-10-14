import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { slugify } from "@/lib/seo";
import OfferDetailModal from "./OfferDetailModal";
import { optimizedImage, optimizedSrcSet, imageFallback } from "@/lib/image-optimize";

interface OfferCardCompactProps {
  id: string;
  title: string;
  subtitle?: string;
  originalPrice: number;
  price: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  category: string;
  isExpiring?: boolean;
}

const OfferCardCompact = ({
  id,
  title,
  subtitle,
  originalPrice,
  price,
  discountPercent,
  rating,
  reviewCount,
  imageUrl,
  category,
  isExpiring = false,
}: OfferCardCompactProps) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const offerData = {
    id,
    title,
    subtitle,
    originalPrice,
    price,
    discountPercent,
    rating,
    reviewCount,
    imageUrl,
    category,
  };

  const offerUrl = `/oferta/${id}/${slugify(title)}`;

  return (
    <>
      <a href={offerUrl} className="sr-only" aria-hidden="true" tabIndex={-1}>
        Ver detalhes: {title}
      </a>
      <div
        className="bg-card rounded-xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => setShowDetailModal(true)}
      >
        {/* Image */}
        <div className="relative h-28 overflow-hidden">
          {imageUrl ? (
            <img
              src={optimizedImage(imageUrl, 320)}
              srcSet={optimizedSrcSet(imageUrl, 320)}
              sizes="45vw"
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={imageFallback(imageUrl)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <p className="text-muted-foreground text-xs">Sem imagem</p>
            </div>
          )}
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5">
            -{discountPercent}%
          </Badge>
        </div>

        {/* Content */}
        <div className="p-2.5">
          <h3 className="font-semibold text-sm line-clamp-1 text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-muted-foreground text-xs line-clamp-1 mt-0.5">{subtitle}</p>
          )}

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1.5">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(rating)
                      ? "fill-warning text-warning"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-muted-foreground text-xs">{rating.toFixed(1)}</span>
          </div>

          {/* Pricing */}
          <div className="mt-2 flex flex-col items-start gap-0.5 min-w-0">
            <span className="max-w-full text-xs text-muted-foreground line-through truncate">
              {formatCurrency(originalPrice)}
            </span>
            <span className="max-w-full text-sm font-bold text-primary leading-none truncate">
              {formatCurrency(price)}
            </span>
          </div>
        </div>
      </div>

      <OfferDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        offer={offerData}
      />
    </>
  );
};

export default OfferCardCompact;
