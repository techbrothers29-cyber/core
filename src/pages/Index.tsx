import { lazy, Suspense, useEffect, useState } from "react";
import HomeBottomNav from "@/components/home/HomeBottomNav";
import HeroSection from "@/components/HeroSection";
import SEOHead from "@/components/SEOHead";
import { jsonLdOrganization, jsonLdWebsite } from "@/lib/seo";
import FeaturedSection from "@/components/FeaturedSection";
import HomeSearchHero from "@/components/home/HomeSearchHero";
import HomeCategoryTabs from "@/components/home/HomeCategoryTabs";
import HomeSignupStrip from "@/components/home/HomeSignupStrip";
import { HOME_CONTAINER } from "@/components/home/layout";
import Footer from "@/components/Footer";
import { CarouselSkeletonLoader } from "@/components/ui/offer-skeleton";
import { prefetchEstabelecimento } from "@/lib/route-prefetch";

// Defer below-the-fold sections so the hero + first carousel paint faster
const SecondaryFeaturedSection = lazy(() => import("@/components/SecondaryFeaturedSection"));
const TertiaryFeaturedSection = lazy(() => import("@/components/TertiaryFeaturedSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));

const SectionSkeleton = () => (
  <section className="pt-6 md:pt-9 pb-3">
    <div className={HOME_CONTAINER}>
      <CarouselSkeletonLoader type="offer" />
    </div>
  </section>
);

const Index = () => {
  const [showDeferredSections, setShowDeferredSections] = useState(false);

  // Reset the global "data da visita" whenever the user lands on/returns to home,
  // so the next establishment visit starts at today's date.
  useEffect(() => {
    try {
      sessionStorage.removeItem("bah-novaxs-selected-date");
    } catch {}
  }, []);

  // Pre-warm the Estabelecimento chunk during browser idle time so the first
  // tap from the home feed feels instantaneous.
  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    const idle = w.requestIdleCallback;
    if (idle) {
      idle(() => prefetchEstabelecimento());
    } else {
      const timer = setTimeout(() => prefetchEstabelecimento(), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Mount below-the-fold sections only after the first paint/idle window. This
  // keeps secondary banners, extra carousels and their images from competing
  // with the hero + first carousel during a reload, especially on mobile.
  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setShowDeferredSections(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(() => setShowDeferredSections(true), 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <SEOHead
        title="Bah Ofertas — Hotéis, Restaurantes e Passeios na Serra Gaúcha"
        description="Reserve hotéis em Gramado e Canela, descontos em restaurantes, parques e passeios na Serra Gaúcha. Cupons e ofertas exclusivas com até 70% OFF no Bah Ofertas."
        canonical="/"
        keywords="bah ofertas, hotéis gramado, hotéis canela, ofertas serra gaúcha, restaurantes gramado, parques gramado, cupons desconto, hospedagem serra gaúcha"
        city="Serra Gaúcha"
        latitude={-29.3788}
        longitude={-50.8740}
        jsonLd={[jsonLdOrganization(), jsonLdWebsite()]}
      />
      <main role="main">
        <HomeSearchHero />
        <HomeCategoryTabs />
        <HomeSignupStrip variant="desktop" />
        <HeroSection />
        {/* Cada seção já é um <section> com título próprio; sem embrulho extra (evita nomes duplicados para leitor de tela). */}
        <FeaturedSection />
        <HomeSignupStrip variant="mobile" />
        {showDeferredSections && (
          <>
            <Suspense fallback={<SectionSkeleton />}>
              <SecondaryFeaturedSection />
            </Suspense>
            <Suspense fallback={<SectionSkeleton />}>
              <TertiaryFeaturedSection />
            </Suspense>
            <section aria-labelledby="testimonials-heading">
              <h2 id="testimonials-heading" className="sr-only">Avaliações dos clientes</h2>
              <Suspense fallback={null}>
                <TestimonialsSection />
              </Suspense>
            </section>
          </>
        )}
      </main>
      <Footer />
      <HomeBottomNav />
    </div>
  );
};

export default Index;
