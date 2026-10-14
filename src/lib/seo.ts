/**
 * SEO helpers — title/description builders, slugify, JSON-LD generators.
 * Used by <SEOHead /> across the app to maximize discoverability of
 * Bah Ofertas pages on Google, Bing and social networks.
 */

const SITE_NAME = "Bah Ofertas";
const SITE_URL = "https://bahofertas.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo-desktop.png`;

export const BAH_OFERTAS_SITE = {
  name: SITE_NAME,
  url: SITE_URL,
  defaultImage: DEFAULT_OG_IMAGE,
};

export function truncate(str: string, max: number): string {
  if (!str) return "";
  const clean = str.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

export function slugify(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============= Title / description builders =============

export interface EstablishmentSeoInput {
  name: string;
  city?: string | null;
  category?: string | null;
  about?: string | null;
  productCount?: number;
  minPrice?: number; // in cents
}

export function buildEstablishmentSeo(input: EstablishmentSeoInput) {
  const city = input.city || "Serra Gaúcha";
  const title = truncate(`${input.name} em ${city} — Ofertas e Cupons | ${SITE_NAME}`, 60);
  const parts: string[] = [];
  if (input.about) parts.push(input.about);
  else parts.push(`Confira ofertas exclusivas de ${input.name} em ${city}.`);
  if (input.productCount && input.productCount > 0) {
    parts.push(`${input.productCount} ofertas disponíveis`);
  }
  if (input.minPrice && input.minPrice > 0) {
    parts.push(`A partir de ${brl(input.minPrice / 100)}`);
  }
  parts.push("Reserve com desconto no Bah Ofertas.");
  return {
    title,
    description: truncate(parts.join(" "), 160),
    keywords: [
      input.name.toLowerCase(),
      `${input.name.toLowerCase()} ${city.toLowerCase()}`,
      input.category || "ofertas",
      `${input.category || "ofertas"} ${city.toLowerCase()}`,
      "serra gaúcha",
      "cupom desconto",
    ].join(", "),
  };
}

export interface OfferSeoInput {
  title: string;
  establishmentName?: string | null;
  city?: string | null;
  description?: string | null;
  priceCents: number;
  oldPriceCents?: number;
  discountPercent?: number;
}

export function buildOfferSeo(input: OfferSeoInput) {
  const city = input.city || "Serra Gaúcha";
  const est = input.establishmentName ? ` — ${input.establishmentName}` : "";
  const title = truncate(`${input.title}${est} ${city} | ${SITE_NAME}`, 60);
  const parts: string[] = [];
  if (input.discountPercent && input.discountPercent > 0) {
    parts.push(`${input.discountPercent}% OFF.`);
  }
  parts.push(`${input.title} por ${brl(input.priceCents / 100)}`);
  if (input.oldPriceCents && input.oldPriceCents > input.priceCents) {
    parts.push(`(de ${brl(input.oldPriceCents / 100)})`);
  }
  parts.push(`em ${city}.`);
  if (input.description) parts.push(input.description);
  parts.push("Compre agora no Bah Ofertas.");
  return {
    title,
    description: truncate(parts.join(" "), 160),
  };
}

export interface HotelSeoInput {
  name: string;
  city?: string | null;
  starRating?: number | null;
  pricePerNightBRL?: number | null;
  description?: string | null;
}

export function buildHotelSeo(input: HotelSeoInput) {
  const city = input.city || "Serra Gaúcha";
  const stars = input.starRating ? `${input.starRating}★ ` : "";
  const title = truncate(`${stars}${input.name} em ${city} — Reserve com desconto | ${SITE_NAME}`, 60);
  const parts: string[] = [];
  parts.push(`Reserve ${input.name} em ${city}.`);
  if (input.starRating) parts.push(`${input.starRating} estrelas.`);
  if (input.pricePerNightBRL && input.pricePerNightBRL > 0) {
    parts.push(`Diárias a partir de ${brl(input.pricePerNightBRL)}.`);
  }
  if (input.description) parts.push(input.description);
  parts.push("Melhores preços no Bah Ofertas.");
  return {
    title,
    description: truncate(parts.join(" "), 160),
    keywords: [
      `hotel em ${city.toLowerCase()}`,
      `hospedagem ${city.toLowerCase()}`,
      `pousada ${city.toLowerCase()}`,
      input.name.toLowerCase(),
      "hotéis serra gaúcha",
      "reserva online",
    ].join(", "),
  };
}

// ============= JSON-LD generators (Schema.org) =============

export function jsonLdOrganization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    sameAs: [
      "https://www.instagram.com/bahofertas",
      "https://www.facebook.com/bahofertas",
    ],
  };
}

