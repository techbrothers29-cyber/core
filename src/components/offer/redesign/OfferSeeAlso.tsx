import { Link } from "react-router-dom";

export interface OfferSeeAlsoLink {
  to: string;
  label: string;
}

/**
 * "Veja também": atalhos internos reais (cidade, categoria, hospedagem).
 * No celular viram uma faixa rolável; no desktop quebram linha.
 */
const OfferSeeAlso = ({ links }: { links: OfferSeeAlsoLink[] }) => (
  <section aria-labelledby="oferta-veja-tambem">
    <h2 id="oferta-veja-tambem" className="mb-3 text-base font-semibold text-foreground md:text-xl md:font-bold">
      Veja também
    </h2>
    <ul className="-mx-5 flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {links.map((l) => (
        <li key={l.to + l.label} className="shrink-0">
          <Link
            to={l.to}
            className="inline-flex h-11 items-center whitespace-nowrap rounded-full border border-[#dddddd] bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

export default OfferSeeAlso;
