import React, { useState, memo } from "react";
import OfferProductCard from "@/components/OfferProductCard";
import OfferProductCardCompact from "@/components/OfferProductCardCompact";
import PromotionalBanner from "@/components/PromotionalBanner";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { type CarouselApi } from "@/components/ui/carousel";
import HomeSectionHeading from "@/components/home/HomeSectionHeading";
import { HOME_CONTAINER } from "@/components/home/layout";
import { useQuery } from "@tanstack/react-query";
import { useCarouselTouchPause } from "@/hooks/useCarouselTouchPause";
import { CarouselSkeletonLoader } from "@/components/ui/offer-skeleton";
import { useNovaxsEstablishments } from "@/hooks/useNovaxsEstablishments";
import { useBahofertasPartners } from "@/hooks/useBahofertasPartners";
import { useSelectedDate } from "@/components/GlobalDatePicker";
import { fetchHomePromotionalBanners } from "@/lib/promotional-banners";

const TertiaryFeaturedSection = memo(() => {
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();
  const [showAllItems, setShowAllItems] = useState(false);
  // Monta depois da busca da Home: mantém a data já escolhida pelo visitante.
  const { selectedDate } = useSelectedDate({ resetOnMount: false });
  const { offers: allOffers, establishments, loading } = useNovaxsEstablishments(selectedDate, { enableFallbackAvailability: false });
  const { offers: bahOffers, establishments: bahEstablishments, loading: bahLoading } = useBahofertasPartners();

  // Merge sources for the tertiary carousel:
  // 1) NovaXS offers from establishments flagged as tertiary (legacy behavior)
  // 2) NovaXS individual products explicitly marked as tertiary by the admin
  // 3) Bah Ofertas offers from parceiros opted into the tertiary carousel
  const offers = React.useMemo(() => {
    const hasAnyEstOverride = establishments.some(e => e.carouselTertiary !== undefined);
    const allowedEstIds = new Set(
      establishments.filter(e => e.carouselTertiary === true).map(e => e.id),
    );
    const novaxsList = allOffers.filter(o => {
      // Per-product flag wins, falls back to establishment flag
      if (o.carouselTertiary === true) return true;
      if (hasAnyEstOverride) return allowedEstIds.has(o.establishmentId);
      return true;
    });

    // Bah Ofertas: only include offers explicitly flagged by admin (per-offer)
    // or whose parent establishment was opted into the tertiary carousel.
    const allowedBahEstIds = new Set(
      bahEstablishments.filter(e => e.carouselTertiary === true).map(e => e.id),
    );
    const bahList = bahOffers.filter(o =>
      o.carouselTertiary === true || allowedBahEstIds.has(o.establishmentId),
    );

    // Deduplicate by id
    const seen = new Set<string>();
    return [...novaxsList, ...bahList].filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
  }, [allOffers, establishments, bahOffers, bahEstablishments]);

  const displayedOffers = React.useMemo(
    () => showAllItems ? offers : offers.slice(0, 8),
    [offers, showAllItems],
  );

  React.useEffect(() => {
    if (showAllItems || offers.length <= 8) return;
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setShowAllItems(true), { timeout: 2600 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(() => setShowAllItems(true), 2200);
    return () => clearTimeout(timer);
  }, [offers.length, showAllItems]);

  const { data: banners } = useQuery({
    queryKey: ["promo-banners-home"],
    queryFn: fetchHomePromotionalBanners,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
  const banner = banners?.before_tertiary || null;

  useCarouselTouchPause({ api: mobileApi, interval: 3000 });
  useCarouselTouchPause({ api: desktopApi, interval: 3000 });

  if (loading) {
    return (
      <section className="pt-6 md:pt-9 pb-3 relative overflow-hidden" aria-busy="true">
        <div className={HOME_CONTAINER}>
          <CarouselSkeletonLoader type="offer" />
        </div>
      </section>
    );
  }

  if (offers.length === 0) return null;

  return (
    <section className="pt-6 md:pt-9 pb-6 relative overflow-hidden" aria-labelledby="offers-heading">
      <div className={HOME_CONTAINER}>
        {/* Banner (quando houver) acima do título, como em Gastronomia — a seção nunca fica sem nome. */}
        {banner && <PromotionalBanner imageUrl={banner.image_url} title={banner.title} />}
        <HomeSectionHeading
          id="offers-heading"
          title="Ofertas e descontos"
          mobileTitle="Ofertas"
          aside={`${offers.length} produtos com desconto ou meia-entrada`}
        />

        <div className="md:hidden">
          <Carousel className="w-full" opts={{ align: "start", loop: true, dragFree: true }} setApi={setMobileApi}>
            <CarouselContent className="-ml-3">
              {displayedOffers.map((offer) => (
                <CarouselItem key={offer.id} className="pl-3 basis-[45%]">
                  <OfferProductCardCompact offer={offer} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <div className="hidden md:block">
          <Carousel className="w-full max-w-[1600px] mx-auto" opts={{ align: "start", loop: true, dragFree: true }} setApi={setDesktopApi}>
            <CarouselContent className="-ml-4">
              {displayedOffers.map((offer) => (
                <CarouselItem key={offer.id} className="pl-4 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <OfferProductCard offer={offer} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
});

TertiaryFeaturedSection.displayName = "TertiaryFeaturedSection";
export default TertiaryFeaturedSection;
