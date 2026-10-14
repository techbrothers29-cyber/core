import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin } from "lucide-react";
import type { Hotel } from "@/pages/Hospedagem";

interface HotelCardCompactProps {
  hotel: Hotel;
  onClick: () => void;
  isBestPrice?: boolean;
}

const toCardImageUrl = (url: string) => {
  return url
    .replace("/1024x768/", "/640x400/")
    .replace("/max1280x900/", "/640x400/")
    .replace("/square2000/", "/640x400/")
    .replace("/square1024/", "/640x400/")
    .replace("/square500/", "/640x400/");
};

const formatPrice = (price: number, currency?: string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(price);

const HotelCardCompact = ({ hotel, onClick, isBestPrice }: HotelCardCompactProps) => {
  const image = hotel.image || "/placeholder.svg";
  const discountPercent =
    hotel.originalPrice && hotel.originalPrice > hotel.price
      ? Math.round((1 - hotel.price / hotel.originalPrice) * 100)
      : null;

  return (
    <div
      className="fluid-card bg-card rounded-xl shadow-sm overflow-hidden cursor-pointer border border-border/50 flex flex-col h-full transition-all duration-200 ease-spring hover:shadow-lg active:scale-[0.97]"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={toCardImageUrl(image)}
          alt={hotel.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
        />
        {discountPercent && (
          <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground font-bold text-xs px-2 py-0.5">
            -{discountPercent}%
          </Badge>
        )}
        {isBestPrice && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5">
            ⭐ Selo Bah Ofertas
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 space-y-1 flex flex-col flex-1">
        <h3 className="font-semibold text-sm line-clamp-2 text-foreground leading-tight min-h-[2.5em]">
          {hotel.name}
        </h3>

        {/* Rating */}
        {hotel.rating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.round(hotel.rating)
                      ? "fill-warning text-warning"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            {hotel.reviewCount > 0 && (
              <span className="text-muted-foreground text-[10px]">
                ({hotel.reviewCount.toLocaleString("pt-BR")} avaliações)
              </span>
            )}
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="text-xs line-clamp-1">{hotel.location}</span>
        </div>

        {/* Price */}
        <div className="pt-1">
          {hotel.priceUnavailable ? (
            <span className="text-xs font-medium text-primary">Sob consulta</span>
          ) : (
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-destructive">
                {formatPrice(hotel.pricePerNight || hotel.price, hotel.currency)}
              </span>
              {hotel.originalPrice && hotel.originalPrice > hotel.price && (
                <span className="text-[11px] text-muted-foreground line-through">
                  {formatPrice(hotel.originalPrice, hotel.currency)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <Button
          size="sm"
          variant="destructive"
          className="w-full h-7 text-xs font-semibold mt-auto"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          Ver disponibilidade
        </Button>
      </div>
    </div>
  );
};

export default HotelCardCompact;
