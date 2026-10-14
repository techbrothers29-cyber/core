import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, Eye } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { slugify } from "@/lib/seo";
import OfferDetailModal from "./OfferDetailModal";
import { optimizedImage, optimizedSrcSet, imageFallback } from "@/lib/image-optimize";

interface OfferCardProps {
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

const OfferCard = ({
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
  isExpiring = false
}: OfferCardProps) => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleButtonClick = () => {
    // Verificar se o usuário é administrador
    if (user && user.user_metadata?.role_type === 'admin') {
      return; // Administradores não podem ver detalhes
    }

    // Abrir modal de detalhes para todos os usuários (logados ou não)
    setShowDetailModal(true);
  };

  // Verificar se o usuário é administrador
  const isAdmin = user && user.user_metadata?.role_type === 'admin';

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
    category
  };

  const offerUrl = `/oferta/${id}/${slugify(title)}`;

  return (
    <>
      {/* Hidden link for SEO crawlers (Google sees /oferta/:id/:slug) */}
      <a href={offerUrl} className="sr-only" aria-hidden="true" tabIndex={-1}>
        Ver detalhes: {title}
      </a>
      <div className="bg-card rounded-xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-[var(--transition-smooth)] overflow-hidden group cursor-pointer" onClick={handleButtonClick}>
        {/* Image Section */}
        <div className="relative h-48 overflow-hidden">
          {imageUrl ? (
            <img src={optimizedImage(imageUrl, 480)} srcSet={optimizedSrcSet(imageUrl, 480)} sizes="(min-width: 768px) 33vw, 90vw" alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" onError={imageFallback(imageUrl)} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-muted-foreground text-sm">Imagem não disponível</p>
              </div>
            </div>
          )}

          {/* Discount Badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary text-primary-foreground font-bold text-sm px-3 py-1">
              -{discountPercent}%
            </Badge>
          </div>

          {/* Category Badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-white/90 text-foreground backdrop-blur-sm">
              {category}
            </Badge>
          </div>

          {/* Expiring Soon */}
          {isExpiring && (
            <div className="absolute bottom-3 right-3">
              <Badge className="bg-warning text-warning-foreground animate-pulse">
                <Clock className="w-3 h-3 mr-1" />
                Expira em breve
              </Badge>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="font-bold text-lg mb-1 line-clamp-1">{title}</h3>
          {subtitle && <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{subtitle}</p>}

          {/* Rating */}
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 fill-warning text-warning" />
            <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground text-sm">({reviewCount})</span>
          </div>

          {/* Location indicator */}
          <div className="flex items-center gap-1 mb-4 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Região disponível</span>
          </div>

          {/* Pricing */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-zinc-950">
                  {formatCurrency(price)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(originalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isAdmin && (
            <Button variant="destructive" onClick={handleButtonClick} className="w-full font-semibold text-sm md:text-base py-2 md:py-2.5">
              <Eye className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" />
              Ver mais
            </Button>
          )}
          {isAdmin && (
            <div className="w-full p-3 text-center text-muted-foreground text-sm bg-muted rounded-lg">
              Administradores não podem adicionar ao carrinho
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal for non-logged users */}
      <OfferDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        offer={offerData}
      />
    </>
  );
};

export default OfferCard;