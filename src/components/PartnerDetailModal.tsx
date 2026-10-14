import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon, Pencil } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

interface PartnerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: {
    name: string;
    logo?: string;
    category?: string;
    productTitle?: string;
    productSubtitle?: string;
    productImage?: string;
    price?: number;
    originalPrice?: number;
    discountPercent?: number;
    selectedDate?: string;
    selectedSchedule?: string;
    manualScheduling?: boolean;
  };
  onDateChange?: (date: string) => void;
}

const PartnerDetailModal = ({ isOpen, onClose, partner, onDateChange }: PartnerDetailModalProps) => {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const formattedDate = partner.selectedDate
    ? partner.selectedDate.split('-').reverse().join('/')
    : null;

  const selectedDateObj = partner.selectedDate
    ? (() => {
        const [y, m, d] = partner.selectedDate.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      })()
    : undefined;

  const hasDiscount =
    partner.originalPrice !== undefined &&
    partner.price !== undefined &&
    partner.originalPrice > partner.price;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="font-sans antialiased w-[calc(100vw-2rem)] max-w-md sm:max-w-lg md:max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto md:overflow-hidden">
        <div className="flex flex-col md:flex-row md:max-h-[80vh]">
          {/* Hero: product image */}
          {partner.productImage && (
            <div className="relative w-full h-48 sm:h-56 md:h-auto md:w-1/2 md:min-h-[420px] bg-muted shrink-0">
              <img
                src={partner.productImage}
                alt={partner.productTitle || partner.name}
                className="w-full h-full object-cover"
              />
              {partner.discountPercent ? (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs sm:text-sm px-2.5 py-1 shadow-lg">
                  -{partner.discountPercent}%
                </Badge>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 sm:p-4">
                <p className="text-[11px] sm:text-xs text-white/80 uppercase tracking-wide line-clamp-1">
                  {partner.name}
                </p>
                {partner.category && (
                  <p className="text-[10px] sm:text-[11px] text-white/60">{partner.category}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:overflow-y-auto">
            {/* Product name */}
            {partner.productTitle && (
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight text-foreground">
                  {partner.productTitle}
                </h2>
                {partner.productSubtitle && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {partner.productSubtitle}
                  </p>
                )}
              </div>
            )}

            {/* Date & schedule */}
            {(formattedDate || partner.selectedSchedule || partner.manualScheduling) && (
              <div className="grid grid-cols-2 gap-2">
                {formattedDate && (
                  onDateChange ? (
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex flex-col items-start gap-1 bg-muted/40 hover:bg-muted/60 transition-colors rounded-lg p-2.5 sm:p-3 text-left w-full"
                        >
                          <div className="flex items-center justify-between w-full text-[11px] sm:text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              Data
                            </span>
                            <Pencil className="w-3 h-3 opacity-60" />
                          </div>
                          <span className="text-sm sm:text-base font-semibold text-foreground">
                            {formattedDate}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDateObj}
                          onSelect={(d) => {
                            if (!d) return;
                            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            onDateChange(iso);
                            setDatePopoverOpen(false);
                          }}
                          disabled={(date) => {
                            const t = new Date();
                            t.setHours(0, 0, 0, 0);
                            return date < t;
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex flex-col items-start gap-1 bg-muted/40 rounded-lg p-2.5 sm:p-3">
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>Data</span>
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-foreground">
                        {formattedDate}
                      </span>
                    </div>
                  )
                )}
                {partner.selectedSchedule && (
                  <div className="flex flex-col items-start gap-1 bg-muted/40 rounded-lg p-2.5 sm:p-3">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Horário</span>
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-foreground">
                      {partner.selectedSchedule}
                    </span>
                  </div>
                )}
                {partner.manualScheduling && (
                  <p className="col-span-2 text-[11px] sm:text-xs italic text-muted-foreground">
                    Agendamento será feito após a compra.
                  </p>
                )}
              </div>
            )}

            {/* Price */}
            {partner.price !== undefined && (
              <div className="flex items-end justify-between border-t border-border pt-3 sm:pt-4">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                  Valor
                </span>
                <div className="flex flex-col items-end">
                  {hasDiscount && (
                    <span className="text-[11px] sm:text-xs text-muted-foreground line-through">
                      {formatCurrency(partner.originalPrice!)}
                    </span>
                  )}
                  <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-success leading-none">
                    {formatCurrency(partner.price)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerDetailModal;