export function jsonLdWebsite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function jsonLdBreadcrumb(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export interface LocalBusinessJsonLdInput {
  name: string;
  url: string;
  image?: string;
  description?: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  telephone?: string | null;
  category?: string | null;
  priceRange?: string;
  rating?: number | null;
  reviewCount?: number | null;
}

export function jsonLdLocalBusiness(input: LocalBusinessJsonLdInput) {
  const cat = (input.category || "").toLowerCase();
  const type =
    cat === "restaurante" || cat === "restaurantes" ? "Restaurant" :
    cat === "entretenimento" || cat === "passeios" ? "TouristAttraction" :
    cat === "hoteis" || cat === "hospedagem" ? "Hotel" :
    "LocalBusiness";


  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name: input.name,
    url: input.url,
    image: input.image || DEFAULT_OG_IMAGE,
    description: input.description,
    priceRange: input.priceRange || "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: input.city || "Serra Gaúcha",
      addressRegion: "RS",
      addressCountry: "BR",
      streetAddress: input.address || undefined,
    },
  };
  if (input.latitude && input.longitude) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }
  if (input.telephone) data.telephone = input.telephone;
  if (input.rating && input.reviewCount) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating,
      reviewCount: input.reviewCount,
    };
  }
  return data;
}

export interface HotelJsonLdInput {
  name: string;
  url: string;
  image?: string;
  description?: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  starRating?: number | null;
  pricePerNightBRL?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
}

export function jsonLdHotel(input: HotelJsonLdInput) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: input.name,
    url: input.url,
    image: input.image || DEFAULT_OG_IMAGE,
    description: input.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: input.city || "Gramado",
      addressRegion: "RS",
      addressCountry: "BR",
      streetAddress: input.address || undefined,
    },
  };
  if (input.starRating) {
    data.starRating = { "@type": "Rating", ratingValue: input.starRating };
  }
  if (input.latitude && input.longitude) {
    data.geo = {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }
  if (input.pricePerNightBRL && input.pricePerNightBRL > 0) {
    data.priceRange = brl(input.pricePerNightBRL);
    data.makesOffer = {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: input.pricePerNightBRL.toFixed(2),
      availability: "https://schema.org/InStock",
      url: input.url,
    };
  }
  if (input.rating && input.reviewCount) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.rating,
      reviewCount: input.reviewCount,
    };
  }
  return data;
}

export interface ProductJsonLdInput {
  name: string;
  url: string;
  image?: string;
  description?: string;
  brand?: string;
  priceCents: number;
  oldPriceCents?: number;
  category?: string;
}

export function jsonLdProduct(input: ProductJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    image: input.image || DEFAULT_OG_IMAGE,
    description: input.description,
    brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
    category: input.category,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: "BRL",
      price: (input.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      ...(input.oldPriceCents && input.oldPriceCents > input.priceCents
        ? { priceSpecification: { "@type": "UnitPriceSpecification", price: (input.oldPriceCents / 100).toFixed(2), priceCurrency: "BRL" } }
        : {}),
    },
  };
}

export function jsonLdItemList(items: Array<{ name: string; url: string; image?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: it.url,
      name: it.name,
      image: it.image,
    })),
  };
}

