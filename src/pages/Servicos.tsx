import React from "react";
import CategoryNav from "@/components/CategoryNav";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import EstablishmentCard from "@/components/EstablishmentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench } from "lucide-react";
import { useNovaxsEstablishments } from "@/hooks/useNovaxsEstablishments";
import heroImage from "@/assets/hero-servicos.webp";

const Servicos = () => {
  const { establishments, loading } = useNovaxsEstablishments(undefined, {
    enableFallbackAvailability: false,
  });
  const serviceEstablishments = establishments.filter(e => e.category === "servicos");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Serviços e Experiências em Gramado e Serra Gaúcha | Bah Ofertas"
        description="Spa, ensaios fotográficos e experiências exclusivas em Gramado, Canela e Serra Gaúcha. Reserve com descontos especiais no Bah Ofertas."
        canonical="/servicos"
        keywords="spa gramado, ensaio fotográfico gramado, experiências serra gaúcha, day spa canela"
        city="Serra Gaúcha"
      />

      <main className="flex-1">
        <section className="relative pt-20 pb-16 overflow-hidden bg-neutral-800">
          <img src={heroImage} alt="Banner da categoria Serviços" {...{ fetchpriority: "high" } as any} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
                Serviços na Serra Gaúcha
              </h1>
              <p className="text-white/80 text-lg max-w-xl mx-auto">
                Spa, ensaios fotográficos e experiências especiais
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : serviceEstablishments.length === 0 ? (
            <div className="text-center py-16">
              <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum serviço encontrado para esta data.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {serviceEstablishments.map((est) => (
                <EstablishmentCard key={est.id} establishment={est} />
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

export default Servicos;
