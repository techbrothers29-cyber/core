/** Formata centavos em reais no padrão brasileiro (R$ 29,90). */
export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Percentual de desconto exibido no selo: usa o valor cadastrado na oferta e,
 * na falta dele, calcula a partir do preço antigo.
 */
export function discountLabel(
  discountPercent: number | null | undefined,
  priceCents: number,
  oldPriceCents?: number,
): string | null {
  if (discountPercent && discountPercent > 0) return `${Math.round(discountPercent)}% OFF`;
  if (oldPriceCents && priceCents > 0 && oldPriceCents > priceCents) {
    const pct = Math.round((1 - priceCents / oldPriceCents) * 100);
    return pct > 0 ? `${pct}% OFF` : null;
  }
  return null;
}