export function jsonLdFaq(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(it => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

// ============= FAQ generators (deterministic, no IA) =============

export function buildEstablishmentFaq(input: {
  name: string;
  city?: string | null;
  category?: string | null;
  minPriceCents?: number;
}): Array<{ question: string; answer: string }> {
  const name = input.name;
  const city = input.city || "Gramado";
  const cat = (input.category || "").toLowerCase();
  const isPark = /entret|parque|passeio|atra/.test(cat);
  const isRestaurant = /restaur|caf|fondue|colonial/.test(cat);
  const priceHint = input.minPriceCents
    ? `A partir de ${brl(input.minPriceCents / 100)} no Bah Ofertas.`
    : "Confira preços atualizados no Bah Ofertas.";

  const faq: Array<{ question: string; answer: string }> = [];
  faq.push({
    question: `Quanto custa ${isPark ? "o ingresso" : isRestaurant ? "um almoço" : "uma visita"} em ${name}?`,
    answer: `O valor varia conforme dia da semana e temporada. ${priceHint} Compre antecipado para garantir o melhor preço e evitar filas no balcão.`,
  });
  faq.push({
    question: `${name} fica em ${city}?`,
    answer: `Sim, ${name} está localizado em ${city}, na Serra Gaúcha (RS). Veja o endereço completo e o mapa de localização na página de detalhes acima.`,
  });
  if (isPark) {
    faq.push({
      question: `Quanto tempo dura a visita em ${name}?`,
      answer: `A maioria dos visitantes reserva de 2 a 4 horas para aproveitar ${name} sem pressa. Chegue cedo para evitar filas — no Bah Ofertas você compra com horário garantido.`,
    });
    faq.push({
      question: `Vale a pena ${name} para crianças?`,
      answer: `${name} é uma das atrações mais procuradas por famílias em ${city}. Combine com outros parques da região para um roteiro completo na Serra Gaúcha.`,
    });
  } else if (isRestaurant) {
    faq.push({
      question: `Precisa reservar mesa em ${name}?`,
      answer: `Sim, especialmente em alta temporada e fins de semana. Reservar antecipadamente garante sua mesa e muitas vezes desconto no Bah Ofertas.`,
    });
  } else {
    faq.push({
      question: `Como comprar em ${name} com desconto?`,
      answer: `No Bah Ofertas você compra ingressos, vouchers e experiências de ${name} com preços abaixo do balcão, sem taxa de conveniência e com pagamento em PIX ou cartão.`,
    });
  }
  faq.push({
    question: `O Bah Ofertas é confiável para comprar em ${name}?`,
    answer: `Sim. O Bah Ofertas é uma plataforma da Serra Gaúcha com parcerias diretas com estabelecimentos como ${name}. Você recebe voucher digital por e-mail imediatamente após a confirmação do pagamento.`,
  });
  return faq;
}

export function buildHotelFaq(input: {
  name: string;
  city?: string | null;
  starRating?: number | null;
  amenities?: string[];
}): Array<{ question: string; answer: string }> {
  const name = input.name;
  const city = input.city || "Gramado";
  const amenities = (input.amenities || []).map((a) => String(a).toLowerCase());
  const hasBreakfast = amenities.some((a) => a.includes("breakfast") || a.includes("café"));
  const hasPet = amenities.some((a) => a.includes("pet") || a.includes("dog"));
  const hasPool = amenities.some((a) => a.includes("pool") || a.includes("piscina"));
  const hasParking = amenities.some((a) => a.includes("parking") || a.includes("estaciona"));
  const hasWifi = amenities.some((a) => a.includes("wi") || a.includes("internet"));

  const faq: Array<{ question: string; answer: string }> = [];
  faq.push({
    question: `O ${name} fica bem localizado em ${city}?`,
    answer: `O ${name} está em ${city}, na Serra Gaúcha. Veja a localização exata no mapa e a distância para os principais pontos turísticos. No Bah Ofertas você reserva com a melhor diária garantida.`,
  });
  faq.push({
    question: `${name} inclui café da manhã?`,
    answer: hasBreakfast
      ? `Sim, o ${name} oferece café da manhã. Confira no detalhe da tarifa se está incluso ou se é cobrado à parte.`
      : `Depende da tarifa selecionada — algumas incluem café da manhã, outras não. O Bah Ofertas exibe essa informação antes de você reservar.`,
  });
  if (input.starRating) {
    faq.push({
      question: `${name} é um hotel ${input.starRating} estrelas?`,
      answer: `Sim, o ${name} é classificado como ${input.starRating} estrelas, oferecendo um padrão compatível com a categoria em ${city}.`,
    });
  }
  faq.push({
    question: `${name} aceita pets?`,
    answer: hasPet
      ? `Sim, o ${name} é pet-friendly. Consulte taxas e regras diretamente com o hotel antes da chegada.`
      : `Política não confirmada nas comodidades cadastradas. Recomendamos contatar o hotel antes de viajar com pets.`,
  });
  faq.push({
    question: `Qual o horário de check-in e check-out no ${name}?`,
    answer: `Por padrão na hotelaria brasileira, o check-in é a partir das 14h e o check-out até as 12h. Solicite early check-in ou late check-out diretamente com o hotel — sujeito à disponibilidade.`,
  });
  if (hasPool || hasParking || hasWifi) {
    const extras: string[] = [];
    if (hasPool) extras.push("piscina");
    if (hasParking) extras.push("estacionamento");
    if (hasWifi) extras.push("Wi-Fi gratuito");
    faq.push({
      question: `Quais comodidades o ${name} oferece?`,
      answer: `Entre as comodidades destacam-se: ${extras.join(", ")}. Veja a lista completa de comodidades no detalhe acima.`,
    });
  }
  faq.push({
    question: `Por que reservar ${name} no Bah Ofertas?`,
    answer: `No Bah Ofertas você compara diárias em tempo real, sem taxa de reserva, com confirmação imediata. Pague em PIX com desconto ou em até 12x no cartão.`,
  });
  return faq;
}

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

// ============= Serra Gaúcha — presets por cidade =============

export interface SerraCity {
  slug: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  intro: string;
  highlights: string[];
  faq: Array<{ question: string; answer: string }>;
}

export const SERRA_CITIES: Record<string, SerraCity> = {
  gramado: {
    slug: "gramado",
    name: "Gramado",
    state: "RS",
    latitude: -29.3788,
    longitude: -50.8740,
    intro:
      "Gramado é o destino mais charmoso da Serra Gaúcha, com arquitetura enxaimel, chocolaterias artesanais, o famoso Natal Luz e parques temáticos como Snowland, Mini Mundo, Dreamland, GramadoZoo, Acquamotion e Garden Park. No Bah Ofertas você encontra hotéis, pousadas e chalés em Gramado com preços em tempo real, além de ingressos para parques, restaurantes típicos e passeios com descontos reais e reserva 100% online.",
    highlights: [
      "Natal Luz de Gramado (out/2026 a jan/2027)",
      "Snowland, Mini Mundo, Dreamland, GramadoZoo, Acquamotion e Garden Park",
      "Rua Coberta, Lago Negro e Palácio dos Festivais",
      "Café colonial, fondue e chocolate artesanal",
      "Hotéis de luxo, pousadas boutique e chalés românticos",
    ],
    faq: [
      {
        question: "Qual o melhor hotel em Gramado?",
        answer:
          "Gramado tem opções para todos os perfis: hotéis 5 estrelas no centro, pousadas charmosas próximas ao Lago Negro e chalés românticos na área rural. No Bah Ofertas você compara preços em tempo real de dezenas de hotéis com cancelamento grátis e reserva a melhor tarifa disponível.",
      },
      {
        question: "Quanto custa uma diária em Gramado em 2026?",
        answer:
          "Em 2026, diárias em Gramado começam por volta de R$ 280 na baixa temporada (março a junho) e podem passar de R$ 900 durante o Natal Luz e feriados. Reservando com antecedência no Bah Ofertas você garante tarifas promocionais e parcelamento em até 12x.",
      },
      {
        question: "O que fazer em Gramado em 3 dias?",
        answer:
          "Dia 1: Mini Mundo, Rua Coberta e café colonial. Dia 2: Snowland ou Acquamotion, passeio no Lago Negro e fondue à noite. Dia 3: GramadoZoo ou Dreamland e compras na Borges de Medeiros. No Bah Ofertas você compra ingressos antecipados com desconto e evita filas.",
      },
      {
        question: "Quando é o Natal Luz de Gramado 2026?",
        answer:
          "O Natal Luz de Gramado 2026/2027 acontece do final de outubro de 2026 até meados de janeiro de 2027, com shows como o Grande Desfile de Natal e o Nativitaten. Reserve hotel e ingressos com antecedência no Bah Ofertas — é a temporada mais concorrida do ano.",
      },
      {
        question: "Qual a melhor região para se hospedar em Gramado?",
        answer:
          "O Centro é ideal para quem quer caminhar até restaurantes e Rua Coberta. Avenida Borges de Medeiros concentra hotéis de luxo. Bairro Planalto oferece chalés mais tranquilos e com vista. Filtre por região no Bah Ofertas para encontrar a hospedagem ideal.",
      },
    ],
  },
  canela: {
    slug: "canela",
    name: "Canela",
    state: "RS",
    latitude: -29.3656,
    longitude: -50.8131,
    intro:
      "Canela é o destino perfeito para quem busca natureza, aventura e tranquilidade na Serra Gaúcha. Cidade-irmã de Gramado, abriga o icônico Parque do Caracol, Alpen Park, Parque da Ferradura e a Catedral de Pedra. Reserve hotéis, pousadas, ingressos e passeios em Canela no Bah Ofertas com desconto.",
    highlights: [
      "Parque do Caracol e Cascata",
      "Alpen Park e Parque da Ferradura",
      "Catedral de Pedra",
      "Trilhas e ecoturismo",
      "Pousadas e hotéis fazenda",
    ],
    faq: [
      {
        question: "Qual o melhor passeio em Canela?",
        answer:
          "O Parque do Caracol, com a cascata de 131 metros, é imperdível. Alpen Park oferece tirolesa e trenó. No Bah Ofertas você compra ingressos com desconto e sem fila.",
      },
      {
        question: "Canela é melhor que Gramado para se hospedar?",
        answer:
          "Canela tem hospedagem geralmente mais econômica e está a apenas 7 km de Gramado, sendo ótima opção para quem busca natureza e quer aproveitar os dois destinos.",
      },
      {
        question: "Quanto tempo ficar em Canela?",
        answer:
          "Reserve ao menos 2 dias para explorar Parque do Caracol, Alpen Park, Catedral de Pedra e os arredores. Combine com Gramado para uma viagem completa pela Serra.",
      },
    ],
  },
  "bento-goncalves": {
    slug: "bento-goncalves",
    name: "Bento Gonçalves",
    state: "RS",
    latitude: -29.1714,
    longitude: -51.5189,
    intro:
      "Bento Gonçalves é a capital brasileira do vinho, no coração da Serra Gaúcha. Vinícolas centenárias, o passeio de Maria Fumaça e o Vale dos Vinhedos atraem turistas o ano todo. Reserve hospedagem e experiências em Bento Gonçalves com desconto no Bah Ofertas.",
    highlights: [
      "Vale dos Vinhedos",
      "Maria Fumaça",
      "Vinícolas Miolo, Aurora e Salton",
      "Gastronomia italiana",
    ],
    faq: [
      {
        question: "O que fazer em Bento Gonçalves?",
        answer:
          "Visite vinícolas no Vale dos Vinhedos, faça o passeio de Maria Fumaça e aproveite a culinária italiana. Reserve experiências com desconto no Bah Ofertas.",
      },
    ],
  },
  "caxias-do-sul": {
    slug: "caxias-do-sul",
    name: "Caxias do Sul",
    state: "RS",
    latitude: -29.1685,
    longitude: -51.1796,
    intro:
      "Caxias do Sul é a maior cidade da Serra Gaúcha, conhecida pela Festa da Uva, gastronomia italiana e Rota das Vinícolas. Encontre restaurantes, hotéis e passeios em Caxias do Sul com ofertas exclusivas no Bah Ofertas.",
    highlights: ["Festa da Uva", "Rota das Vinícolas", "Catedral Diocesana", "Parque dos Macaquinhos"],
    faq: [
      {
        question: "Quando é a Festa da Uva?",
        answer: "A Festa da Uva de Caxias do Sul acontece a cada dois anos, geralmente em fevereiro e março.",
      },
    ],
  },
  "nova-petropolis": {
    slug: "nova-petropolis",
    name: "Nova Petrópolis",
    state: "RS",
    latitude: -29.3753,
    longitude: -51.1136,
    intro:
      "Nova Petrópolis, conhecida como o Jardim da Serra Gaúcha, preserva fortemente a cultura alemã com arquitetura enxaimel, o tradicional Labirinto Verde e o Parque Aldeia do Imigrante. A cidade é parada obrigatória entre Gramado e Caxias do Sul, com cafés coloniais, artesanato e festivais folclóricos durante todo o ano. Reserve hospedagem, restaurantes e atrações em Nova Petrópolis com desconto no Bah Ofertas.",
    highlights: [
      "Labirinto Verde — o maior da América Latina",
      "Parque Aldeia do Imigrante",
      "Centro de eventos enxaimel",
      "Café colonial e gastronomia alemã",
      "Festival Internacional de Folclore (julho)",
    ],
    faq: [
      {
        question: "O que fazer em Nova Petrópolis em 1 dia?",
        answer:
          "Comece pelo Labirinto Verde, almoce no Recanto Suíço, visite o Parque Aldeia do Imigrante e termine com um café colonial. No Bah Ofertas você compra ingressos antecipados com desconto.",
      },
      {
        question: "Vale a pena ficar hospedado em Nova Petrópolis?",
        answer:
          "Sim — a cidade é mais tranquila e econômica que Gramado, e fica a apenas 25 km, sendo ótima base para quem quer explorar toda a Serra Gaúcha sem o preço alto da alta temporada.",
      },
      {
        question: "Quando acontece o Festival de Folclore?",
        answer:
          "O Festival Internacional de Folclore de Nova Petrópolis acontece tradicionalmente em julho e atrai grupos de dezenas de países, com apresentações gratuitas no centro histórico.",
      },
    ],
  },
  "sao-francisco-de-paula": {
    slug: "sao-francisco-de-paula",
    name: "São Francisco de Paula",
    state: "RS",
    latitude: -29.4475,
    longitude: -50.5836,
    intro:
      "São Francisco de Paula é o destino ideal para quem busca natureza pura na Serra Gaúcha. Conhecida como a cidade dos sete lagos, abriga o famoso Cânion Itaimbezinho (Parque Nacional dos Aparados da Serra) e a Floresta Nacional. Hotéis fazenda, trilhas ecológicas e ar puro fazem da cidade um refúgio para casais e famílias. Reserve hospedagem e passeios em São Francisco de Paula com desconto no Bah Ofertas.",
    highlights: [
      "Cânion Itaimbezinho — Aparados da Serra",
      "Lago São Bernardo e os sete lagos",
      "Floresta Nacional de São Francisco de Paula",
      "Hotéis fazenda e ecoturismo",
      "Trilhas e cavalgadas",
    ],
    faq: [
      {
        question: "Como chegar ao Cânion Itaimbezinho?",
        answer:
          "O Parque Nacional Aparados da Serra fica a cerca de 70 km do centro de São Francisco de Paula. Muitas pousadas oferecem transfer e guia. No Bah Ofertas você encontra pacotes com passeio incluso.",
      },
      {
        question: "Qual a melhor época para visitar?",
        answer:
          "O outono (abril-junho) e o inverno (julho-setembro) oferecem o céu mais limpo para fotografar o cânion. Reserve com antecedência — hospedagem em alta temporada lota.",
      },
    ],
  },
  garibaldi: {
    slug: "garibaldi",
    name: "Garibaldi",
    state: "RS",
    latitude: -29.2566,
    longitude: -51.5340,
    intro:
      "Garibaldi é a capital nacional do espumante, no coração da região de imigração italiana da Serra Gaúcha. Vinícolas históricas, o passeio de Maria Fumaça e cafés coloniais com massa caseira atraem turistas o ano todo. Combine com Bento Gonçalves e Carlos Barbosa em um roteiro de enoturismo perfeito. Reserve hotéis, restaurantes e experiências em Garibaldi com desconto no Bah Ofertas.",
    highlights: [
      "Capital nacional do espumante",
      "Maria Fumaça (Garibaldi–Bento–Carlos Barbosa)",
      "Vinícolas Cave Geisse, Garibaldi e Don Giovanni",
      "Café colonial e gastronomia italiana",
      "Festa Nacional do Champanha",
    ],
    faq: [
      {
        question: "O que fazer em Garibaldi?",
        answer:
          "Visite a Cave Geisse para degustação de espumante, faça o passeio de Maria Fumaça até Bento Gonçalves e experimente o café colonial típico italiano. Compre ingressos e degustações com desconto no Bah Ofertas.",
      },
      {
        question: "Quanto custa o passeio de Maria Fumaça?",
        answer:
          "O passeio entre Garibaldi, Bento Gonçalves e Carlos Barbosa custa entre R$ 180 e R$ 250 por pessoa, incluindo apresentações culturais e parada panorâmica. Reserve antecipado — lota em feriados.",
      },
    ],
  },
  farroupilha: {
    slug: "farroupilha",
    name: "Farroupilha",
    state: "RS",
    latitude: -29.2253,
    longitude: -51.3417,
    intro:
      "Farroupilha é berço da imigração italiana no Rio Grande do Sul e abriga a tradicional FENAVINDIMA e o Parque dos Pinheiros. A cidade combina cultura italiana, vinhos premiados e gastronomia que mistura massas artesanais e churrasco gaúcho. Encontre hospedagem, restaurantes e experiências em Farroupilha com ofertas no Bah Ofertas.",
    highlights: [
      "FENAVINDIMA (fevereiro, anos pares)",
      "Parque dos Pinheiros",
      "Vinícolas Casa Valduga e Cordilheira",
      "Museu Casa de Pedra",
      "Pratos típicos italianos",
    ],
    faq: [
      {
        question: "Quando é a Fenavindima de Farroupilha?",
        answer:
          "A Festa Nacional da Vindima (FENAVINDIMA) acontece a cada dois anos, geralmente em fevereiro, celebrando a colheita da uva com desfiles, gastronomia e shows. Confira datas e ingressos no Bah Ofertas.",
      },
    ],
  },
};

export const SERRA_KEYWORDS_BASE = [
  "serra gaúcha",
  "hotéis gramado",
  "hotéis canela",
  "pousadas gramado",
  "hospedagem serra gaúcha",
  "ingressos parques gramado",
  "snowland",
  "mini mundo",
  "gramadozoo",
  "parque do caracol",
  "natal luz gramado",
  "restaurantes gramado",
  "fondue gramado",
  "café colonial gramado",
  "passeios canela",
  "vinícolas bento gonçalves",
  "vale dos vinhedos",
  "city tour serra gaúcha",
  "ofertas serra gaúcha",
  "cupons gramado",
];

export type CategorySlug =
  | "hoteis"
  | "pousadas"
  | "hoteis-baratos"
  | "ofertas"
  | "passeios"
  | "restaurantes";

const CATEGORY_LABELS: Record<CategorySlug, { plural: string; verb: string; targetPath: string }> = {
  hoteis: { plural: "Hotéis e Pousadas", verb: "Reserve", targetPath: "/hospedagem" },
  pousadas: { plural: "Pousadas", verb: "Reserve", targetPath: "/hospedagem" },
  "hoteis-baratos": { plural: "Hotéis baratos", verb: "Encontre", targetPath: "/hospedagem" },
  ofertas: { plural: "Ofertas e Cupons", verb: "Aproveite", targetPath: "/" },
  passeios: { plural: "Passeios e Ingressos", verb: "Compre", targetPath: "/entretenimento" },
  restaurantes: { plural: "Restaurantes e Cafés", verb: "Reserve", targetPath: "/restaurantes" },
};

/**
 * Copy de snippet por categoria, focada em CTR: promessa concreta + ação.
 * Sem números ou benefícios não verificáveis.
 */
const CATEGORY_SNIPPET: Record<CategorySlug, { lead: string; cta: string }> = {
  hoteis: {
    lead: "Compare hotéis e pousadas",
    cta: "Veja fotos, comodidades e reserve online em minutos.",
  },
  pousadas: {
    lead: "Compare pousadas",
    cta: "Veja fotos, comodidades e reserve online em minutos.",
  },
  "hoteis-baratos": {
    lead: "Encontre hospedagem em conta",
    cta: "Filtre por preço, veja avaliações e reserve online.",
  },
  ofertas: {
    lead: "Ofertas e cupons atualizados",
    cta: "Descontos em passeios, restaurantes e hospedagem. Compre online.",
  },
  passeios: {
    lead: "Ingressos e passeios com desconto",
    cta: "Escolha a data, garanta o ingresso e receba o voucher na hora.",
  },
  restaurantes: {
    lead: "Restaurantes, fondues e cafés coloniais",
    cta: "Veja cardápios, preços e garanta seu desconto antes de ir.",
  },
};

export function buildCitySeo(citySlug: string, category: CategorySlug) {
  const city = SERRA_CITIES[citySlug];
  if (!city) {
    return {
      title: `Serra Gaúcha — ${SITE_NAME}`,
      description: "Ofertas, hotéis, restaurantes e passeios na Serra Gaúcha.",
      keywords: SERRA_KEYWORDS_BASE.join(", "),
    };
  }
  const cat = CATEGORY_LABELS[category];
  const snippet = CATEGORY_SNIPPET[category];
  const year = new Date().getFullYear();
  // Título curto, keyword no início, ano para sinalizar conteúdo atual.
  const title = truncate(`${cat.plural} em ${city.name} ${year}: ${cat.verb} com desconto`, 60);
  const description = truncate(
    `${snippet.lead} em ${city.name}, na Serra Gaúcha. ${snippet.cta}`,
    155,
  );
  const keywords = [
    `${category} ${city.name.toLowerCase()}`,
    `${category} em ${city.name.toLowerCase()}`,
    `${cat.plural.toLowerCase()} ${city.name.toLowerCase()}`,
    `${city.name.toLowerCase()} serra gaúcha`,
    ...SERRA_KEYWORDS_BASE,
  ].join(", ");
  return { title, description, keywords, city, category: cat };
}


export function jsonLdTouristDestination(city: SerraCity) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: `${city.name} - Serra Gaúcha`,
    description: city.intro,
    url: `${SITE_URL}/`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: city.latitude,
      longitude: city.longitude,
    },
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: "Serra Gaúcha, Rio Grande do Sul, Brasil",
    },
    touristType: ["Casais", "Famílias", "Turismo gastronômico", "Ecoturismo"],
  };
}

