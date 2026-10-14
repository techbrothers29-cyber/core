import React from "react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HotelFilters } from "@/pages/Hospedagem";
import type { Hotel } from "@/pages/Hospedagem";

export type SortMode = "default" | "price" | "rating" | "popular";

interface MobileFilterChipsProps {
  filters: HotelFilters;
  onFilterChange: (filters: HotelFilters) => void;
  onOpenFilters: () => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

const MobileFilterChips = ({
  filters,
  onFilterChange,
  onOpenFilters,
  sortMode,
  onSortChange,
}: MobileFilterChipsProps) => {
  const activeCount =
    (filters.star_rating?.length || 0) +
    (filters.kind?.length || 0) +
    (filters.serp_filter?.length || 0) +
    (filters.price_from != null || filters.price_to != null ? 1 : 0) +
    (sortMode !== "default" ? 1 : 0);

  return (
    <div className="pb-2">
      <button
        onClick={onOpenFilters}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors",
          activeCount > 0
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground"
        )}
      >
        <Filter className="h-4 w-4" />
        Filtros
        {activeCount > 0 && (
          <span className="ml-0.5 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default MobileFilterChips;

export const sortHotels = (hotels: Hotel[], mode: SortMode): Hotel[] => {
  if (mode === "default") return hotels;

  const sorted = [...hotels];

  // Keep test hotels at top
  const testHotels = sorted.filter((h) => h.isTestHotel);
  const realHotels = sorted.filter((h) => !h.isTestHotel);

  switch (mode) {
    case "price":
      realHotels.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
      break;
    case "rating":
      realHotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case "popular":
      realHotels.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      break;
  }

  return [...testHotels, ...realHotels];
};
