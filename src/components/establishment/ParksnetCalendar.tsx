import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SeasonType = "media" | "alta" | "unavailable";

function getSeason(date: Date, isAvailable: boolean): SeasonType {
  if (!isAvailable) return "unavailable";

  const day = date.getDay();
  const month = date.getMonth();
  const highSeasonMonths = [0, 6, 11];

  if (highSeasonMonths.includes(month)) return "alta";
  if (day === 0 || day === 5 || day === 6) return "alta";
  return "media";
}

const SEASON_COLORS: Record<SeasonType, { bg: string; text: string; label: string }> = {
  media: {
    bg: "bg-blue-100 hover:bg-blue-200 border-blue-200",
    text: "text-blue-900",
    label: "Média Temporada",
  },
  alta: {
    bg: "bg-amber-100 hover:bg-amber-200 border-amber-200",
    text: "text-amber-900",
    label: "Alta Temporada",
  },
  unavailable: {
    bg: "bg-muted/60 border-muted",
    text: "text-muted-foreground/60",
    label: "Parque Fechado",
  },
};

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

interface ParksnetCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  minPriceCents?: number;
  availableDates?: Set<string>;
  dayPrices?: Record<string, number>;
  availabilityLoading?: boolean;
  hasResolvedMonth?: boolean;
  onMonthChange?: (month: Date) => void;
  isDayClosed?: (date: Date) => boolean;
  /** Restringe navegação e disponibilidade aos meses listados (0=jan .. 11=dez). */
  allowedMonths?: number[];
}

