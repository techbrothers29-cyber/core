import React from "react";
import { Helmet } from "react-helmet";
import { BAH_OFERTAS_SITE, absoluteUrl } from "@/lib/seo";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string; // path or full URL
  image?: string;
  keywords?: string;
  type?: "website" | "article" | "product" | "place";
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  /** One or more JSON-LD schema objects. */
  jsonLd?: Array<Record<string, unknown>>;
  noindex?: boolean;
}

/**
 * Centralized SEO/meta tag injector. Applies optimized title, description,
 * Open Graph, Twitter Card, geo and Schema.org JSON-LD on a per-page basis.
 */
const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonical,
  image,
  keywords,
  type = "website",
  latitude,
  longitude,
  city,
  jsonLd,
  noindex,
}) => {
  const url = canonical
    ? absoluteUrl(canonical)
    : (typeof window !== "undefined" ? window.location.href : BAH_OFERTAS_SITE.url);
  const ogImage = image || BAH_OFERTAS_SITE.defaultImage;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content={BAH_OFERTAS_SITE.name} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Geo */}
      <meta name="geo.region" content="BR-RS" />
      {city && <meta name="geo.placename" content={city} />}
      {latitude && longitude && (
        <meta name="geo.position" content={`${latitude};${longitude}`} />
      )}
      {latitude && longitude && (
        <meta name="ICBM" content={`${latitude}, ${longitude}`} />
      )}

      {/* JSON-LD Schema.org */}
      {jsonLd?.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
