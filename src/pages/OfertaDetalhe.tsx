import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, MapPin, Tag } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import CategoryNav from "@/components/CategoryNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { establishmentPath } from "@/lib/establishment-slug";
import {
  buildOfferSeo,
  jsonLdProduct,
  jsonLdBreadcrumb,
  absoluteUrl,
  slugify,
} from "@/lib/seo";

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

const OfertaDetalhe: React.FC = () => {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<OfferRow | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-72 w-full rounded-xl mb-4" />
          <Skeleton className="h-8 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-6" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </main>
        <Footer />
        <CategoryNav />
      </div>
    );
  }

  if (!offer || offer.is_active === false) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Oferta não encontrada</h1>
          <p className="text-muted-foreground mb-6">
            Esta oferta pode ter expirado. Veja outras ofertas em {city}.
          </p>
          <Button asChild>
            <Link to={`/ofertas-em-${slugify(city)}`}>Ver ofertas em {city}</Link>
          </Button>
        </main>
        <Footer />
        <CategoryNav />
      </div>
    );
  }

  const establishmentHref = estName ? establishmentPath(estName) : null;
  const categoryHref = offer.category ? `/${offer.category}` : "/";

  return (
    <div className="min-h-screen bg-background">
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

      {/* Hero */}
      <div className="relative h-56 md:h-80 overflow-hidden bg-muted">
        {image && (
          <img
            src={image}
            alt={`${offer.title}${estName ? ` - ${estName}` : ""} em ${city}`}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/60 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Voltar</span>
        </button>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-2xl md:text-4xl font-bold leading-tight">{offer.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
            {estName && (
              <span className="inline-flex items-center gap-1 bg-background/80 text-foreground rounded-full px-2 py-0.5">
                <Tag className="w-3.5 h-3.5" />
                <span className="font-semibold">{estName}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-white/90">
              <MapPin className="w-3.5 h-3.5" /> {city}
            </span>
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-4xl px-4 py-6">
        <nav className="text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">Início</Link>
          {offer.category && (
            <>
              <span className="mx-2">/</span>
              <Link to={categoryHref} className="hover:text-primary capitalize">{offer.category}</Link>
            </>
          )}
          {estName && establishmentHref && (
            <>
              <span className="mx-2">/</span>
              <Link to={establishmentHref} className="hover:text-primary">{estName}</Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-foreground">{offer.title}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex-1">
            {offer.subtitle && (
              <p className="text-lg text-muted-foreground mb-2">{offer.subtitle}</p>
            )}
            <div className="flex items-baseline gap-3 mb-4">
              {oldPriceCents && oldPriceCents > priceCents ? (
                <span className="text-muted-foreground line-through">
                  R$ {(oldPriceCents / 100).toFixed(2).replace(".", ",")}
                </span>
              ) : null}
              <span className="text-3xl font-bold text-primary">
                R$ {(priceCents / 100).toFixed(2).replace(".", ",")}
              </span>
              {offer.discount_percent ? (
                <Badge variant="destructive">{offer.discount_percent}% OFF</Badge>
              ) : null}
            </div>
          </div>
          {establishmentHref && (
            <Button asChild size="lg" className="shrink-0">
              <Link to={establishmentHref}>
                Ver detalhes e comprar
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          )}
        </div>

        {offer.description && (
          <section className="mb-8 prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-3">Sobre esta oferta</h2>
            <p className="whitespace-pre-line text-muted-foreground">{offer.description}</p>
          </section>
        )}

        <section className="mb-8 p-5 rounded-xl border border-border bg-card">
          <h2 className="text-lg font-semibold mb-2">
            {offer.title} {estName ? `— ${estName}` : ""} em {city}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Compre agora com desconto exclusivo no Bah Ofertas. Pagamento seguro via PIX ou cartão.
          </p>
          {establishmentHref && (
            <Button asChild>
              <Link to={establishmentHref}>Comprar agora</Link>
            </Button>
          )}
        </section>

        <section className="mt-10 pt-8 border-t border-border">
          <h2 className="text-lg font-semibold mb-4">Veja também</h2>
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link to={`/ofertas-em-${slugify(city)}`} className="inline-block px-3 py-1.5 text-sm rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors">
                Mais ofertas em {city}
              </Link>
            </li>
            {offer.category && (
              <li>
                <Link to={categoryHref} className="inline-block px-3 py-1.5 text-sm rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors capitalize">
                  Todas em {offer.category}
                </Link>
              </li>
            )}
            <li>
              <Link to="/hospedagem" className="inline-block px-3 py-1.5 text-sm rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors">
                Hospedagem na Serra Gaúcha
              </Link>
            </li>
          </ul>
        </section>
      </main>

      <Footer />
      <CategoryNav />
    </div>
  );
};

export default OfertaDetalhe;
