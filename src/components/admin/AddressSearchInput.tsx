import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { AddressMapPicker } from './AddressMapPicker';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

interface SearchBoxSuggestion {
  mapbox_id: string;
  name: string;
  name_preferred?: string;
  place_formatted?: string;
  full_address?: string;
  feature_type?: string;
  address?: string;
  maki?: string;
}

interface AddressSearchInputProps {
  latitude: string;
  longitude: string;
  initialLabel?: string;
  onCoordinatesChange: (lat: string, lng: string, label?: string) => void;
}

export const AddressSearchInput: React.FC<AddressSearchInputProps> = ({
  latitude,
  longitude,
  initialLabel,
  onCoordinatesChange,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchBoxSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel || '');
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Persistent session token required by Search Box API
  const sessionTokenRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  // Sync external label changes (e.g., when modal opens with saved data)
  useEffect(() => {
    setSelectedLabel(initialLabel || '');
  }, [initialLabel]);

  const search = useCallback(async (q: string) => {
    if (!MAPBOX_TOKEN || q.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      // Mirror Mapbox Search Box demo behavior: address+POI focused, biased to Brazil.
      const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(q)}&access_token=${MAPBOX_TOKEN}&session_token=${sessionTokenRef.current}&country=br&language=pt&limit=10&proximity=ip&types=address,street,poi,place,locality,neighborhood,postcode`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.suggestions || []);
    } catch (err) {
      console.error('[AddressSearch] erro:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      search(query);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Click outside to close
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSelect = async (suggestion: SearchBoxSuggestion) => {
    if (!MAPBOX_TOKEN) return;
    setLoading(true);
    try {
      const typedQuery = query.trim();
      const hasStreetNumber = /\b\d{1,6}[A-Za-z-]?\b/.test(typedQuery);
      let lng: number | null = null;
      let lat: number | null = null;

      const preferredLabel =
        typedQuery.length > 0
          ? typedQuery
          : suggestion.full_address ||
            suggestion.place_formatted ||
            `${suggestion.name}${suggestion.address ? `, ${suggestion.address}` : ''}`;

      // Prioridade 1: se o admin digitou número, geocodificar o texto completo.
      // Isso reproduz melhor o comportamento do demo do Mapbox para endereço exato.
      if (hasStreetNumber) {
        try {
          const exactUrl = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
            typedQuery
          )}&access_token=${MAPBOX_TOKEN}&country=br&language=pt&limit=1&types=address,street`;
          const exactRes = await fetch(exactUrl);
          const exactData = await exactRes.json();
          const exactFeature = exactData?.features?.[0];

          if (exactFeature?.geometry?.coordinates) {
            [lng, lat] = exactFeature.geometry.coordinates;
          }
        } catch (exactErr) {
          console.warn('[AddressSearch] geocode exato falhou, usando retrieve:', exactErr);
        }
      }

      // Prioridade 2: fallback para o retrieve da Search Box API.
      if (lng === null || lat === null) {
        const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(
          suggestion.mapbox_id
        )}?access_token=${MAPBOX_TOKEN}&session_token=${sessionTokenRef.current}&language=pt`;
        const res = await fetch(url);
        const data = await res.json();
        const feature = data?.features?.[0];

        if (!feature?.geometry?.coordinates) {
          console.error('[AddressSearch] retrieve sem feature');
          return;
        }

        [lng, lat] = feature.geometry.coordinates;
      }

      onCoordinatesChange(String(lat), String(lng), preferredLabel);
      setSelectedLabel(preferredLabel);
      setQuery('');
      setResults([]);
      setOpen(false);
      sessionTokenRef.current =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch (err) {
      console.error('[AddressSearch] retrieve erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    onCoordinatesChange('', '', '');
    setSelectedLabel('');
    setQuery('');
  };

  if (!MAPBOX_TOKEN) {
    return (
      <p className="text-xs text-destructive">
        Token do Mapbox não configurado (VITE_MAPBOX_TOKEN).
      </p>
    );
  }

  const hasCoords = !!latitude && !!longitude;

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label className="text-xs">Buscar endereço</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Digite endereço com número, empresa ou cidade..."
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}

        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
            {results.map((s) => {
              // Avoid duplicating the name when address already starts with it
              const primary = s.address && !s.address.startsWith(s.name)
                ? `${s.name}, ${s.address}`
                : s.name;
              const secondary = s.full_address || s.place_formatted || '';
              return (
                <button
                  key={s.mapbox_id}
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent input blur from closing the dropdown before click fires
                    e.preventDefault();
                  }}
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0 flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{primary}</div>
                    {secondary && secondary !== primary && (
                      <div className="text-xs text-muted-foreground truncate">{secondary}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {hasCoords && (
        <>
          <AddressMapPicker
            latitude={Number(latitude)}
            longitude={Number(longitude)}
            onChange={(lat, lng) => {
              // Keep existing label when only fine-tuning the pin position
              onCoordinatesChange(String(lat), String(lng), selectedLabel || undefined);
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-start gap-2 p-2 rounded-md bg-background border text-xs">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium break-words sm:truncate">
                  {selectedLabel || 'Endereço selecionado'}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-block mt-0.5"
                >
                  Ver no Google Maps
                </a>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 self-end sm:self-start flex-shrink-0"
              onClick={handleClear}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
