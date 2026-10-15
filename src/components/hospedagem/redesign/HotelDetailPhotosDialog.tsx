import React, { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: string[];
  hotelName: string;
  /** Foto que deve aparecer primeiro ao abrir (índice em `photos`). */
  startIndex?: number;
}

/**
 * Todas as fotos do hotel, uma embaixo da outra, num diálogo rolável.
 * Ao abrir pela foto N, a lista já começa nela.
 */
const HotelDetailPhotosDialog: React.FC<Props> = ({ open, onOpenChange, photos, hotelName, startIndex = 0 }) => {
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (!open || startIndex <= 0) return;
    const t = window.setTimeout(() => {
      itemRefs.current[startIndex]?.scrollIntoView({ block: "start" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [open, startIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-jakarta w-[calc(100vw-1rem)] max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 md:p-6 rounded-2xl">
        <div className="pr-14 mb-4">
          <DialogTitle className="text-lg md:text-xl font-bold leading-tight">Fotos do {hotelName}</DialogTitle>
          <DialogDescription className="mt-1">
            {photos.length} {photos.length === 1 ? "foto" : "fotos"}
          </DialogDescription>
        </div>
        <ul className="m-0 p-0 list-none grid gap-2 md:gap-3 md:grid-cols-2">
          {photos.map((src, i) => (
            <li
              key={`${src}-${i}`}
              ref={(el) => { itemRefs.current[i] = el; }}
              className={`scroll-mt-16 ${i % 3 === 0 ? "md:col-span-2" : ""}`}
            >
              <img
                src={src}
                alt={`${hotelName} - foto ${i + 1} de ${photos.length}`}
                loading={i < 3 ? "eager" : "lazy"}
                className="w-full aspect-[4/3] object-cover rounded-xl bg-muted"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
              />
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

export default HotelDetailPhotosDialog;
