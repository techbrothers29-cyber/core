import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Check, Users, Coffee, Bed, CreditCard, Building2,
  AlertCircle, Loader2, ChevronDown, ChevronUp, Image as ImageIcon, Baby,
  ChevronLeft, ChevronRight, X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MealDataItem {
  value: string;
  no_child_meal?: boolean;
}

interface RoomOption {
  id: string;
  book_hash: string;
  room_name: string;
  room_type: string;
  meal: string;
  meal_plan: string;
  meal_data?: MealDataItem[];
  beds: any[];
  max_occupancy: number;
  price: number;
  currency: string;
  payment_options: {
    now: {
      amount: number;
      currency: string;
    } | null;
    pay_later: {
      deposit_amount: number;
      at_property_amount: number;
      currency: string;
      need_credit_card_data?: boolean;
    } | null;
  };
  free_cancellation: boolean;
  cancellation_before: string | null;
  cancellation_policies?: any[];
  no_show_penalty?: any;
  amenities: string[];
  rg_ext?: Record<string, any>;
  taxes?: {
    included: { name: string; amount: string; currency_code: string }[];
    excluded: { name: string; amount: string; currency_code: string }[];
  };
}

interface StaticRoomGroup {
  room_group_id: number;
  name: string;
  images: string[];
  room_amenities: string[];
  rg_ext?: Record<string, any>;
}

interface RoomSelectorProps {
  rooms: RoomOption[];
  selectedRoom: RoomOption | null;
  onSelectRoom: (room: RoomOption) => void;
  onProceed: (paymentType: 'now' | 'pay_later') => void;
  isLoading?: boolean;
  roomGroups?: StaticRoomGroup[];
  /** Hotel photos used when a room group has no images of its own */
  fallbackImages?: string[];
}

const toThumbUrl = (url: string) =>
  url
    .replace("/1024x768/", "/640x400/")
    .replace("/max1280x900/", "/640x400/");

// ETG requirement #16: Display meal_data.value directly from API
const getMealLabel = (room: { meal: string; meal_plan: string; meal_data?: MealDataItem[] | MealDataItem }): string => {
  if (room.meal_data) {
    const items = Array.isArray(room.meal_data) ? room.meal_data : [room.meal_data];
    if (items.length > 0 && items[0].value) return items[0].value;
  }
  const meal = room.meal || room.meal_plan;
  if (!meal || meal === 'nomeal') return 'nomeal';
  return meal;
};

const getChildMealExcluded = (room: { meal_data?: MealDataItem[] | MealDataItem }): boolean => {
  if (!room.meal_data) return false;
  const items = Array.isArray(room.meal_data) ? room.meal_data : [room.meal_data];
  if (items.length === 0) return false;
  return items.some(md => md.no_child_meal === true);
};

/** Compare rg_ext objects: match if all keys from rate exist in static and values match */
const matchRgExt = (rateRgExt: Record<string, any>, staticRgExt: Record<string, any>): boolean => {
  const rateKeys = Object.keys(rateRgExt);
  if (rateKeys.length === 0) return false;
  return rateKeys.every(key => {
    if (!(key in staticRgExt)) return false;
    // Compare stringified for nested objects
    return JSON.stringify(rateRgExt[key]) === JSON.stringify(staticRgExt[key]);
  });
};

/** Create a stable key from rg_ext for grouping unmatched rates */
const rgExtKey = (rgExt: Record<string, any>): string => {
  return JSON.stringify(rgExt, Object.keys(rgExt).sort());
};

interface GroupedRoom {
  groupKey: string;
  staticGroup: StaticRoomGroup | null;
  rates: RoomOption[];
}

