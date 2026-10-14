/**
 * NovaXS Establishments — ratings, categories, and grouping logic
 */

export const RATINGS_MAP: Record<string, number> = {
  // === ENTRETENIMENTO / PARQUES ===
  "Snowland": 4.9,
  "Acquamotion": 4.7,
  "Space Adventure": 4.9,
  "Bondinhos Canela": 4.7,
  "Aerozuum": 4.7,
  "Skyglass": 4.8,
  "Parque do Caracol": 4.8,
  "Caracol": 4.8,
  "Mundo Lugano": 4.8,
  "U-Drive": 4.8,
  "U Drive": 4.8,
  "Parque de aventuras Gasper": 4.7,
  "Parque de Aventuras Gasper": 4.7,
  "Gasper": 4.7,
  "Lumni": 4.8,
  "NBA Park Gramado": 4.7,
  "Vila da Mônica": 4.8,
  "Big Land": 4.7,
  "Alpen Park": 4.8,
  "Aldeia do Papai Noel": 4.8,
  "Oficina Criamigos": 4.8,
  "Criamigos": 4.8,
  "Jolimont": 4.7,
  "Jolimont ": 4.7,
  "Museu do Vinho": 4.7,
  "Canyons & Baloes Adventure": 4.9,
  "Canyons": 4.9,
  "Brasil Raft": 4.8,
  "Mini Mundo": 4.8,
  "Mátria Parque das Flores": 4.8,
  "Mátria": 4.8,
  "Parque Pedras do Silêncio": 4.8,
  "Pedras do Silêncio": 4.8,
  "Parque Terra Mágica Florybal": 4.8,
  "Terra Mágica Florybal": 4.8,
  "Florybal": 4.8,
  "Roda Canela": 4.8,
  "Reino do Chocolate": 4.8,
  "Exceed Park": 4.7,
  "Garden Park": 4.7,
  "Happy Valen": 4.7,
  "Grupo Dreams": 4.8,
  "Cristais de Gramado": 4.8,
  "Olivas de Gramado": 4.8,
  "SKY Kids": 4.8,
  "SKY Kids - Fornecedora": 4.8,

  // === GASTRONOMIA ===
  "Gatzz": 4.8,
  "Chocoland": 4.8,
  "Hard Rock": 4.8,
  "Era do Fogo": 4.8,
  "Malbek Gramado": 4.8,
  "Malbek": 4.8,
  "Malbec": 4.8,
  "Hector Pizzaria": 4.8,
  "Hector": 4.8,
  "Hector Ferrovia Secreta": 4.8,
  "Heróis da Pizza": 4.8,
  "Heróis da Pizza - Gramado": 4.8,
  "Kongo Pizzaria": 4.8,
  "Kongo": 4.8,
  "Chalezinho Gramado": 4.8,
  "Chalezinho": 4.8,
  "Versoi": 4.8,
  "Versoi Fondue": 4.8,
  "Churrascaria Gramadense": 4.8,
  "Gramadense": 4.8,
  "Campo e Vinho": 4.8,
  "Cacique Restobar": 4.8,
  "Cacique Steak Ember": 4.8,
  "Cacique Steak": 4.8,
  "Cacique": 4.8,
  "Casa Galo": 4.8,
  "Restaurante Carne e Osso": 4.8,
  "Carne e Osso": 4.8,
  "Café da Banca": 4.8,
  "Café Bela Vista": 4.8,
  "Reino da Boêmia": 4.8,
  "Castelo Saint Andrews": 4.8,
  "Saint Andrews": 4.8,
  "Gramado Café Colonial": 4.8,
  "Château Allemand": 4.8,
  "La Bella Notte": 4.8,
  "Caquelon Fondue e Restaurante": 4.8,
  "Caquelon Fondue": 4.8,
  "Caquelon": 4.8,
  "Restaurante Lindenhof": 4.8,
  "Lindenhof": 4.8,
  "Rasen Braza": 4.8,
  "RF Vision | Fondue Giratório": 4.8,
  "RF Vision": 4.8,
  "Caffé Colonial Della Nonna": 4.8,
  "Della Nonna": 4.8,
  "Sopas da Serra": 4.8,
  "Palace Café Colonial": 4.8,
  "Palace Café": 4.8,
  "Cantina Premium": 4.8,
  "Garfo e Bombacha": 4.8,
  "Tchê Pierre Fondue Temático": 4.8,
  "Tchê Pierre": 4.8,
  "Carlitos Prime": 4.8,
  "Carlitos Prime Restaurante": 4.8,
  "Carlitos": 4.8,
  "SKY Cantina Premium - Fornecedora": 4.8,
  "SKY Palace Café Colonial - Fornecedora": 4.8,
  "SKY Sopas da Serra - Fornecedora": 4.8,
  "SKY Chateau Allemand": 4.8,
  "SKY La Bella Notte": 4.8,

  // === CERVEJARIAS ===
  "Cervejaria Felsen": 4.8,
  "Felsen": 4.8,
  "Cervejaria Edelbrau": 4.8,
  "Edelbrau": 4.8,
  "Cervejaria Farol": 4.8,
  "Cervejaria do Farol": 4.8,
  "Farol": 4.8,

  // === SERVIÇOS ===
  "Forever em Gramado": 4.9,
  "Forever In Gramado": 4.9,
  "Forever": 4.9,
  "Recordar Fotos": 4.9,
  "Recordar Fotos - Foto a moda antiga": 4.9,
  "Recordar": 4.9,
  "SKY SPA": 4.8,
  "SKY SPA Gramado": 4.8,
  "SKY SPA Gramado - Fornecedora": 4.8,

  // === PASSEIOS / TOURS ===
  "Tour Raízes Coloniais": 4.8,
  "Raízes Coloniais": 4.8,
  "Gramado Receptivo": 4.8,
  "Maria Fumaça": 4.8,
};

