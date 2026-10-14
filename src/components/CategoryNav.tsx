import React, { useRef, useState } from "react";
import { Home, FerrisWheel, UtensilsCrossed, Package, Wrench, Ticket, ChevronDown, Car, BedDouble } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

const categories = ["Hospedagem", "Entretenimento", "Restaurantes", "Serviços", "Carros"];

const categoryIcons = {
  "Hospedagem": BedDouble,
  "Entretenimento": FerrisWheel,
  "Restaurantes": UtensilsCrossed,
  "Produtos": Package,
  "Serviços": Wrench,
  "Carros": Car,
};

type PublicCompanyInfo = {
  id: string;
  category_id: string | null;
  name: string;
  trade_name: string | null;
  description: string | null;
  logo_url: string | null;
};

const CategoryNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; category: string; pointerId: number } | null>(null);
  const ignoreClickUntilRef = useRef(0);
  const categoryPageMap: Record<string, string> = {
    "Hospedagem": "/hospedagem",
    "Entretenimento": "/entretenimento",
    "Restaurantes": "/restaurantes",
    "Serviços": "/servicos",
    "Carros": "/carros",
  };
  const isOnCategoryPage = ['/entretenimento', '/restaurantes', '/servicos', '/hospedagem', '/carros'].includes(location.pathname)
    || location.pathname.startsWith('/estabelecimento/');
  const isHidden = false;

  const { data: dbCategories } = useQuery({
    queryKey: ['categories-mapping'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true);
      return data || [];
    }
  });

  const { data: companies, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies-by-category', expandedCategory],
    queryFn: async () => {
      if (!expandedCategory || !dbCategories) return [];
      const matchedCategory = dbCategories.find(
        cat => cat.name.toLowerCase() === expandedCategory.toLowerCase() ||
               cat.slug.toLowerCase() === expandedCategory.toLowerCase()
      );
      if (!matchedCategory) return [];
      const { data, error } = await supabase.rpc('get_public_company_marketplace_info');
      if (error) { console.error('Error fetching companies:', error); return []; }
      return ((data || []) as PublicCompanyInfo[]).filter((company) => company.category_id === matchedCategory.id).slice(0, 12);
    },
    enabled: !!expandedCategory && !!dbCategories,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true
  });

  const categoryRoutes: Record<string, string> = {
    "Hospedagem": "/hospedagem",
    "Entretenimento": "/entretenimento",
    "Restaurantes": "/restaurantes",
    "Serviços": "/servicos",
    "Carros": "/carros",
  };

  const handleCategoryClick = (category: string) => {
    const route = categoryRoutes[category];
    if (route) {
      setExpandedCategory(null);
      if (location.pathname !== route) {
        navigate(route);
      }
      return;
    }
    setExpandedCategory(prev => prev === category ? null : category);
  };

  const handleCategoryPointerDown = (category: string, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, category, pointerId: e.pointerId };
  };

  const handleCategoryPointerUp = (category: string, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") return;

    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    if (!start || start.category !== category || start.pointerId !== e.pointerId) return;

    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (moved > 18) return;

    e.preventDefault();
    e.stopPropagation();
    ignoreClickUntilRef.current = Date.now() + 900;
    handleCategoryClick(category);
  };

  return (
    <div className={`sticky bottom-0 z-50 transition-transform duration-300 ease-in-out ${isHidden ? 'translate-y-full' : 'translate-y-0'}`}>
      {/* Expanded Partners List - opens upward */}
      {expandedCategory && (
        <div className="bg-gradient-to-t from-card/95 to-card/80 backdrop-blur-xl shadow-2xl border-t border-border overflow-hidden animate-[slideDown_0.8s_cubic-bezier(0.16,1,0.3,1)]">
          <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-h-[60vh] overflow-y-auto scroll-smooth">
            <div className="flex items-center justify-between mb-8 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)]">
              <h3 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2 sm:gap-3">
                <span className="w-1.5 h-8 bg-gradient-primary rounded-full shadow-lg animate-pulse"></span>
                Parceiros em {expandedCategory}
              </h3>
              <span className="text-xs sm:text-sm text-muted-foreground px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 hidden sm:inline-block animate-[scaleIn_0.5s_cubic-bezier(0.16,1,0.3,1)] shadow-sm">
                {isLoadingCompanies ? '...' : companies?.length || 0} estabelecimentos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {companies?.map((company, index) => (
                <div
                  key={company.id}
                  className="group relative bg-card/90 backdrop-blur-sm rounded-2xl p-5 hover:bg-card hover:shadow-2xl hover:shadow-primary/10 hover:scale-105 transition-all duration-500 cursor-pointer border border-border/50 hover:border-primary/30"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animation: 'fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both'
                  }}
                  onClick={() => {
                    setExpandedCategory(null);
                    navigate(`/parceiro/${company.id}/ofertas`);
                  }}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="relative">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-border group-hover:ring-primary transition-colors"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                          {(company.trade_name || company.name).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                      </div>
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="font-medium text-foreground text-sm truncate mb-1">
                        {company.trade_name || company.name}
                      </p>
                      {company.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 h-8">
                          {company.description}
                        </p>
                      )}
                    </div>
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
              ))}

              {(!companies || companies.length === 0) && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                  </div>
                  <p className="text-center">
                    Nenhum parceiro encontrado<br />
                    <span className="text-xs">em {expandedCategory}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="border-t border-border bg-card/80 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:hidden" role="navigation" aria-label="Categorias principais">
        <div className="container mx-auto px-1">
          <div className="flex items-center justify-evenly py-2">
            {categories.map((category, index) => {
              const IconComponent = categoryIcons[category as keyof typeof categoryIcons];
              const isOnThisPage = location.pathname === categoryPageMap[category];
              const isExpanded = isOnThisPage || expandedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  className={`flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium transition-colors px-1 py-2 flex-1 min-w-0 min-h-[48px] touch-manipulation select-none active:opacity-70 ${
                    isExpanded
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                  onPointerDown={(e) => handleCategoryPointerDown(category, e)}
                  onPointerCancel={() => {
                    pointerStartRef.current = null;
                  }}
                  onPointerUp={(e) => handleCategoryPointerUp(category, e)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (Date.now() < ignoreClickUntilRef.current) return;
                    handleCategoryClick(category);
                  }}
                  aria-expanded={isExpanded}
                  aria-controls={`category-${category.toLowerCase()}`}
                  aria-label={`Ver ofertas de ${category}`}
                >
                  <span className="pointer-events-none flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 w-full">
                    <IconComponent
                      className={`w-6 h-6 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                        isExpanded
                          ? 'text-red-500 drop-shadow-[0_0_20px_rgba(185,28,28,1)] animate-[pulse_2s_ease-in-out_infinite]'
                          : ''
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] sm:text-sm truncate w-full text-center leading-tight">{category}</span>
                    <ChevronDown
                      className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform hidden sm:inline ${
                        isExpanded
                          ? 'rotate-180 text-red-500 drop-shadow-[0_0_20px_rgba(185,28,28,1)] animate-[pulse_2s_ease-in-out_infinite]'
                          : ''
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default CategoryNav;
