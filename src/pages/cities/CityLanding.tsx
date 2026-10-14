import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import CategoryNav from "@/components/CategoryNav";
import CityLinksFooter from "@/components/CityLinksFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight, Star, ShieldCheck, CreditCard, Sparkles, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { establishmentPath } from "@/lib/establishment-slug";
import {
  SERRA_CITIES,
  buildCitySeo,
  jsonLdTouristDestination,
  jsonLdCollectionPage,
  jsonLdFaq,
  jsonLdBreadcrumb,
  jsonLdItemList,
  absoluteUrl,
  slugify,
  type CategorySlug,
} from "@/lib/seo";

interface Props {
  citySlug: keyof typeof SERRA_CITIES | string;
  category: CategorySlug;
  path: string;
}

interface HotelItem {
  hid: string | number;
  name: string;
  city: string | null;
  star_rating: number | null;
  images: any;
}

interface ListItem {
  title: string;
  href: string;
  image?: string;
  meta?: string;
}

const isHotelLike = (c: CategorySlug) => c === "hoteis" || c === "pousadas" || c === "hoteis-baratos";

const CityLanding: React.FC<Props> = ({ citySlug, category, path }) => {
  const city = SERRA_CITIES[citySlug];
  const seo = buildCitySeo(citySlug, category);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingItems(true);
        if (isHotelLike(category)) {
          const cityName = city?.name || "Gramado";
          const { data } = await supabase
            .from("etg_hotels")
            .select("hid, name, city, star_rating, images")
            .ilike("city", `%${cityName}%`)
            .order("star_rating", { ascending: false, nullsFirst: false })
            .limit(80);
          if (cancelled) return;

          // Curated ranking of Gramado's most-searched hotels (por demanda real).
          const POPULAR_RANK: string[] = [
            "wish serrano",
            "laghetto stilo higienopolis",
            "laghetto viverone mont blanc",
            "laghetto stilo borges",
            "laghetto pedras altas",
            "laghetto allegro alpenhaus",
            "laghetto siena",
            "casa da montanha",
            "estalagem st hubertus",
            "saint andrews",
            "kurotel",
            "ritta hoppner",
            "bavaria sport",
            "bavaria",
            "recanto da serra",
            "serra azul",
            "master premium gramado",
            "colline de france",
            "il campanario",
            "vila suzana parque",
            "grande hotel gramado",
            "swan lake",
            "chateau la villette",
            "buona vitta gramado resort",
            "villa bella",
          ];
          const norm = (s: string) => s
            .normalize("NFD").replace(/[̀-ͯ]/g, "")
            .toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
          const rankOf = (name: string) => {
            const n = norm(name);
            const idx = POPULAR_RANK.findIndex((k) => n.includes(k));
            return idx === -1 ? 999 : idx;
          };

          // Dedup por hid E por nome normalizado (evita repetição de mesma marca).
          const seenHid = new Set<string>();
          const seenName = new Set<string>();
          const uniq: HotelItem[] = [];
          for (const h of ((data || []) as unknown as HotelItem[])) {
            const hidKey = String(h.hid);
            const nameKey = norm(h.name);
            if (seenHid.has(hidKey) || seenName.has(nameKey)) continue;
            seenHid.add(hidKey);
            seenName.add(nameKey);
            uniq.push(h);
          }

          // Ordena: primeiro os curados pela ordem de POPULAR_RANK; depois por estrelas.
          uniq.sort((a, b) => {
            const ra = rankOf(a.name);
            const rb = rankOf(b.name);
            if (ra !== rb) return ra - rb;
            return (b.star_rating || 0) - (a.star_rating || 0);
          });

          const list: ListItem[] = uniq.slice(0, 12).map((h) => {
            const raw = Array.isArray(h.images) && h.images[0] ? String(h.images[0]) : "";
            const image = raw
              .replace("{size}", "640x400")
              .replace("/max1280x900/", "/640x400/")
              .replace("/1024x768/", "/640x400/");
            return {
              title: h.name,
              href: `/hospedagem/hotel/${h.hid}/${slugify(h.name)}`,
              image,
              meta: h.star_rating ? `${h.star_rating}★` : undefined,
            };
          });
          setItems(list);
        } else {
          // NovaXS catalog (estabelecimentos)
          const mod = await import("@/data/novaxs-catalog");
          const arr: any[] = (mod as any).NOVAXS_INTEGRATED_ESTABLISHMENTS || [];
          // Sem cidade no catálogo — Gramado-centric. Mostra todos para LPs de Gramado/Canela.
          const list = arr.slice(0, 12).map((e: { name: string }) => ({
            title: e.name,
            href: establishmentPath(e.name),
            meta: "Ver ofertas",
          }));
          setItems(list);
        }
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => { cancelled = true; };
  }, [citySlug, category, city?.name]);

  if (!city || !("city" in seo)) {
    return <div className="p-8">Cidade não encontrada.</div>;
  }

  const url = absoluteUrl(path);
  const jsonLd = [
    jsonLdTouristDestination(city),
    jsonLdCollectionPage({ url, name: seo.title, description: seo.description }),
    jsonLdBreadcrumb([
      { name: "Bah Ofertas", url: absoluteUrl("/") },
      { name: city.name, url },
    ]),
    ...(items.length > 0
      ? [jsonLdItemList(items.map((i) => ({ name: i.title, url: absoluteUrl(i.href), image: i.image })))]
      : []),
    ...(city.faq.length ? [jsonLdFaq(city.faq)] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={path}
        keywords={seo.keywords}
        city={city.name}
        latitude={city.latitude}
        longitude={city.longitude}
        jsonLd={jsonLd}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--foreground))_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative max-w-[1200px] mx-auto px-4 py-10 md:py-16">
          <nav className="text-xs md:text-sm text-muted-foreground mb-5" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-primary">Início</Link>
            <span className="mx-2">/</span>
            <span>{city.name}</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">{seo.category.plural}</span>
          </nav>

          <Badge variant="secondary" className="mb-4">
            <MapPin className="w-3 h-3 mr-1" />
            Serra Gaúcha — Rio Grande do Sul
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight text-foreground max-w-3xl">
            {seo.category.plural} em {city.name}
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {city.intro}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-lg">
              <Link to={seo.category.targetPath}>
                Ver {seo.category.plural.toLowerCase()} disponíveis
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          <ul className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            {[
              { icon: ShieldCheck, label: "Reserva 100% online" },
              { icon: CreditCard, label: "Parcelamento em até 12x" },
              { icon: Sparkles, label: "Preços em tempo real" },
              { icon: Building2, label: "Hotéis verificados" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground bg-card/70 backdrop-blur border border-border/60 rounded-lg px-3 py-2">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground/90">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="max-w-[1200px] mx-auto px-4 py-10 md:py-14">
        {/* Listagem real — hotéis mais procurados */}
        <section className="mb-14" aria-labelledby="listings-title">
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Mais procurados</p>
              <h2 id="listings-title" className="text-2xl md:text-3xl font-bold tracking-tight">
                {isHotelLike(category)
                  ? `Hotéis em ${city.name}`
                  : `${seo.category.plural} em ${city.name}`}
              </h2>
            </div>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to={seo.category.targetPath}>
                Ver todos
                <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>

          {loadingItems ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">Em breve mais opções em {city.name}.</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it, idx) => (
                <li
                  key={it.href}
                  className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Link to={it.href} className="block">
                    <div className="relative overflow-hidden">
                      {it.image ? (
                        <>
                          <img
                            src={it.image}
                            alt={it.title}
                            className="w-full aspect-[4/3] object-cover bg-muted group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.style.display = "none";
                              const fb = el.nextElementSibling as HTMLElement | null;
                              if (fb) fb.style.display = "flex";
                            }}
                          />
                          <div
                            className="w-full aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5 items-center justify-center"
                            style={{ display: "none" }}
                          >
                            <Building2 className="w-10 h-10 text-primary/40" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Building2 className="w-10 h-10 text-primary/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                      {idx < 3 && (
                        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-0 shadow-md">
                          Top {idx + 1}
                        </Badge>
                      )}
                      {it.meta?.includes("★") && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/95 backdrop-blur rounded-full px-2.5 py-1 shadow-sm">
                          <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                          <span className="text-xs font-bold">{it.meta.replace("★", "").trim()}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {it.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{city.name}, RS</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Ver preços e disponibilidade</span>
                        <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {city.highlights.length > 0 && (
          <section className="mb-10" aria-labelledby="highlights-title">
            <h2 id="highlights-title" className="text-xl md:text-2xl font-semibold mb-4">
              Destaques de {city.name}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {city.highlights.map((h) => (
                <li
                  key={h}
                  className="bg-card border border-border rounded-lg p-4 text-sm text-card-foreground"
                >
                  {h}
                </li>
              ))}
            </ul>
          </section>
        )}

        {city.faq.length > 0 && (
          <section className="mb-10" aria-labelledby="faq-title">
            <h2 id="faq-title" className="text-xl md:text-2xl font-semibold mb-4">
              Perguntas frequentes sobre {city.name}
            </h2>
            <div className="space-y-4">
              {city.faq.map((q) => (
                <article
                  key={q.question}
                  className="bg-card border border-border rounded-lg p-5"
                >
                  <h3 className="font-semibold text-foreground mb-2">{q.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{q.answer}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <CityLinksFooter currentSlug={city.slug} />
      </main>

      <Footer />
      <CategoryNav />
    </div>
  );
};

export default CityLanding;