function formatDateKey(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function ParksnetCalendar({
  selectedDate,
  onDateChange,
  minPriceCents,
  availableDates,
  dayPrices,
  availabilityLoading,
  hasResolvedMonth,
  onMonthChange,
  isDayClosed,
  allowedMonths,
}: ParksnetCalendarProps) {
  const today = startOfDay(new Date());

  // Se allowedMonths estiver definido, escolhemos o primeiro mês futuro
  // (dentro dos próximos 12 meses) que esteja na lista permitida. Assim,
  // estabelecimentos sazonais (ex.: Natal Luz) já abrem no primeiro mês
  // válido em vez de mostrar um calendário todo fechado.
  const initialMonth = useMemo(() => {
    const base = startOfMonth(today);
    if (!allowedMonths || allowedMonths.length === 0) return base;
    if (allowedMonths.includes(base.getMonth())) return base;
    for (let i = 1; i <= 12; i++) {
      const candidate = addMonths(base, i);
      if (allowedMonths.includes(candidate.getMonth())) return candidate;
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedMonths?.join(",")]);

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  // Optimistic selection: highlights the clicked day instantly even when the
  // parent page is busy re-rendering (mergedDisplayEstablishment, products,
  // availability, etc.). The real prop syncs in via useEffect below.
  const [optimisticDate, setOptimisticDate] = useState<Date>(selectedDate);
  const lastSelectedRef = React.useRef(selectedDate);

  const isMonthAllowed = useCallback(
    (d: Date) => !allowedMonths || allowedMonths.length === 0 || allowedMonths.includes(d.getMonth()),
    [allowedMonths],
  );

  useEffect(() => {
    if (lastSelectedRef.current.getTime() !== selectedDate.getTime()) {
      lastSelectedRef.current = selectedDate;
      setOptimisticDate(selectedDate);
      const nextMonth = startOfMonth(selectedDate);
      if (nextMonth.getTime() !== currentMonth.getTime() && isMonthAllowed(nextMonth)) {
        setCurrentMonth(nextMonth);
        onMonthChange?.(nextMonth);
      }
    }
  }, [selectedDate, currentMonth, onMonthChange, isMonthAllowed]);

  useEffect(() => {
    onMonthChange?.(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateClick = useCallback(
    (day: Date) => {
      setOptimisticDate(day);
      // Defer expensive parent re-renders so the highlight repaints first.
      React.startTransition(() => {
        onDateChange(day);
      });
    },
    [onDateChange],
  );

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const handlePrevMonth = useCallback(() => {
    const prev = subMonths(currentMonth, 1);
    if (isBefore(endOfMonth(prev), today)) return;
    if (!isMonthAllowed(prev)) return;
    setCurrentMonth(prev);
    onMonthChange?.(prev);
  }, [currentMonth, today, onMonthChange, isMonthAllowed]);

  // Limita a navegação do calendário até janeiro do ano seguinte,
  // cobrindo a temporada Natal Luz / Nativitaten / O Grande Desfile.
  const maxMonth = useMemo(
    () => startOfMonth(new Date(today.getFullYear() + 1, 0, 1)),
    [today],
  );

  const nextCandidate = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);
  const canGoNext = currentMonth.getTime() < maxMonth.getTime() && isMonthAllowed(nextCandidate);

  const handleNextMonth = useCallback(() => {
    if (!canGoNext) return;
    setCurrentMonth(nextCandidate);
    onMonthChange?.(nextCandidate);
  }, [nextCandidate, onMonthChange, canGoNext]);

  const handleTouchActivation = useCallback((event: React.PointerEvent<HTMLButtonElement>, action: () => void) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    event.stopPropagation();
    action();
  }, []);

  const prevCandidate = useMemo(() => subMonths(currentMonth, 1), [currentMonth]);
  const canGoPrev = !isBefore(endOfMonth(prevCandidate), today) && isMonthAllowed(prevCandidate);

  return (
    <div className="bg-card rounded-xl border shadow-sm p-4 w-full max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Escolher a data</span>
        {availabilityLoading && !hasResolvedMonth && (
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin ml-auto" />
        )}
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          onPointerUp={(event) => canGoPrev && handleTouchActivation(event, handlePrevMonth)}
          disabled={!canGoPrev}
          className={cn(
            "min-h-11 min-w-11 rounded-full flex items-center justify-center border transition-colors touch-manipulation select-none active:scale-95 active:opacity-80",
            canGoPrev
              ? "border-border hover:bg-accent text-foreground"
              : "border-transparent text-muted-foreground/30 cursor-not-allowed"
          )}
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground capitalize min-w-[120px] text-center">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          onPointerUp={(event) => canGoNext && handleTouchActivation(event, handleNextMonth)}
          disabled={!canGoNext}
          className={cn(
            "min-h-11 min-w-11 rounded-full flex items-center justify-center border transition-colors touch-manipulation select-none active:scale-95 active:opacity-80",
            canGoNext
              ? "border-border hover:bg-accent text-foreground"
              : "border-transparent text-muted-foreground/30 cursor-not-allowed"
          )}
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const isPast = isBefore(day, today);
          const isSelected = isSameDay(day, optimisticDate);
          const isDisabledByCalendar = !inMonth || isPast;
          const dateKey = formatDateKey(day);
          // Só marcamos um dia como "fechado" quando temos evidência concreta
          // (availableDates com dados e a data não presente, ou flag forçada
          // pelo parent). Se ainda não temos dados — ou o estabelecimento não
          // devolveu nenhuma data — assumimos que todos os dias futuros estão
          // abertos, evitando o calendário aparecer em branco em reloads e
          // quando a NovaXS demora/omite a resposta desse estabelecimento.
          const hasAvailabilityData = Boolean(availableDates && availableDates.size > 0);
          const forcedClosed = isDayClosed?.(day) ?? false;
          const isAvailable = forcedClosed ? false : (inMonth && !isPast);
          const season = getSeason(day, isAvailable);
          const isClosed = inMonth && !isPast && (forcedClosed || (hasAvailabilityData && !availableDates!.has(dateKey)));
          const seasonStyle = SEASON_COLORS[season];

          return (
            <button
              type="button"
              key={day.toISOString()}
              disabled={isDisabledByCalendar || isClosed}
              onClick={() => handleDateClick(day)}
              onPointerUp={(event) => {
                if (!isDisabledByCalendar && !isClosed) {
                  handleTouchActivation(event, () => handleDateClick(day));
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg text-xs transition-all min-h-11 border touch-manipulation select-none active:scale-95 active:opacity-80",
                isPast && inMonth && "cursor-not-allowed border-transparent bg-transparent text-muted-foreground/30",
                !inMonth && "cursor-not-allowed border-transparent bg-transparent text-transparent",
                isClosed && "cursor-not-allowed border-transparent bg-white text-muted-foreground/30",
                !isDisabledByCalendar && !isClosed && !isSelected && seasonStyle.bg,
                !isDisabledByCalendar && !isClosed && !isSelected && seasonStyle.text,
                isSelected && !isClosed && "bg-primary text-primary-foreground border-primary ring-2 ring-primary/30 font-bold",
              )}
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              <span className={cn("text-[13px] leading-none font-semibold", isSelected && !isClosed && "text-primary-foreground")}>
                {format(day, "d")}
              </span>
              {!isDisabledByCalendar && !isClosed && (() => {
                const dayPrice = dayPrices?.[dateKey];
                // Enquanto o mês ainda não foi resolvido, mostramos o preço base
                // ("a partir de") em todos os dias futuros — evita o calendário
                // parecer vazio/carregando para o visitante que entra direto.
                const fallbackPrice = !hasAvailabilityData ? minPriceCents : undefined;
                const priceCents = dayPrice ?? fallbackPrice ?? (isSelected ? minPriceCents : undefined);
                if (!priceCents || priceCents <= 0) return null;
                const reais = Math.round(priceCents / 100);
                return (
                  <span className={cn(
                    "text-[9px] leading-none mt-0.5 font-medium tabular-nums whitespace-nowrap",
                    isSelected ? "text-primary-foreground/80" : "opacity-70",
                  )}>
                    R$ {reais.toLocaleString("pt-BR")}
                  </span>
                );
              })()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t">
        {(["media", "alta"] as SeasonType[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                s === "media" && "bg-blue-400",
                s === "alta" && "bg-amber-400",
              )}
            />
            <span className="text-[10px] text-muted-foreground">{SEASON_COLORS[s].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
