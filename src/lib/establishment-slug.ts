/**
 * URLs amigáveis para estabelecimentos.
 *
 * "O Grande Desfile de Natal" -> "Grande-Desfile-Natal"
 *
 * `establishmentSlug` gera o link exibido; `slugKey` normaliza qualquer
 * variação (slug novo, nome cru antigo com %20, acentos) para comparação,
 * garantindo que URLs antigas continuem funcionando.
 */

const STOPWORDS = new Set([
  "o", "a", "os", "as",
  "de", "da", "do", "das", "dos",
  "e", "em", "no", "na", "nos", "nas",
  "um", "uma", "ao", "aos",
]);

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function words(str: string): string[] {
  return stripAccents(str)
    .replace(/&/g, " e ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Slug legível usado nas URLs (mantém capitalização de cada palavra). */
export function establishmentSlug(name: string): string {
  const all = words(name || "");
  const kept = all.filter((w) => !STOPWORDS.has(w.toLowerCase()));
  const list = kept.length > 0 ? kept : all;
  return list
    .map((w) => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("-");
}

/** Chave canônica para comparar rota x nome do estabelecimento. */
export function slugKey(value: string): string {
  return establishmentSlug(value).toLowerCase();
}

/** Caminho completo da página de estabelecimento. */
export function establishmentPath(name: string): string {
  return `/estabelecimento/${establishmentSlug(name)}`;
}
