import { memo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import CardImage from "@/components/CardImage";
import { useFavorites, type FavoriteItem } from "@/hooks/useFavorites";

export interface HomePlaceCardProps {
  /** Chave estável para favoritos. */
  favKey: string;
  title: string;
  image?: string;
  path: string;
  rating?: number;
  /** Linha cinza abaixo do título (ex.: "Serra Gaúcha · 25 opções"). */
  subtitle?: string;
  /** Selo no canto da foto, só no desktop (ex.: "Entretenimento", "-50%"). */
  tag?: string;
  tagTone?: "neutral" | "brand";
  /** Preço atual já formatado; vazio = "Ver ofertas". */
  price?: string;
  /** Preço antigo formatado (riscado). */
  oldPrice?: string | null;
  /** Mostra "A partir de" antes do preço. */
  fromLabel?: boolean;
  /** Pré-carrega a página de destino ao tocar/passar o mouse. */
  onPrefetch?: () => void;
  /** Mantém o enquadramento da foto como no card original. */
  forceCover?: boolean;
  imageClassName?: string;
}

const formatRating = (r: number) => r.toFixed(1).replace(".", ",");

/**
 * Card da Home no formato da proposta visual: foto grande arredondada
 * (quadrada no celular), coração para favoritar, nome + nota, linha de apoio e preço.
 * O link e o coração são irmãos (sem botão dentro de link), acessíveis por teclado.
 */
const HomePlaceCard = memo((props: HomePlaceCardProps) => {
  const {
    favKey, title, image, path, rating, subtitle, tag, tagTone = "neutral",
    price, oldPrice, fromLabel = true, onPrefetch, forceCover, imageClassName,
  } = props;
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(favKey);

  const favItem: Omit<FavoriteItem, "savedAt"> = {
    key: favKey,
    title,
    image,
    path,
    subtitle,
    rating,
    priceLabel: price ? `${fromLabel ? "A partir de " : ""}${price}` : undefined,
  };

  let priceLine: ReactNode;
  if (!price) {
    priceLine = <span className="font-semibold text-foreground">Ver ofertas</span>;
  } else if (oldPrice) {
    priceLine = (
      <>
        <b className="font-bold text-foreground">{price}</b>{" "}
        <s className="text-xs md:text-[13px] text-muted-foreground">{oldPrice}</s>
      </>
    );
  } else {
    priceLine = (
      <>
        {fromLabel && <span className="text-[13px] text-muted-foreground">A partir de </span>}
        <b className="font-bold text-foreground">{price}</b>
      </>
    );
  }

  return (
    <div className="relative h-full">
      <Link
        to={path}
        onMouseEnter={onPrefetch}
        onTouchStart={onPrefetch}
        className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="relative aspect-square md:aspect-[4/3] rounded-[14px] md:rounded-2xl overflow-hidden bg-muted">
          {image ? (
            <CardImage
              src={image}
              alt={title}
              width={480}
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 45vw"
              hoverZoom
              forceCover={forceCover}
              className={imageClassName}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
          )}
          {tag && (
            <span
              className={`hidden md:inline-block absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${
                tagTone === "brand" ? "bg-primary text-primary-foreground" : "bg-white text-[#1f1f1f]"
              }`}
            >
              {tag}
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-2 mt-2 md:mt-2.5">
          <h3 className="m-0 min-w-0 truncate text-sm md:text-[15px] font-semibold text-foreground">{title}</h3>
          {typeof rating === "number" && rating > 0 && (
            <span className="flex items-center gap-0.5 shrink-0 text-sm text-foreground">
              <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-foreground text-foreground" aria-hidden="true" />
              <span className="sr-only">Nota </span>
              {formatRating(rating)}
            </span>
          )}
        </div>
        {subtitle && <p className="m-0 mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>}
        <p className="m-0 mt-0.5 md:mt-1.5 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{priceLine}</p>
      </Link>
      <button
        type="button"
        onClick={() => toggleFavorite(favItem)}
        aria-pressed={fav}
        aria-label={fav ? `Remover ${title} dos favoritos` : `Salvar ${title} nos favoritos`}
        className="absolute right-1 top-1 md:right-3 md:top-3 w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full md:bg-white/90 md:hover:bg-white md:shadow-sm transition-colors"
      >
        <Heart
          className={`w-6 h-6 md:w-[18px] md:h-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] md:drop-shadow-none ${
            fav ? "fill-primary text-primary" : "text-white md:text-[#1f1f1f]"
          }`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
    </div>
  );
});

HomePlaceCard.displayName = "HomePlaceCard";
export default HomePlaceCard;
