import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface HomeSectionHeadingProps {
  id?: string;
  title: string;
  /** Título alternativo, mais curto, no celular. */
  mobileTitle?: string;
  /** Rota "ver todos" (ex.: /entretenimento). */
  to?: string;
  /** Texto auxiliar à direita do título no desktop (ex.: "42 ofertas"). */
  aside?: string;
}

/** Título de seção da Home: alinhado à esquerda, com atalho "Ver todos". */
const HomeSectionHeading = ({ id, title, mobileTitle, to, aside }: HomeSectionHeadingProps) => (
  <div className="flex items-center justify-between gap-4 mb-2 md:mb-3">
    <h2 id={id} className="m-0 text-lg md:text-[22px] font-semibold md:font-extrabold tracking-tight text-foreground">
      {mobileTitle ? (
        <>
          <span className="md:hidden">{mobileTitle}</span>
          <span className="hidden md:inline">{title}</span>
        </>
      ) : (
        title
      )}
    </h2>
    <div className="flex items-center gap-4 shrink-0">
      {aside && <span className="hidden md:inline text-sm text-muted-foreground">{aside}</span>}
      {to && (
        <Link
          to={to}
          className="inline-flex items-center gap-0.5 min-h-[44px] min-w-[44px] justify-end text-sm font-semibold text-foreground hover:underline underline-offset-4"
          aria-label={`Ver todos: ${title}`}
        >
          <span className="hidden md:inline">Ver todos</span>
          <ChevronRight className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
        </Link>
      )}
    </div>
  </div>
);

export default HomeSectionHeading;
