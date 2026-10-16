import React, { useEffect, useMemo, useState } from "react";
import { flattenAmenities } from "@/lib/amenity-translate";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Star, Wifi, Car, Snowflake, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Hotel, HotelFilters as FiltersType } from "@/pages/Hospedagem";

export type HotelSortMode = "default" | "price" | "rating" | "popular";

interface HotelFiltersProps {
  filters: FiltersType;
  onFilterChange: (filters: FiltersType) => void;
  /** Resultados da busca atual (filtros e contagens são calculados sobre eles, sem nova consulta à API). */
  hotels: Hotel[];
  /** Quantos hotéis sobram com os filtros atuais. */
  resultCount: number;
  /** Fecha o painel. */
  onDone: () => void;
  sortMode?: HotelSortMode;
  onSortChange?: (mode: HotelSortMode) => void;
}

// Opções compartilhadas com os chips de filtro da página de resultados.
// "kind" e "star_rating" seguem os valores do conteúdo da ETG/RateHawk (star_rating 0 = sem classificação).
export const HOTEL_PROPERTY_TYPES = [
  { id: "Hotel", label: "Hotel" },
  { id: "Guesthouse", label: "Pousada" },
  { id: "Hostel", label: "Hostel" },
  { id: "Apartments", label: "Apartamento" },
  { id: "Resort", label: "Resort" },
  { id: "Villa", label: "Chalé / Villa" },
];

export const HOTEL_STAR_OPTIONS = [
  { value: 5, label: "5 estrelas" },
  { value: 4, label: "4 estrelas" },
  { value: 3, label: "3 estrelas" },
  { value: 2, label: "2 estrelas" },
];

// Comodidades do hotel (amenity_groups). Café da manhã NÃO entra aqui: pela regra da RateHawk,
// a refeição é da tarifa (meal_data) e só pode ser informada a partir dela, não das comodidades do hotel.
export const HOTEL_AMENITY_FILTERS = [
  { id: "has_internet", label: "Wi-Fi", icon: Wifi },
  { id: "has_parking", label: "Estacionamento", icon: Car },
  { id: "air_conditioning", label: "Ar-condicionado", icon: Snowflake },
];

export const HOTEL_AMENITY_KEYWORDS: Record<string, string[]> = {
  has_internet: ["wi-fi", "wifi", "internet"],
  has_parking: ["estacionamento", "parking"],
  air_conditioning: ["ar-condicionado", "ar condicionado", "air condition"],
};

export const HOTEL_PRICE_MAX = 5000;

/** Preço por noite exibido nos cards (é sobre ele que o filtro de preço age). */
export const nightlyPrice = (h: Hotel) => Number(h.pricePerNight || h.price || 0);

export const hotelHasAmenity = (h: Hotel, id: string) => {
  const keywords = HOTEL_AMENITY_KEYWORDS[id];
  if (!keywords) return true; // filtro antigo/desconhecido (ex.: has_breakfast salvo) não esconde hotéis
  const list = flattenAmenities(h.amenities).map((a) => a.toLowerCase());
  return keywords.some((kw) => list.some((a) => a.includes(kw)));
};

const BINS = 28;
const fmt = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

const sortOptions: { id: HotelSortMode; label: string }[] = [
  { id: "price", label: "Menor preço" },
  { id: "rating", label: "Mais estrelas" },
  { id: "popular", label: "Mais reservados" },
];

