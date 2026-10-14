import { CalendarClock } from "lucide-react";

export default function ManualSchedulingNotice() {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/50 border border-accent text-xs text-muted-foreground">
      <CalendarClock className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
      <p>
        Após a compra, nossa equipe entrará em contato para agendar o melhor horário/disponibilidade.
      </p>
    </div>
  );
}
