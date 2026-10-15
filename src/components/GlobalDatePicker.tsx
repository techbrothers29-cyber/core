import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SESSION_KEY = "bah-novaxs-selected-date";

// Clear any persisted date once per page load (reload or navigation entry).
// Instances of useSelectedDate within the same page can still share the date
// via sessionStorage, but a fresh page load always starts at "today".
let __dateSessionInitialized = false;
function ensureFreshSession() {
  if (__dateSessionInitialized) return;
  __dateSessionInitialized = true;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

function getInitialDate(): Date {
  ensureFreshSession();
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = new Date(stored);
      if (!isNaN(parsed.getTime()) && !isBefore(parsed, startOfDay(new Date()))) {
        return parsed;
      }
    }
  } catch {}
  return startOfDay(new Date());
}

interface GlobalDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function GlobalDatePicker({ selectedDate, onDateChange }: GlobalDatePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onDateChange(date);
    sessionStorage.setItem(SESSION_KEY, date.toISOString());
    try { window.dispatchEvent(new CustomEvent("bah:selected-date-changed", { detail: { iso: date.toISOString() } })); } catch {}
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Data da visita:</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-medium h-9 px-3 rounded-full",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) => isBefore(date, startOfDay(new Date()))}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface UseSelectedDateOptions {
  /**
   * Padrão `true` (comportamento original): ao montar, volta a data para "hoje".
   * Use `false` em blocos que montam depois do resto da página (ex.: carrosséis
   * carregados sob demanda na Home), para não apagar a data que o visitante já
   * escolheu na busca. A troca de rota continua voltando para "hoje".
   */
  resetOnMount?: boolean;
}

export function useSelectedDate({ resetOnMount = true }: UseSelectedDateOptions = {}) {
  const [selectedDate, setSelectedDateState] = useState<Date>(getInitialDate);
  const location = useLocation();
  const skipFirstResetRef = useRef(!resetOnMount);

  const setSelectedDate = (date: Date) => {
    setSelectedDateState(date);
    try {
      sessionStorage.setItem(SESSION_KEY, date.toISOString());
      window.dispatchEvent(new CustomEvent("bah:selected-date-changed", { detail: { iso: date.toISOString() } }));
    } catch {}
  };

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, selectedDate.toISOString());
  }, [selectedDate]);

  // Reset to "today" whenever the route changes (SPA navigation).
  useEffect(() => {
    if (skipFirstResetRef.current) {
      skipFirstResetRef.current = false;
      return;
    }
    const today = startOfDay(new Date());
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setSelectedDateState((prev) => (prev.getTime() === today.getTime() ? prev : today));
    try {
      window.dispatchEvent(new CustomEvent("bah:selected-date-changed", { detail: { iso: today.toISOString() } }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Sync across instances on the same page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const iso = detail?.iso || (() => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } })();
      if (!iso) return;
      const parsed = new Date(iso);
      if (isNaN(parsed.getTime())) return;
      setSelectedDateState((prev) => (prev.getTime() === parsed.getTime() ? prev : parsed));
    };
    window.addEventListener("bah:selected-date-changed", handler);
    return () => window.removeEventListener("bah:selected-date-changed", handler);
  }, []);

  return { selectedDate, setSelectedDate };
}
