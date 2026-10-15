import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Heart, Share, Wifi, Car, Coffee } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import SEOContentBlock from "@/components/SEOContentBlock";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/hooks/use-toast";
import HotelDetailGallery from "@/components/hospedagem/redesign/HotelDetailGallery";
import HotelDetailPhotosDialog from "@/components/hospedagem/redesign/HotelDetailPhotosDialog";
import HotelDetailMobileHero from "@/components/hospedagem/redesign/HotelDetailMobileHero";
import HotelDetailBookingCard from "@/components/hospedagem/redesign/HotelDetailBookingCard";
import HotelDetailActionBar from "@/components/hospedagem/redesign/HotelDetailActionBar";
import HotelDetailLocation from "@/components/hospedagem/redesign/HotelDetailLocation";
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

/** Container das páginas de detalhe: mais estreito que a Home, como na proposta (1280px). */
const DETAIL_CONTAINER = "w-full max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12";

/** Quantos parágrafos do "Sobre" aparecem antes do "Mostrar mais" (o resto continua no HTML). */
const ABOUT_PREVIEW = 2;

const normalizePhoto = (u: unknown): string => {
  const s = String(u || "");
  if (!s) return "";
  // ETG returns URLs with a {size} template; substitute a real size
  if (s.includes("{size}")) return s.replace("{size}", "1024x768");
  return s;
};

const ROUND_BTN_MOBILE =
  "w-11 h-11 rounded-full bg-white text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.25)] inline-flex items-center justify-center";

