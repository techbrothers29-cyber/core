import { slugify } from "@/lib/seo";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Check, ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import type { Hotel } from "@/pages/Hospedagem";

interface HotelResultCardProps {
  hotel: Hotel;
  /** Abre o painel de detalhes/reserva do hotel (mesmo fluxo do card antigo). */
  onOpen: () => void;
  isBestPrice?: boolean;
  /** Carrega a primeira foto sem lazy-load (primeiros cards da lista). */
  priority?: boolean;
}

const toCardImageUrl = (url: string) =>
  // 640x400 é um tamanho válido do CDN da ETG e carrega mais rápido nos cards.
  url
    .replace("/1024x768/", "/640x400/")
    .replace("/max1280x900/", "/640x400/")
    .replace("/square2000/", "/640x400/")
    .replace("/square1024/", "/640x400/")
    .replace("/square500/", "/640x400/");

const MAX_DOTS = 5;

/**
 * Card de resultado de hospedagem no novo visual.
 * - Celular: foto grande (230px) arredondada com coração e bolinhas da galeria;
 *   nome + estrelas, endereço, preço e "Ver disponibilidade" sublinhado.
 * - Desktop (md+): card horizontal — foto 240x160 à esquerda, dados no meio,
 *   preço e botão vermelho "Ver disponibilidade" à direita.
 * O clique no card abre o mesmo modal de detalhes/reserva de antes.
 */
