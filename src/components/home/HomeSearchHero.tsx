import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, CalendarDays, BedDouble } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import SearchResultsDropdown from "@/components/SearchResultsDropdown";
import { useSelectedDate } from "@/components/GlobalDatePicker";
import { HOME_CONTAINER } from "@/components/home/layout";

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

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (desktopRef.current?.contains(t) || mobileRef.current?.contains(t)) return;
      setShowResults(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

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
      initialFocus
      className="p-3 pointer-events-auto"
    />
  );

  return (
    <section className={`${HOME_CONTAINER} pt-4 md:pt-10 pb-2 md:pb-6`} aria-label="Buscar no Bah Ofertas">
      <h1 className="sr-only md:not-sr-only md:block md:text-center md:m-0 md:mb-6 md:text-[40px] md:leading-tight font-extrabold tracking-tight text-foreground">
        Para onde vamos?
      </h1>
      {/* Desktop */}
      <div className="hidden md:block">
        <div ref={desktopRef} className="relative max-w-[860px] mx-auto text-left">
          <div className="flex items-center bg-card border border-[#dddddd] rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-1.5 pl-0">
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
        <div className="flex items-center gap-3 h-14 bg-card border border-[#dddddd] rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.08)] pl-5 pr-2">
          <Search className="w-5 h-5 shrink-0 text-foreground" strokeWidth={1.8} aria-hidden="true" />
          <label className="flex-1 min-w-0 leading-tight">
            <span className="sr-only">Para onde?</span>
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setShowResults(true)}
              onKeyDown={onKeyDown}
              placeholder="Para onde?"
              className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-foreground placeholder:text-foreground focus:outline-none"
            />
            <span className="block text-xs text-muted-foreground truncate">Hotéis, parques, restaurantes · {dateLabel}</span>
          </label>
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
    </section>
  );
};

export default HomeSearchHero;