const RoomSelector = ({
  rooms,
  selectedRoom,
  onSelectRoom,
  onProceed,
  isLoading,
  roomGroups = [],
  fallbackImages = [],
}: RoomSelectorProps) => {
  const [paymentType, setPaymentType] = useState<'now' | 'pay_later'>('now');
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [gallery, setGallery] = useState<{ images: string[]; name: string; index: number } | null>(null);

  // Group rates by rg_ext matching
  const groupedRooms = useMemo((): GroupedRoom[] => {
    if (!rooms.length) return [];

    const groups = new Map<string, GroupedRoom>();

    for (const room of rooms) {
      const rateRgExt = room.rg_ext;

      // Try to match against static room groups
      let matched = false;
      if (rateRgExt && typeof rateRgExt === 'object' && Object.keys(rateRgExt).length > 0 && roomGroups.length > 0) {
        for (const sg of roomGroups) {
          if (sg.rg_ext && matchRgExt(rateRgExt, sg.rg_ext)) {
            const key = `static_${sg.room_group_id}`;
            if (!groups.has(key)) {
              groups.set(key, { groupKey: key, staticGroup: sg, rates: [] });
            }
            groups.get(key)!.rates.push(room);
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // Create a new group based on rg_ext or fallback to room id
        const key = rateRgExt && Object.keys(rateRgExt).length > 0
          ? `dynamic_${rgExtKey(rateRgExt)}`
          : `ungrouped_${room.id}`;
        if (!groups.has(key)) {
          groups.set(key, { groupKey: key, staticGroup: null, rates: [] });
        }
        groups.get(key)!.rates.push(room);
      }
    }

    return Array.from(groups.values());
  }, [rooms, roomGroups]);

  // Start with all groups COLLAPSED
  useEffect(() => {
    setExpandedGroups(new Set());
  }, [groupedRooms]);

  // Auto-select payment type based on available options
  useEffect(() => {
    if (!selectedRoom) return;
    const hasNow = !!selectedRoom.payment_options.now;
    const hasPayLater = !!selectedRoom.payment_options.pay_later;
    if (hasNow && !hasPayLater) setPaymentType('now');
    else if (!hasNow && hasPayLater) setPaymentType('pay_later');
  }, [selectedRoom]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const formatTaxAmount = (amount: string, currencyCode: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return `${amount} ${currencyCode}`;
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(num);
    } catch {
      return `${num.toFixed(2)} ${currencyCode}`;
    }
  };

  const taxNameMap: Record<string, string> = {
    city_tax: 'Taxa da cidade',
    resort_fee: 'Taxa do resort',
    tourism_tax: 'Taxa de turismo',
    service_charge: 'Taxa de serviço',
    service_fee: 'Taxa de serviço',
    vat: 'IVA',
    electricity_fee: 'Taxa de energia',
    cleaning_fee: 'Taxa de limpeza',
    occupancy_tax: 'Taxa de ocupação',
  };

  const formatCancellationDateTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      // ETG sends UTC+0 — ensure "Z" suffix so JS parses as UTC, not local time
      const normalized = dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10)
        ? dateStr
        : dateStr + 'Z';
      const utcDate = new Date(normalized);
      if (isNaN(utcDate.getTime())) return null;
      // Convert to America/Sao_Paulo for Brazilian users
      const date = utcDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
      const time = utcDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      // Show UTC offset for the converted timezone to avoid user confusion (ETG requirement)
      const offsetMin = -utcDate.getTimezoneOffset(); // not reliable for target TZ; hardcode BRT offset
      const brOffset = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', timeZoneName: 'shortOffset' }).formatToParts(utcDate).find(p => p.type === 'timeZoneName')?.value || 'BRT';
      return `${date} às ${time} (${brOffset})`;
    } catch { return null; }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum quarto disponível para estas datas.</p>
      </div>
    );
  }

  const hasMultipleGroups = groupedRooms.length > 1;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Selecione um quarto</h3>

      <div className="space-y-4">
        {groupedRooms.map((group) => {
          const isGroupExpanded = expandedGroups.has(group.groupKey);
          const sg = group.staticGroup;
          // Use the group's own photos; fall back to hotel photos when ETG has none
          const groupImages = sg?.images && sg.images.length > 0 ? sg.images : fallbackImages;

          return (
            <div key={group.groupKey} className="border border-border rounded-xl overflow-hidden">
              {/* Group Header — div role=button because it contains the photo thumbnail button */}
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "w-full flex items-center gap-3 p-3 hover:bg-muted/80 transition-colors text-left cursor-pointer",
                  isGroupExpanded ? "bg-primary/5 border-b border-border" : "bg-muted/30"
                )}
                onClick={() => toggleGroup(group.groupKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleGroup(group.groupKey);
                  }
                }}
              >
                {/* Room photo thumbnail (falls back to hotel photos) */}
                {groupImages.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGallery({ images: groupImages, name: sg?.name || group.rates[0]?.room_name || 'Quarto', index: 0 });
                    }}
                    className="relative group flex-shrink-0 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`Ver fotos do ${sg?.name || 'quarto'}`}
                  >
                    <img
                      src={toThumbUrl(groupImages[0])}
                      alt={sg?.name || group.rates[0]?.room_name || 'Quarto'}
                      className="w-12 h-12 sm:w-14 sm:h-14 object-cover"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                    />
                    {groupImages.length > 1 && (
                      <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl-md leading-tight">
                        +{groupImages.length - 1}
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground text-sm truncate block">
                    {sg?.name || group.rates[0]?.room_name || 'Quarto'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {group.rates.length} {group.rates.length === 1 ? 'opção' : 'opções'}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      a partir de {formatPrice(Math.min(...group.rates.map(r => r.price)))}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-colors",
                  isGroupExpanded ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {isGroupExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {/* Rates list — only when expanded */}
              {isGroupExpanded && (
                <div className="p-3 space-y-2">
                  {group.rates.map((room) => {
                    const isSelected = selectedRoom?.id === room.id;
                    const isExpanded = expandedRoom === room.id;
                    const mealLabel = getMealLabel(room);
                    const childMealExcluded = getChildMealExcluded(room);
                    const cancellationDate = formatCancellationDateTime(room.cancellation_before);

                     return (
                      <div
                        key={room.id}
                        className={cn(
                          "border rounded-lg cursor-pointer transition-all overflow-hidden",
                          isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm" : "border-border hover:border-primary/50 hover:shadow-sm"
                        )}
                        onClick={() => onSelectRoom(room)}
                      >
                        {/* Main content */}
                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            {/* Left: room name */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Bed className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-foreground text-sm leading-tight line-clamp-2">{room.room_name}</span>
                            </div>

                            {/* Right: price */}
                            <div className="text-right flex-shrink-0">
                              <span className="text-base sm:text-lg font-bold text-foreground whitespace-nowrap">{formatPrice(room.price)}</span>
                              <p className="text-[11px] text-muted-foreground">total da estadia</p>
                            </div>
                          </div>

                          {/* Badges row */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
                              <Coffee className="h-3 w-3 mr-1 flex-shrink-0" />{mealLabel}
                            </Badge>
                            <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
                              <Users className="h-3 w-3 mr-1 flex-shrink-0" />Até {room.max_occupancy}
                            </Badge>
                            {room.free_cancellation && (
                              <Badge className="bg-green-600 text-[11px] px-2 py-0.5">
                                <Check className="h-3 w-3 mr-1 flex-shrink-0" />
                                Cancel. grátis
                              </Badge>
                            )}
                            {childMealExcluded && (
                              <Badge variant="outline" className="text-[11px] px-2 py-0.5 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                                <Baby className="h-3 w-3 mr-1 flex-shrink-0" />Refeição não inclusa para crianças
                              </Badge>
                            )}
                          </div>

                          {room.free_cancellation && cancellationDate && (
                            <p className="text-[11px] text-green-600 dark:text-green-400 mt-1.5">
                              Cancelamento grátis até {cancellationDate}
                            </p>
                          )}

                          {/* Taxes info */}
                          {room.taxes?.excluded && room.taxes.excluded.length > 0 ? (
                            <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                              <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 mb-1">
                                Taxas adicionais (pagas no check-in):
                              </p>
                              {room.taxes.excluded.map((tax, i) => (
                                <div key={i} className="flex justify-between text-[11px] text-amber-700 dark:text-amber-400">
                                  <span>{taxNameMap[tax.name] || tax.name}</span>
                                  <span className="font-medium">{formatTaxAmount(tax.amount, tax.currency_code)}</span>
                                </div>
                              ))}
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                                * Valores na moeda original. Pagamento direto no hotel.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
                              <Check className="h-3 w-3 flex-shrink-0" />
                              <span>Todas as taxas incluídas no preço</span>
                            </div>
                          )}

                          {/* Footer: details toggle + select CTA */}
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <button
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={(e) => { e.stopPropagation(); setExpandedRoom(isExpanded ? null : room.id); }}
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isExpanded ? 'Menos detalhes' : 'Mais detalhes'}
                            </button>

                            <Button
                              type="button"
                              size="sm"
                              variant={isSelected ? 'default' : 'outline'}
                              className={cn(
                                "h-8 px-3 text-xs font-semibold",
                                isSelected && "pointer-events-none"
                              )}
                              onClick={(e) => { e.stopPropagation(); onSelectRoom(room); }}
                            >
                              {isSelected ? (
                                <><Check className="h-3.5 w-3.5 mr-1" />Selecionado</>
                              ) : (
                                'Selecionar'
                              )}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 text-sm text-muted-foreground space-y-1 pl-1">
                              {room.beds?.length > 0 && (
                                <p className="text-xs">🛏️ Camas: {room.beds.map((b: any) => b.type || 'Cama').join(', ')}</p>
                              )}
                              {room.amenities?.length > 0 && (
                                <p className="text-xs">Comodidades: {room.amenities.slice(0, 5).join(', ')}</p>
                              )}
                              {sg?.room_amenities && sg.room_amenities.length > 0 && (
                                <p className="text-xs">Amenidades: {sg.room_amenities.slice(0, 5).join(', ')}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment type selection */}
      {selectedRoom && (
        <>
          <Separator className="my-4" />
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Forma de pagamento</h3>
            <RadioGroup
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as 'now' | 'pay_later')}
              className="space-y-2"
            >
              {selectedRoom.payment_options.now && (
                <div
                  className={cn(
                    "flex items-start space-x-3 border rounded-lg p-4 cursor-pointer transition-all",
                    paymentType === 'now' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setPaymentType('now')}
                >
                  <RadioGroupItem value="now" id="now" className="mt-1" />
                  <Label htmlFor="now" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="font-medium">Pagar agora</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pague {formatPrice(selectedRoom.payment_options.now.amount)} agora com cartão de crédito
                    </p>
                    {selectedRoom.free_cancellation && (
                      <p className="text-xs text-green-600 mt-1">✓ Cancelamento gratuito disponível</p>
                    )}
                  </Label>
                </div>
              )}
              {selectedRoom.payment_options.pay_later && (
                <div
                  className={cn(
                    "flex items-start space-x-3 border rounded-lg p-4 cursor-pointer transition-all",
                    paymentType === 'pay_later' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => setPaymentType('pay_later')}
                >
                  <RadioGroupItem value="pay_later" id="pay_later" className="mt-1" />
                  <Label htmlFor="pay_later" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">Pagar no hotel</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pague {formatPrice(selectedRoom.payment_options.pay_later.at_property_amount)} diretamente no hotel
                    </p>
                    {selectedRoom.payment_options.pay_later.need_credit_card_data ? (
                      <p className="text-xs text-amber-600 mt-1">* Cartão de crédito necessário como garantia</p>
                    ) : (
                      <p className="text-xs text-green-600 mt-1">✓ Sem necessidade de cartão</p>
                    )}
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          <div className="sticky bottom-0 -mx-3 sm:mx-0 px-3 sm:px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:bg-transparent sm:backdrop-blur-none border-t sm:border-0 border-border z-10 mt-4">
            <Button
              className="w-full h-12 sm:h-14 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
              size="lg"
              onClick={() => onProceed(paymentType)}
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Verificando disponibilidade...</>
              ) : (
                <span className="flex items-center justify-center gap-2 w-full">
                  <span>Finalizar reserva</span>
                  <span className="opacity-80">•</span>
                  <span>{formatPrice(
                    paymentType === 'now'
                      ? (selectedRoom.payment_options.now?.amount ?? selectedRoom.price)
                      : (selectedRoom.payment_options.pay_later?.at_property_amount ?? selectedRoom.price)
                  )}</span>
                </span>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Você poderá revisar os detalhes antes de confirmar
            </p>
          </div>
        </>
      )}

      {/* Room gallery dialog */}
      <Dialog open={!!gallery} onOpenChange={(o) => !o && setGallery(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border">
          <DialogTitle className="sr-only">{gallery?.name || 'Galeria'}</DialogTitle>
          {gallery && (
            <div className="flex flex-col">
              <div className="relative bg-black flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                <img
                  src={gallery.images[gallery.index]}
                  alt={`${gallery.name} - foto ${gallery.index + 1}`}
                  className="max-h-[70vh] max-w-full object-contain"
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                />
                {gallery.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setGallery(g => g && ({ ...g, index: (g.index - 1 + g.images.length) % g.images.length }))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                      aria-label="Foto anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGallery(g => g && ({ ...g, index: (g.index + 1) % g.images.length }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                      aria-label="Próxima foto"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      {gallery.index + 1} / {gallery.images.length}
                    </span>
                  </>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-foreground mb-2 truncate">{gallery.name}</p>
                {gallery.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {gallery.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGallery(g => g && ({ ...g, index: i }))}
                        className={cn(
                          "flex-shrink-0 rounded-md overflow-hidden border-2 transition-all",
                          i === gallery.index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                      >
                        <img
                          src={toThumbUrl(img)}
                          alt=""
                          className="w-16 h-16 object-cover"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomSelector;
