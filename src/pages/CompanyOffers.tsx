import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CategoryNav from "@/components/CategoryNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Star,
  MapPin,
  Filter,
  Images,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import BahofertasOfferCard from "@/components/BahofertasOfferCard";
import SEOHead from "@/components/SEOHead";
import {
  buildEstablishmentSeo,
  jsonLdLocalBusiness,
  jsonLdBreadcrumb,
  jsonLdItemList,
  jsonLdProduct,
  absoluteUrl,
} from "@/lib/seo";
import EstablishmentSidebar from "@/components/establishment/EstablishmentSidebar";
import ParksnetCalendar from "@/components/establishment/ParksnetCalendar";
import type { Establishment } from "@/data/novaxs-establishments";

const CompanyOffers = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Per-company closed-day rules. Add entries here for establishments with
  // fixed weekly closures or seasonal restrictions.
  const isDayClosedForCompany = useMemo(() => {
    const rules: Record<string, (date: Date) => boolean> = {
      // Funciona de quinta a terça (fechado às quartas) e apenas até outubro.
      "93e66d28-2de1-45a3-b4c5-8c9aeb50f027": (date: Date) => {
        if (date.getDay() === 3) return true; // quarta-feira
        if (date.getMonth() > 9) return true; // novembro/dezembro
        return false;
      },
    };
    return companyId ? rules[companyId] : undefined;
  }, [companyId]);

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_company_marketplace_info");
      if (error) throw error;
      return (data || []).find((c: any) => c.id === companyId) || null;
    },
    enabled: !!companyId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: override } = useQuery({
    queryKey: ["company-override", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bahofertas_establishment_overrides")
        .select("*")
        .eq("company_id", companyId as string)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: adminGallery } = useQuery({
    queryKey: ["company-gallery", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("bahofertas_establishment_gallery")
        .select("image_url, display_order")
        .eq("company_id", companyId as string)
        .order("display_order");
      return (data || []) as Array<{ image_url: string }>;
    },
    enabled: !!companyId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: offers, isLoading: offersLoading } = useQuery({
    queryKey: ["company-offers", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Realtime: refresh on admin overrides/gallery changes
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`company-${companyId}-admin`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bahofertas_establishment_overrides", filter: `company_id=eq.${companyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["company-override", companyId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bahofertas_establishment_gallery", filter: `company_id=eq.${companyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["company-gallery", companyId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `company_id=eq.${companyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["company-offers", companyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, queryClient]);

  const isLoading = companyLoading || offersLoading;
  const companyName = company?.trade_name || company?.name || "";
  const canonicalPath = `/parceiro/${companyId}/ofertas`;

  // Build gallery: admin gallery first, then offer images
  const galleryImages = useMemo(() => {
    const urls = new Set<string>();
    for (const g of adminGallery || []) {
      if (g.image_url) urls.add(g.image_url);
    }
    for (const o of (offers as any[]) || []) {
      if (o.banner_image_url) urls.add(o.banner_image_url);
      if (o.card_image_url) urls.add(o.card_image_url);
    }
    return Array.from(urls);
  }, [offers, adminGallery]);

  const heroImage =
    (override as any)?.custom_banner_url ||
    company?.banner_url ||
    (override as any)?.custom_image_url ||
    galleryImages[0] ||
    company?.logo_url ||
    "";

  // Address (jsonb) → label and coords
  const addressLabel = useMemo(() => {
    const addr = (company as any)?.address;
    if (!addr) return undefined;
    if (typeof addr === "string") return addr;
    const parts = [addr.street, addr.number, addr.neighborhood, addr.city, addr.state]
      .filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }, [company]);

  const coords = useMemo(() => {
    const addr = (company as any)?.address;
    const lat = Number(addr?.latitude ?? addr?.lat);
    const lng = Number(addr?.longitude ?? addr?.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat && lng) {
      return { lat, lng };
    }
    return { lat: undefined, lng: undefined };
  }, [company]);

  // Synthesize Establishment object so we can reuse EstablishmentSidebar
  const synthEstablishment: Establishment | null = useMemo(() => {
    if (!company) return null;
    const minPriceCents =
      offers && offers.length
        ? Math.round(Math.min(...offers.map((o: any) => Number(o.price))) * 100)
        : 0;
    const ov = override as any;
    return {
      id: company.id,
      name: ov?.custom_name || companyName,
      displayName: ov?.custom_name || companyName,
      category: "restaurante",
      image: ov?.custom_image_url || company.logo_url || heroImage,
      rating: 4.8,
      minPrice: minPriceCents,
      productCount: offers?.length || 0,
      products: [],
      aboutText: ov?.about_text || company.description || undefined,
      includesIncluded: ov?.includes_included ?? null,
      includesNotIncluded: ov?.includes_not_included ?? null,
      importantNotes: ov?.important_notes ?? null,
      galleryImages,
      bannerImage: ov?.custom_banner_url || company.banner_url || undefined,
      bannerPosition: ov?.banner_position ?? null,
      latitude: ov?.latitude ?? coords.lat,
      longitude: ov?.longitude ?? coords.lng,
      addressLabel: ov?.address_label || addressLabel,
      partnerType: "bahofertas",
      companyId: company.id,
    } as Establishment;
  }, [company, companyName, offers, galleryImages, heroImage, coords, addressLabel, override]);

  // Categories for filter
  const productTypes = useMemo(() => {
    if (!offers) return [];
    const types = new Set(offers.map((o: any) => o.category || "Geral"));
    return ["todos", ...Array.from(types)];
  }, [offers]);

  const filteredOffers = useMemo(() => {
    if (!offers) return [];
    if (typeFilter === "todos") return offers;
    return offers.filter((o: any) => (o.category || "Geral") === typeFilter);
  }, [offers, typeFilter]);

  const minOfferCents =
    offers && offers.length
      ? Math.round(Math.min(...offers.map((o: any) => Number(o.price))) * 100)
      : undefined;

  const seo = companyName
    ? buildEstablishmentSeo({
        name: companyName,
        city: (company as any)?.address?.city || "Serra Gaúcha",
        about: company?.description,
        productCount: offers?.length,
        minPrice: minOfferCents,
      })
    : { title: "Ofertas | Bah Ofertas", description: "Confira as ofertas disponíveis no Bah Ofertas.", keywords: "" };

  if (isLoading && !company) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <Skeleton className="h-48 w-full rounded-xl mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        </main>
        <Footer />
        <CategoryNav />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Estabelecimento não encontrado</h1>
          <p className="text-muted-foreground mb-6">O parceiro que você procura não está disponível.</p>
          <Button onClick={() => navigate("/")}>Voltar ao início</Button>
        </main>
        <Footer />
        <CategoryNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonical={canonicalPath}
        image={heroImage || company.logo_url}
        type="place"
        city={(company as any)?.address?.city || "Serra Gaúcha"}
        latitude={coords.lat}
        longitude={coords.lng}
        jsonLd={[
          jsonLdLocalBusiness({
            name: companyName,
            url: absoluteUrl(canonicalPath),
            image: heroImage || company.logo_url,
            description: company.description || seo.description,
            city: (company as any)?.address?.city,
            address: addressLabel,
            latitude: coords.lat,
            longitude: coords.lng,
            rating: 4.8,
            reviewCount: 24,
          }),
          jsonLdBreadcrumb([
            { name: "Início", url: absoluteUrl("/") },
            { name: "Parceiros", url: absoluteUrl("/") },
            { name: companyName, url: absoluteUrl(canonicalPath) },
          ]),
          ...(offers && offers.length > 0
            ? [
                jsonLdItemList(
                  offers.slice(0, 20).map((o: any) => ({
                    name: o.title,
                    url: absoluteUrl(canonicalPath),
                    image: o.card_image_url,
                  })),
                ),
                ...offers.slice(0, 5).map((o: any) =>
                  jsonLdProduct({
                    name: o.title,
                    url: absoluteUrl(canonicalPath),
                    image: o.card_image_url,
                    description: o.subtitle,
                    brand: companyName,
                    priceCents: Math.round(Number(o.price) * 100),
                    oldPriceCents: o.original_price ? Math.round(Number(o.original_price) * 100) : undefined,
                    category: o.category,
                  }),
                ),
              ]
            : []),
        ]}
      />

      {/* Hero */}
      <div className="relative h-44 md:h-60 overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={companyName}
            className="w-full h-full object-cover animate-in fade-in duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <button
          className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/90 text-xs hover:bg-primary hover:text-primary-foreground active:scale-95 transition-transform touch-manipulation"
          onClick={() => {
            if (window.history.length > 1) navigate(-1);
            else navigate("/");
          }}
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-xl md:text-3xl font-bold text-white leading-tight">{companyName}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5">
              <Star className="w-3.5 h-3.5 fill-warning text-warning" />
              <span className="font-bold text-xs">4.8</span>
            </div>
            <div className="flex items-center gap-1 text-white/80 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              <span>{(company as any)?.address?.city || "Serra Gaúcha"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <GalleryStrip
          images={galleryImages}
          name={companyName}
          onSelect={setSelectedImage}
        />
      )}

      <main className="container mx-auto px-4 py-4 pb-6 md:pb-8">
        {/* Filters */}
        {productTypes.length > 2 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            {productTypes.map((type) => (
              <Button
                key={type}
                variant={typeFilter === type ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap text-xs h-8 rounded-full"
                onClick={() => setTypeFilter(type)}
              >
                {type === "todos" ? "Todos" : type}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Offers — 2/3 on desktop */}
          <div className="flex-1 min-w-0">
            {filteredOffers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredOffers.map((offer: any, index: number) => (
                  <BahofertasOfferCard
                    key={offer.id}
                    offer={offer}
                    index={index}
                    companyName={companyName}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma oferta disponível no momento.</p>
              </div>
            )}
          </div>

          {/* Sidebar — desktop only */}
          {synthEstablishment && (
            <aside className="hidden lg:block w-[340px] xl:w-[380px] shrink-0">
              <div className="lg:sticky lg:top-4 space-y-4">
                <ParksnetCalendar
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  minPriceCents={minOfferCents}
                  isDayClosed={isDayClosedForCompany}
                />
                <EstablishmentSidebar establishment={synthEstablishment} />
              </div>
            </aside>
          )}
        </div>

        {/* Mobile: calendar + sidebar below offers */}
        {synthEstablishment && (
          <div className="lg:hidden mt-4 space-y-4">
            <ParksnetCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              minPriceCents={minOfferCents}
              isDayClosed={isDayClosedForCompany}
            />
            <EstablishmentSidebar establishment={synthEstablishment} />
          </div>
        )}
      </main>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt={companyName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      <Footer />
      <CategoryNav />
    </div>
  );
};

function GalleryStrip({
  images,
  name,
  onSelect,
}: {
  images: string[];
  name: string;
  onSelect: (url: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="container mx-auto px-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Images className="w-3.5 h-3.5" />
          <span>Galeria</span>
        </div>
        <div className="hidden md:flex gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => scroll("left")}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => scroll("right")}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-1 px-1 pb-1"
      >
        {images.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => onSelect(url)}
            className="snap-start shrink-0 w-32 h-24 md:w-40 md:h-28 rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img src={url} alt={`${name} - foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default CompanyOffers;
