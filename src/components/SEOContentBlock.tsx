import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface InternalLink {
  to: string;
  label: string;
}

interface Props {
  /** Optional rich intro paragraphs displayed above the FAQ. */
  paragraphs?: string[];
  /** Trust bullets (ex.: "Sem taxa de reserva", "Preço em tempo real"). */
  bullets?: string[];
  /** FAQ items rendered as semantic H3/P (also indexable). */
  faq?: FaqItem[];
  /** Cross-link suggestions ("Veja também"). */
  internalLinks?: InternalLink[];
  /** Section heading shown at the top (defaults to entity name). */
  heading?: string;
  /** Label for the cross-link section (default: "Veja também"). */
  linksHeading?: string;
}

/**
 * Reusable indexable SEO content block. Renders a long-form description,
 * trust bullets, a semantic FAQ (paired with FAQPage JSON-LD in the parent),
 * and cross-links for internal linking depth.
 *
 * Add the matching FAQ schema in the parent via `jsonLdFaq(...)` from
 * `src/lib/seo.ts` to keep DOM + structured data in sync.
 */
const SEOContentBlock: React.FC<Props> = ({
  paragraphs = [],
  bullets = [],
  faq = [],
  internalLinks = [],
  heading,
  linksHeading = "Veja também",
}) => {
  if (
    paragraphs.length === 0 &&
    bullets.length === 0 &&
    faq.length === 0 &&
    internalLinks.length === 0
  ) {
    return null;
  }

  return (
    <section
      className="container mx-auto max-w-5xl px-4 py-8 border-t border-border"
      aria-labelledby="seo-content-heading"
    >
      {heading && (
        <h2 id="seo-content-heading" className="text-xl md:text-2xl font-semibold mb-4">
          {heading}
        </h2>
      )}

      {paragraphs.length > 0 && (
        <div className="prose prose-sm md:prose-base max-w-none text-foreground/90 space-y-3 mb-6">
          {paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
      )}

      {bullets.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2 mb-8">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-sm text-foreground/90"
            >
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {faq.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Perguntas frequentes</h3>
          <div className="space-y-3 faq-tech-list">
            {faq.map((item) => (
              <article
                key={item.question}
                className="faq-tech-card bg-card border border-border rounded-lg p-4"
              >
                <span className="faq-tech-scan" aria-hidden="true" />
                <h4 className="relative z-[1] font-semibold text-foreground mb-1.5">
                  {item.question}
                </h4>
                <p className="relative z-[1] text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {internalLinks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{linksHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {internalLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="seo-link-chip">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default SEOContentBlock;
