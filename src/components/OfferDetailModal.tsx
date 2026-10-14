import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, ShoppingCart, Clock, Tag, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useNavigate } from "react-router-dom";

interface OfferDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: {
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
  } | null;
}

const OfferDetailModal = ({ open, onOpenChange, offer }: OfferDetailModalProps) => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  if (!offer) return null;

  const handleAddToCart = () => {
    if (!user) {
      onOpenChange(false);
      navigate('/auth');
      return;
    }

    addItem({
      id: offer.id,
      title: offer.title,
      subtitle: offer.subtitle,
      price: offer.price,
      originalPrice: offer.originalPrice,
      discountPercent: offer.discountPercent,
      imageUrl: offer.imageUrl,
      category: offer.category
    });
    onOpenChange(false);
  };

  const savings = offer.originalPrice - offer.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl">
        {/* Image with gradient overlay */}
        <div className="relative h-52 sm:h-60 w-full overflow-hidden rounded-t-2xl">
          {offer.imageUrl ? (
            <img
              src={offer.imageUrl}
              alt={offer.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <p className="text-muted-foreground">Imagem não disponível</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

          {/* Discount Badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary text-primary-foreground font-extrabold text-base px-3 py-1.5 rounded-lg shadow-lg">
              -{offer.discountPercent}%
            </Badge>
          </div>

          {/* Category Badge */}
          <div className="absolute bottom-3 right-3">
            <Badge variant="secondary" className="bg-background/80 text-foreground backdrop-blur-md border-0 text-xs px-2.5 py-1 rounded-full">
              <Tag className="w-3 h-3 mr-1" />
              {offer.category}
            </Badge>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Title & Subtitle */}
          <DialogHeader className="text-left p-0 space-y-1">
            <DialogTitle className="text-lg font-bold leading-tight">{offer.title}</DialogTitle>
            {offer.subtitle && (
              <p className="text-sm text-muted-foreground">{offer.subtitle}</p>
            )}
          </DialogHeader>

          {/* Rating & Location row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-warning/10 px-2.5 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                <span className="font-bold text-sm">{offer.rating.toFixed(1)}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                ({offer.reviewCount} avaliações)
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs">Disponível na sua região</span>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-accent/50 rounded-xl p-4 space-y-2 border border-border/50">
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-extrabold text-foreground">
                {formatCurrency(offer.price)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(offer.originalPrice)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-primary">
              <Info className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold">
                Você economiza {formatCurrency(savings)}!
              </span>
            </div>
          </div>

          {/* Time limit hint */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Oferta por tempo limitado</span>
          </div>

          {/* Action Button */}
          <Button
            variant="destructive"
            className="w-full font-bold py-5 text-base rounded-xl shadow-md hover:shadow-lg transition-shadow"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {user ? "Adicionar ao Carrinho" : "Fazer Login para Comprar"}
          </Button>

          {!user && (
            <p className="text-center text-xs text-muted-foreground">
              Faça login para adicionar ao carrinho e finalizar a compra
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferDetailModal;