/** Keywords that identify a restaurant/gastro establishment */
const RESTAURANT_KEYWORDS = [
  "garfo", "bombacha", "era do fogo", "comilança", "gatzz", "bellepoque",
  "dezoito", "hard rock", "chocoland fondue", "fondue", "malbek", "malbec", "versoi",
  "cacique", "casa galo", "parrilla", "carne", "osso", "burger", "café bela vista",
  "colonial", "della nonna", "gramado café", "la bella notte", "hector",
  "kongo", "chalezinho", "cantina premium", "massas", "sopas da serra",
  "palace café", "café da banca", "reino da boêmia", "churrascaria",
  "gramadense", "rf vision", "ferroviaria secreta", "americana",
  "château allemand", "chateau allemand", "heróis da pizza", "campo e vinho",
  "castelo saint", "saint andrews", "cervejaria", "felsen", "edelbrau", "farol",
  "caquelon", "lindenhof", "rasen braza", "ferrovia secreta",
  "sky cantina", "sky palace", "sky sopas", "sky la bella", "sky chateau",
  "tchê pierre", "carlitos", "carlitos prime",
];

/** Keywords that identify service establishments (excluded from carousels) */
const SERVICE_KEYWORDS = [
  "forever", "recordar", "sky spa", "ensaio",
];

/** Keywords that identify kids/entertainment venues */
const ENTERTAINMENT_KEYWORDS = [
  "sky kids", "exceed park", "garden park", "happy valen",
  "mini mundo", "mátria", "parque das flores", "pedras do silêncio",
  "terra mágica", "florybal", "roda canela", "reino do chocolate",
  "cristais de gramado", "olivas de gramado", "grupo dreams",
  "gramado receptivo", "maria fumaça",
];

export type EstablishmentCategory = "entretenimento" | "restaurante" | "servicos";

export function classifyEstablishment(name: string): EstablishmentCategory {
  const lower = name.toLowerCase();
  if (SERVICE_KEYWORDS.some(k => lower.includes(k))) return "servicos";
  if (RESTAURANT_KEYWORDS.some(k => lower.includes(k))) return "restaurante";
  // Check entertainment keywords explicitly (to avoid misclassifying SKY Kids as service)
  if (ENTERTAINMENT_KEYWORDS.some(k => lower.includes(k))) return "entretenimento";
  return "entretenimento";
}