const HotelResultCard = memo(({ hotel, onOpen, isBestPrice, priority }: HotelResultCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favKey = `hotel:${hotel.id}`;
  const fav = isFavorite(favKey);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [remoteImages, setRemoteImages] = useState<string[] | null>(null);
  const [isFetchingImages, setIsFetchingImages] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });

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

  // Mesmo comportamento do card antigo: ao navegar pelas setas, busca a galeria completa.
  const ensureAllPhotos = async (): Promise<string[]> => {
    const current = remoteImages ?? initialImages;
    if (remoteImages || isFetchingImages) return current;
    setIsFetchingImages(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-hotel-details", {
        body: { hotelId: hotel.id, adults: hotel.guests },
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

  const handlePrevImage = async (e: MouseEvent) => {
    e.stopPropagation();
    await ensureAllPhotos();
    emblaApi?.scrollPrev();
  };

  const handleNextImage = async (e: MouseEvent) => {
    e.stopPropagation();
    await ensureAllPhotos();
    emblaApi?.scrollNext();
  };

  const formatPrice = (price: number, cur?: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur || hotel.currency || "BRL" }).format(price);

  const hasDiscount = !!hotel.originalPrice && hotel.originalPrice > hotel.price;
  const discountPercent = hasDiscount ? Math.round((1 - hotel.price / (hotel.originalPrice as number)) * 100) : null;
  const stars = Math.max(0, Math.min(5, Math.round(hotel.rating || 0)));
  const nightlyPrice = hotel.pricePerNight || hotel.price;
  const guestsLabel = `${hotel.guests} hóspede${hotel.guests > 1 ? "s" : ""}`;

  // Botões internos abrem o hotel sem disparar também o clique do card.
  const handleOpenButton = (e: MouseEvent) => {
    e.stopPropagation();
    onOpen();
  };

  const handleFavorite = (e: MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({
      key: favKey,
      title: hotel.name,
      image: hotel.image && hotel.image !== "/placeholder.svg" ? toCardImageUrl(hotel.image) : undefined,
      // Página própria do hotel (funciona fora da busca, ex.: aberta pelos Favoritos)
      path: `/hospedagem/hotel/${encodeURIComponent(hotel.id)}/${slugify(hotel.name || "hotel")}`,
      subtitle: hotel.location,
      rating: hotel.rating > 0 ? hotel.rating : undefined,
    });
  };

  const starsLabel = stars > 0 ? `${stars} estrela${stars > 1 ? "s" : ""}` : null;

  return (
    <article
      onClick={onOpen}
      className={`group relative flex flex-col md:flex-row md:gap-4 md:rounded-2xl md:border md:p-3 cursor-pointer rounded-2xl md:transition-shadow md:hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] ${
        hotel.isTestHotel ? "md:border-destructive" : "md:border-[#ebebeb]"
      }`}
    >
      {/* Foto / galeria */}
      <div className="relative w-full h-[230px] shrink-0 overflow-hidden rounded-2xl bg-muted md:w-[240px] md:h-[160px]">
        <div className="h-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((img, index) => (
              <div key={`${img}-${index}`} className="h-full min-w-0 flex-[0_0_100%]">
                <img
                  src={toCardImageUrl(img)}
                  alt={`${hotel.name} - Foto ${index + 1} de ${images.length}`}
                  loading={priority && index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover md:transition-transform md:duration-500 md:group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              disabled={isFetchingImages}
              onClick={handlePrevImage}
              aria-label="Foto anterior"
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1f1f1f] shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={isFetchingImages}
              onClick={handleNextImage}
              aria-label="Próxima foto"
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1f1f1f] shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Bolinhas da galeria */}
            <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-[5px]" aria-hidden="true">
              {images.slice(0, MAX_DOTS).map((_, index) => {
                const active =
                  currentImageIndex === index ||
                  (index === MAX_DOTS - 1 && currentImageIndex >= MAX_DOTS);
                return (
                  <i
                    key={index}
                    className={`block h-1.5 w-1.5 rounded-full bg-white transition-opacity ${active ? "opacity-100" : "opacity-[.55]"}`}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Selos (mantidos do card anterior) */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-64px)] flex-wrap gap-1.5">
          {hotel.isTestHotel && (
            <span className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold text-destructive-foreground">
              ⚠ HOTEL TEST
            </span>
          )}
          {isBestPrice && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
              Melhor preço
            </span>
          )}
          {hotel.freeCancellation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-green-700">
              <Check className="h-3 w-3" aria-hidden="true" />
              Cancelamento grátis
            </span>
          )}
          {discountPercent != null && discountPercent > 0 && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-primary">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Coração (favoritos locais) */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-pressed={fav}
          aria-label={fav ? `Remover ${hotel.name} dos favoritos` : `Salvar ${hotel.name} nos favoritos`}
          className="absolute right-0.5 top-0.5 z-10 flex h-11 w-11 items-center justify-center rounded-full md:right-2 md:top-2 md:h-9 md:w-9 md:bg-white/90 md:shadow-sm md:hover:bg-white"
        >
          <Heart
            className={`h-6 w-6 md:h-[18px] md:w-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] md:drop-shadow-none ${
              fav ? "fill-primary text-primary" : "text-white md:text-[#1f1f1f]"
            }`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Dados */}
      <div className="mt-2.5 min-w-0 flex-1 md:mt-0 md:py-1">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={`m-0 min-w-0 text-[15px] font-semibold leading-snug md:text-[17px] md:font-bold ${
              hotel.isTestHotel ? "text-destructive" : "text-foreground"
            }`}
          >
            {hotel.name}
          </h3>
          {/* Celular: estrelas em ícones ao lado do nome */}
          {stars > 0 && (
            <span className="mt-1 flex shrink-0 items-center gap-0.5 md:hidden" aria-label={starsLabel ?? undefined} role="img">
              {Array.from({ length: stars }, (_, i) => (
                <Star key={i} className="h-3 w-3 fill-foreground text-foreground" aria-hidden="true" />
              ))}
            </span>
          )}
        </div>

        {hotel.isTestHotel && (
          <p className="m-0 mt-1 text-xs font-medium text-destructive/80">
            Identificador de teste ETG: {hotel.id}
          </p>
        )}

        {/* Desktop: "★ N estrelas · endereço" */}
        <p className="m-0 mt-1 hidden text-sm text-muted-foreground md:block">
          {starsLabel && (
            <>
              <span aria-hidden="true">★ </span>
              {starsLabel}
              {hotel.location && " · "}
            </>
          )}
          {hotel.location}
        </p>
        {/* Celular: endereço */}
        {hotel.location && (
          <p className="m-0 truncate text-sm text-muted-foreground md:hidden">{hotel.location}</p>
        )}

        {(hotel.propertyType || hotel.reviewCount > 0) && (
          <p className="m-0 mt-1 hidden text-[13px] text-muted-foreground md:block">
            {hotel.propertyType}
            {hotel.propertyType && hotel.reviewCount > 0 && " · "}
            {hotel.reviewCount > 0 && `${hotel.reviewCount.toLocaleString("pt-BR")} avaliações`}
          </p>
        )}

        {/* Celular: preço + "Ver disponibilidade" sublinhado */}
        <div className="mt-1 text-sm md:hidden">
          {hotel.priceUnavailable ? (
            <p className="m-0">
              <span className="text-muted-foreground">Sob consulta · </span>
              <button
                type="button"
                onClick={handleOpenButton}
                aria-label={`Ver detalhes de ${hotel.name}`}
                className="-my-3 inline-flex min-h-[44px] items-center font-semibold text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                Ver detalhes
              </button>
            </p>
          ) : (
            <>
              <p className="m-0">
                {hasDiscount && (
                  <s className="mr-1.5 text-muted-foreground">{formatPrice(hotel.originalPrice as number)}</s>
                )}
                <span className="text-muted-foreground">a partir de </span>
                <b className="font-bold text-foreground">{formatPrice(nightlyPrice)}</b>
                <span className="text-muted-foreground"> / noite</span>
              </p>
              <p className="m-0 mt-0.5 text-[13px]">
                <span className="text-muted-foreground">
                  {hotel.nights && hotel.nights > 1
                    ? `Total: ${formatPrice(hotel.price)} · ${hotel.nights} noites · ${guestsLabel}`
                    : `Para ${guestsLabel}`}
                </span>
                <button
                  type="button"
                  onClick={handleOpenButton}
                  aria-label={`Ver disponibilidade de ${hotel.name}`}
                  className="-mb-2 flex min-h-[44px] items-center font-semibold text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Ver disponibilidade
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Desktop: preço + botão */}
      <div className="hidden shrink-0 flex-col items-end justify-end self-stretch text-right md:flex md:max-w-[220px]">
        {hotel.priceUnavailable ? (
          <>
            <span className="text-sm font-semibold text-primary">Sob consulta</span>
            <span className="mt-0.5 text-xs text-muted-foreground">Clique para ver detalhes e contato</span>
          </>
        ) : (
          <>
            <span className="text-[13px] text-muted-foreground">Preço para as suas datas</span>
            <span className="mt-0.5 leading-tight">
              {hasDiscount && (
                <s className="mr-1.5 text-sm text-muted-foreground">{formatPrice(hotel.originalPrice as number)}</s>
              )}
              <span className="text-[13px] text-muted-foreground">a partir de </span>
              <b className="text-xl font-bold text-foreground">{formatPrice(nightlyPrice)}</b>
              <span className="text-[13px] text-muted-foreground"> / noite</span>
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              {hotel.nights && hotel.nights > 1
                ? `Total: ${formatPrice(hotel.price)} · ${hotel.nights} noites · ${guestsLabel}`
                : `Para ${guestsLabel}`}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={handleOpenButton}
          aria-label={`Ver disponibilidade de ${hotel.name}`}
          className="mt-2 h-11 whitespace-nowrap rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Ver disponibilidade
        </button>
      </div>
    </article>
  );
});

HotelResultCard.displayName = "HotelResultCard";
export default HotelResultCard;
