import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Heart, Share } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import CategoryNav from "@/components/CategoryNav";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { establishmentPath } from "@/lib/establishment-slug";
import { cn } from "@/lib/utils";
import {
  buildOfferSeo,
  jsonLdProduct,
  jsonLdBreadcrumb,
  absoluteUrl,
  slugify,
} from "@/lib/seo";
import OfferRoundButton from "@/components/offer/redesign/OfferRoundButton";
import OfferPurchaseCard from "@/components/offer/redesign/OfferPurchaseCard";
import OfferMobileBuyBar, { OFFER_BUY_BAR_HEIGHT } from "@/components/offer/redesign/OfferMobileBuyBar";
import OfferSeeAlso from "@/components/offer/redesign/OfferSeeAlso";
import { useOfferActions } from "@/components/offer/redesign/useOfferActions";
import { discountLabel, formatBRL } from "@/components/offer/redesign/format";

interface OfferRow {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  category: string | null;
  city: string | null;
  card_image_url: string | null;
  banner_image_url: string | null;
  is_active: boolean | null;
  company_id: string | null;
}

interface CompanyRow {
  id: string;
  name: string | null;
  trade_name: string | null;
  city: string | null;
}

/** Largura da página de detalhe (mais estreita que a Home, como na proposta). */
const DETAIL_CONTAINER = "mx-auto w-full max-w-[1280px] md:px-8 lg:px-12";

