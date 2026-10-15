import React, { useState, memo } from "react";
import { HomeEstablishmentCard } from "@/components/home/HomeCards";
import PromotionalBanner from "@/components/PromotionalBanner";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { type CarouselApi } from "@/components/ui/carousel";
import HomeSectionHeading from "@/components/home/HomeSectionHeading";
import { HOME_CONTAINER } from "@/components/home/layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCarouselTouchPause } from "@/hooks/useCarouselTouchPause";
import { CarouselSkeletonLoader } from "@/components/ui/offer-skeleton";
import { useNovaxsEstablishments } from "@/hooks/useNovaxsEstablishments";
import { useBahofertasPartners } from "@/hooks/useBahofertasPartners";
import { useSelectedDate } from "@/components/GlobalDatePicker";
import { fetchHomePromotionalBanners } from "@/lib/promotional-banners";

const SecondaryFeaturedSection = memo(() => {
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();
  const [showAllItems, setShowAllItems] = useState(false);
  // Monta depois da busca da Home: mantém a data já escolhida pelo visitante.
  const { selectedDate } = useSelectedDate({ resetOnMount: false });
  const { restaurantEstablishments: allRestaurants, loading } = useNovaxsEstablishments(selectedDate, { enableFallbackAvailability: true });
  const { establishments: bahEstablishments, loading: bahLoading } = useBahofertasPartners();

  // Merge NovaXS restaurants with Bah Ofertas parceiros that opted into the secondary carousel
  const restaurantEstablishments = React.useMemo(() => {
    const hasAnyOverride = allRestaurants.some(e => e.carouselSecondary !== undefined);
    const novaxsList = !hasAnyOverride
      ? allRestaurants
      : allRestaurants.filter(e => e.carouselSecondary === true);
    // Se o admin marcou qualquer carrossel, essa seleção manda. Sem marcação, usa a categoria como fallback.
    const bahList = bahEstablishments.filter(
      e => {
        const hasCarouselSelection = e.carouselPrimary || e.carouselSecondary || e.carouselTertiary;
        return hasCarouselSelection ? e.carouselSecondary === true : e.category === "restaurante";
      }
    );
    return [...novaxsList, ...bahList];
  }, [allRestaurants, bahEstablishments]);

  const displayedEstablishments = React.useMemo(
    () => showAllItems ? restaurantEstablishments : restaurantEstablishments.slice(0, 8),
    [restaurantEstablishments, showAllItems],
  );

  React.useEffect(() => {
    if (showAllItems || restaurantEstablishments.length <= 8) return;
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setShowAllItems(true), { timeout: 2400 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(() => setShowAllItems(true), 2000);
    return () => clearTimeout(timer);
  }, [restaurantEstablishments.length, showAllItems]);

  const { data: banners } = useQuery({
    queryKey: ["promo-banners-home"],
    queryFn: fetchHomePromotionalBanners,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
  const banner = banners?.before_secondary || null;

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

  if (restaurantEstablishments.length === 0) return null;

  return (
    <section className="pt-6 md:pt-9 pb-3 relative overflow-hidden" aria-labelledby="restaurants-heading">
      <div className={HOME_CONTAINER}>
        {banner && (
          <PromotionalBanner imageUrl={banner.image_url} title={banner.title} />
        )}

        <HomeSectionHeading id="restaurants-heading" title="Gastronomia" to="/restaurantes" />

        <div className="md:hidden">
          <Carousel className="w-full" opts={{ align: "start", loop: true, dragFree: true }} setApi={setMobileApi}>
            <CarouselContent className="-ml-3">
              {displayedEstablishments.map((est) => (
                <CarouselItem key={est.id} className="pl-3 basis-[45%]">
                  <HomeEstablishmentCard establishment={est} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <div className="hidden md:block">
          <Carousel className="w-full max-w-[1600px] mx-auto" opts={{ align: "start", loop: true, dragFree: true }} setApi={setDesktopApi}>
            <CarouselContent className="-ml-5">
              {displayedEstablishments.map((est) => (
                <CarouselItem key={est.id} className="pl-5 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <HomeEstablishmentCard establishment={est} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
});

SecondaryFeaturedSection.displayName = "SecondaryFeaturedSection";
export default SecondaryFeaturedSection;
