import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Star, MapPin, ArrowLeft, ArrowRight, Wifi, Car, Coffee } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import SEOContentBlock from "@/components/SEOContentBlock";
import Footer from "@/components/Footer";
import CategoryNav from "@/components/CategoryNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  buildHotelSeo,
  buildHotelFaq,
  jsonLdHotel,
  jsonLdBreadcrumb,
  jsonLdFaq,
  absoluteUrl,
  slugify,
} from "@/lib/seo";

interface EtgHotelRow {
  hid: number | string;
  id?: string;
  name: string;
  city: string | null;
  address: string | null;
  star_rating: number | null;
  latitude: number | null;
  longitude: number | null;
  images: any;
  amenities: any;
  description_struct: any;
}

const HotelDetalhe: React.FC = () => {
  const { hid, slug } = useParams<{ hid: string; slug: string }>();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<EtgHotelRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("etg_hotels")
          .select("hid, id, name, city, address, star_rating, latitude, longitude, images, amenities, description_struct")
          .eq("hid", String(hid))
          .maybeSingle();
        if (!cancelled) setHotel((data as any) || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hid]);

  const photos = useMemo<string[]>(() => {
    const imgs = Array.isArray(hotel?.images) ? (hotel!.images as any[]) : [];
    return imgs
      .slice(0, 8)
      .map((u) => {
        const s = String(u || "");
        if (!s) return "";
        // ETG returns URLs with a {size} template; substitute a real size
        if (s.includes("{size}")) return s.replace("{size}", "1024x768");
        return s;
      })
      .filter(Boolean);
  }, [hotel]);

  const descParagraphs: string[] = useMemo(() => {
    const ds = hotel?.description_struct;
    if (!Array.isArray(ds)) return [];
    return ds.flatMap((d: any) => Array.isArray(d?.paragraphs) ? d.paragraphs : []).slice(0, 12);
  }, [hotel]);

  const city = hotel?.city || "Gramado";
  const canonical = `/hospedagem/hotel/${hid}/${slug || slugify(hotel?.name || "hotel")}`;
  const seo = buildHotelSeo({
    name: hotel?.name || "Hotel",
    city,
    starRating: hotel?.star_rating || undefined,
    description: descParagraphs[0],
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 max-w-5xl">
          <Skeleton className="h-72 w-full rounded-xl mb-4" />
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-6" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </main>
        <Footer />
        <CategoryNav />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Hotel não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Confira outros hotéis disponíveis em Gramado e Canela.
          </p>
          <Button asChild>
            <Link to="/hospedagem">Ver hotéis</Link>
          </Button>
        </main>
        <Footer />
        <CategoryNav />
      </div>
    );
  }

  const reserveHref = `/hospedagem?destination=${encodeURIComponent((city || "gramado").toLowerCase())}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonical={canonical}
        image={photos[0]}
        type="place"
        city={city}
        latitude={hotel.latitude || undefined}
        longitude={hotel.longitude || undefined}
        jsonLd={[
          jsonLdHotel({
            name: hotel.name,
            url: absoluteUrl(canonical),
            image: photos[0],
            description: descParagraphs.join(" ") || seo.description,
            city,
            address: hotel.address || undefined,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            starRating: hotel.star_rating,
          }),
          jsonLdBreadcrumb([
            { name: "Início", url: absoluteUrl("/") },
            { name: "Hospedagem", url: absoluteUrl("/hospedagem") },
            { name: `Hotéis em ${city}`, url: absoluteUrl(`/hoteis-em-${slugify(city)}`) },
            { name: hotel.name, url: absoluteUrl(canonical) },
          ]),
          jsonLdFaq(buildHotelFaq({
            name: hotel.name,
            city,
            starRating: hotel.star_rating,
            amenities: Array.isArray(hotel.amenities) ? (hotel.amenities as any[]).map(String) : [],
          })),
        ]}
      />

      {/* Hero */}
      <div className="relative h-56 md:h-80 overflow-hidden bg-muted">
        {photos[0] && (
          <img
            src={photos[0]}
            alt={`${hotel.name} - ${city}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/hospedagem"))}
          className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/60 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Voltar</span>
        </button>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-2xl md:text-4xl font-bold leading-tight">{hotel.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm">
            {hotel.star_rating ? (
              <span className="inline-flex items-center gap-1 bg-background/80 text-foreground rounded-full px-2 py-0.5">
                <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                <span className="font-semibold">{hotel.star_rating} estrelas</span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-white/90">
              <MapPin className="w-3.5 h-3.5" /> {hotel.address || city}
            </span>
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-5xl px-4 py-6">
        <nav className="text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">Início</Link>
          <span className="mx-2">/</span>
          <Link to="/hospedagem" className="hover:text-primary">Hospedagem</Link>
          <span className="mx-2">/</span>
          <Link to={`/hoteis-em-${slugify(city)}`} className="hover:text-primary">Hotéis em {city}</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{hotel.name}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <p className="text-muted-foreground">
            Reserve {hotel.name} em {city} com os melhores preços no Bah Ofertas. Compare diárias em tempo real e
            escolha sem taxa extra.
          </p>
          <Button asChild size="lg" className="shrink-0">
            <Link to={reserveHref}>
              Ver disponibilidade e preços
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>

        {photos.length > 1 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
            {photos.slice(1, 5).map((p, i) => (
              <img
                key={i}
                src={p}
                alt={`${hotel.name} foto ${i + 2}`}
                className="aspect-[4/3] w-full object-cover rounded-lg bg-muted"
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
              />
            ))}
          </section>
        )}

        {Array.isArray(hotel.amenities) && hotel.amenities.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Comodidades</h2>
            <div className="flex flex-wrap gap-2">
              {(hotel.amenities as any[]).slice(0, 24).map((a: any) => {
                const label = String(a);
                const lower = label.toLowerCase();
                return (
                  <Badge key={label} variant="secondary" className="font-normal">
                    {lower.includes("wi") ? <Wifi className="w-3 h-3 mr-1" /> :
                     lower.includes("parking") ? <Car className="w-3 h-3 mr-1" /> :
                     lower.includes("breakfast") ? <Coffee className="w-3 h-3 mr-1" /> : null}
                    {label}
                  </Badge>
                );
              })}
            </div>
          </section>
        )}

        {descParagraphs.length > 0 && (
          <section className="mb-8" aria-labelledby="about-hotel-title">
            <h2 id="about-hotel-title" className="text-xl font-semibold mb-3">
              Sobre o {hotel.name}
            </h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              {descParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        <section className="mb-8 p-5 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-2">Reserve {hotel.name} em {city}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione as datas para ver preços atualizados em tempo real e disponibilidade de quartos.
          </p>
          <Button asChild>
            <Link to={reserveHref}>Ver datas e reservar</Link>
          </Button>
        </section>
      </main>

      <SEOContentBlock
        heading={`Tudo sobre o ${hotel.name} em ${city}`}
        bullets={[
          "Reserva online com confirmação imediata",
          "Compare diárias em tempo real, sem taxa de reserva",
          "Pagamento em PIX, cartão (até 12x) ou pelo hotel",
          `Suporte local na Serra Gaúcha`,
        ]}
        faq={buildHotelFaq({
          name: hotel.name,
          city,
          starRating: hotel.star_rating,
          amenities: Array.isArray(hotel.amenities) ? (hotel.amenities as any[]).map(String) : [],
        })}
        internalLinks={[
          { to: `/hoteis-em-${slugify(city)}`, label: `Mais hotéis em ${city}` },
          { to: "/hoteis-em-gramado", label: "Hotéis em Gramado" },
          { to: "/hoteis-em-canela", label: "Hotéis em Canela" },
          { to: "/pousadas-em-gramado", label: "Pousadas em Gramado" },
          { to: "/hoteis-baratos-em-gramado", label: "Hotéis baratos em Gramado" },
          { to: "/hoteis-com-piscina-em-gramado", label: "Hotéis com piscina" },
          { to: "/hoteis-pet-friendly-em-gramado", label: "Hotéis pet friendly" },
          { to: "/hoteis-na-serra-gaucha", label: "Hotéis na Serra Gaúcha" },
        ]}
      />

      <Footer />
      <CategoryNav />
    </div>
  );
};

export default HotelDetalhe;