const OfertaDetalhe: React.FC = () => {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const [offer, setOffer] = useState<OfferRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("offers")
          .select("id, title, subtitle, description, price, original_price, discount_percent, category, city, card_image_url, banner_image_url, is_active, company_id")
          .eq("id", String(id))
          .maybeSingle();
        if (!cancelled) setOffer((data as any) || null);
        const companyId = (data as any)?.company_id;
        if (companyId) {
          const { data: c } = await supabase
            .from("companies")
            .select("id, name, trade_name, city")
            .eq("id", companyId)
            .maybeSingle();
          if (!cancelled) setCompany((c as any) || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => { setImageFailed(false); }, [id]);

  const city = offer?.city || company?.city || "Serra Gaúcha";
  const estName = company?.trade_name || company?.name || "";
  const priceCents = Math.round((offer?.price || 0) * 100);
  const oldPriceCents = offer?.original_price ? Math.round(offer.original_price * 100) : undefined;
  const image = offer?.banner_image_url || offer?.card_image_url || undefined;

  const canonical = `/oferta/${id}/${slug || slugify(offer?.title || "oferta")}`;

  const seo = useMemo(() => buildOfferSeo({
    title: offer?.title || "Oferta",
    establishmentName: estName,
    city,
    description: offer?.description || offer?.subtitle || undefined,
    priceCents,
    oldPriceCents,
    discountPercent: offer?.discount_percent || undefined,
  }), [offer, estName, city, priceCents, oldPriceCents]);

  const favItem = useMemo(() => (offer ? {
    key: `offer:${offer.id}`,
    title: offer.title,
    image,
    path: canonical,
    subtitle: estName ? `${estName} · ${city}` : city,
    priceLabel: priceCents > 0 ? formatBRL(priceCents) : undefined,
  } : null), [offer, image, canonical, estName, city, priceCents]);

  const { goBack, share, toggleFav, favorited } = useOfferActions(
    favItem,
    offer?.title || "Oferta no Bah Ofertas",
    absoluteUrl(canonical),
  );

  const cityOffersHref = `/ofertas-em-${slugify(city)}`;

  /** Topo do celular para os estados sem foto (carregando / não encontrada). */
  const mobileBackBar = (
    <div className="flex h-16 items-center px-4 md:hidden">
      <OfferRoundButton onClick={goBack} aria-label="Voltar">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </OfferRoundButton>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background font-jakarta">
        <main className={cn(DETAIL_CONTAINER, "pb-10 md:pt-4")} aria-busy="true">
          <Skeleton className="hidden h-4 w-64 mb-3 md:block" />
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
            <div>
              <Skeleton className="h-[300px] w-full rounded-none md:h-[400px] md:rounded-2xl" />
              <div className="px-5 pt-6 md:px-0">
                <Skeleton className="h-8 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3 mb-6" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            </div>
            <Skeleton className="hidden h-60 w-full rounded-2xl lg:block" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!offer || offer.is_active === false) {
    return (
      <div className="min-h-screen bg-background font-jakarta">
        {mobileBackBar}
        <main className="mx-auto max-w-xl px-5 py-12 text-center md:py-20">
          <h1 className="mb-3 text-2xl font-extrabold text-foreground md:text-[32px]">Oferta não encontrada</h1>
          <p className="mb-8 text-muted-foreground">
            Esta oferta pode ter expirado. Veja outras ofertas em {city}.
          </p>
          <Link
            to={cityOffersHref}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ver ofertas em {city}
          </Link>
        </main>
        <Footer />
        <CategoryNav />
      </div>
    );
  }

  const establishmentHref = estName ? establishmentPath(estName) : null;
  const categoryHref = offer.category ? `/${offer.category}` : "/";
  const hasOld = !!oldPriceCents && oldPriceCents > priceCents;
  const discount = discountLabel(offer.discount_percent, priceCents, oldPriceCents);
  const imageAlt = `${offer.title}${estName ? ` - ${estName}` : ""} em ${city}`;

  const seeAlso = [
    { to: cityOffersHref, label: `Mais ofertas em ${city}` },
    ...(offer.category ? [{ to: categoryHref, label: `Todas em ${offer.category.charAt(0).toUpperCase()}${offer.category.slice(1)}` }] : []),
    { to: "/hospedagem", label: "Hospedagem na Serra Gaúcha" },
  ];

  const breadcrumb = (className: string) => (
    <nav className={className} aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <li><Link to="/" className="hover:text-foreground hover:underline">Início</Link></li>
        {offer.category && (
          <>
            <li aria-hidden="true">/</li>
            <li><Link to={categoryHref} className="capitalize hover:text-foreground hover:underline">{offer.category}</Link></li>
          </>
        )}
        {estName && establishmentHref && (
          <>
            <li aria-hidden="true">/</li>
            <li><Link to={establishmentHref} className="hover:text-foreground hover:underline">{estName}</Link></li>
          </>
        )}
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="min-w-0 text-foreground/70">{offer.title}</li>
      </ol>
    </nav>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-background font-jakarta text-foreground">
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={canonical}
        image={image}
        type="product"
        city={city}
        jsonLd={[
          jsonLdProduct({
            name: offer.title,
            url: absoluteUrl(canonical),
            image,
            description: offer.description || offer.subtitle || seo.description,
            brand: estName || "Bah Ofertas",
            priceCents,
            oldPriceCents,
            category: offer.category || undefined,
          }),
          jsonLdBreadcrumb([
            { name: "Início", url: absoluteUrl("/") },
            ...(offer.category ? [{ name: offer.category, url: absoluteUrl(categoryHref) }] : []),
            ...(estName ? [{ name: estName, url: absoluteUrl(establishmentHref!) }] : []),
            { name: offer.title, url: absoluteUrl(canonical) },
          ]),
        ]}
      />

      <main className={cn(DETAIL_CONTAINER, "pb-8 md:pb-14 md:pt-4")}>
        {breadcrumb("mb-3 hidden text-sm text-muted-foreground md:block")}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-12">
          {/* Foto + título */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <div className="relative">
              <div className="h-[300px] w-full overflow-hidden bg-muted md:h-[400px] md:rounded-2xl">
                {image && !imageFailed && (
                  <img
                    src={image}
                    alt={imageAlt}
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                  />
                )}
              </div>

              {/* Botões sobre a foto (celular) */}
              <div className="absolute left-4 top-[max(14px,env(safe-area-inset-top))] md:hidden">
                <OfferRoundButton onClick={goBack} aria-label="Voltar">
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </OfferRoundButton>
              </div>
              <div className="absolute right-4 top-[max(14px,env(safe-area-inset-top))] flex gap-2.5 md:hidden">
                <OfferRoundButton onClick={share} aria-label="Compartilhar">
                  <Share className="h-[18px] w-[18px]" aria-hidden="true" />
                </OfferRoundButton>
                <OfferRoundButton
                  onClick={toggleFav}
                  aria-label={favorited ? "Remover dos favoritos" : "Salvar nos favoritos"}
                  aria-pressed={favorited}
                >
                  <Heart
                    className={cn("h-[18px] w-[18px]", favorited && "fill-primary text-primary")}
                    aria-hidden="true"
                  />
                </OfferRoundButton>
              </div>
            </div>

            {/* Folha branca que sobe sobre a foto no celular */}
            <div className="relative -mt-[22px] rounded-t-[22px] bg-background px-5 pt-6 md:mt-0 md:rounded-none md:px-0 md:pt-6">
              {breadcrumb("text-xs text-muted-foreground md:hidden")}

              <div className="mt-2 flex items-start justify-between gap-4 md:mt-0">
                <div className="min-w-0">
                  <h1 className="break-words text-[22px] font-bold leading-tight md:text-[32px] md:font-extrabold">
                    {offer.title}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {estName && establishmentHref ? (
                      <>
                        <Link to={establishmentHref} className="font-semibold text-foreground hover:underline">
                          {estName}
                        </Link>
                        <span aria-hidden="true"> · </span>
                      </>
                    ) : null}
                    {city}
                  </p>
                </div>

                {/* Compartilhar / favoritar (tablet e desktop) */}
                <div className="hidden shrink-0 gap-1 md:flex">
                  <button
                    type="button"
                    onClick={share}
                    className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold underline-offset-2 hover:bg-muted hover:underline"
                  >
                    <Share className="h-4 w-4" aria-hidden="true" />
                    Compartilhar
                  </button>
                  <button
                    type="button"
                    onClick={toggleFav}
                    aria-pressed={favorited}
                    className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold underline-offset-2 hover:bg-muted hover:underline"
                  >
                    <Heart className={cn("h-4 w-4", favorited && "fill-primary text-primary")} aria-hidden="true" />
                    {favorited ? "Salvo" : "Salvar"}
                  </button>
                </div>
              </div>

              {/* Preço (celular) */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 md:hidden">
                {priceCents > 0 && (
                  <span className="text-2xl font-bold">
                    <span className="sr-only">Por </span>{formatBRL(priceCents)}
                  </span>
                )}
                {hasOld && (
                  <s className="text-[15px] text-muted-foreground">
                    <span className="sr-only">De </span>{formatBRL(oldPriceCents!)}
                  </s>
                )}
                {discount && (
                  <span className="rounded-md bg-[#fff1f1] px-2 py-0.5 text-xs font-bold text-primary">
                    {discount}
                  </span>
                )}
              </div>
              {offer.subtitle && (
                <p className="mt-2 text-sm text-muted-foreground md:hidden">{offer.subtitle}</p>
              )}
            </div>
          </div>

          {/* Card de compra (tablet e desktop) */}
          <aside
            className="mt-6 hidden md:block md:max-w-[440px] lg:max-w-none lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start"
            aria-label="Comprar oferta"
          >
            <OfferPurchaseCard
              priceCents={priceCents}
              oldPriceCents={oldPriceCents}
              discount={discount}
              subtitle={offer.subtitle}
              buyHref={establishmentHref}
              fallbackHref={cityOffersHref}
              fallbackLabel={`Ver ofertas em ${city}`}
            />
          </aside>

          {/* Descrição + Veja também */}
          <div className="min-w-0 px-5 md:px-0 lg:col-start-1 lg:row-start-2">
            <div className="my-5 border-t border-[#ebebeb] md:hidden" />

            <section className="md:mt-6" aria-labelledby="oferta-sobre">
              <h2 id="oferta-sobre" className="sr-only">Sobre esta oferta</h2>
              {offer.description && (
                <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground md:text-base md:leading-[1.6]">
                  {offer.description}
                </p>
              )}
              <p className={cn("text-sm text-muted-foreground", offer.description && "mt-3")}>
                {offer.title}{estName ? ` — ${estName}` : ""} em {city}. Compre agora com desconto exclusivo no Bah Ofertas. Pagamento seguro via PIX ou cartão.
              </p>
            </section>

            <div className="my-5 border-t border-[#ebebeb] md:my-8" />

            <OfferSeeAlso links={seeAlso} />
          </div>
        </div>
      </main>

      <Footer />

      {/* Espaço para a barra de compra fixa não cobrir o rodapé (celular) */}
      <div
        className="md:hidden"
        style={{ height: `calc(${OFFER_BUY_BAR_HEIGHT}px + env(safe-area-inset-bottom))` }}
        aria-hidden="true"
      />

      <OfferMobileBuyBar
        priceCents={priceCents}
        oldPriceCents={oldPriceCents}
        buyHref={establishmentHref}
        fallbackHref={cityOffersHref}
        fallbackLabel="Ver ofertas"
      />
    </div>
  );
};

export default OfertaDetalhe;
