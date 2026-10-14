import bannerImage from "@/assets/promotional-banner.png";
import natalBanner from "@/assets/natal-banner.png";
import { optimizedImage, optimizedSrcSet, imageFallback } from "@/lib/image-optimize";

interface PromotionalBannerProps {
  imageUrl?: string;
  title?: string;
}

// Mapeamento de imagens locais por título
const localBanners: Record<string, string> = {
  "VIVA A MAGIA DO NATAL": natalBanner,
  "default": bannerImage
};

const PromotionalBanner = ({ imageUrl, title }: PromotionalBannerProps) => {
  // Se imageUrl começar com 'local://', usar o mapping local por título
  const isLocalImage = imageUrl?.startsWith('local://');
  const imageSrc = (isLocalImage || !imageUrl)
    ? (localBanners[title || ""] || localBanners.default)
    : imageUrl;

  // A transformação padrão do Supabase era `cover`, que recortava banners com
  // proporção diferente de 1200x260. Agora usamos `contain` e deixamos a altura
  // seguir a proporção real do arquivo (sem corte e sem distorção).

  return (
    <div className="w-full max-w-[1600px] mx-auto mb-2 md:mb-4 flex justify-center items-center px-4">
      <img
        src={optimizedImage(imageSrc, 1200, 72, "contain")}
        srcSet={optimizedSrcSet(imageSrc, 1200, 72, "contain")}
        sizes="(min-width: 768px) 1200px, 100vw"
        alt="Banner promocional"
        className="rounded-lg md:rounded-2xl shadow-lg w-full"
        loading="lazy"
        decoding="async"
        onError={imageFallback(imageSrc)}
        style={{ maxWidth: '1200px', height: 'auto', objectFit: 'contain' }}
      />
    </div>
  );
};

export default PromotionalBanner;
