import React, { useState, memo } from "react";
import { HomeEstablishmentCard } from "@/components/home/HomeCards";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { type CarouselApi } from "@/components/ui/carousel";
import HomeSectionHeading from "@/components/home/HomeSectionHeading";
import { HOME_CONTAINER } from "@/components/home/layout";
import { useCarouselTouchPause } from "@/hooks/useCarouselTouchPause";
import { CarouselSkeletonLoader } from "@/components/ui/offer-skeleton";
import { useNovaxsEstablishments } from "@/hooks/useNovaxsEstablishments";
import { useBahofertasPartners } from "@/hooks/useBahofertasPartners";
import { useSelectedDate } from "@/components/GlobalDatePicker";
import { isUdriveEstablishmentName } from "@/lib/udrive-freebie";

const FeaturedSection = memo(() => {
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();
  const { selectedDate } = useSelectedDate();
  const { entertainmentEstablishments: allEntertainment, loading } = useNovaxsEstablishments(selectedDate, { enableFallbackAvailability: true });
  const { establishments: bahEstablishments, loading: bahLoading } = useBahofertasPartners();

  // Merge NovaXS entertainment with Bah Ofertas parceiros that opted into the primary carousel
  const entertainmentEstablishments = React.useMemo(() => {
    const hasAnyOverride = allEntertainment.some(e => e.carouselPrimary !== undefined);
    const novaxsList = (!hasAnyOverride
      ? allEntertainment
      : allEntertainment.filter(e => e.carouselPrimary === true)
    ).filter(e => !isUdriveEstablishmentName(e.name) && !isUdriveEstablishmentName(e.displayName));
    // Se o admin marcou qualquer carrossel, essa seleção manda. Sem marcação, usa a categoria como fallback.
    const bahList = bahEstablishments.filter(
      e => {
        const hasCarouselSelection = e.carouselPrimary || e.carouselSecondary || e.carouselTertiary;
        return hasCarouselSelection ? e.carouselPrimary === true : e.category === "entretenimento";
      }
    );
    return [...novaxsList, ...bahList];
  }, [allEntertainment, bahEstablishments]);

  const displayedEstablishments = entertainmentEstablishments;

  useCarouselTouchPause({ api: mobileApi, interval: 3000 });
  useCarouselTouchPause({ api: desktopApi, interval: 3000 });

  // Render as soon as NovaXS data is ready — don't block on Bah Ofertas partners.
  if (loading) {
    return (
      <section className="pt-6 md:pt-9 pb-3 relative overflow-hidden" aria-busy="true">
        <div className={HOME_CONTAINER}>
          <CarouselSkeletonLoader type="offer" />
        </div>
      </section>
    );
  }

  if (entertainmentEstablishments.length === 0) return null;

  return (
    <section className="pt-6 md:pt-9 pb-3 relative overflow-hidden" aria-labelledby="entertainment-heading">
      <div className={HOME_CONTAINER}>
        <HomeSectionHeading
          id="entertainment-heading"
          title="Parques, atrações e passeios"
          to="/entretenimento"
        />

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

FeaturedSection.displayName = "FeaturedSection";
export default FeaturedSection;
