import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { prefetchEstabelecimento } from "@/lib/route-prefetch";
import { formatBRL } from "./format";

interface OfferPurchaseCardProps {
  priceCents: number;
  oldPriceCents?: number;
  discount: string | null;
  subtitle?: string | null;
  /** Destino da compra (página do estabelecimento, igual ao fluxo anterior). */
  buyHref: string | null;
  /** Alternativa quando a oferta não tem estabelecimento vinculado. */
  fallbackHref: string;
  fallbackLabel: string;
}

/**
 * Card de compra da coluna direita (tablet e desktop).
 * O botão "Comprar agora" leva ao mesmo destino de antes: a página do
 * estabelecimento, onde o cliente escolhe data, horário e quantidade.
 */
const OfferPurchaseCard = ({
  priceCents, oldPriceCents, discount, subtitle, buyHref, fallbackHref, fallbackLabel,
}: OfferPurchaseCardProps) => {
  const hasOld = !!oldPriceCents && oldPriceCents > priceCents;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#dddddd] bg-background p-5 shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        {hasOld && (
          <s className="text-sm text-muted-foreground">
            <span className="sr-only">De </span>{formatBRL(oldPriceCents!)}
          </s>
        )}
        {priceCents > 0 && (
          <span className="text-[30px] font-extrabold leading-tight text-primary">
            <span className="sr-only">Por </span>{formatBRL(priceCents)}
          </span>
        )}
        {discount && (
          <span className="rounded-full bg-[#fff1f1] px-2.5 py-1 text-[13px] font-bold text-primary">
            {discount}
          </span>
        )}
      </div>

      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

      {buyHref ? (
        <Link
          to={buyHref}
          onMouseEnter={prefetchEstabelecimento}
          onTouchStart={prefetchEstabelecimento}
          className="flex h-[52px] items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Comprar agora
        </Link>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Esta oferta não está disponível para compra on-line no momento.
          </p>
          <Link
            to={fallbackHref}
            className="flex h-[52px] items-center justify-center rounded-xl border border-[#dddddd] px-6 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {fallbackLabel}
          </Link>
        </>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        Pagamento seguro via PIX ou cartão
      </p>
    </div>
  );
};

export default OfferPurchaseCard;
