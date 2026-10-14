import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Users, Minus, Plus, ShoppingCart, ArrowLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import ParksnetCalendar from "@/components/establishment/ParksnetCalendar";
import type { NovaxsProduct } from "@/data/novaxs-establishments";

const UNLIMITED = 2147483647;

interface MobileBuyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: NovaxsProduct | null;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  minPriceCents?: number;
  availableDates?: Set<string>;
  dayPrices?: Record<string, number>;
  productPrices?: Record<string, Record<string, number>>;
  availabilityLoading?: boolean;
  hasResolvedMonth?: boolean;
  onMonthChange?: (month: Date) => void;
  allowedMonths?: number[];
  onConfirm: (params: { date: Date; schedule: string | null; quantity: number }) => void;
}

type Step = "date" | "schedule" | "quantity";

export default function MobileBuyDrawer({
  open,
  onOpenChange,
  product,
  selectedDate,
  onDateChange,
  minPriceCents,
  availableDates,
  dayPrices,
  productPrices,
  availabilityLoading,
  hasResolvedMonth,
  onMonthChange,
  allowedMonths,
  onConfirm,
}: MobileBuyDrawerProps) {
  const hasSchedules = !!(product?.schedules && product.schedules.length > 0);
  const [step, setStep] = useState<Step>("date");
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Reset state when drawer opens with a new product
  useEffect(() => {
    if (open) {
      // When opened with a product (Comprar flow), skip the calendar step
      // and use the globally selected date. Calendar remains in date-only mode.
      if (product) {
        setStep(hasSchedules ? "schedule" : "quantity");
      } else {
        setStep("date");
      }
      setSelectedSchedule(null);
      setQuantity(1);
    } else if (product) {
      // When the buy drawer (with product) closes, reset selected date back to today.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      onDateChange(today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  // Instant per-day price from cached availability — switches immediately when the date changes.
  const effectivePriceCents = useMemo(() => {
    if (!product) return 0;
    if (selectedDate && productPrices) {
      const dateKey = format(selectedDate, "dd/MM/yyyy");
      const productKey = String(product.id ?? product.path ?? "");
      const fromMap = productPrices[productKey]?.[dateKey];
      if (fromMap && fromMap > 0) return fromMap;
    }
    return product.priceCents || 0;
  }, [product, productPrices, selectedDate]);

  const priceFormatted = useMemo(() => {
    const cents = effectivePriceCents * quantity;
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }, [effectivePriceCents, quantity]);

  const handleDateSelect = (date: Date) => {
    onDateChange(date);
    if (!product) {
      // Date-only mode (opened by the floating date FAB) — just persist & close.
      try {
        sessionStorage.setItem("bah-novaxs-selected-date", date.toISOString());
        window.dispatchEvent(new CustomEvent("bah:selected-date-changed", { detail: { iso: date.toISOString() } }));
      } catch {}
      onOpenChange(false);
      return;
    }
    if (hasSchedules) {
      setStep("schedule");
    } else {
      // No schedule needed → ask for quantity
      setStep("quantity");
    }
  };

  const handleConfirm = () => {
    onConfirm({
      date: selectedDate,
      schedule: hasSchedules ? selectedSchedule : null,
      quantity,
    });
  };

  const canConfirm = hasSchedules ? !!selectedSchedule : true;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-8 pt-2 max-h-[92vh] overflow-y-auto">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-4" />

        {step === "date" && (
          <>
            {product && (
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</h3>
              </div>
            )}
            <ParksnetCalendar
              selectedDate={selectedDate}
              onDateChange={handleDateSelect}
              minPriceCents={minPriceCents}
              availableDates={availableDates}
              dayPrices={dayPrices}
              availabilityLoading={availabilityLoading}
              hasResolvedMonth={hasResolvedMonth}
              onMonthChange={onMonthChange}
              allowedMonths={allowedMonths}
            />
          </>
        )}

        {step === "schedule" && product && (
          <div className="animate-in slide-in-from-right-2 fade-in duration-200">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-border hover:bg-accent text-foreground transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Quantity */}
            <div className="bg-muted/30 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>Quantidade</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Diminuir"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-semibold text-foreground w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    aria-label="Aumentar"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Schedules */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Selecione o horário</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {product.schedules.map((s: any, i: number) => {
                  const time = s.schedule;
                  const avail = parseFloat(String(s.available || "0"));
                  const isUnlimited = avail >= UNLIMITED;
                  const isSelected = selectedSchedule === time;
                  const isUnavailable = !isUnlimited && avail <= 0;
                  const isLow = !isUnlimited && avail > 0 && avail <= 5;

                  return (
                    <button
                      key={`${time}-${i}`}
                      disabled={isUnavailable}
                      onClick={() => setSelectedSchedule(time)}
                      className={cn(
                        "flex flex-col items-center justify-center px-2 py-2.5 rounded-lg border text-xs transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                          : "border-border hover:border-primary/50 text-foreground bg-card",
                        isUnavailable && "opacity-40 cursor-not-allowed line-through"
                      )}
                    >
                      <span className="font-semibold text-sm">{time}</span>
                      {isLow && (
                        <span className="text-[9px] text-warning mt-0.5">poucas vagas</span>
                      )}
                      {!isUnlimited && avail > 5 && (
                        <span className="text-[9px] text-muted-foreground mt-0.5">
                          {Math.floor(avail)} vagas
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer: total + add */}
            <div className="sticky bottom-0 bg-background pt-3 border-t border-border -mx-4 px-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-extrabold text-primary">{priceFormatted}</span>
              </div>
              <Button
                disabled={!canConfirm}
                onClick={handleConfirm}
                className="w-full h-11 rounded-full text-sm font-semibold"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {canConfirm ? "Adicionar ao carrinho" : "Selecione um horário"}
              </Button>
            </div>
          </div>
        )}

        {step === "quantity" && product && (
          <div className="animate-in slide-in-from-right-2 fade-in duration-200">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-border hover:bg-accent text-foreground transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Quantity */}
            <div className="bg-muted/30 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Users className="w-4 h-4" />
                  <span>Quantidade</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Diminuir"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-base font-semibold text-foreground w-7 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors"
                    aria-label="Aumentar"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer: total + add */}
            <div className="sticky bottom-0 bg-background pt-3 border-t border-border -mx-4 px-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-extrabold text-primary">{priceFormatted}</span>
              </div>
              <Button
                onClick={handleConfirm}
                className="w-full h-11 rounded-full text-sm font-semibold"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adicionar ao carrinho
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
