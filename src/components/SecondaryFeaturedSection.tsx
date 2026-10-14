import React, { useState, memo } from "react";
import EstablishmentCard from "@/components/EstablishmentCard";
import EstablishmentCardCompact from "@/components/EstablishmentCardCompact";
import PromotionalBanner from "@/components/PromotionalBanner";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { type CarouselApi } from "@/components/ui/carousel";
import { UtensilsCrossed } from "lucide-react";
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
  const { selectedDate } = useSelectedDate();
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
      <section className="py-6 relative overflow-hidden bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-[1600px] mx-auto">
            <CarouselSkeletonLoader type="offer" />
          </div>
        </div>
      </section>
    );
  }

  if (restaurantEstablishments.length === 0) return null;

  return (
    <section className="pt-1 pb-6 relative overflow-hidden bg-muted/30" aria-labelledby="restaurants-heading">
      <div className="container mx-auto px-4">
        {banner && (
          <PromotionalBanner imageUrl={banner.image_url} title={banner.title} />
        )}

        <div className="flex items-center justify-center mb-3 md:hidden">
          <h2 id="restaurants-heading" className="text-lg font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            Gastronomia
          </h2>
        </div>
        <div className="hidden md:block text-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-primary flex items-center justify-center gap-2">
            <UtensilsCrossed className="h-6 w-6" />
            Gastronomia
          </h2>
        </div>

        <div className="md:hidden">
          <Carousel className="w-full" opts={{ align: "start", loop: true, dragFree: true }} setApi={setMobileApi}>
            <CarouselContent className="-ml-3">
              {displayedEstablishments.map((est) => (
                <CarouselItem key={est.id} className="pl-3 basis-[45%]">
                  <EstablishmentCardCompact establishment={est} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <div className="hidden md:block">
          <Carousel className="w-full max-w-[1600px] mx-auto" opts={{ align: "start", loop: true, dragFree: true }} setApi={setDesktopApi}>
            <CarouselContent className="-ml-4">
              {displayedEstablishments.map((est) => (
                <CarouselItem key={est.id} className="pl-4 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <EstablishmentCard establishment={est} />
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
