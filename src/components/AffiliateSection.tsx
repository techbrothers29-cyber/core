import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { TrendingUp, Users, DollarSign, Target, ArrowRight } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
const AffiliateSection = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollNext = useCallback(() => {
    if (api) {
      api.scrollNext();
    }
  }, [api]);

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      scrollNext();
    }, 3500); // 3.5 seconds

    return () => clearInterval(interval);
  }, [scrollNext]);

  // Auto-rotate background slides
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 4);
    }, 4000); // 4 seconds

    return () => clearInterval(slideInterval);
  }, []);
  const benefits = [{
    icon: DollarSign,
    title: "Comissões Altas",
    description: "Ganhe até 15% de comissão em cada venda realizada através dos seus links"
  }, {
    icon: Target,
    title: "Fácil de Promover",
    description: "Ofertas irresistíveis que se vendem sozinhas - alta conversão garantida"
  }, {
    icon: TrendingUp,
    title: "Pagamentos em Dia",
    description: "Receba seus ganhos pontualmente, sem burocracia ou atraso"
  }, {
    icon: Users,
    title: "Suporte Dedicado",
    description: "Equipe especializada para ajudar você a maximizar seus resultados"
  }];
  return <section className="relative py-20 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/15">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-secondary/15 rounded-full blur-2xl animate-pulse delay-1000" />

    </section>;
};
export default AffiliateSection;