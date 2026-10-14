import React from "react";
import CategoryNav from "@/components/CategoryNav";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import EstablishmentCard from "@/components/EstablishmentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Gamepad2 } from "lucide-react";
import { useNovaxsEstablishments } from "@/hooks/useNovaxsEstablishments";
import { useBahofertasPartners } from "@/hooks/useBahofertasPartners";
import { useSelectedDate } from "@/components/GlobalDatePicker";
import heroImage from "@/assets/hero-entretenimento.webp";

const Entretenimento = () => {
  const { selectedDate } = useSelectedDate();
  const { entertainmentEstablishments, loading } = useNovaxsEstablishments(selectedDate, { enableFallbackAvailability: true });
  const { establishments: bahEstablishments, loading: bahLoading } = useBahofertasPartners();
  // Apenas estabelecimentos ativos em algum carrossel são exibidos nesta categoria.
  const visibleEstablishments = React.useMemo(() => {
    const isNotChocoland = (name: string | undefined) =>
      !name || !/chocoland/i.test(name);
    const novaxs = entertainmentEstablishments.filter(
      (e) => (e.carouselPrimary || e.carouselSecondary || e.carouselTertiary) && isNotChocoland(e.name)
    );
    // Se o admin marcou qualquer carrossel, essa seleção manda. Sem marcação, usa a categoria como fallback.
    const bah = bahEstablishments.filter((e) => {
      const hasCarouselSelection = e.carouselPrimary || e.carouselSecondary || e.carouselTertiary;
      return hasCarouselSelection ? e.carouselPrimary === true : e.category === "entretenimento";
    }).filter((e) => isNotChocoland(e.name));
    return [...novaxs, ...bah];
  }, [entertainmentEstablishments, bahEstablishments]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Entretenimento em Gramado, Canela e Serra Gaúcha | Bah Ofertas"
        description="Parques, atrações e passeios imperdíveis em Gramado, Canela e Serra Gaúcha. Ingressos com descontos exclusivos para Snowland, Acquamotion, Mini Mundo e mais."
        canonical="/entretenimento"
        keywords="parques gramado, snowland, acquamotion, mini mundo, ingressos gramado, atrações serra gaúcha, passeios canela"
        city="Serra Gaúcha"
      />

      <main className="flex-1">
        <section className="relative pt-20 pb-16 overflow-hidden bg-neutral-800">
          <img src={heroImage} alt="Banner da categoria Entretenimento" {...{ fetchpriority: "high" } as any} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
                Entretenimento na Serra Gaúcha
              </h1>
              <p className="text-white/80 text-lg max-w-xl mx-auto">
                Parques, atrações e passeios imperdíveis com preços exclusivos
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
              <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum estabelecimento encontrado para esta data.</p>
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

export default Entretenimento;
