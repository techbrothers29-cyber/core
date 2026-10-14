import React from "react";
import CategoryNav from "@/components/CategoryNav";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import EstablishmentCard from "@/components/EstablishmentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { UtensilsCrossed } from "lucide-react";
import { useNovaxsEstablishments } from "@/hooks/useNovaxsEstablishments";
import { useBahofertasPartners } from "@/hooks/useBahofertasPartners";
import { useSelectedDate } from "@/components/GlobalDatePicker";
import heroImage from "@/assets/hero-restaurantes.webp";

const Restaurantes = () => {
  const { selectedDate } = useSelectedDate();
  const { restaurantEstablishments, loading } = useNovaxsEstablishments(selectedDate, { enableFallbackAvailability: true });
  const { establishments: bahEstablishments } = useBahofertasPartners();
  // Apenas estabelecimentos ativos em algum carrossel são exibidos nesta categoria.
  const visibleEstablishments = React.useMemo(() => {
    const novaxs = restaurantEstablishments.filter(
      (e) => e.carouselPrimary || e.carouselSecondary || e.carouselTertiary
    );
    // Se o admin marcou qualquer carrossel, essa seleção manda. Sem marcação, usa a categoria como fallback.
    const bah = bahEstablishments.filter((e) => {
      const hasCarouselSelection = e.carouselPrimary || e.carouselSecondary || e.carouselTertiary;
      return hasCarouselSelection ? e.carouselSecondary === true : e.category === "restaurante";
    });
    return [...novaxs, ...bah];
  }, [restaurantEstablishments, bahEstablishments]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Restaurantes na Serra Gaúcha | Bah Ofertas"
        description="Os melhores restaurantes da Serra Gaúcha com descontos exclusivos. Reserve mesas em Gramado, Canela e região com cupons especiais no Bah Ofertas."
        canonical="/restaurantes"
        keywords="restaurantes serra gaúcha, restaurantes gramado, restaurantes canela, cupons restaurantes, ofertas gastronomia"
        city="Serra Gaúcha"
      />



      <main className="flex-1">
        <section className="relative pt-20 pb-16 overflow-hidden bg-neutral-800">
          <img src={heroImage} alt="Banner da categoria Restaurantes" {...{ fetchpriority: "high" } as any} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
                Restaurantes na Serra Gaúcha
              </h1>
              <p className="text-white/80 text-lg max-w-xl mx-auto">
                Gastronomia de primeira com preços especiais e exclusivos
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fluid-stagger">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : visibleEstablishments.length === 0 ? (
            <div className="text-center py-16 fluid-stagger">
              <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum restaurante encontrado para esta data.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fluid-stagger">
              {visibleEstablishments.map((est) => (
                <div key={est.id} className="fluid-card">
                  <EstablishmentCard establishment={est} />
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      <Footer />
      <CategoryNav />
    </div>
  );
};

export default Restaurantes;
