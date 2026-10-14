import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import DOMPurify from "dompurify";
import { optimizedImage, optimizedSrcSet, imageFallback } from "@/lib/image-optimize";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/utils";
import { slugify } from "@/lib/seo";

export interface BahofertasOffer {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  category?: string | null;
  card_image_url?: string | null;
  banner_image_url?: string | null;
  company_id?: string | null;
}

interface Props {
  offer: BahofertasOffer;
  index: number;
  companyName?: string;
}

const BahofertasOfferCard: React.FC<Props> = ({ offer, index, companyName }) => {
  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // O vaul registra um listener global de scroll assim que o Drawer é montado.
  // Com dezenas de cards na home isso travava a rolagem: montamos sob demanda.
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const price = Number(offer.price) || 0;
  const originalPrice = Number(offer.original_price ?? offer.price) || price;
  const discountPercent = offer.discount_percent || 0;
  const image = offer.card_image_url || offer.banner_image_url || "";

  const rawDescription = offer.description || offer.subtitle || "";
  const cleanDescription = rawDescription
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sanitizedHtml = DOMPurify.sanitize(rawDescription);

  const openBuyFlow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMobile) {
      setQuantity(1);
      setDrawerMounted(true);
      setDrawerOpen(true);
      return;
    }
    if (!expanded) {
      setExpanded(true);
      return;
    }
    setQuantity(1);
    setDrawerMounted(true);
    setDrawerOpen(true);
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: `${offer.id}${quantity > 1 ? `-${i + 1}` : ""}`,
        title: offer.title,
        subtitle: offer.subtitle || undefined,
        price,
        originalPrice,
        discountPercent,
        imageUrl: image,
        category: offer.category || "Oferta",
        metadata: {
          source: "bahofertas",
          offerId: offer.id,
          companyId: offer.company_id,
          companyName,
        } as any,
      });
    }
    toast({
      title: "Adicionado ao carrinho",
      description: `${offer.title}${quantity > 1 ? ` (x${quantity})` : ""}`,
    });
    setDrawerOpen(false);
  };

  return (
    <>
      <a
        href={`/oferta/${offer.id}/${slugify(offer.title)}`}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      >
        Ver detalhes: {offer.title}
      </a>
      <div
        className={`bg-card rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer transition-shadow hover:shadow-md ${
          expanded ? "ring-1 ring-primary/20" : ""
        }`}
        style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
        onClick={() => setExpanded((v) => !v)}
      >
        {image ? (
          <div
            className={`overflow-hidden transition-all duration-300 relative ${
              expanded ? "h-48 md:h-56" : "h-36"
            }`}
          >
            <img src={optimizedImage(image, 480)} srcSet={optimizedSrcSet(image, 480)} sizes="(min-width: 768px) 40vw, 95vw" alt={offer.title} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={imageFallback(image)} />
            {discountPercent > 0 && (
              <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5">
                -{discountPercent}%
              </Badge>
            )}
          </div>
        ) : (
          <div className={`overflow-hidden transition-all duration-300 ${expanded ? "h-48 md:h-56" : "h-36"} bg-gradient-to-br from-primary/20 to-primary/5`} />
        )}

        <div className="p-3">
          <h3 className="font-semibold text-sm mb-1 line-clamp-2 text-foreground">{offer.title}</h3>
          {offer.category && (
            <Badge variant="outline" className="mb-1.5 text-[10px] h-5">
              {offer.category}
            </Badge>
          )}

          {cleanDescription ? (
            !expanded ? (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">{cleanDescription}</p>
            ) : (
              <div
                className="text-xs text-muted-foreground mb-3 prose prose-xs max-w-none [&_p]:mb-1 [&_ul]:mb-1 [&_li]:mb-0.5 animate-in fade-in duration-200"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            )
          ) : null}

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {price > 0 ? (
                <>
                  <span className="text-base font-extrabold text-primary">{formatCurrency(price)}</span>
                  {originalPrice > price && (
                    <span className="text-[10px] text-muted-foreground line-through leading-none">
                      {formatCurrency(originalPrice)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-base font-bold text-muted-foreground">Gratuito</span>
              )}
            </div>
            {price > 0 && (
              <Button
                size="sm"
                className="h-8 text-xs rounded-full px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={openBuyFlow}
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                Comprar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quantity Drawer (montado apenas quando usado) */}
      {drawerMounted && (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-base">{offer.title}</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-2">
            {image && (
              <div className="rounded-lg overflow-hidden h-40 mb-3">
                <img src={optimizedImage(image, 640)} alt={offer.title} className="w-full h-full object-cover" loading="lazy" decoding="async" onError={imageFallback(image)} />
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Quantidade</span>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center text-base font-bold">{quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-extrabold text-primary">
                {formatCurrency(price * quantity)}
              </span>
            </div>
          </div>

          <DrawerFooter>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Adicionar ao carrinho
            </Button>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      )}
    </>
  );
};

export default BahofertasOfferCard;