const HotelDetalhe: React.FC = () => {
  const { hid, slug } = useParams<{ hid: string; slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [hotel, setHotel] = useState<EtgHotelRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [photosStart, setPhotosStart] = useState(0);
  const [aboutExpanded, setAboutExpanded] = useState(false);

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

  // Todas as fotos do hotel (galeria completa no diálogo "Ver todas as fotos").
  const allPhotos = useMemo<string[]>(() => {
    const imgs = Array.isArray(hotel?.images) ? (hotel!.images as any[]) : [];
    return imgs.slice(0, 60).map(normalizePhoto).filter(Boolean);
  }, [hotel]);

  // Mesmo recorte de antes (8 primeiras) — usado no SEO (og:image / JSON-LD).
  const photos = useMemo<string[]>(() => allPhotos.slice(0, 8), [allPhotos]);

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

  const goBack = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    const hasHistory = typeof idx === "number" ? idx > 0 : window.history.length > 1;
    if (hasHistory) navigate(-1);
    else navigate("/hospedagem");
  }, [navigate]);

  const favKey = `hotel:${hid}`;
  const favorite = isFavorite(favKey);

  const handleToggleFavorite = useCallback(() => {
    if (!hotel) return;
    const stars = hotel.star_rating ? `${hotel.star_rating} estrelas · ` : "";
    const added = toggleFavorite({
      key: favKey,
      title: hotel.name,
      image: photos[0],
      path: canonical,
      subtitle: `${stars}${city}`,
    });
    toast({
      title: added ? "Salvo nos favoritos" : "Removido dos favoritos",
      description: added ? "Encontre este hotel depois em Favoritos." : undefined,
    });
  }, [hotel, toggleFavorite, favKey, photos, canonical, city, toast]);

  const handleShare = useCallback(async () => {
    const url = absoluteUrl(canonical);
    const title = hotel?.name ? `${hotel.name} em ${city} | Bah Ofertas` : "Bah Ofertas";
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // Usuário cancelou o compartilhamento: não faz nada.
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado", description: "Cole onde quiser para compartilhar este hotel." });
    } catch {
      toast({ title: "Não foi possível copiar o link", description: url });
    }
  }, [canonical, hotel?.name, city, toast]);

  const openPhotos = useCallback((index: number) => {
    setPhotosStart(index);
    setPhotosOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-jakarta">
        <div className="md:hidden relative">
          <Skeleton className="h-[300px] w-full rounded-none" />
          <div className="absolute left-4 top-[calc(12px+env(safe-area-inset-top))]">
            <button type="button" onClick={goBack} aria-label="Voltar" className={ROUND_BTN_MOBILE}>
              <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
        <main className={`${DETAIL_CONTAINER} relative -mt-[22px] md:mt-0 rounded-t-[22px] md:rounded-none bg-background pt-6 md:pt-4 pb-10`}>
          <Skeleton className="hidden md:block h-4 w-80 mb-3" />
          <Skeleton className="hidden md:block h-[320px] lg:h-[368px] w-full rounded-2xl mb-7" />
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-6" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background font-jakarta">
        <div className="md:hidden px-4 pt-[calc(12px+env(safe-area-inset-top))]">
          <button type="button" onClick={goBack} aria-label="Voltar" className={ROUND_BTN_MOBILE}>
            <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <main className={`${DETAIL_CONTAINER} py-16 text-center`}>
          <h1 className="text-2xl font-extrabold mb-4">Hotel não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Confira outros hotéis disponíveis em Gramado e Canela.
          </p>
          <Link
            to="/hospedagem"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ver hotéis
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const reserveHref = `/hospedagem?destination=${encodeURIComponent((city || "gramado").toLowerCase())}`;
  const address = hotel.address || city;
  const cityHotelsPath = `/hoteis-em-${slugify(city)}`;
  const amenities: string[] = Array.isArray(hotel.amenities) ? (hotel.amenities as any[]).map(String) : [];
  const hotelFaq = buildHotelFaq({
    name: hotel.name,
    city,
    starRating: hotel.star_rating,
    amenities,
  });
  const seeAlso = [
    { to: cityHotelsPath, label: `Hotéis em ${city}` },
    { to: "/pousadas-em-gramado", label: "Pousadas em Gramado" },
    { to: "/hoteis-baratos-em-gramado", label: "Hotéis baratos em Gramado" },
  ];
  const hasMoreAbout = descParagraphs.length > ABOUT_PREVIEW;
  const sectionCls = "mt-5 pt-5 border-t border-[#ebebeb] md:mt-8 md:pt-0 md:border-t-0";
  const sectionTitleCls = "m-0 mb-3 text-base font-semibold md:text-xl md:font-bold text-foreground";

  return (
    <div className="min-h-screen bg-background font-jakarta pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-0">
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
          jsonLdFaq(hotelFaq),
        ]}
      />

      {/* Celular: foto em tela cheia com voltar / compartilhar / favoritar */}
      <div className="md:hidden">
        <HotelDetailMobileHero
          photo={allPhotos[0]}
          photoCount={allPhotos.length}
          hotelName={hotel.name}
          city={city}
          isFavorite={favorite}
          onBack={goBack}
          onShare={handleShare}
          onToggleFavorite={handleToggleFavorite}
          onOpenPhotos={() => openPhotos(0)}
        />
      </div>

      {/* No celular o conteúdo é uma folha branca que sobe sobre a foto */}
      <main className="relative -mt-[22px] md:mt-0 rounded-t-[22px] md:rounded-none bg-background">
        <div className={`${DETAIL_CONTAINER} pt-6 md:pt-4 pb-8 md:pb-12`}>
          {/* Tablet/desktop: breadcrumb + ações */}
          <div className="hidden md:flex items-center justify-between gap-4 mb-3">
            <nav className="min-w-0 text-sm text-muted-foreground" aria-label="Breadcrumb">
              <ol className="m-0 p-0 list-none flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <li><Link to="/" className="hover:text-foreground hover:underline">Início</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link to="/hospedagem" className="hover:text-foreground hover:underline">Hospedagem</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link to={cityHotelsPath} className="hover:text-foreground hover:underline">Hotéis em {city}</Link></li>
                <li aria-hidden="true">/</li>
                <li className="min-w-0 truncate" aria-current="page">{hotel.name}</li>
              </ol>
            </nav>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground underline underline-offset-2 hover:bg-[#f7f7f7] transition-colors"
              >
                <Share className="w-4 h-4" aria-hidden="true" />
                Compartilhar
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-pressed={favorite}
                className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-foreground underline underline-offset-2 hover:bg-[#f7f7f7] transition-colors"
              >
                <Heart className={`w-4 h-4 ${favorite ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
                {favorite ? "Salvo" : "Salvar"}
              </button>
            </div>
          </div>

          <div className="hidden md:block">
            <HotelDetailGallery
              photos={allPhotos}
              hotelName={hotel.name}
              city={city}
              onOpenPhotos={openPhotos}
            />
          </div>

          <div className="md:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-12">
            <div className="min-w-0">
              <h1 className="m-0 text-[22px] font-bold leading-tight md:text-[32px] md:font-extrabold text-foreground break-words">
                {hotel.name}
              </h1>
              <p className="m-0 mt-1.5 text-sm text-muted-foreground">
                {hotel.star_rating ? (
                  <>
                    <span className="hidden md:inline" aria-hidden="true">★ </span>
                    {hotel.star_rating} estrelas ·{" "}
                  </>
                ) : null}
                {address}
              </p>

              <div className="mt-5 pt-5 border-t border-[#ebebeb] md:mt-6 md:pt-0 md:border-t-0">
                <p className="m-0 text-[15px] md:text-base leading-relaxed text-foreground">
                  Reserve {hotel.name} em {city} com os melhores preços no Bah Ofertas. Compare diárias em tempo real e
                  escolha sem taxa extra.
                </p>
              </div>

              {descParagraphs.length > 0 && (
                <section className={sectionCls} aria-labelledby="about-hotel-title">
                  <h2 id="about-hotel-title" className={sectionTitleCls}>
                    Sobre o {hotel.name}
                  </h2>
                  <div id="about-hotel-text" className="space-y-3 text-[15px] md:text-base text-muted-foreground leading-relaxed">
                    {descParagraphs.map((p, i) => (
                      <p key={i} className={`m-0 ${!aboutExpanded && i >= ABOUT_PREVIEW ? "hidden" : ""}`}>{p}</p>
                    ))}
                  </div>
                  {hasMoreAbout && (
                    <button
                      type="button"
                      onClick={() => setAboutExpanded((v) => !v)}
                      aria-expanded={aboutExpanded}
                      aria-controls="about-hotel-text"
                      className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-foreground underline underline-offset-2"
                    >
                      {aboutExpanded ? "Mostrar menos" : "Mostrar mais"}
                    </button>
                  )}
                </section>
              )}

              {amenities.length > 0 && (
                <section className={sectionCls} aria-labelledby="hotel-amenities-title">
                  <h2 id="hotel-amenities-title" className={sectionTitleCls}>Comodidades</h2>
                  <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
                    {amenities.slice(0, 24).map((label) => {
                      const lower = label.toLowerCase();
                      return (
                        <li
                          key={label}
                          className="inline-flex items-center rounded-full border border-[#ebebeb] bg-[#f7f7f7] px-3 py-1.5 text-[13px] text-foreground"
                        >
                          {lower.includes("wi") ? <Wifi className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> :
                           lower.includes("parking") ? <Car className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> :
                           lower.includes("breakfast") ? <Coffee className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> : null}
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className={sectionCls} aria-labelledby="hotel-location-title">
                <h2 id="hotel-location-title" className={sectionTitleCls}>Localização</h2>
                <HotelDetailLocation
                  hotelName={hotel.name}
                  address={address}
                  latitude={hotel.latitude}
                  longitude={hotel.longitude}
                />
              </section>

              <section className={sectionCls} aria-labelledby="hotel-see-also-title">
                <h2 id="hotel-see-also-title" className={sectionTitleCls}>Veja também</h2>
                <ul className="m-0 p-0 list-none flex flex-wrap gap-2 md:gap-2.5">
                  {seeAlso.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="inline-flex min-h-[44px] md:min-h-[40px] items-center rounded-full border border-[#dddddd] bg-white px-4 text-[13px] md:text-sm font-semibold text-foreground hover:border-foreground transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Desktop: card de reserva fixo na coluna direita */}
            <aside className="hidden lg:block lg:sticky lg:top-24" aria-label={`Reservar ${hotel.name}`}>
              <HotelDetailBookingCard hotelName={hotel.name} reserveHref={reserveHref} />
            </aside>
          </div>
        </div>
      </main>

      <SEOContentBlock
        heading={`Tudo sobre o ${hotel.name} em ${city}`}
        bullets={[
          "Reserva online com confirmação imediata",
          "Compare diárias em tempo real, sem taxa de reserva",
          "Pagamento em PIX, cartão (até 12x) ou pelo hotel",
          `Suporte local na Serra Gaúcha`,
        ]}
        faq={hotelFaq}
        linksHeading="Mais opções de hospedagem"
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

      <HotelDetailPhotosDialog
        open={photosOpen}
        onOpenChange={setPhotosOpen}
        photos={allPhotos}
        hotelName={hotel.name}
        startIndex={photosStart}
      />

      {/* Celular/tablet: barra fixa inferior "Ver disponibilidade" (portal no <body>) */}
      <HotelDetailActionBar reserveHref={reserveHref} />
    </div>
  );
};

export default HotelDetalhe;
