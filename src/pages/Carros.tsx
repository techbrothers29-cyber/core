import React from "react";
import CategoryNav from "@/components/CategoryNav";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Car } from "lucide-react";
import bahOfertasLogo from "@/assets/bahofertas-logo.png";
import rentcarsLogo from "@/assets/rentcars-logo.webp";
import heroImage from "@/assets/hero-carros.webp";

const Carros = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Aluguel de Carros em Gramado e Serra Gaúcha | Bah Ofertas"
        description="Alugue carros nos melhores preços para sua viagem a Gramado, Canela e Serra Gaúcha. Parceria Bah Ofertas × Rentcars com tarifas exclusivas."
        canonical="/carros"
        keywords="aluguel carros gramado, locadora canela, rent a car serra gaúcha, alugar carro porto alegre"
      />

      <main className="flex-1">
        <section className="relative pt-20 pb-16 overflow-hidden bg-neutral-800">
          <img src={heroImage} alt="Banner da categoria Aluguel de Carros" {...{ fetchpriority: "high" } as any} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
                Aluguel de Carros
              </h1>
              <p className="text-white/80 text-lg max-w-xl mx-auto">
                Parceria <strong className="text-white">Bah Ofertas</strong> × <strong className="text-white">Rentcars</strong> — as melhores tarifas para sua viagem
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-6 md:py-10 flex justify-center">
          <div className="w-full max-w-[600px] lg:max-w-[900px]">
            <div className="bg-white rounded-t-xl border border-border/50 px-4 py-3 flex items-center justify-center gap-3 shadow-sm overflow-hidden">
              <img src={bahOfertasLogo} alt="Bah Ofertas" className="h-7 sm:h-8 md:h-10 object-contain shrink-0" />
              <span className="text-muted-foreground font-bold text-sm sm:text-base md:text-lg shrink-0">×</span>
              <img src={rentcarsLogo} alt="Rentcars" className="h-5 sm:h-6 md:h-8 object-contain shrink-0 max-w-[120px] sm:max-w-[140px] md:max-w-none" />
            </div>
            <iframe
              src="https://widgets.rentcars.com/widget-v13.html?requestor=10510&locale=pt-br&utm_source=bahofertas.com&utm_medium=afiliado-widget"
              width="100%"
              className="border-0 rounded-b-xl shadow-lg bg-white h-[620px] sm:h-[520px] md:h-[460px]"
              title="Buscar aluguel de carros - Rentcars"
              loading="lazy"
              allow="geolocation"
            />
          </div>
        </section>
      </main>

      <Footer />
      <CategoryNav />
    </div>
  );
};

export default Carros;
