import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, CalendarDays, BedDouble, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import SearchResultsDropdown from "@/components/SearchResultsDropdown";
import { useSelectedDate } from "@/components/GlobalDatePicker";
import { HOME_CONTAINER } from "@/components/home/layout";
import heroDesktop from "@/assets/home-hero.webp";
import heroMobile from "@/assets/home-hero-mobile.webp";

/**
 * Busca principal da Home ("Para onde vamos?").
 * - "Onde": usa a mesma busca global do cabeçalho (ofertas, parceiros, hotéis, ingressos...).
 * - "Quando": define a "data da visita" global, a mesma usada pelos carrosséis para disponibilidade.
 * - "Hospedagem": atalho para a busca de hotéis com hóspedes (/hospedagem).
 */
const HomeSearchHero = () => {
  const navigate = useNavigate();
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  // Um estado por calendário: desktop e celular ficam ambos montados (um só escondido por CSS).
  // Com um estado compartilhado, os dois abriam juntos, disputavam o foco e fechavam um ao outro.
  const [dateOpenDesktop, setDateOpenDesktop] = useState(false);
  const [dateOpenMobile, setDateOpenMobile] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const { results, isSearching } = useGlobalSearch(query, query.trim().length > 0);

  // pointerdown cobre mouse e toque (no iPhone, "mousedown" não dispara ao tocar em áreas não clicáveis).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (desktopRef.current?.contains(t) || mobileRef.current?.contains(t)) return;
      setShowResults(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const clearQuery = (input: HTMLInputElement | null) => {
    setQuery("");
    setShowResults(false);
    input?.focus();
  };

  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime();
  const dateLabel = isToday ? "Hoje" : format(selectedDate, "dd 'de' MMM", { locale: ptBR });

  const onChange = (value: string) => {
    setQuery(value);
    setShowResults(value.trim().length >= 2);
  };

  const submit = (input: HTMLInputElement | null) => {
    if (query.trim().length >= 2) setShowResults(true);
    else input?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      setShowResults(false);
    }
    if (e.key === "Enter") submit(e.currentTarget);
  };

  const clearAfterSelect = () => {
    setShowResults(false);
    setQuery("");
  };

  const renderDatePicker = (close: () => void) => (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={(d) => {
        if (!d) return;
        setSelectedDate(d);
        close();
      }}
      disabled={(d) => isBefore(d, startOfDay(new Date()))}
      locale={ptBR}
      initialFocus
      className="p-3 pointer-events-auto"
    />
  );

  return (
    <section className={`${HOME_CONTAINER} pt-3 md:pt-6 pb-2 md:pb-4`} aria-label="Buscar no Bah Ofertas">
     {/* Fundo com foto da Serra numa camada própria: o bloco da busca não pode ter overflow-hidden,
         senão a lista de resultados abaixo da pílula seria cortada. */}
     <div className="relative rounded-3xl px-4 pt-6 pb-5 md:px-8 md:pt-14 md:pb-14">
      <div className="absolute inset-0 rounded-3xl overflow-hidden bg-[#2a2a2a]" aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet={heroMobile} />
          {/* @ts-expect-error fetchpriority ainda não está nos tipos do React */}
          <img src={heroDesktop} alt="" fetchpriority="high" decoding="async" className="w-full h-full object-cover object-[center_60%]" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/55" />
      </div>
      <div className="relative">
      <h1 className="m-0 text-center text-[26px] leading-tight md:text-[44px] font-extrabold tracking-tight text-white">
        Para onde vamos?
      </h1>
      <p className="m-0 mt-1 md:mt-2 mb-4 md:mb-7 text-center text-[13px] md:text-base text-white/85">
        Hotéis, parques e restaurantes com desconto<span className="hidden md:inline"> no Sul do Brasil</span>
      </p>
      {/* Desktop */}
      <div className="hidden md:block">
        <div ref={desktopRef} className="relative max-w-[860px] mx-auto text-left">
          <div className="flex items-center bg-card border border-[#dddddd] rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.25)] p-1.5 pl-0">
            <label className="flex-[1.4] min-w-0 px-5 lg:px-7 py-2 rounded-full cursor-text hover:bg-muted/60 transition-colors">
              <span className="block text-xs font-extrabold text-foreground">Onde</span>
              <input
                ref={desktopInputRef}
                type="text"
                value={query}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => query.trim().length >= 2 && setShowResults(true)}
                onKeyDown={onKeyDown}
                placeholder="Cidade, hotel ou parque"
                className="w-full bg-transparent border-0 p-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Onde: buscar cidade, hotel, parque ou restaurante"
              />
            </label>
            {query && (
              <button
                type="button"
                onClick={() => clearQuery(desktopInputRef.current)}
                className="shrink-0 w-8 h-8 mr-1 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
            <div className="w-px h-8 bg-[#dddddd]" aria-hidden="true" />
            <Popover open={dateOpenDesktop} onOpenChange={setDateOpenDesktop}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex-1 min-w-0 px-5 lg:px-7 py-2 rounded-full text-left hover:bg-muted/60 transition-colors"
                  aria-label={`Quando: data da visita ${format(selectedDate, "dd/MM/yyyy")}`}
                >
                  <span className="block text-xs font-extrabold text-foreground">Quando</span>
                  <span className="block text-sm text-muted-foreground truncate">{dateLabel}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                {renderDatePicker(() => setDateOpenDesktop(false))}
              </PopoverContent>
            </Popover>
            <div className="w-px h-8 bg-[#dddddd]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => navigate("/hospedagem")}
              className="flex-1 min-w-0 px-5 lg:px-7 py-2 rounded-full text-left hover:bg-muted/60 transition-colors"
            >
              <span className="block text-xs font-extrabold text-foreground">Hospedagem</span>
              <span className="block text-sm text-muted-foreground truncate">Com hóspedes</span>
            </button>
            <button
              type="button"
              onClick={() => submit(desktopInputRef.current)}
              className="shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              aria-label="Buscar"
            >
              <Search className="w-[22px] h-[22px]" strokeWidth={2.2} />
            </button>
          </div>
          {showResults && (
            <SearchResultsDropdown results={results} isSearching={isSearching} query={query} onSelect={clearAfterSelect} />
          )}
        </div>
      </div>

      {/* Celular */}
      <div ref={mobileRef} className="md:hidden">
        {/* Toda a pílula (exceto os botões) abre o teclado: antes só a linha do texto (20px) respondia ao toque. */}
        <div
          className="flex items-center gap-3 h-14 bg-card border border-[#dddddd] rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.25)] pl-5 pr-2 cursor-text"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("button")) mobileInputRef.current?.focus();
          }}
        >
          <Search className="w-5 h-5 shrink-0 text-foreground" strokeWidth={1.8} aria-hidden="true" />
          <label className="flex-1 min-w-0 self-stretch flex flex-col justify-center leading-tight">
            <span className="sr-only">Para onde?</span>
            <input
              ref={mobileInputRef}
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setShowResults(true)}
              onKeyDown={onKeyDown}
              placeholder="Para onde?"
              className="w-full bg-transparent border-0 p-0 text-base font-semibold text-foreground placeholder:text-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <span className="block text-xs text-muted-foreground truncate">Hotéis, parques, restaurantes · {dateLabel}</span>
          </label>
          {query && (
            <button
              type="button"
              onClick={() => clearQuery(mobileInputRef.current)}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          )}
          <Popover open={dateOpenMobile} onOpenChange={setDateOpenMobile}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 w-10 h-10 rounded-full border border-[#dddddd] flex items-center justify-center"
                aria-label={`Escolher data da visita (atual: ${format(selectedDate, "dd/MM/yyyy")})`}
              >
                <CalendarDays className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              {renderDatePicker(() => setDateOpenMobile(false))}
            </PopoverContent>
          </Popover>
        </div>
        {showResults && (
          <SearchResultsDropdown results={results} isSearching={isSearching} query={query} onSelect={clearAfterSelect} inline />
        )}
        <button
          type="button"
          onClick={() => navigate("/hospedagem")}
          className="sr-only focus:not-sr-only focus:mt-2 focus:inline-flex items-center gap-2 text-sm"
        >
          <BedDouble className="w-4 h-4" /> Buscar hospedagem com hóspedes
        </button>
      </div>
      </div>
     </div>
    </section>
  );
};

export default HomeSearchHero;
