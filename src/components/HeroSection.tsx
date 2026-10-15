import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { type CarouselApi } from "@/components/ui/carousel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { optimizedImage } from "@/lib/image-optimize";
import { HOME_CONTAINER } from "@/components/home/layout";

interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  mobile_image_url?: string;
  desktop_image_url?: string;
  is_active: boolean;
  display_order: number;
}

const SLIDES_CACHE_KEY = "bah:hero-slides:v2";
const INTERVAL_CACHE_KEY = "bah:hero-interval:v2";

// Purge legacy cache keys so old cached slides don't linger on returning devices.
try {
  ["bah:hero-slides:v1", "bah:hero-interval:v1"].forEach((k) => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
} catch {}

function readCache<T>(key: string): { data: T; t: number } | null {
  try {
    const raw = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key))
      || (typeof localStorage !== 'undefined' && localStorage.getItem(key));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writeCache<T>(key: string, data: T) {
  try {
    const payload = JSON.stringify({ data, t: Date.now() });
    sessionStorage.setItem(key, payload);
    localStorage.setItem(key, payload);
  } catch {}
}

async function fetchHeroSlides(): Promise<BannerSlide[]> {
  const { data } = await supabase
    .from('banner_slides')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  const slides = (data || []) as BannerSlide[];
  writeCache(SLIDES_CACHE_KEY, slides);
  return slides;
}

async function fetchHeroInterval(): Promise<number> {
  const { data } = await supabase
    .from('carousel_settings')
    .select('rotation_interval')
    .eq('carousel_type', 'hero')
    .maybeSingle();
  const val = data?.rotation_interval || 6000;
  writeCache(INTERVAL_CACHE_KEY, val);
  return val;
}

const HeroSection = memo(() => {
  const [api, setApi] = useState<CarouselApi>();
  const isUserInteractingRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; snap: number } | null>(null);
  const queryClient = useQueryClient();

  const cachedSlides = readCache<BannerSlide[]>(SLIDES_CACHE_KEY);
  const cachedInterval = readCache<number>(INTERVAL_CACHE_KEY);

  // Slides query renders ASAP; settings query is independent and non-blocking.
  const { data: slidesData } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: fetchHeroSlides,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    initialData: cachedSlides?.data,
    initialDataUpdatedAt: cachedSlides?.t,
  });

  const { data: intervalData } = useQuery({
    queryKey: ["hero-interval"],
    queryFn: fetchHeroInterval,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: cachedInterval?.data,
    initialDataUpdatedAt: cachedInterval?.t,
  });

  const slides: BannerSlide[] = Array.isArray(slidesData) ? slidesData : [];

  // Realtime: sync when admin adds/edits/removes slides.
  useEffect(() => {
    const channel = supabase
      .channel('public-hero-slides')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banner_slides' }, () => {
        try {
          sessionStorage.removeItem(SLIDES_CACHE_KEY);
          localStorage.removeItem(SLIDES_CACHE_KEY);
        } catch {}
        queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);


  // Preload first banner image so it paints as soon as possible (LCP).
  useEffect(() => {
    if (!slides.length) return;
    const first = slides[0];
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const raw = (isMobile && first.mobile_image_url) || first.desktop_image_url || first.image_url;
    // Match the exact transform the rendered <source>/<img> will use so the preload is reused.
    const href = optimizedImage(raw, isMobile ? 828 : 1600, isMobile ? 72 : 80, isMobile ? "cover" : "contain");
    if (!href) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority = 'high';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, [slides]);

  const rotationInterval = Math.max(intervalData || 6000, 4000);
  const scrollNext = useCallback(() => {
    if (!isUserInteractingRef.current) api?.scrollNext();
  }, [api]);

  useEffect(() => {
    if (!api) return;

    const pause = () => { isUserInteractingRef.current = true; };
    const resume = () => { isUserInteractingRef.current = false; };

    api.on("pointerDown", pause);
    api.on("pointerUp", resume);
    api.on("settle", resume);

    return () => {
      api.off("pointerDown", pause);
      api.off("pointerUp", resume);
      api.off("settle", resume);
    };
  }, [api]);

  useEffect(() => {
    if (!api || slides.length <= 1) return;
    const id = setInterval(scrollNext, rotationInterval);
    return () => clearInterval(id);
  }, [api, scrollNext, rotationInterval, slides.length]);

  const handleHeroTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!api || event.touches.length !== 1) return;
    const touch = event.touches[0];
    isUserInteractingRef.current = true;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      snap: api.selectedScrollSnap(),
    };
  }, [api]);

  const handleHeroTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!api || !start || event.changedTouches.length === 0) {
      isUserInteractingRef.current = false;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX >= 35 && absX > absY * 1.2) {
      window.setTimeout(() => {
        if (api.selectedScrollSnap() === start.snap) {
          if (deltaX < 0) api.scrollNext();
          else api.scrollPrev();
        }
        isUserInteractingRef.current = false;
      }, 120);
      return;
    }

    isUserInteractingRef.current = false;
  }, [api]);

  const handleHeroTouchCancel = useCallback(() => {
    touchStartRef.current = null;
    isUserInteractingRef.current = false;
  }, []);

  // Reserve hero space even while loading to prevent layout shift (CLS).
  if (slides.length === 0) {
    return (
      <section className={`${HOME_CONTAINER} mt-5 md:mt-7 relative`} aria-label="Banners promocionais">
        <div className="w-full h-[160px] md:h-auto md:aspect-[32/5] rounded-2xl bg-muted animate-pulse" />
      </section>
    );
  }

  return (
    <section className={`${HOME_CONTAINER} mt-5 md:mt-7 relative`} aria-label="Banners promocionais">
      <Carousel
        className="w-full overflow-hidden rounded-2xl select-none"
        opts={{ align: "start", loop: true, dragFree: false, watchDrag: true, skipSnaps: false }}
        setApi={setApi}
        role="region"
        aria-label="Carousel de ofertas principais"
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
        onTouchCancel={handleHeroTouchCancel}
      >
        <CarouselContent className="-ml-0">
          {slides.map((slide, index) => {
            const hasText = slide.title || slide.subtitle || slide.description;
            const mobileSrc = optimizedImage(slide.mobile_image_url || slide.image_url, 828, 72, "cover");
            const desktopSrc = optimizedImage(slide.desktop_image_url || slide.image_url, 1600, 80, "contain");
            return (
              <CarouselItem key={slide.id || index} className="pl-0">
                {/* Celular: altura fixa com imagem própria (cover). Tablet/desktop: proporção 1600x250 do banner, sem faixas vazias. */}
                <article className="relative h-[160px] md:h-auto md:aspect-[32/5] overflow-hidden rounded-2xl select-none" itemScope itemType="https://schema.org/Offer">
                  <div className="absolute inset-0">
                    <picture>
                      <source media="(max-width: 767px)" srcSet={mobileSrc} />
                      <source media="(min-width: 768px)" srcSet={desktopSrc} />
                      <img
                        src={desktopSrc}
                        alt={hasText ? `Oferta especial: ${slide.title} ${slide.subtitle} - ${slide.description}` : "Banner promocional Bah Ofertas - Serra Gaúcha"}
                        className="w-full h-full object-cover md:object-contain object-center bg-muted pointer-events-none select-none"
                        draggable={false}
                        width={1600}
                        height={250}
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding={index === 0 ? "sync" : "async"}
                        // @ts-expect-error fetchpriority is a valid HTML attr not in React types yet
                        fetchpriority={index === 0 ? "high" : "low"}
                        onError={(e) => {
                          const img = e.currentTarget;
                          const original = (window.matchMedia('(max-width: 767px)').matches
                            ? slide.mobile_image_url : slide.desktop_image_url) || slide.image_url;
                          if (original && img.dataset.fallbackApplied !== '1') {
                            img.dataset.fallbackApplied = '1';
                            img.parentElement?.querySelectorAll('source').forEach((s) => s.remove());
                            img.src = original;
                            return;
                          }
                          img.onerror = null;
                          img.style.display = 'none';
                        }}
                        itemProp="image"
                      />
                    </picture>
                    {hasText && <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />}
                  </div>
                  {hasText && (
                    <div className="relative h-full flex items-center">
                      <div className="container mx-auto px-6">
                        <div className="max-w-lg text-white">
                          <h2 className="text-3xl md:text-4xl font-bold mb-2 leading-tight" itemProp="name">
                            {slide.title}<br />
                            <span className="text-warning">{slide.subtitle}</span>
                          </h2>
                          <p className="text-lg mb-4 text-white/90" itemProp="description">{slide.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </section>
  );
});

HeroSection.displayName = "HeroSection";
export default HeroSection;