export function getRating(name: string): number {
  // Exact match first
  if (RATINGS_MAP[name]) return RATINGS_MAP[name];
  // Trimmed match (handles trailing spaces like "Jolimont ")
  const trimmed = name.trim();
  if (RATINGS_MAP[trimmed]) return RATINGS_MAP[trimmed];
  // Partial match
  for (const [key, rating] of Object.entries(RATINGS_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return rating;
  }
  return 4.5;
}

export interface NovaxsProduct {
  id: string;
  path: string;
  name: string;
  shortName: string;
  type: string;
  price: number;        // already in reais (divided by 100 by edge function)
  priceCents: number;
  available: number;
  image: string;
  supplierName: string;
  oldValue?: number;
  token: string;
  schedules: any[];
  select_date?: boolean;
  dates?: string[];
  products?: NovaxsProduct[];
  memo: string;
  htmlMemo: string;
  cancellationPolicies: string;
  // Carousel selection (admin override per product)
  carouselPrimary?: boolean;
  carouselSecondary?: boolean;
  carouselTertiary?: boolean;
}

export interface Establishment {
  id: string;
  name: string;
  /** Optional custom display name set by admin. When present, should be used in UI instead of `name`. `name` remains the API identifier used for routing/lookup. */
  displayName?: string | null;
  category: EstablishmentCategory;
  image: string;
  rating: number;
  minPrice: number;       // in centavos
  minPriceOldValue?: number; // in centavos — valor "de" do produto mais barato (admin)
  productCount: number;
  products: NovaxsProduct[];
  carouselPrimary?: boolean;
  carouselSecondary?: boolean;
  carouselTertiary?: boolean;
  // Sidebar content overrides
  aboutText?: string | null;
  includesIncluded?: string[] | null;
  includesNotIncluded?: string[] | null;
  importantNotes?: string[] | null;
  // Gallery images from admin
  galleryImages?: string[];
  bannerImage?: string | null;
  bannerPosition?: string | null;
  // Custom location (admin override) — used in establishment map
  latitude?: number | null;
  longitude?: number | null;
  addressLabel?: string | null;
  // Partner source — distinguishes NovaXS integrations from Bah Ofertas Parceiros
  partnerType?: 'novaxs' | 'bahofertas';
  companyId?: string;
}

export interface OfferProduct {
  id: string;
  name: string;
  establishmentName: string;
  establishmentId: string;
  rating: number;
  price: number;          // centavos
  oldPrice: number;       // centavos
  discountPercent: number;
  image: string;
  type: string;
  // Partner source for navigation
  partnerType?: 'novaxs' | 'bahofertas';
  companyId?: string;
  // Carousel selection (admin override per product)
  carouselPrimary?: boolean;
  carouselSecondary?: boolean;
  carouselTertiary?: boolean;
}

/**
 * Groups raw NovaXS products into establishments
 */
export function groupByEstablishment(products: NovaxsProduct[]): Establishment[] {
  const map = new Map<string, NovaxsProduct[]>();

  for (const p of products) {
    // U-Drive gratuito (produto NovaXS 140170) é brinde automático do carrinho —
    // nunca deve aparecer como establishment ou dentro de outro establishment.
    if (String(p.id) === "140170") continue;
    const key = p.supplierName || "Outros";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const establishments: Establishment[] = [];

  for (const [name, prods] of map.entries()) {
    const paidProducts = prods.filter(p => p.priceCents > 0);
    const minPrice = paidProducts.length > 0
      ? Math.min(...paidProducts.map(p => p.priceCents))
      : 0;

    const firstImage = prods.find(p => p.image)?.image || "";
    const category = classifyEstablishment(name);

    establishments.push({
      id: `est-${name.replace(/\s+/g, '-').toLowerCase()}`,
      name,
      category,
      image: firstImage,
      rating: getRating(name),
      minPrice,
      productCount: prods.length,
      products: prods,
    });
  }

  return establishments.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extracts discount offers (products where oldValue > price, meia-entrada,
 * OR explicitly marked for tertiary carousel by admin)
 */
export function extractOffers(products: NovaxsProduct[]): OfferProduct[] {
  const offers: OfferProduct[] = [];

  for (const p of products) {
    // U-Drive gratuito (140170) é brinde automático do carrinho — nunca vai a carrossel.
    if (String(p.id) === "140170") continue;

    const isMeiaEntrada = p.name.toLowerCase().includes("meia") ||
                          p.type?.toLowerCase().includes("meia");
    const hasDiscount = p.oldValue && p.oldValue > p.priceCents;
    const adminPicked = p.carouselTertiary === true;

    if (!isMeiaEntrada && !hasDiscount && !adminPicked) continue;
    if (p.priceCents <= 0) continue;

    const oldPrice = hasDiscount ? p.oldValue! : Math.round(p.priceCents * 2);
    const discountPercent = hasDiscount || isMeiaEntrada
      ? Math.min(Math.round(((oldPrice - p.priceCents) / oldPrice) * 100), 60)
      : 0;

    offers.push({
      id: `offer-${p.id || p.path}`,
      name: p.name,
      establishmentName: p.supplierName || "Estabelecimento",
      establishmentId: `est-${(p.supplierName || "outros").replace(/\s+/g, '-').toLowerCase()}`,
      rating: getRating(p.supplierName || ""),
      price: p.priceCents,
      oldPrice: hasDiscount || isMeiaEntrada ? oldPrice : p.priceCents,
      discountPercent,
      image: p.image || "",
      type: p.type || "",
      carouselPrimary: p.carouselPrimary,
      carouselSecondary: p.carouselSecondary,
      carouselTertiary: p.carouselTertiary,
    });
  }

  return offers.sort((a, b) => b.discountPercent - a.discountPercent);
}

// IDs with empty description
const EMPTY_DESC_IDS = new Set(["2733", "139513", "139514", "139515", "139516"]);

export function getProductDescription(product: NovaxsProduct): string {
  // Apenas a descrição personalizada pelo admin é exibida.
  // O memo/htmlMemo da API NovaXS é descartado em useNovaxsEstablishments,
  // então aqui apenas devolvemos o que sobrou (string vazia se não há override).
  const description = (product.htmlMemo || product.memo || "").trim();
  return description;
}
