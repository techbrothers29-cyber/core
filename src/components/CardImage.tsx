import React from "react";
import { cn } from "@/lib/utils";
import { optimizedImage, imageFallback } from "@/lib/image-optimize";

/**
 * Imagem de card padronizada: a foto aparece SEMPRE inteira (`object-contain`),
 * nunca cortada. As sobras laterais/superiores são preenchidas por uma cópia
 * desfocada e ampliada da própria imagem, mantendo a moldura totalmente ocupada.
 */

interface CardImageProps {
  src: string;
  alt: string;
  /** Largura base para a transformação/otimização. */
  width: number;
  sizes?: string;
  className?: string;
  imgWidth?: number;
  imgHeight?: number;
  /** Aplica leve zoom no hover (apenas em dispositivos com mouse). */
  hoverZoom?: boolean;
  /** Mantém o preenchimento total mesmo quando a foto é vertical/panorâmica. */
  forceCover?: boolean;
}

export const CardImage: React.FC<CardImageProps> = ({
  src,
  alt,
  width,
  sizes,
  className,
  imgWidth,
  imgHeight,
  hoverZoom = false,
  forceCover = false,
}) => {
  // `cover` enquadra a foto preenchendo o card (padrão). Só caímos para
  // `contain` quando a proporção da imagem é muito diferente da moldura,
  // evitando cortes agressivos em fotos muito verticais/panorâmicas.
  const [fit, setFit] = React.useState<"cover" | "contain">("cover");

  React.useEffect(() => {
    setFit("cover");
  }, [src]);

  const handleLoad = React.useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const frame = img.parentElement;
    if (!img.naturalWidth || !img.naturalHeight || !frame) return;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const frameRatio = frame.clientWidth / Math.max(frame.clientHeight, 1);
    const ratio = imgRatio / frameRatio;
    // Só usamos `contain` em fotos realmente extremas (panorâmicas ou muito
    // verticais). Diferenças moderadas continuam em `cover`, preenchendo o card.
    setFit(!forceCover && (ratio > 2.1 || ratio < 0.5) ? "contain" : "cover");
  }, [forceCover]);


  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      {fit === "contain" && (
        <img
          src={optimizedImage(src, Math.round(width / 2), 40)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl saturate-150"
          loading="lazy"
          decoding="async"
        />
      )}
      <img
        src={optimizedImage(src, width, 70, "contain")}
        srcSet={`${optimizedImage(src, width, 70, "contain")} 1x, ${optimizedImage(src, width * 2, 70, "contain")} 2x`}
        sizes={sizes}
        alt={alt}
        width={imgWidth}
        height={imgHeight}
        onLoad={handleLoad}
        className={cn(
          "relative w-full h-full object-center transition-transform duration-500",
          fit === "cover" ? "object-cover" : "object-contain",
          hoverZoom && "[@media(hover:hover)]:group-hover:scale-105",
          className,
        )}
        loading="lazy"
        decoding="async"
        onError={imageFallback(src)}
      />
    </div>
  );
};


export default CardImage;
