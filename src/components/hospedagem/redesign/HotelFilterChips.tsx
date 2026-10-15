import type { ReactNode } from "react";
import { Check, ChevronDown, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  HOTEL_AMENITY_FILTERS,
  HOTEL_PROPERTY_TYPES,
  HOTEL_STAR_OPTIONS,
} from "@/components/hospedagem/HotelFilters";
import type { SortMode } from "@/components/hospedagem/MobileFilterChips";
import type { HotelFilters } from "@/pages/Hospedagem";

interface HotelFilterChipsProps {
  filters: HotelFilters;
  onFilterChange: (filters: HotelFilters) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  /** Abre o painel completo de filtros (faixa de preço com "Aplicar filtros"). */
  onOpenAllFilters: () => void;
  /** Conteúdo extra alinhado à direita (ex.: botão "Ver no mapa" no desktop). */
  trailing?: ReactNode;
  className?: string;
}

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "default", label: "Recomendados" },
  { id: "price", label: "Menor preço" },
  { id: "rating", label: "Nota" },
  { id: "popular", label: "Mais reservados" },
];

// Pílula com 36–40px de altura visível e área de toque estendida para 44px.
const chipClass = (active: boolean) =>
  cn(
    "relative inline-flex h-9 md:h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13px] md:text-sm font-semibold transition-colors",
    "before:absolute before:inset-x-0 before:-inset-y-1 md:before:-inset-y-0.5 before:content-['']",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
    active
      ? "border-[#1f1f1f] bg-[#f7f7f7] text-foreground"
      : "border-[#dddddd] bg-background text-foreground hover:border-[#1f1f1f]"
  );

const OptionRow = ({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    role="menuitemcheckbox"
    aria-checked={checked}
    onClick={onClick}
    className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-[#b0b0b0] bg-background"
      )}
      aria-hidden="true"
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
    <span className="min-w-0 flex-1">{children}</span>
  </button>
);

/**
 * Linha de chips de filtro do novo visual (desktop e celular).
 * Estrelas, tipo, comodidades e ordenação aplicam na hora (filtro no navegador,
 * igual ao painel de filtros); "Faixa de preço" abre o painel completo, onde o
 * preço é confirmado em "Aplicar filtros" como antes.
 */
const HotelFilterChips = ({
  filters,
  onFilterChange,
  sortMode,
  onSortChange,
  onOpenAllFilters,
  trailing,
  className,
}: HotelFilterChipsProps) => {
  const stars = filters.star_rating || [];
  const kinds = filters.kind || [];
  const amenities = filters.serp_filter || [];
  const hasPrice = filters.price_from != null || filters.price_to != null;
  const hasAny = stars.length > 0 || kinds.length > 0 || amenities.length > 0 || hasPrice || sortMode !== "default";

  const toggle = (key: "star_rating" | "kind" | "serp_filter", value: number | string) => {
    const current = (filters[key] || []) as (number | string)[];
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFilterChange({ ...filters, [key]: updated.length > 0 ? updated : undefined } as HotelFilters);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;
  const priceLabel = hasPrice
    ? filters.price_from != null && filters.price_to != null
      ? `${fmt(filters.price_from)} – ${fmt(filters.price_to)}`
      : filters.price_from != null
        ? `A partir de ${fmt(filters.price_from)}`
        : `Até ${fmt(filters.price_to as number)}`
    : "Faixa de preço";

  const kindLabel =
    kinds.length === 1
      ? HOTEL_PROPERTY_TYPES.find((t) => t.id === kinds[0])?.label ?? "Tipo de hospedagem"
      : kinds.length > 1
        ? `Tipo de hospedagem (${kinds.length})`
        : "Tipo de hospedagem";

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortMode)?.label ?? "Recomendados";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="-mx-5 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-5 py-1.5 md:mx-0 md:px-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="toolbar"
        aria-label="Filtros de hospedagem"
      >
        <button type="button" className={chipClass(hasPrice)} onClick={onOpenAllFilters}>
          {priceLabel}
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chipClass(stars.length > 0)}>
              <span className="md:hidden">Estrelas</span>
              <span className="hidden md:inline">Classificação por estrelas</span>
              {stars.length > 0 && <span className="text-muted-foreground">({stars.length})</span>}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="z-50 w-64 rounded-2xl p-2">
            <div role="menu" aria-label="Classificação por estrelas">
              {HOTEL_STAR_OPTIONS.map((opt) => (
                <OptionRow
                  key={opt.value}
                  checked={stars.includes(opt.value)}
                  onClick={() => toggle("star_rating", opt.value)}
                >
                  <span className="flex items-center justify-between gap-2">
                    {opt.label}
                    <span className="flex gap-0.5" aria-hidden="true">
                      {Array.from({ length: opt.value }, (_, i) => (
                        <Star key={i} className="h-3 w-3 fill-foreground text-foreground" />
                      ))}
                    </span>
                  </span>
                </OptionRow>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chipClass(kinds.length > 0)}>
              {kindLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="z-50 w-60 rounded-2xl p-2">
            <div role="menu" aria-label="Tipo de hospedagem">
              {HOTEL_PROPERTY_TYPES.map((type) => (
                <OptionRow key={type.id} checked={kinds.includes(type.id)} onClick={() => toggle("kind", type.id)}>
                  {type.label}
                </OptionRow>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chipClass(amenities.length > 0)}>
              Comodidades
              {amenities.length > 0 && <span className="text-muted-foreground">({amenities.length})</span>}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="z-50 w-60 rounded-2xl p-2">
            <div role="menu" aria-label="Comodidades">
              {HOTEL_AMENITY_FILTERS.map((amenity) => {
                const Icon = amenity.icon;
                return (
                  <OptionRow
                    key={amenity.id}
                    checked={amenities.includes(amenity.id)}
                    onClick={() => toggle("serp_filter", amenity.id)}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {amenity.label}
                    </span>
                  </OptionRow>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={chipClass(sortMode !== "default")}>
              <span className="text-muted-foreground font-normal">Ordenar:</span> {sortLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="z-50 w-56 rounded-2xl p-2">
            <div role="menu" aria-label="Ordenar resultados">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortMode === opt.id}
                  onClick={() => onSortChange(opt.id)}
                  className="flex min-h-[44px] w-full items-center justify-between rounded-lg px-2.5 text-left text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {opt.label}
                  {sortMode === opt.id && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {hasAny && (
          <button
            type="button"
            onClick={() => {
              onFilterChange({});
              onSortChange("default");
            }}
            className="relative inline-flex h-9 md:h-10 shrink-0 items-center whitespace-nowrap px-2 text-[13px] md:text-sm font-semibold text-foreground underline underline-offset-2 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {trailing && <div className="hidden shrink-0 md:flex">{trailing}</div>}
    </div>
  );
};

export default HotelFilterChips;
