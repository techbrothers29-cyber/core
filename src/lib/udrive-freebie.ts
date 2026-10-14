/**
 * U-Drive Gratuito (produto NovaXS 140170) — brinde automático do carrinho.
 *
 * Sempre que o usuário adiciona qualquer item pago ao carrinho, o U-Drive
 * é incluído uma única vez como cortesia. O usuário ainda pode remover
 * manualmente. Ele NÃO deve aparecer nos carrosséis da home.
 */
import { invokeInBrazil } from "@/lib/supabase-region";
import { format } from "date-fns";

export const UDRIVE_PRODUCT_ID = "140170";
export const UDRIVE_CART_ID_PREFIX = "udrive-freebie";

export function isUdriveFreebie(item: { id?: string; metadata?: any }): boolean {
  if (!item) return false;
  if (item.id && item.id.startsWith(UDRIVE_CART_ID_PREFIX)) return true;
  const pid = item.metadata?.productId;
  return pid != null && String(pid) === UDRIVE_PRODUCT_ID;
}

export function isUdriveEstablishmentName(name?: string | null): boolean {
  if (!name) return false;
  // Normaliza acentos, hífens e espaços: "U-Drive - Brinde" -> "udrivebrinde"
  const n = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return n.startsWith("udrive");
}

interface NovaxsRawProduct {
  id?: string | number;
  path?: string;
  name?: string;
  image?: string;
  token?: string;
  supplierName?: string;
  priceCents?: number;
  price?: number;
}

/** Converte yyyy-MM-dd -> dd/mm/yyyy (formato exigido pela NovaXS). */
function toBrDate(date: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return date;
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return date;
}

/** Busca dados frescos do produto U-Drive (com priceToken válido) para uma data. */
export async function fetchUdriveProduct(date: string): Promise<NovaxsRawProduct | null> {
  try {
    const { data } = await invokeInBrazil<{ products?: NovaxsRawProduct[] }>(
      "novaxs-search-products",
      { date: toBrDate(date) }
    );
    const products = data?.products || [];
    // A edge devolve id no formato "products/140170" (canonical). Normalizamos
    // extraindo o trecho numérico para casar com UDRIVE_PRODUCT_ID.
    const match = products.find((p) => {
      const rawId = String(p.id ?? "").replace(/^products\//, "").trim();
      const rawPath = String(p.path ?? "").replace(/^products\//, "").trim();
      return rawId === UDRIVE_PRODUCT_ID || rawPath === UDRIVE_PRODUCT_ID;
    });
    return match || null;
  } catch {
    return null;
  }
}


export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}