export function jsonLdCollectionPage(input: { url: string; name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.url,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };
}

/** Generic WebPage schema — used on institutional/static pages. */
export function jsonLdWebPage(input: {
  url: string;
  name: string;
  description: string;
  inLanguage?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    inLanguage: input.inLanguage || "pt-BR",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: DEFAULT_OG_IMAGE },
  };
}

/**
 * Event schema — only emit when the event has real, cadastrado start/end dates.
 * Never invent dates, prices or attendance data.
 */
export function jsonLdEvent(input: {
  name: string;
  url: string;
  startDate: string;
  endDate?: string;
  image?: string;
  description?: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceCents?: number | null;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    url: input.url,
    startDate: input.startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: input.image || DEFAULT_OG_IMAGE,
    description: input.description,
    location: {
      "@type": "Place",
      name: input.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: input.city || "Serra Gaúcha",
        addressRegion: "RS",
        addressCountry: "BR",
        streetAddress: input.address || undefined,
      },
      ...(input.latitude && input.longitude
        ? { geo: { "@type": "GeoCoordinates", latitude: input.latitude, longitude: input.longitude } }
        : {}),
    },
    organizer: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
  if (input.endDate) data.endDate = input.endDate;
  if (input.priceCents && input.priceCents > 0) {
    data.offers = {
      "@type": "Offer",
      url: input.url,
      priceCurrency: "BRL",
      price: (input.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    };
  }
  return data;
}


/** Cities of the Serra Gaúcha covered by Bah Ofertas partners. */
const KNOWN_SERRA_CITY_NAMES = [
  "Gramado",
  "Canela",
  "Nova Petrópolis",
  "Bento Gonçalves",
  "Caxias do Sul",
  "São Francisco de Paula",
  "Carlos Barbosa",
  "Garibaldi",
  "Farroupilha",
  "Três Coroas",
  "São Marcos",
];

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Keyword fallbacks for well-known partners whose address label is a short slug. */
const ESTABLISHMENT_CITY_KEYWORDS: Array<[RegExp, string]> = [
  [/bondinho|caracol|skyglass|catedral de pedra|mundo a vapor/, "Canela"],
  [/lindenhof|aldeia do imigrante|ninho das aguias/, "Nova Petrópolis"],
  [/brasil raft|tres coroas/, "Três Coroas"],
];

/**
 * Resolves the real city of an establishment. The admin `address_label`
 * field often contains a short keyword (e.g. "snow", "alpen") instead of a
 * full address, so naive parsing produced labels like "Hotéis em snow".
 * Resolution order: known city mentioned in the address label → keyword
 * fallback from the establishment name → "Gramado" (most partners).
 */
export function resolveEstablishmentCity(
  addressLabel?: string | null,
  establishmentName?: string | null,
): string {
  if (addressLabel) {
    const normalizedAddress = normalizeForMatch(addressLabel);
    for (const city of KNOWN_SERRA_CITY_NAMES) {
      if (normalizedAddress.includes(normalizeForMatch(city))) return city;
    }
  }
  const normalizedName = normalizeForMatch(establishmentName || "");
  for (const [pattern, city] of ESTABLISHMENT_CITY_KEYWORDS) {
    if (pattern.test(normalizedName)) return city;
  }
  return "Gramado";
}

/** Returns the address only when it looks like a real address (not a short slug). */
export function resolveEstablishmentAddress(addressLabel?: string | null): string | undefined {
  if (!addressLabel) return undefined;
  const trimmed = addressLabel.trim();
  // Real addresses contain a street number or a comma; slugs like "snow" don't.
  if (/\d/.test(trimmed) || trimmed.includes(",")) return trimmed;
  return undefined;
}
