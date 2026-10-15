import { useState, useRef, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, Store, Search, X, Home, Gamepad2, FerrisWheel, UtensilsCrossed, Package, Wrench, ChevronDown, Car, BedDouble } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CartIcon from "@/components/CartIcon";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, formatValidationErrors } from "@/lib/validation";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import SearchResultsDropdown from "@/components/SearchResultsDropdown";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import SocialLoginButtons from "@/components/auth/SocialLoginButtons";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";
import { getEffectiveUserAccess } from "@/lib/user-role";
import logoDesktop from "@/assets/logo-desktop.png";

const HeaderLogo = memo(() => (
  <img
    src={logoDesktop}
    alt="BahOfertas - Portal de Ofertas e Cupons de Desconto em Porto Alegre"
    className="h-12 w-auto md:h-16 lg:h-20"
    itemProp="logo"
    decoding="async"
    width={200}
    height={80}
  />
));
HeaderLogo.displayName = "HeaderLogo";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { scrollDirection, isScrolling } = useScrollDirection();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isLoginDrawerOpen, setIsLoginDrawerOpen] = useState(false);
  const [loginDrawerMounted, setLoginDrawerMounted] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [effectiveRole, setEffectiveRole] = useState<'admin' | 'partner' | 'affiliate' | 'user' | 'client'>('user');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { results: searchResults, isSearching } = useGlobalSearch(searchQuery, isSearchOpen || searchQuery.length > 0);
  const [showResults, setShowResults] = useState(false);

  // Close results on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node) &&
        mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadEffectiveRole = async () => {
      if (!user?.id) {
        if (isMounted) setEffectiveRole('user');
        return;
      }

      const { role } = await getEffectiveUserAccess(user.id, user.email);
      if (isMounted) {
        setEffectiveRole(role);
      }
    };

    loadEffectiveRole();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email]);

  const isOnHospedagemPage = location.pathname === '/hospedagem';
  // Na Home (novo visual), busca e categorias ficam no corpo da página.
  // Nas demais páginas o cabeçalho segue igual.
  const isHome = location.pathname === '/';
  // Páginas já no novo visual: cabeçalho enxuto no desktop e, no celular,
  // a própria página desenha o topo (voltar / compartilhar / favoritar).
  const hideOnMobile = location.pathname === '/hospedagem'
    || location.pathname.startsWith('/hospedagem/hotel/')
    || location.pathname.startsWith('/oferta/')
    || location.pathname.startsWith('/estabelecimento/');
  const isRedesign = isHome || hideOnMobile;
  const categories = ["Hospedagem", "Entretenimento", "Restaurantes", "Serviços", "Carros"];
  const categoryIcons: Record<string, any> = {
    "Hospedagem": BedDouble, "Entretenimento": Gamepad2, "Restaurantes": UtensilsCrossed,
    "Produtos": Package, "Serviços": Wrench, "Carros": Car,
  };

  const { data: dbCategories } = useQuery({
    queryKey: ['categories-mapping'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name, slug').eq('is_active', true);
      return data || [];
    }
  });

  const { data: companies, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies-by-category', expandedCategory],
    queryFn: async () => {
      if (!expandedCategory || !dbCategories) return [];
      const matched = dbCategories.find(c => c.name.toLowerCase() === expandedCategory.toLowerCase() || c.slug.toLowerCase() === expandedCategory.toLowerCase());
      if (!matched) return [];
      const { data, error } = await supabase.rpc('get_public_company_marketplace_info');
      if (error) return [];
      return (data || []).filter((c: any) => c.category_id === matched.id).slice(0, 12);
    },
    enabled: !!expandedCategory && !!dbCategories,
    staleTime: 1000 * 60 * 5,
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
      // If already on this category page, collapse and go home
      if (location.pathname === route) {
        navigate('/');
      } else {
        navigate(route);
      }
      return;
    }
    setExpandedCategory(prev => prev === category ? null : category);
  };

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleDrawerLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoginLoading(true);
    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get("drawer-email") as string,
      password: formData.get("drawer-password") as string,
    };
    try {
      const validatedData = loginSchema.parse(rawData);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });
      if (error) {
        toast({ title: "Erro no login", description: "Email ou senha incorretos.", variant: "destructive" });
      } else if (data?.user) {
        const { role } = await getEffectiveUserAccess(data.user.id, data.user.email);
        toast({ title: "Login realizado com sucesso!" });
        setIsLoginDrawerOpen(false);

        switch (role) {
          case 'admin':
            navigate('/admin/dashboard', { replace: true });
            return;
          case 'affiliate':
            navigate('/afiliado/painel', { replace: true });
            return;
          case 'partner':
            navigate('/parceiro/painel', { replace: true });
            return;
          default:
            navigate('/dashboard', { replace: true });
        }
      }
    } catch (validationError: any) {
      toast({ title: "Dados inválidos", description: formatValidationErrors(validationError), variant: "destructive" });
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <header
      className={isRedesign
        ? `bg-card border-b border-[#ebebeb] relative z-50 font-jakarta${hideOnMobile ? " hidden md:block" : ""}`
        : "bg-card/80 backdrop-blur-md shadow-[var(--shadow-card)] relative z-50"}
      role="banner"
    >
      {/* Decorative elements */}
      {!isRedesign && (
        <>
          <div className="absolute top-2 right-4 w-4 h-4 md:w-6 md:h-6 bg-primary/15 rounded-full blur-sm animate-pulse opacity-60" />
          <div className="absolute top-1 left-12 w-2 h-2 md:w-3 md:h-3 bg-accent/20 rounded-full blur-sm animate-pulse delay-400 opacity-70" />
        </>
      )}

      {/* Top Bar */}
      <div className={isRedesign
        ? "w-full max-w-[1600px] mx-auto px-5 md:px-8 py-2 md:py-3 flex items-center justify-between"
        : "container mx-auto px-4 py-3 flex items-center justify-between"}>
        <div className="flex items-center gap-6" itemScope itemType="https://schema.org/Organization">
          <div className="flex items-center gap-2 text-2xl font-bold cursor-pointer" onClick={() => navigate('/')}>
            <HeaderLogo />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Search Bar */}
          <div className={`${isRedesign ? 'hidden' : 'hidden md:flex'} items-center relative`} ref={searchContainerRef}>
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Buscar ofertas, parceiros, cupons..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.trim().length >= 2) setShowResults(true); }}
                onFocus={() => { if (searchQuery.trim().length >= 2) setShowResults(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setShowResults(false);
                  }
                  if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                    setShowResults(true);
                  }
                }}
                className="h-9 w-56 lg:w-72 rounded-md border-border/60 bg-muted/50 pr-9 text-sm"
              />
              <Search className="absolute right-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            {showResults && (
              <SearchResultsDropdown
                results={searchResults}
                isSearching={isSearching}
                query={searchQuery}
                onSelect={() => { setShowResults(false); setSearchQuery(''); }}
              />
            )}
          </div>
          {/* Mobile Search Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`${isRedesign ? 'hidden' : 'md:hidden'} h-9 w-9 rounded-full border-border/60 transition-all duration-300 ${
              isSearchOpen
                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                : 'bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-primary'
            }`}
            aria-label="Buscar"
          >
            {isSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </Button>
          {/* Cart icon (desktop only) */}
          <div className="hidden md:flex">
            <CartIcon />
          </div>
          {user ? (
            effectiveRole === 'admin' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/dashboard')}
                className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors duration-200 px-3"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            ) : effectiveRole === 'partner' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/parceiro/painel')}
                className="hover:bg-success hover:text-white hover:border-success transition-colors duration-200 px-3"
              >
                <Store className="w-4 h-4 mr-2" />
                Parceiro
              </Button>
            ) : effectiveRole === 'affiliate' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/afiliado/painel')}
                className="hover:bg-success hover:text-white hover:border-success transition-colors duration-200 px-3"
              >
                <User className="w-4 h-4 mr-2" />
                Afiliado
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors duration-200"
              >
                <User className="w-4 h-4" />
              </Button>
            )
          ) : (
            <Button
              variant={isRedesign ? "default" : "hero"}
              size="default"
              className={isRedesign ? "rounded-full h-11 px-6 font-semibold" : undefined}
              onClick={() => {
                if (isMobile) {
                  setLoginDrawerMounted(true);
                  setIsLoginDrawerOpen(true);
                } else {
                  navigate('/auth');
                }
              }}
            >
              Entrar
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Login Drawer (montado apenas quando usado) */}
      {loginDrawerMounted && (
      <Drawer open={isLoginDrawerOpen} onOpenChange={setIsLoginDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <img src={logoDesktop} alt="Bah Ofertas" className="h-8 w-auto" loading="lazy" decoding="async" />
            </div>
            <DrawerTitle className="text-lg font-bold text-foreground">Bem-vindo de volta!</DrawerTitle>
            <DrawerDescription className="text-muted-foreground text-xs">Use seu e-mail para entrar</DrawerDescription>
          </DrawerHeader>
          <div className="px-5 pb-6 space-y-4">
            <form onSubmit={handleDrawerLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="drawer-email" className="text-foreground font-medium text-sm">E-mail</Label>
                <Input id="drawer-email" name="drawer-email" type="email" placeholder="seu@email.com" required className="h-10 border-2 border-border focus:border-destructive/50 transition-all duration-300 bg-background/50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="drawer-password" className="text-foreground font-medium text-sm">Senha</Label>
                <Input id="drawer-password" name="drawer-password" type="password" placeholder="••••••••" required className="h-10 border-2 border-border focus:border-destructive/50 transition-all duration-300 bg-background/50" />
              </div>
              <Button type="submit" className="w-full h-10 bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive/80 text-destructive-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border-0" disabled={isLoginLoading}>
                {isLoginLoading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginDrawerOpen(false);
                    setIsForgotPasswordOpen(true);
                  }}
                  className="text-xs text-destructive hover:text-destructive/80 font-medium transition-colors underline-offset-2 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <SocialLoginButtons isLoading={isLoginLoading} />
            </form>
            <p className="text-[11px] text-muted-foreground text-center">
              Não tem conta? Use o Google acima para criar automaticamente.
            </p>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsLoginDrawerOpen(false);
                  navigate('/auth');
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Ou <span className="font-semibold underline">cadastre-se com e-mail</span>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      )}

      <ForgotPasswordDialog
        open={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
        accentColor="destructive"
        portal="cliente"
      />

      {/* Mobile Search Bar - Expandable */}
      <div
        ref={mobileSearchContainerRef}
        className={`${isRedesign ? 'hidden' : 'md:hidden'} border-t border-border/50 transition-all duration-300 ease-in-out relative ${
          isSearchOpen ? 'max-h-[400px] opacity-100 py-2 px-4' : 'max-h-0 opacity-0 py-0 px-4 overflow-hidden'
        }`}
      >
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder="Buscar ofertas, parceiros, cupons..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.trim().length >= 2) setShowResults(true); }}
            onFocus={() => { if (searchQuery.trim().length >= 2) setShowResults(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    setShowResults(false);
                  }
                  if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                    setShowResults(true);
                  }
                }}
            className="h-9 w-full rounded-full border-border/60 bg-muted/50 pl-9 pr-16 text-sm"
            autoFocus={isSearchOpen}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowResults(false); }}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => { if (searchQuery.trim().length >= 2) setShowResults(true); }}
              className="bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors"
              aria-label="Buscar"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {showResults && (
          <SearchResultsDropdown
            results={searchResults}
            isSearching={isSearching}
            query={searchQuery}
            onSelect={() => { setShowResults(false); setSearchQuery(''); setIsSearchOpen(false); }}
            inline
          />
        )}
      </div>

      {/* Desktop Category Navigation */}
      <nav className={`border-t border-border ${isRedesign ? 'hidden' : 'hidden md:block'}`} role="navigation" aria-label="Categorias principais">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-8 py-4 overflow-x-auto">
            {categories.map((category) => {
              const IconComponent = categoryIcons[category];
              const isExpanded = category === "Hospedagem" ? isOnHospedagemPage : expandedCategory === category;
              return (
                <button
                  key={category}
                  className={`flex items-center gap-1 text-sm font-medium transition-all duration-300 ease-out whitespace-nowrap px-2 py-1 hover:-translate-y-0.5 ${
                    isExpanded ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-primary'
                  }`}
                  onClick={() => handleCategoryClick(category)}
                  aria-expanded={isExpanded}
                  aria-label={`Ver ofertas de ${category}`}
                >
                  <IconComponent className={`w-4 h-4 transition-all duration-300 ease-out ${isExpanded ? 'text-red-500 scale-110 drop-shadow-[0_0_20px_rgba(185,28,28,1)]' : ''}`} aria-hidden="true" />
                  <span>{category}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180 text-red-500' : ''}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Expanded Partners */}
        {expandedCategory && (
          <div className="border-t border-border bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-xl shadow-2xl overflow-hidden animate-[slideDown_0.8s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="container mx-auto px-4 py-8 max-h-96 overflow-y-auto scroll-smooth">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-primary flex items-center gap-3">
                  <span className="w-1.5 h-8 bg-gradient-primary rounded-full shadow-lg animate-pulse"></span>
                  Parceiros em {expandedCategory}
                </h3>
                <span className="text-sm text-muted-foreground px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                  {isLoadingCompanies ? '...' : companies?.length || 0} estabelecimentos
                </span>
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {companies?.map((company, index) => (
                  <div
                    key={company.id}
                    className="group relative bg-card/90 backdrop-blur-sm rounded-2xl p-5 hover:bg-card hover:shadow-2xl hover:shadow-primary/10 hover:scale-105 transition-all duration-500 cursor-pointer border border-border/50 hover:border-primary/30"
                    style={{ animationDelay: `${index * 0.1}s`, animation: 'fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both' }}
                    onClick={() => { setExpandedCategory(null); navigate(`/parceiro/${company.id}/ofertas`); }}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="relative">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt={company.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-border group-hover:ring-primary transition-colors" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                            {(company.trade_name || company.name).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-foreground text-sm truncate w-full">{company.trade_name || company.name}</p>
                      {company.description && <p className="text-xs text-muted-foreground line-clamp-2">{company.description}</p>}
                    </div>
                  </div>
                ))}
                {(!companies || companies.length === 0) && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <p>Nenhum parceiro encontrado em {expandedCategory}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
export default Header;