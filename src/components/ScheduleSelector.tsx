import { useState } from "react";
import { Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Schedule {
  schedule: string;
  available: string | number;
  [key: string]: any;
}

interface ScheduleSelectorProps {
  schedules: Schedule[];
  selectedSchedule: string | null;
  onSelect: (schedule: string) => void;
}

const UNLIMITED = 2147483647;

export default function ScheduleSelector({ schedules, selectedSchedule, onSelect }: ScheduleSelectorProps) {
  if (!schedules || schedules.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span>Selecione um horário</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {schedules.map((s, i) => {
          const time = s.schedule;
          const avail = parseFloat(String(s.available || "0"));
          const isUnlimited = avail >= UNLIMITED;
          const isSelected = selectedSchedule === time;
          const isUnavailable = !isUnlimited && avail <= 0;

          return (
            <button
              key={`${time}-${i}`}
              disabled={isUnavailable}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(time);
              }}
              className={cn(
                "flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs transition-all",
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                  : "border-border hover:border-primary/50 text-foreground",
                isUnavailable && "opacity-40 cursor-not-allowed line-through"
              )}
            >
              <span className="font-medium">{time}</span>
              {!isUnlimited && avail > 0 && (
                <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" />
                  {Math.floor(avail)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
