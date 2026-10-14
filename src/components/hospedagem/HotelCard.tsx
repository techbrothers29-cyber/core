import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Hotel } from "@/pages/Hospedagem";
import useEmblaCarousel from "embla-carousel-react";

interface HotelCardProps {
  hotel: Hotel;
  onClick: () => void;
  isBestPrice?: boolean;
}

const toCardImageUrl = (url: string) => {
  // Use 640x400 for card thumbnails (valid ETG CDN size, faster loading)
  return url
    .replace("/1024x768/", "/640x400/")
    .replace("/max1280x900/", "/640x400/")
    .replace("/square2000/", "/640x400/")
    .replace("/square1024/", "/640x400/")
    .replace("/square500/", "/640x400/");
};

const HotelCard = ({ hotel, onClick, isBestPrice }: HotelCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [remoteImages, setRemoteImages] = useState<string[] | null>(null);
  const [isFetchingImages, setIsFetchingImages] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    dragFree: false,
  });

  const initialImages = useMemo(() => {
    const list = Array.isArray(hotel.images)
      ? hotel.images.filter((u): u is string => typeof u === "string" && u.length > 0)
      : [];

    const base = typeof hotel.image === "string" && hotel.image.length > 0 ? [hotel.image] : [];
    const merged = [...base, ...list.filter((u) => u !== hotel.image)];

    return merged.length ? merged : ["/placeholder.svg"];
  }, [hotel.images, hotel.image]);

  const images = remoteImages ?? initialImages;

  useEffect(() => {
    setCurrentImageIndex(0);
    setRemoteImages(null);
  }, [hotel.id]);

  // Sync embla with currentImageIndex
  useEffect(() => {
    if (emblaApi) {
      emblaApi.scrollTo(currentImageIndex, true);
    }
  }, [emblaApi, currentImageIndex]);

  // Update currentImageIndex when embla slides
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentImageIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const ensureAllPhotos = async (): Promise<string[]> => {
    const current = remoteImages ?? initialImages;
    if (remoteImages || isFetchingImages) return current;

    setIsFetchingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-hotel-details", {
        body: {
          hotelId: hotel.id,
          adults: hotel.guests,
        },
      });

      if (error) throw error;

      const photos = Array.isArray(data?.photos)
        ? data.photos.filter((u: unknown): u is string => typeof u === "string" && u.length > 0)
        : [];

      if (photos.length > current.length) {
        setRemoteImages(photos);
        return photos;
      }

      return current;
    } catch (err) {
      console.error("Erro ao carregar fotos do hotel:", err);
      return current;
    } finally {
      setIsFetchingImages(false);
    }
  };

  const formatPrice = (price: number, cur?: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: cur || hotel.currency || "BRL",
    }).format(price);
  };

  const handlePrevImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await ensureAllPhotos();
    emblaApi?.scrollPrev();
  };

  const handleNextImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await ensureAllPhotos();
    emblaApi?.scrollNext();
  };

  // Prevent card click when swiping
  const handleCarouselClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className={`fluid-card overflow-hidden cursor-pointer group hover:shadow-2xl border-border/50 transition-all duration-200 ease-spring active:scale-[0.98] ${hotel.isTestHotel ? "border-destructive shadow-lg shadow-destructive/10" : ""}`}
      onClick={onClick}
    >
      {/* Best Price Badge */}
      {isBestPrice && (
        <div className="bg-primary text-primary-foreground text-xs font-semibold text-center py-1.5 px-2">
          ⭐ Melhor preço
        </div>
      )}
      {/* Image Carousel with Swipe */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <div
          className="overflow-hidden h-full"
          ref={emblaRef}
          onClick={handleCarouselClick}
        >
          <div className="flex h-full">
            {images.map((img, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] min-w-0 h-full"
              >
                <img
                  src={toCardImageUrl(img)}
                  alt={`${hotel.name} - Foto ${index + 1} de ${images.length}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows - Only show if multiple images */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              disabled={isFetchingImages}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={handlePrevImage}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={isFetchingImages}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={handleNextImage}
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Dots indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.slice(0, 5).map((_, index) => (
                <button
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    currentImageIndex === index
                      ? "bg-white w-3"
                      : "bg-white/60 hover:bg-white/80"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    emblaApi?.scrollTo(index);
                  }}
                  aria-label={`Ir para foto ${index + 1}`}
                />
              ))}
              {images.length > 5 && (
                <span className="text-white text-xs ml-1">+{images.length - 5}</span>
              )}
            </div>
          </>
        )}

        {hotel.isTestHotel && (
          <Badge variant="destructive" className="absolute top-3 left-3 z-10 text-xs font-semibold">
            ⚠ HOTEL TEST
          </Badge>
        )}

        {hotel.freeCancellation && (
          <Badge className={`absolute top-3 z-10 ${hotel.isTestHotel ? "right-3" : "left-3 bg-green-600 hover:bg-green-700"}`}>
            <Check className="h-3 w-3 mr-1" />
            Cancelamento grátis
          </Badge>
        )}
        {hotel.originalPrice && hotel.originalPrice > hotel.price && (
          <Badge className="absolute top-3 right-3 bg-destructive z-10">
            -{Math.round((1 - hotel.price / hotel.originalPrice) * 100)}%
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        {/* Property Type */}
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {hotel.propertyType}
        </span>

        {/* Name */}
        <h3 className={`font-semibold mt-1 transition-colors ${hotel.isTestHotel ? "text-destructive" : "text-foreground group-hover:text-primary"}`}>
          {hotel.name}
        </h3>

        {hotel.isTestHotel && (
          <p className="text-xs font-medium text-destructive/80 mt-1">
            Identificador de teste ETG: {hotel.id}
          </p>
        )}

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">{hotel.location}</span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mt-3">
          {hotel.rating > 0 && (
            <>
              <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm font-medium">
                <Star className="h-3 w-3 fill-current" />
                {hotel.rating.toFixed(1)}
              </div>
              {hotel.reviewCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({hotel.reviewCount} avaliações)
                </span>
              )}
            </>
          )}
        </div>

        {/* Price */}
        <div className="mt-4 pt-3 border-t border-border">
        {hotel.priceUnavailable ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">
                  Sob consulta
                </span>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Ver detalhes
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique para ver detalhes e contato
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  {hotel.originalPrice && hotel.originalPrice > hotel.price && (
                    <span className="text-sm text-muted-foreground line-through mr-2">
                      {formatPrice(hotel.originalPrice)}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">a partir de </span>
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(hotel.pricePerNight || hotel.price)}
                  </span>
                  <span className="text-sm text-muted-foreground"> / noite</span>
                </div>
              </div>
              {(hotel.nights && hotel.nights > 1) ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Total: {formatPrice(hotel.price)} · {hotel.nights} noite{hotel.nights > 1 ? "s" : ""} · {hotel.guests} hóspede{hotel.guests > 1 ? "s" : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Para {hotel.guests} hóspede{hotel.guests > 1 ? "s" : ""}
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HotelCard;
