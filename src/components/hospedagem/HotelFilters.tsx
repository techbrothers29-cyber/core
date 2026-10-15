import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, DollarSign, Building, SlidersHorizontal, Wifi, UtensilsCrossed, Car, Snowflake } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { HotelFilters as FiltersType } from "@/pages/Hospedagem";

const PRICE_MIN = 0;
const PRICE_MAX = 5000;

export type HotelSortMode = "default" | "price" | "rating" | "popular";

interface HotelFiltersProps {
  filters: FiltersType;
  onFilterChange: (filters: FiltersType) => void;
  onApplyFilters: () => void;
  sortMode?: HotelSortMode;
  onSortChange?: (mode: HotelSortMode) => void;
}

// Decorative histogram bars (simulated price distribution)
const HISTOGRAM_BARS = [
  15, 25, 35, 20, 45, 55, 40, 60, 75, 85, 95, 100, 90, 80, 70, 65,
  55, 50, 45, 40, 35, 30, 25, 20, 18, 15, 12, 10, 8, 5,
];

// Opções compartilhadas com os chips de filtro da página de resultados.
// ETG "kind" values
export const HOTEL_PROPERTY_TYPES = [
  { id: "Hotel", label: "Hotel" },
  { id: "Guesthouse", label: "Pousada" },
  { id: "Hostel", label: "Hostel" },
  { id: "Apartments", label: "Apartamento" },
  { id: "Resort", label: "Resort" },
  { id: "Villa", label: "Chalé / Villa" },
];

// ETG star_rating: 1–5 (0 = sem classificação)
export const HOTEL_STAR_OPTIONS = [
  { value: 5, label: "5 estrelas" },
  { value: 4, label: "4 estrelas" },
  { value: 3, label: "3 estrelas" },
  { value: 2, label: "2 estrelas" },
];

// ETG serp_filter amenities
export const HOTEL_AMENITY_FILTERS = [
  { id: "has_breakfast", label: "Café da manhã", icon: UtensilsCrossed },
  { id: "has_internet", label: "Wi-Fi", icon: Wifi },
  { id: "has_parking", label: "Estacionamento", icon: Car },
  { id: "air_conditioning", label: "Ar-condicionado", icon: Snowflake },
];

export const HOTEL_PRICE_MAX = PRICE_MAX;

