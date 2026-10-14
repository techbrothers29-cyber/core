import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { CarouselApi } from "@/components/ui/carousel";
import mariaSilva from "@/assets/avatars/maria-silva.jpg";
import joaoSantos from "@/assets/avatars/joao-santos.jpg";
import anaCosta from "@/assets/avatars/ana-costa.jpg";
import pedroOliveira from "@/assets/avatars/pedro-oliveira.jpg";
import carlaMendes from "@/assets/avatars/carla-mendes.jpg";
import lucasFerreira from "@/assets/avatars/lucas-ferreira.jpg";

interface Testimonial {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

const mockTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "Maria Silva",
    avatar: mariaSilva,
    rating: 5,
    comment: "Excelente plataforma! Consegui ótimos descontos em diversos estabelecimentos. Super recomendo!",
    date: "Há 2 dias"
  },
  {
    id: 2,
    name: "João Santos",
    avatar: joaoSantos,
    rating: 4.5,
    comment: "Muito prático e fácil de usar. As ofertas são realmente vantajosas e a variedade de parceiros é ótima.",
    date: "Há 1 semana"
  },
  {
    id: 3,
    name: "Ana Costa",
    avatar: anaCosta,
    rating: 5,
    comment: "Adorei! Já economizei muito usando a plataforma. O atendimento dos parceiros também é excelente.",
    date: "Há 3 semanas"
  },
  {
    id: 4,
    name: "Pedro Oliveira",
    avatar: pedroOliveira,
    rating: 4.8,
    comment: "Plataforma confiável com ótimas promoções. Vale muito a pena para quem quer economizar com qualidade.",
    date: "Há 1 mês"
  },
  {
    id: 5,
    name: "Carla Mendes",
    avatar: carlaMendes,
    rating: 5,
    comment: "Simplesmente perfeita! Os descontos são reais e os parceiros são de primeira qualidade. Nota 10!",
    date: "Há 1 mês"
  },
  {
    id: 6,
    name: "Lucas Ferreira",
    avatar: lucasFerreira,
    rating: 4.7,
    comment: "Estou muito satisfeito com as ofertas. A plataforma é intuitiva e o processo de compra é bem simples.",
    date: "Há 2 meses"
  }
];

const TestimonialsSection = () => {
  const [api, setApi] = useState<CarouselApi>();

  const scrollNext = useCallback(() => {
    if (api) {
      api.scrollNext();
    }
  }, [api]);

  // Auto rotation effect
  useEffect(() => {
    if (!api) return;
    const interval = setInterval(() => {
      scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [scrollNext, api]);

  return (
    <section className="pt-4 pb-0 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-gradient-to-tl from-accent/10 to-transparent rounded-xl blur-lg animate-pulse delay-700" />

      <div className="container mx-auto px-4">
        <Carousel
          setApi={setApi}
          className="w-full max-w-2xl mx-auto"
          opts={{
            align: "start",
            loop: true
          }}
        >
          <CarouselContent>
            {mockTestimonials.map((testimonial) => (
              <CarouselItem key={testimonial.id}>
                <Card
                  className="group border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="w-12 h-12 ring-2 ring-primary/10">
                        <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{testimonial.name}</h3>
                        <p className="text-xs text-muted-foreground">{testimonial.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(testimonial.rating)
                              ? "fill-yellow-500 text-yellow-500"
                              : i < testimonial.rating
                              ? "fill-yellow-500/50 text-yellow-500"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-semibold text-foreground">
                        {testimonial.rating.toFixed(1)}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed">
                      "{testimonial.comment}"
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 opacity-10 hover:opacity-100 transition-opacity bg-background/30 backdrop-blur-sm border-none shadow-none" />
          <CarouselNext className="right-2 opacity-10 hover:opacity-100 transition-opacity bg-background/30 backdrop-blur-sm border-none shadow-none" />
        </Carousel>
      </div>
    </section>
  );
};

export default TestimonialsSection;
