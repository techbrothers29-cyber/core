import { memo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { useCarouselTouchPause } from "@/hooks/useCarouselTouchPause";
import HomeSectionHeading from "@/components/home/HomeSectionHeading";
import HomePlaceCard from "@/components/home/HomePlaceCard";
import { HOME_CONTAINER } from "@/components/home/layout";
import { CarouselSkeletonLoader } from "@/components/ui/offer-skeleton";
import { slugify } from "@/lib/seo";

type Row = { hid: string; name: string; city: string; images: unknown };

const photo = (images: unknown) => {
  const first = Array.isArray(images) ? String(images[0] || "") : "";
  if (first.includes("{size}")) return first.replace("{size}", "640x400");
  return first.replace(/\/t\/[^/]+\/content\//, "/t/640x400/content/");
};

/** Alterna as cidades (Gramado, Canela, Gramado…) para o carrossel não ficar com uma só no começo. */
function interleave(rows: Row[], cities: string[]) {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const buckets = cities.map((c) => rows.filter((r) => norm(r.city) === norm(c)));
  const out: Row[] = [];
  for (let i = 0; out.length < rows.length && i < 50; i++) buckets.forEach((b) => b[i] && out.push(b[i]));
  return out;
}

interface Props {
  id: string;
  title: string;
  mobileTitle?: string;
  /** Cidades como aparecem para o cliente (com acento). */
  cities: string[];
  /** Destino da busca de hospedagem ("Ver todos"). */
  destination: string;
}

/**
 * Carrossel de hotéis 4 estrelas da Home, a partir do catálogo RateHawk salvo (etg_hotels).
 * Sem preço: a RateHawk só informa tarifa depois que o cliente escolhe as datas.
 */
const HomeHotelsSection = memo(({ id, title, mobileTitle, cities, destination }: Props) => {
  const [hotels, setHotels] = useState<Row[] | null>(null);
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();
  // Mesmo avanço automático dos demais carrosséis da Home (pausa ao tocar/arrastar).
  useCarouselTouchPause({ api: mobileApi, interval: 3000 });
  useCarouselTouchPause({ api: desktopApi, interval: 3000 });

  useEffect(() => {
    let cancelled = false;
    const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const names = [...new Set(cities.flatMap((c) => [c, plain(c)]))];
    supabase
      .from("etg_hotels")
      .select("hid, name, city, images")
      .in("city", names)
      .eq("star_rating", 4)
      .not("name", "ilike", "%test%")
      .limit(60)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = ((data as Row[]) || []).filter((h) => photo(h.images));
        setHotels(interleave(rows, cities).slice(0, 16));
      });
    return () => {
      cancelled = true;
    };
  }, [cities]);

  if (hotels === null) {
    return (
      <section className="pt-6 md:pt-9 pb-3" aria-busy="true">
        <div className={HOME_CONTAINER}>
          <CarouselSkeletonLoader type="offer" />
        </div>
      </section>
    );
  }
  if (hotels.length === 0) return null;

  const card = (h: Row) => (
    <HomePlaceCard
      favKey={`hotel:${h.hid}`}
      title={h.name}
      image={photo(h.images)}
      path={`/hospedagem/hotel/${encodeURIComponent(h.hid)}/${slugify(h.name)}`}
      subtitle={`4 estrelas · ${h.city.replace("Balneario Camboriu", "Balneário Camboriú").replace(/^Florianopolis$/, "Florianópolis")}`}
      tag="Hospedagem"
      emptyPriceLabel="Ver datas e preços"
    />
  );

  return (
    <section className="pt-6 md:pt-9 pb-3 relative overflow-hidden" aria-labelledby={id}>
      <div className={HOME_CONTAINER}>
        <HomeSectionHeading id={id} title={title} mobileTitle={mobileTitle} to={`/hospedagem?destination=${destination}`} />

        <div className="md:hidden">
          <Carousel className="w-full" opts={{ align: "start", loop: true, dragFree: true }} setApi={setMobileApi}>
            <CarouselContent className="-ml-3">
              {hotels.map((h) => (
                <CarouselItem key={h.hid} className="pl-3 basis-[45%]">
                  {card(h)}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        <div className="hidden md:block">
          <Carousel className="w-full max-w-[1600px] mx-auto" opts={{ align: "start", loop: true, dragFree: true }} setApi={setDesktopApi}>
            <CarouselContent className="-ml-5">
              {hotels.map((h) => (
                <CarouselItem key={h.hid} className="pl-5 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  {card(h)}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
});

HomeHotelsSection.displayName = "HomeHotelsSection";
export default HomeHotelsSection;
