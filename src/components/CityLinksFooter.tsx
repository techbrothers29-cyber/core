import React from "react";
import { Link } from "react-router-dom";

interface Props {
  currentSlug?: string;
}

const LINKS = [
  { to: "/hoteis-em-gramado", label: "Hotéis em Gramado" },
  { to: "/hoteis-em-canela", label: "Hotéis em Canela" },
  { to: "/hoteis-em-bento-goncalves", label: "Hotéis em Bento Gonçalves" },
  { to: "/hoteis-na-serra-gaucha", label: "Hotéis na Serra Gaúcha" },
  { to: "/pousadas-em-gramado", label: "Pousadas em Gramado" },
  { to: "/pousadas-em-canela", label: "Pousadas em Canela" },
  { to: "/hoteis-baratos-em-gramado", label: "Hotéis baratos em Gramado" },
  { to: "/ofertas-em-gramado", label: "Ofertas em Gramado" },
  { to: "/ofertas-em-canela", label: "Ofertas em Canela" },
  { to: "/passeios-em-gramado", label: "Passeios em Gramado" },
  { to: "/passeios-em-canela", label: "Passeios em Canela" },
  { to: "/restaurantes-em-gramado", label: "Restaurantes em Gramado" },
];

const CityLinksFooter: React.FC<Props> = () => {
  return (
    <section className="mt-10 pt-8 border-t border-border" aria-labelledby="city-links-title">
      <h2 id="city-links-title" className="text-lg font-semibold mb-4">
        Explore a Serra Gaúcha
      </h2>
      <ul className="flex flex-wrap gap-2">
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="inline-block px-3 py-1.5 text-sm rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CityLinksFooter;
