import { useState } from "react";
import { format, isBefore, startOfDay, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ScheduleSelector from "@/components/ScheduleSelector";

interface DateScheduleSelectorProps {
  schedules: any[];
  selectDate?: boolean;
  dates?: string[];
  selectedDate: Date | null;
  selectedSchedule: string | null;
  onDateChange: (date: Date | null) => void;
  onScheduleChange: (schedule: string) => void;
}

export default function DateScheduleSelector({
  schedules,
  selectDate,
  dates,
  selectedDate,
  selectedSchedule,
  onDateChange,
  onScheduleChange,
}: DateScheduleSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const hasSchedules = schedules && schedules.length > 0;

  if (!hasSchedules) return null;

  const today = startOfDay(new Date());

  // If select_date + dates array, restrict to those dates
  const allowedDates = dates?.map(d => {
    // Try parsing YYYY-MM-DD or other formats
    const parsed = parse(d, "yyyy-MM-dd", new Date());
    return isNaN(parsed.getTime()) ? null : parsed;
  }).filter(Boolean) as Date[] | undefined;

  const hasRestrictedDates = selectDate && allowedDates && allowedDates.length > 0;

  const disabledDays = (date: Date) => {
    if (isBefore(date, today)) return true;
    if (hasRestrictedDates) {
      return !allowedDates!.some(
        d => d.getFullYear() === date.getFullYear() &&
             d.getMonth() === date.getMonth() &&
             d.getDate() === date.getDate()
      );
    }
    return false;
  };

  return (
    <div className="space-y-3">
      {/* Date Picker */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Selecione a data</span>
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "w-full justify-start text-left text-xs h-9",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-2" />
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
                : "Escolha uma data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={(date) => {
                onDateChange(date || null);
                setCalendarOpen(false);
              }}
              disabled={disabledDays}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Schedule Selector — only show after date is selected */}
      {selectedDate && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          <ScheduleSelector
            schedules={schedules}
            selectedSchedule={selectedSchedule}
            onSelect={onScheduleChange}
          />
        </div>
      )}
    </div>
  );
}
