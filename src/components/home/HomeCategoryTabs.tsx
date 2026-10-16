import { Link, useLocation } from "react-router-dom";
import { BedDouble, FerrisWheel, UtensilsCrossed, Wrench, Car } from "lucide-react";

const TABS = [
  { label: "Hospedagem", to: "/hospedagem", icon: BedDouble },
  { label: "Entretenimento", to: "/entretenimento", icon: FerrisWheel },
  { label: "Restaurantes", to: "/restaurantes", icon: UtensilsCrossed },
  { label: "Serviços", to: "/servicos", icon: Wrench },
  { label: "Carros", to: "/carros", icon: Car },
];

/**
 * Abas de categoria da Home, logo abaixo da busca (proposta visual).
 * Celular: linha rolável, com respiro no fim para o último item não ficar colado na borda.
 * Tablet/desktop: centralizadas.
 */
const HomeCategoryTabs = () => {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Categorias" className="w-full max-w-[1600px] mx-auto md:px-8 mt-3 md:mt-1">
      <ul className="flex gap-2.5 md:gap-3 md:justify-center overflow-x-auto m-0 py-1 pl-5 md:px-0 list-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden after:content-[''] after:shrink-0 after:w-3 md:after:hidden">
        {TABS.map(({ label, to, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="shrink-0">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-2 h-11 md:h-12 pl-1.5 pr-4 md:pr-5 rounded-full border text-[13px] md:text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-[#ebebeb] bg-card text-foreground hover:border-[#1f1f1f]"
                }`}
              >
                <span className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default HomeCategoryTabs;
