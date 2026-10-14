import {
  classifyEstablishment,
  getRating,
  type Establishment,
} from "@/data/novaxs-establishments";

interface IntegratedEstablishmentCatalogEntry {
  name: string;
  aliases?: string[];
}

const NOVAXS_INTEGRATED_ESTABLISHMENTS: IntegratedEstablishmentCatalogEntry[] = [
  { name: "Acquamotion" },
  { name: "Aldeia do Papai Noel" },
  { name: "Alpen Park" },
  { name: "Big Land" },
  { name: "Bondinhos Canela" },
  { name: "Cacique Steak", aliases: ["Cacique Steak Ember"] },
  { name: "Café Bela Vista" },
  { name: "Café da Banca" },
  { name: "Canyons & Baloes Adventure", aliases: ["Canyons"] },
  { name: "Caquelon Fondue", aliases: ["Caquelon Fondue e Restaurante", "Caquelon"] },
  { name: "Castelo Saint Andrews", aliases: ["Saint Andrews"] },
  { name: "Casa Galo", aliases: ["Casa Galo(cacique)"] },
  { name: "Cervejaria do Farol", aliases: ["Cervejaria Farol", "Farol"] },
  { name: "Cervejaria Felsen", aliases: ["Felsen"] },
  { name: "Chalezinho Gramado", aliases: ["Chalezinho"] },
  { name: "Chocoland" },
  { name: "Cristais de Gramado" },
  { name: "Edelbrau", aliases: ["Cervejaria Edelbrau"] },
  { name: "Era do Fogo" },
  { name: "Exceed Park" },
  { name: "Forever In Gramado", aliases: ["Forever em Gramado", "Forever"] },
  { name: "Garden Park" },
  { name: "Garfo e Bombacha" },
  { name: "Gramado Receptivo", aliases: ["Gramado Receptivo (Maria Fuma)", "Maria Fumaça", "Maria Fuma", "Passeio Maria Fumaça", "Passeio Maria Fumaca"] },
  { name: "Grupo Dreams" },
  { name: "Happy Valen" },
  { name: "Hard Rock" },
  { name: "Hector Ferrovia Secreta" },
  { name: "Hector Pizzaria", aliases: ["Hector"] },
  { name: "Jolimont", aliases: ["Jolimont (Compo e Vinho)", "Campo e Vinho"] },
  { name: "Kongo Pizzaria", aliases: ["Kongo"] },
  { name: "Lumni" },
  { name: "Malbec", aliases: ["Malbek", "Malbek Gramado"] },
  { name: "Mátria Parque das Flores", aliases: ["Mátria"] },
  { name: "Mini Mundo" },
  { name: "Mundo Lugano" },
  { name: "Museu do Vinho" },
  { name: "Natal Luz", aliases: ["O Grande Desfile de Natal", "Grande Desfile de Natal", "Desfile de Natal", "Natal Luz Gramado"] },
  { name: "NBA Park Gramado" },
  { name: "Oficina Criamigos", aliases: ["Criamigos"] },
  { name: "Olivas de Gramado" },
  { name: "Parque de Aventuras Gasper", aliases: ["Parque de aventuras Gasper", "Gasper"] },
  { name: "Parque do Caracol", aliases: ["Caracol"] },
  { name: "Parque Pedras do Silêncio", aliases: ["Pedras do Silêncio"] },
  { name: "Parque Terra Mágica Florybal", aliases: ["Terra Mágica Florybal", "Florybal"] },
  { name: "Rasen Braza" },
  { name: "Recordar Fotos", aliases: ["Recordar Fotos - Foto a moda antiga", "Recordar"] },
  { name: "Reino da Boêmia" },
  { name: "Reino do Chocolate" },
  { name: "Restaurante Lindenhof", aliases: ["Lindenhof"] },
  { name: "Roda Canela" },
  { name: "SKY Cantina Premium", aliases: ["SKY Cantina Premium - Fornecedora"] },
  { name: "SKY Chateau Allemand", aliases: ["Château Allemand"] },
  { name: "SKY Kids", aliases: ["SKY Kids - Fornecedora"] },
  { name: "SKY La Bella Notte", aliases: ["La Bella Notte"] },
  { name: "SKY Palace Café Colonial", aliases: ["SKY Palace Café Colonial - Fornecedora", "Palace Café Colonial", "Palace Café"] },
  { name: "SKY Sopas da Serra", aliases: ["SKY Sopas da Serra - Fornecedora", "Sopas da Serra"] },
  { name: "SKY SPA Gramado", aliases: ["SKY SPA", "SKY SPA Gramado - Fornecedora"] },
  { name: "Skyglass" },
  { name: "Snowland", aliases: ["Snowland - Orbit", "Snowland Orbit"] },
  { name: "Space Adventure" },
  { name: "Tchê Pierre Fondue Temático", aliases: ["Tchê Pierre"] },
  { name: "Tour Raízes Coloniais", aliases: ["Raízes Coloniais"] },
  { name: "U Drive", aliases: ["U-Drive"] },
  { name: "Versoi Fondue", aliases: ["Versoi"] },
  { name: "Vila da Mônica" },
  { name: "Carlitos Prime Restaurante de Fondue", aliases: ["Carlitos Prime", "Carlitos Prime Restaurante", "Carlitos", "Carlitos prime restaurante de fondue"] },
  { name: "Churrascaria Gramadense", aliases: ["Gramadense"] },
];

export function normalizeNovaxsText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyEstablishmentName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function getCatalogTerms(entry: IntegratedEstablishmentCatalogEntry): string[] {
  return [entry.name, ...(entry.aliases ?? [])].map(normalizeNovaxsText);
}

function buildCatalogEstablishment(entry: IntegratedEstablishmentCatalogEntry): Establishment {
  return {
    id: `est-${slugifyEstablishmentName(entry.name)}`,
    name: entry.name,
    category: classifyEstablishment(entry.name),
    image: "",
    rating: getRating(entry.name),
    minPrice: 0,
    productCount: 0,
    products: [],
  };
}

export function searchIntegratedEstablishments(query: string): Establishment[] {
  const normalizedQuery = normalizeNovaxsText(query);
  if (!normalizedQuery) return [];

  return NOVAXS_INTEGRATED_ESTABLISHMENTS
    .filter((entry) => getCatalogTerms(entry).some((term) => term.includes(normalizedQuery)))
    .map(buildCatalogEstablishment);
}

export function resolveIntegratedEstablishmentByName(name: string): Establishment | null {
  const normalizedName = normalizeNovaxsText(name);

  const entry = NOVAXS_INTEGRATED_ESTABLISHMENTS.find((candidate) =>
    getCatalogTerms(candidate).some(
      (term) => term === normalizedName || term.includes(normalizedName) || normalizedName.includes(term)
    )
  );

  return entry ? buildCatalogEstablishment(entry) : null;
}

/**
 * Maps a raw NovaXS supplierName (e.g. "Snowland - Orbit") to the canonical
 * establishment name ("Snowland") when it exactly matches a catalog alias.
 * Returns the input unchanged otherwise.
 */
export function canonicalizeSupplierName(supplierName?: string | null): string {
  if (!supplierName) return supplierName ?? "";
  const normalized = normalizeNovaxsText(supplierName);
  const entry = NOVAXS_INTEGRATED_ESTABLISHMENTS.find((candidate) =>
    getCatalogTerms(candidate).some((term) => term === normalized)
  );
  return entry ? entry.name : supplierName;
}
