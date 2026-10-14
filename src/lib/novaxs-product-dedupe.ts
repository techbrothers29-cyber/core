import type { NovaxsProduct } from "@/data/novaxs-establishments";

export function getCanonicalProductId(product: Pick<NovaxsProduct, "id" | "path">): string {
  const rawPath = typeof product.path === "string" ? product.path.trim() : "";
  if (rawPath) {
    return rawPath.startsWith("products/") ? rawPath : `products/${rawPath.replace(/^\/+/, "")}`;
  }

  const rawId = typeof product.id === "string" ? product.id.trim() : String(product.id ?? "").trim();
  if (!rawId) return "";
  return rawId.startsWith("products/") ? rawId : `products/${rawId}`;
}

export function getLegacyProductId(productId: string): string {
  return productId.replace(/^products\//, "");
}

export function isGenericProductTitle(name?: string | null, productId?: string): boolean {
  const normalizedName = name?.trim().toLowerCase() || "";
  if (!normalizedName) return true;

  const legacyId = productId ? getLegacyProductId(productId).toLowerCase() : "";
  const normalizedLegacyId = legacyId.replace(/^products\//, "");
  const normalizedProductPath = normalizedLegacyId ? `products/${normalizedLegacyId}` : "";

  return Boolean(
    /^\d+$/.test(normalizedName) ||
      normalizedName === normalizedLegacyId ||
      normalizedName === normalizedProductPath ||
      normalizedName === `produto ${normalizedLegacyId}` ||
      normalizedName === `produto ${normalizedProductPath}` ||
      /^produto\s+(?:products\/)?\d+$/i.test(normalizedName),
  );
}

function normalizeProductTitle(name?: string | null): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function dedupeNovaxsProducts(products: NovaxsProduct[]): NovaxsProduct[] {
  const groupedProducts = new Map<string, NovaxsProduct[]>();

  products.forEach((product) => {
    const canonicalId = getCanonicalProductId(product);
    if (!canonicalId) return;

    const normalizedTitle = normalizeProductTitle(product.name || product.shortName);
    const dedupeKey = `${canonicalId}::${normalizedTitle || "__sem_titulo__"}`;

    const currentGroup = groupedProducts.get(dedupeKey) || [];
    currentGroup.push({
      ...product,
      id: canonicalId,
      path: canonicalId,
    });
    groupedProducts.set(dedupeKey, currentGroup);
  });

  return Array.from(groupedProducts.entries()).flatMap(([dedupeKey, group]) => {
    const [canonicalId] = dedupeKey.split("::");
    const realNamedProducts = group.filter((product) => !isGenericProductTitle(product.name, canonicalId));
    const source = realNamedProducts.length > 0 ? realNamedProducts : group;
    if (source.length === 0) return [];

    const preferredProduct = [...source].sort((a, b) => {
      const aHasImage = a.image ? 1 : 0;
      const bHasImage = b.image ? 1 : 0;
      const aHasDescription = (a.htmlMemo || a.memo) ? 1 : 0;
      const bHasDescription = (b.htmlMemo || b.memo) ? 1 : 0;
      const aHasPrice = a.priceCents > 0 ? 1 : 0;
      const bHasPrice = b.priceCents > 0 ? 1 : 0;
      const aHasType = a.type ? 1 : 0;
      const bHasType = b.type ? 1 : 0;

      return (bHasImage - aHasImage)
        || (bHasDescription - aHasDescription)
        || (bHasPrice - aHasPrice)
        || (bHasType - aHasType);
    })[0];

    return [preferredProduct];
  });
}