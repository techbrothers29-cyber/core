import { Link, useLocation } from "react-router-dom";
import { BedDouble, FerrisWheel, UtensilsCrossed, Wrench, Car } from "lucide-react";

const TABS = [
  { label: "Hospedagem", to: "/hospedagem", icon: BedDouble },
  { label: "Entretenimento", to: "/entretenimento", icon: FerrisWheel },
  { label: "Restaurantes", to: "/restaurantes", icon: UtensilsCrossed },
  { label: "Serviços", to: "/servicos", icon: Wrench },
  { label: "Carros", to: "/carros", icon: Car },
];

/** Abas de categoria da Home (tablet/desktop): ícone acima do rótulo, sublinhado no item ativo. */
const HomeCategoryTabs = () => {
  const { pathname } = useLocation();
  return (
    // Só tablet/desktop: no celular as categorias já estão na barra fixa inferior (CategoryNav),
    // que também abre a lista de parceiros. Mostrar as duas duplicava as mesmas 5 categorias.
    <nav aria-label="Categorias" className="hidden md:block w-full max-w-[1600px] mx-auto px-8">
      <ul className="flex gap-9 justify-center m-0 p-0 list-none border-b border-[#ebebeb]">
        {TABS.map(({ label, to, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to} className="shrink-0">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 md:gap-1.5 pt-2.5 pb-2 px-1 text-xs md:text-[13px] font-semibold border-b-2 transition-colors min-h-[44px] ${
                  active
                    ? "text-primary border-primary"
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
