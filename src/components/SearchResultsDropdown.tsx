import { useNavigate } from "react-router-dom";
import { Search, Store, Tag, MapPin, Hotel, ShoppingBag, Ticket, Loader2, FerrisWheel, UtensilsCrossed, Wrench } from "lucide-react";
import type { SearchResult } from "@/hooks/useGlobalSearch";

interface SearchResultsDropdownProps {
  results: SearchResult[];
  isSearching: boolean;
  query: string;
  onSelect: () => void;
  inline?: boolean;
}

const typeConfig: Record<SearchResult["type"], { icon: typeof Search; label: string; color: string }> = {
  offer: { icon: ShoppingBag, label: "Oferta", color: "text-primary" },
  partner: { icon: Store, label: "Parceiro", color: "text-emerald-500" },
  coupon: { icon: Tag, label: "Cupom", color: "text-amber-500" },
  region: { icon: MapPin, label: "Região", color: "text-blue-500" },
  hotel: { icon: Hotel, label: "Hotel", color: "text-violet-500" },
  ticket: { icon: Ticket, label: "Ingresso", color: "text-orange-500" },
  entertainment: { icon: FerrisWheel, label: "Entretenimento", color: "text-pink-500" },
  restaurant: { icon: UtensilsCrossed, label: "Restaurante", color: "text-red-500" },
  service: { icon: Wrench, label: "Serviço", color: "text-teal-500" },
};

const SearchResultsDropdown = ({ results, isSearching, query, onSelect, inline = false }: SearchResultsDropdownProps) => {
  const navigate = useNavigate();

  if (!query || query.trim().length < 2) return null;

  const handleClick = (result: SearchResult) => {
    onSelect();
    navigate(result.url);
  };

  const containerClass = inline
    ? "mt-2 bg-card border border-border rounded-lg shadow-xl z-[100] max-h-64 overflow-y-auto"
    : "absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-[100] max-h-[70vh] md:max-h-[600px] overflow-y-auto";

  return (
    <div className={containerClass}>
      {isSearching ? (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Buscando...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground text-sm">
          Nenhum resultado para "<strong>{query}</strong>"
        </div>
      ) : (
        <ul className="py-1">
          {results.map((result) => {
            const config = typeConfig[result.type];
            const Icon = config.icon;
            return (
              <li key={`${result.type}-${result.id}`}>
                <button
                  onClick={() => handleClick(result)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                >
                  {result.image ? (
                    <img
                      src={result.image}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        const fallback = img.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-border/50 bg-muted"
                    />
                  ) : null}
                  {!result.image && (
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-muted/80 flex-shrink-0 ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  {result.image && (
                    <div
                      style={{ display: "none" }}
                      className={`w-9 h-9 rounded-lg items-center justify-center bg-muted/80 flex-shrink-0 ${config.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted ${config.color} flex-shrink-0`}>
                    {result.type === "partner" && result.category ? result.category : config.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SearchResultsDropdown;