const pill = (active: boolean) =>
  cn(
    "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
    active ? "border-[#1f1f1f] bg-[#1f1f1f] text-white" : "border-[#dddddd] bg-background text-foreground hover:border-[#1f1f1f]"
  );

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="border-b border-[#ebebeb] py-6 first:pt-2 last:border-b-0">
    <h3 className="m-0 text-[17px] font-bold">{title}</h3>
    {hint && <p className="m-0 mt-1 text-[13px] text-muted-foreground">{hint}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

const HotelFilters = ({ filters, onFilterChange, hotels, resultCount, onDone, sortMode = "default", onSortChange }: HotelFiltersProps) => {
  const prices = useMemo(() => hotels.map(nightlyPrice).filter((p) => p > 0), [hotels]);
  const priceMax = useMemo(
    () => (prices.length ? Math.max(100, Math.ceil(Math.max(...prices) / 100) * 100) : HOTEL_PRICE_MAX),
    [prices]
  );
  const step = priceMax > 2000 ? 50 : 10;

  // Histograma real dos preços por noite desta busca
  const bins = useMemo(() => {
    const counts = new Array(BINS).fill(0);
    for (const p of prices) counts[Math.min(BINS - 1, Math.floor((p / priceMax) * BINS))]++;
    const top = Math.max(1, ...counts);
    return counts.map((c) => (c === 0 ? 0 : Math.max(8, (c / top) * 100)));
  }, [prices, priceMax]);

  const [range, setRange] = useState<[number, number]>([filters.price_from ?? 0, Math.min(filters.price_to ?? priceMax, priceMax)]);
  useEffect(() => {
    setRange([filters.price_from ?? 0, Math.min(filters.price_to ?? priceMax, priceMax)]);
  }, [filters.price_from, filters.price_to, priceMax]);

  const commitPrice = ([from, to]: number[]) =>
    onFilterChange({
      ...filters,
      price_from: from > 0 ? from : undefined,
      price_to: to < priceMax ? to : undefined,
    });

  const toggle = <K extends "star_rating" | "kind" | "serp_filter">(key: K, value: NonNullable<FiltersType[K]>[number]) => {
    const current = (filters[key] || []) as (typeof value)[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFilterChange({ ...filters, [key]: next.length ? next : undefined });
  };

  // Contagens sobre os resultados (só mostramos opções que existem nesta busca)
  const starCount = (s: number) => hotels.filter((h) => Math.floor(h.rating) === s).length;
  const kindCount = (k: string) => hotels.filter((h) => h.propertyType?.toLowerCase().includes(k.toLowerCase())).length;
  const amenityCount = (id: string) => hotels.filter((h) => hotelHasAmenity(h, id)).length;
  const freeCancelCount = hotels.filter((h) => h.freeCancellation).length;

  const kinds = HOTEL_PROPERTY_TYPES.map((t) => ({ ...t, n: kindCount(t.id) })).filter((t) => t.n > 0 || filters.kind?.includes(t.id));
  const stars = HOTEL_STAR_OPTIONS.map((s) => ({ ...s, n: starCount(s.value) })).filter((s) => s.n > 0 || filters.star_rating?.includes(s.value));
  const amenities = HOTEL_AMENITY_FILTERS.map((a) => ({ ...a, n: amenityCount(a.id) })).filter((a) => a.n > 0 || filters.serp_filter?.includes(a.id));

  const hasAny =
    Object.values(filters).some((v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== false)) || sortMode !== "default";

  const clearAll = () => {
    onFilterChange({});
    onSortChange?.("default");
  };

  return (
    <div className="flex h-full min-h-0 flex-col font-jakarta text-foreground">
      <div className="flex shrink-0 items-center justify-between border-b border-[#ebebeb] px-5 pb-3 md:px-6">
        <h2 className="m-0 text-lg font-bold">Filtros</h2>
        {hasAny && (
          <button type="button" onClick={clearAll} className="mr-8 text-sm font-semibold underline underline-offset-2 hover:text-primary">
            Limpar tudo
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 md:px-6" style={{ WebkitOverflowScrolling: "touch" }}>
        {onSortChange && (
          <Section title="Ordenar por">
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((o) => (
                <button key={o.id} type="button" aria-pressed={sortMode === o.id} className={pill(sortMode === o.id)} onClick={() => onSortChange(sortMode === o.id ? "default" : o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title="Preço por noite" hint="Média por noite da tarifa mais barata. Taxas pagas no hotel, quando houver, aparecem na página da hospedagem.">
          <div className="flex h-16 items-end gap-[2px]" aria-hidden="true">
            {bins.map((h, i) => {
              const start = (i / BINS) * priceMax;
              const end = ((i + 1) / BINS) * priceMax;
              const inRange = end > range[0] && start < range[1];
              return (
                <div
                  key={i}
                  className={cn("flex-1 rounded-t-[3px]", inRange ? "bg-primary" : "bg-[#dddddd]")}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
          <Slider
            value={range}
            onValueChange={(v) => setRange([Math.min(v[0], v[1]), Math.max(v[0], v[1])])}
            onValueCommit={commitPrice}
            min={0}
            max={priceMax}
            step={step}
            minStepsBetweenThumbs={1}
            className="-mt-1"
            aria-label="Faixa de preço por noite"
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { label: "Mínimo", value: range[0] },
              { label: "Máximo", value: range[1], plus: range[1] >= priceMax },
            ].map((b) => (
              <div key={b.label} className="rounded-xl border border-[#dddddd] px-4 py-2.5">
                <span className="block text-xs text-muted-foreground">{b.label}</span>
                <span className="block text-[15px] font-semibold tabular-nums">
                  {fmt(b.value)}
                  {b.plus ? "+" : ""}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {freeCancelCount > 0 || filters.free_cancellation ? (
          <Section title="Flexibilidade">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block text-[15px] font-medium">Cancelamento grátis</span>
                <span className="block text-[13px] text-muted-foreground">
                  Tarifa com cancelamento sem custo até a data informada na reserva · {freeCancelCount}
                </span>
              </span>
              <Switch
                checked={!!filters.free_cancellation}
                onCheckedChange={(v) => onFilterChange({ ...filters, free_cancellation: v || undefined })}
              />
            </label>
          </Section>
        ) : null}

        {stars.length > 0 && (
          <Section title="Classificação do hotel">
            <div className="flex flex-wrap gap-2">
              {stars.map((s) => {
                const active = !!filters.star_rating?.includes(s.value);
                return (
                  <button key={s.value} type="button" aria-pressed={active} aria-label={`${s.label} (${s.n})`} className={pill(active)} onClick={() => toggle("star_rating", s.value)}>
                    {s.value}
                    <Star className={cn("h-3.5 w-3.5", active ? "fill-white text-white" : "fill-foreground text-foreground")} aria-hidden="true" />
                    <span className={cn("text-xs", active ? "text-white/70" : "text-muted-foreground")}>{s.n}</span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {kinds.length > 1 && (
          <Section title="Tipo de hospedagem">
            <div className="grid grid-cols-2 gap-2">
              {kinds.map((t) => {
                const active = !!filters.kind?.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle("kind", t.id)}
                    className={cn(
                      "flex min-h-[52px] items-center justify-between rounded-xl border px-4 text-left text-sm font-medium transition-colors",
                      active ? "border-[#1f1f1f] bg-[#f7f7f7] ring-1 ring-[#1f1f1f]" : "border-[#dddddd] hover:border-[#1f1f1f]"
                    )}
                  >
                    <span>{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.n}</span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {amenities.length > 0 && (
          <Section title="Comodidades">
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => {
                const active = !!filters.serp_filter?.includes(a.id);
                const Icon = active ? Check : a.icon;
                return (
                  <button key={a.id} type="button" aria-pressed={active} className={pill(active)} onClick={() => toggle("serp_filter", a.id)}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </Section>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#ebebeb] px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-6">
        <button
          type="button"
          onClick={clearAll}
          disabled={!hasAny}
          className="h-12 px-1 text-[15px] font-semibold underline underline-offset-2 disabled:text-muted-foreground disabled:no-underline"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={resultCount === 0}
          className="h-12 flex-1 max-w-[260px] rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {resultCount === 0
            ? "Nenhuma hospedagem"
            : `Mostrar ${resultCount} ${resultCount === 1 ? "hospedagem" : "hospedagens"}`}
        </button>
      </div>
    </div>
  );
};

export default HotelFilters;
