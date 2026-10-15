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
    <nav aria-label="Categorias" className="w-full max-w-[1600px] mx-auto md:px-8 mt-3 md:mt-0">
      <ul className="flex gap-[26px] md:gap-9 md:justify-center overflow-x-auto m-0 pl-5 md:px-0 list-none border-b border-[#ebebeb] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden after:content-[''] after:shrink-0 after:w-5 md:after:hidden">
        {TABS.map(({ label, to, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="shrink-0">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 md:gap-1.5 pt-2.5 pb-2 px-1 text-xs md:text-[13px] font-medium md:font-semibold border-b-2 transition-colors min-h-[44px] ${
                  active
                    ? "text-foreground border-foreground md:text-primary md:border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-[#dddddd]"
                }`}
              >
                <Icon className="w-6 h-6 md:w-[26px] md:h-[26px]" strokeWidth={1.8} aria-hidden="true" />
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
