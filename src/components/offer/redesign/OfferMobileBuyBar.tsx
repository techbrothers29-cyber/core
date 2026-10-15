import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { prefetchEstabelecimento } from "@/lib/route-prefetch";
import { formatBRL } from "./format";

interface OfferMobileBuyBarProps {
  priceCents: number;
  oldPriceCents?: number;
  buyHref: string | null;
  fallbackHref: string;
  fallbackLabel: string;
}

/** Altura da barra (sem a área segura do iPhone); usada também no espaçador da página. */
export const OFFER_BUY_BAR_HEIGHT = 80;

/**
 * Barra fixa inferior do celular: preço à esquerda e "Comprar agora" à direita.
 * Renderizada em document.body (portal) porque o PageTransition aplica
 * `transform` no conteúdo da rota, o que prenderia um `fixed` dentro dele.
 */
const OfferMobileBuyBar = ({ priceCents, oldPriceCents, buyHref, fallbackHref, fallbackLabel }: OfferMobileBuyBarProps) => {
  if (typeof document === "undefined") return null;
  const hasOld = !!oldPriceCents && oldPriceCents > priceCents;

  const bar = (
    <div
      className="font-jakarta fixed inset-x-0 bottom-0 z-50 border-t border-[#ebebeb] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      role="region"
      aria-label="Comprar oferta"
    >
      <div className="flex h-20 items-center justify-between gap-3 px-5">
        <div className="min-w-0 leading-tight">
          {priceCents > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">{formatBRL(priceCents)}</span>
              {hasOld && (
                <s className="truncate text-xs text-muted-foreground">
                  <span className="sr-only">De </span>{formatBRL(oldPriceCents!)}
                </s>
              )}
            </div>
          ) : null}
          <p className="truncate text-xs text-muted-foreground">Pagamento via PIX ou cartão</p>
        </div>
        {buyHref ? (
          <Link
            to={buyHref}
            onTouchStart={prefetchEstabelecimento}
            className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground active:scale-[0.98]"
          >
            Comprar agora
          </Link>
        ) : (
          <Link
            to={fallbackHref}
            className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-[#dddddd] px-5 text-[15px] font-semibold text-foreground"
          >
            {fallbackLabel}
          </Link>
        )}
      </div>
    </div>
  );

  return createPortal(bar, document.body);
};

export default OfferMobileBuyBar;