const HotelFilters = ({ filters, onFilterChange, onApplyFilters, sortMode, onSortChange }: HotelFiltersProps) => {
  const [priceRange, setPriceRange] = useState([filters.price_from ?? 0, filters.price_to ?? 5000]);

  const sortOptions: { id: HotelSortMode; label: string }[] = [
    { id: "price", label: "Menor preço" },
    { id: "rating", label: "Nota" },
    { id: "popular", label: "Mais reservados" },
  ];

  const handleClearFilters = () => {
    setPriceRange([0, 5000]);
    onFilterChange({});
    onSortChange?.("default");
  };

  const propertyTypes = HOTEL_PROPERTY_TYPES;
  const ratingOptions = HOTEL_STAR_OPTIONS;
  const amenityFilters = HOTEL_AMENITY_FILTERS;

  // Price slider updates local state only — committed on "Aplicar filtros"
  const handlePriceChange = (values: number[]) => {
    const sorted = [Math.min(values[0], values[1]), Math.max(values[0], values[1])];
    setPriceRange(sorted);
  };

  const committedFrom = filters.price_from ?? PRICE_MIN;
  const committedTo = filters.price_to ?? PRICE_MAX;
  const hasPendingPrice = priceRange[0] !== committedFrom || priceRange[1] !== committedTo;

  const handleApply = () => {
    onFilterChange({
      ...filters,
      price_from: priceRange[0] > PRICE_MIN ? priceRange[0] : undefined,
      price_to: priceRange[1] < PRICE_MAX ? priceRange[1] : undefined,
    });
    // Let the parent commit the new filters before running the search
    setTimeout(() => onApplyFilters(), 0);
  };

  const toggleStarRating = (star: number) => {
    const current = filters.star_rating || [];
    const updated = current.includes(star)
      ? current.filter((s) => s !== star)
      : [...current, star];
    onFilterChange({ ...filters, star_rating: updated.length > 0 ? updated : undefined });
  };

  const toggleKind = (kind: string) => {
    const current = filters.kind || [];
    const updated = current.includes(kind)
      ? current.filter((k) => k !== kind)
      : [...current, kind];
    onFilterChange({ ...filters, kind: updated.length > 0 ? updated : undefined });
  };

  const toggleSerpFilter = (filterId: string) => {
    const current = filters.serp_filter || [];
    const updated = current.includes(filterId)
      ? current.filter((f) => f !== filterId)
      : [...current, filterId];
    onFilterChange({ ...filters, serp_filter: updated.length > 0 ? updated : undefined });
  };

  return (
    <Card className="sticky top-24 border-border/50 flex flex-col max-h-[calc(100vh-7rem)]">
      <CardHeader className="pb-4 shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 overflow-y-auto overscroll-contain pr-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
        {onSortChange && (
          <>
            <div>
              <h4 className="font-medium text-foreground mb-3">Ordenar por</h4>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => {
                  const isActive = sortMode === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => onSortChange(isActive ? "default" : option.id)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}
        {/* Price Range — tech panel, applied only via "Aplicar filtros" */}
        <div className="rounded-xl border border-border/60 bg-gradient-to-b from-primary/[0.05] to-transparent p-3">
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Faixa de preço
          </h4>

          {/* Digital readout */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Mín", value: priceRange[0] },
              { label: "Máx", value: priceRange[1] },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-primary/20 bg-background/60 px-2.5 py-1.5 shadow-[inset_0_0_12px_hsl(var(--primary)/0.06)]"
              >
                <span className="block text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </span>
                <span className="block font-mono text-sm font-bold tabular-nums text-primary">
                  R$ {item.value.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>

          {/* Histogram + Slider — bars light up inside the selected range */}
          <div>
            <div className="flex items-end gap-[1.5px] h-14 px-1 mb-1">
              {HISTOGRAM_BARS.map((height, i) => {
                const barStart = (i / HISTOGRAM_BARS.length) * PRICE_MAX;
                const barEnd = ((i + 1) / HISTOGRAM_BARS.length) * PRICE_MAX;
                const inRange = barEnd > priceRange[0] && barStart < priceRange[1];
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-t-[2px] transition-all duration-300",
                      inRange
                        ? "bg-gradient-to-t from-primary/60 to-primary shadow-[0_0_6px_hsl(var(--primary)/0.45)]"
                        : "bg-muted-foreground/15"
                    )}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>

            <Slider
              value={priceRange}
              onValueChange={handlePriceChange}
              max={PRICE_MAX}
              min={PRICE_MIN}
              step={50}
              minStepsBetweenThumbs={1}
              className="[&>span>span]:shadow-[0_0_12px_hsl(var(--primary)/0.55)]"
            />
          </div>
        </div>

        <Separator />

        {/* Star Rating — multi-select */}
        <div>
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-muted-foreground" />
            Classificação por estrelas
          </h4>
          <div className="space-y-2">
            {ratingOptions.map((option) => {
              const isActive = (filters.star_rating || []).includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleStarRating(option.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border ease-spring transition-all duration-300 ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary scale-[1.02] shadow-sm shadow-primary/10"
                      : "border-border hover:border-primary/50 hover:scale-[1.01]"
                  }`}
                >
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{option.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {"★".repeat(option.value)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Property Type (kind) — multi-select */}
        <div>
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">

            Tipo de hospedagem
          </h4>
          <div className="space-y-2">
            {propertyTypes.map((type) => (
              <div key={type.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`kind-${type.id}`}
                  checked={(filters.kind || []).includes(type.id)}
                  onCheckedChange={() => toggleKind(type.id)}
                />
                <Label htmlFor={`kind-${type.id}`} className="text-sm cursor-pointer">
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Amenities (serp_filter) */}
        <div>
          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
            Comodidades
          </h4>
          <div className="space-y-2">
            {amenityFilters.map((amenity) => {
              const Icon = amenity.icon;
              return (
                <div key={amenity.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity.id}`}
                    checked={(filters.serp_filter || []).includes(amenity.id)}
                    onCheckedChange={() => toggleSerpFilter(amenity.id)}
                  />
                  <Label htmlFor={`amenity-${amenity.id}`} className="text-sm cursor-pointer flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {amenity.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button onClick={handleApply} className="w-full relative">
            Aplicar filtros
          </Button>
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="w-full"
          >
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HotelFilters;
