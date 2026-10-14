/**
 * Otimização de imagens do Supabase Storage.
 *
 * Os cards/banners da home apontavam para o arquivo original no bucket público
 * (PNG/JPG de até ~2,4 MB), o que fazia a home baixar dezenas de MB em conexões
 * móveis. O endpoint de transformação do Supabase (`/render/image/public/`)
 * devolve a mesma imagem redimensionada e em WebP (~60 KB), reduzindo o payload
 * em mais de 95%.
 *
 * URLs que não são do Storage público (parceiros externos, assets locais,
 * data URIs) são devolvidas sem alteração.
 */
const PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_PATH = "/storage/v1/render/image/public/";

export function optimizedImage(
  url: string | null | undefined,
  width: number,
  quality = 70,
  resize: "cover" | "contain" | "fill" = "cover",
): string | undefined {
  if (!url) return undefined;
  if (!url.includes(PUBLIC_OBJECT_PATH)) return url;
  if (url.includes(RENDER_PATH)) return url;

  const [base, hash] = url.split("#");
  const [path, search] = base.split("?");
  const params = new URLSearchParams(search);
  params.set("width", String(Math.round(width)));
  params.set("quality", String(quality));
  params.set("resize", resize);

  const rendered = path.replace(PUBLIC_OBJECT_PATH, RENDER_PATH);
  return `${rendered}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

/** Gera um srcSet 1x/2x já otimizado (usa a mesma origem quando não é Storage). */
export function optimizedSrcSet(
  url: string | null | undefined,
  width: number,
  quality = 70,
  resize: "cover" | "contain" | "fill" = "cover",
): string | undefined {
  if (!url || !url.includes(PUBLIC_OBJECT_PATH)) return undefined;
  return [
    `${optimizedImage(url, width, quality, resize)} 1x`,
    `${optimizedImage(url, width * 2, quality, resize)} 2x`,
  ].join(", ");
}

/**
 * Fallback: se a versão transformada falhar (throttle/timeout do endpoint de
 * render), recarrega a imagem original do bucket em vez de mostrar o ícone de
 * imagem quebrada.
 */
export function imageFallback(originalUrl: string | null | undefined) {
  return (event: { currentTarget: HTMLImageElement }) => {
    const img = event.currentTarget;
    if (!originalUrl || img.dataset.fallbackApplied === "1") return;
    img.dataset.fallbackApplied = "1";
    img.removeAttribute("srcset");
    img.src = originalUrl;
  };
}
