import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ZoomIn, ZoomOut, Maximize2, ShoppingCart, AlertTriangle, X } from "lucide-react";
import { useNovaxsSpaces, type SeatMapSeat } from "@/hooks/useNovaxsSpaces";
import {
  detectVenueFromProduct,
  positionSeatsForSector,
  seatFill,
  hasApiCoords,
  layoutSeatsFromApi,
  type VenuePalette,
} from "@/data/venue-seat-layouts";
import { VenueLayer } from "@/components/establishment/VenueMap";

const MAX_SEATS = 10;
const SEAT_R = 0.34; // raio do assento em unidades do mapa (fallback)
// Para o mapa de assentos numerados (VIP), forçamos um zoom mínimo que
// mantém os números dos lugares legíveis. O piso é calculado a partir do
// tamanho real do container (responsivo): o assento precisa ter ao menos
// ~SEAT_MIN_PX de diâmetro na tela para o número ser lido.
const SEAT_MIN_PX = 34; // diâmetro mínimo do assento na tela (px)
const LABEL_MIN_FACTOR_CAP = 4.0; // teto do piso de zoom (telas pequenas)
const ZOOM_MAX_FACTOR = 18;



/** Paleta padrão quando o mapa vem direto da API (sem venue desenhado). */
const DEFAULT_PALETTE: VenuePalette = {
  free: "#22c55e",
  reserved: "#eab308",
  selected: "#f97316",
  occupied: "#ef4444",
  blocked: "#3f3f46",
};


interface SeatMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productPath: string;
  date: string; // dd/MM/yyyy
  dateLabel?: string;
  priceCents: number;
  onConfirm: (seats: SeatMapSeat[]) => void;
  onFallback?: () => void;
}

interface ViewTransform {
  k: number;
  x: number;
  y: number;
}

const SeatMapModal = ({
  open,
  onOpenChange,
  productName,
  productPath,
  date,
  dateLabel,
  priceCents,
  onConfirm,
  onFallback,
}: SeatMapModalProps) => {
  const { toast } = useToast();
  const spacesQuery = useNovaxsSpaces(productPath, date, open);
  const sectors = spacesQuery.data?.sectors ?? [];
  const availableDates = (spacesQuery.data as { availableDates?: string[] } | undefined)?.availableDates ?? [];


  const [activeSector, setActiveSector] = useState(0);
  const sector = sectors[Math.min(activeSector, Math.max(sectors.length - 1, 0))];
  const [selected, setSelected] = useState<SeatMapSeat[]>([]);
  const [emptyResponseRetries, setEmptyResponseRetries] = useState(0);

  // Venue próprio (Nativitaten / Desfile): o mapa é desenhado por nós e os
  // assentos da API são posicionados sobre a geometria do venue.
  const venueInfo = useMemo(() => detectVenueFromProduct(productName), [productName]);

  // Reseta seleção quando o produto/data muda.
  useEffect(() => {
    setSelected([]);
    setActiveSector(0);
    setEmptyResponseRetries(0);
  }, [productPath, date]);

  // A ParksNet pode responder temporariamente sem setores mesmo quando a
  // sessão existe. Reconsulta duas vezes antes de informar que não há mapa.
  useEffect(() => {
    if (!open || !spacesQuery.isSuccess || sectors.length > 0 || emptyResponseRetries >= 2) return;
    const timer = window.setTimeout(() => {
      setEmptyResponseRetries((current) => current + 1);
      void spacesQuery.refetch();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [open, spacesQuery.isSuccess, spacesQuery.refetch, sectors.length, emptyResponseRetries]);

  useEffect(() => {
    if (sectors.length > 0 && emptyResponseRetries !== 0) setEmptyResponseRetries(0);
  }, [sectors.length, emptyResponseRetries]);

  // Tempo real: a cada revalidação, remove da seleção assentos que deixaram
  // de estar livres (alguém comprou enquanto o mapa estava aberto).
  useEffect(() => {
    const all = spacesQuery.data?.sectors.flatMap((s) => s.seats) ?? [];
    if (!all.length) return;
    setSelected((prev) => {
      if (!prev.length) return prev;
      const byId = new Map(all.map((s) => [s.id, s]));
      const next = prev.filter((s) => (byId.get(s.id)?.status ?? "free") === "free");
      if (next.length !== prev.length) {
        toast({
          title: "Assento indisponível",
          description: "Um dos assentos escolhidos acabou de ser vendido e foi removido da seleção.",
          duration: 3500,
        });
      }
      return next.length === prev.length ? prev : next;
    });
  }, [spacesQuery.data, toast]);



  // Layout REAL da API (getSpaces já devolve x/y de cada assento do mapa
  // físico). Quando existe, ele tem prioridade sobre o desenho aproximado.
  const apiLayout = useMemo(() => {
    const seats = sector?.seats ?? [];
    return hasApiCoords(seats) ? layoutSeatsFromApi(seats) : null;
  }, [sector]);

  const mappedSeats = useMemo(() => {
    if (apiLayout) return apiLayout.seats;
    if (venueInfo) {
      // Posiciona os assentos da API sobre o desenho do venue.
      return positionSeatsForSector(venueInfo.venue, venueInfo.sector.id, sector?.seats ?? []);
    }
    return (sector?.seats ?? []).filter((s) => s.x !== null && s.y !== null);
  }, [apiLayout, venueInfo, sector]);
  const hasCoords = mappedSeats.length > 0;
  const seatR = apiLayout?.radius ?? SEAT_R;

  const bounds = useMemo(() => {
    if (!apiLayout && venueInfo) {
      const { w, h } = venueInfo.venue.viewBox;
      const pad = 12;
      return { minX: -pad, maxX: w + pad, minY: -pad, maxY: h + pad };
    }
    if (!mappedSeats.length) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of mappedSeats) {
      minX = Math.min(minX, s.x as number);
      maxX = Math.max(maxX, s.x as number);
      minY = Math.min(minY, s.y as number);
      maxY = Math.max(maxY, s.y as number);
    }
    if (apiLayout?.stage) {
      minX = Math.min(minX, apiLayout.stage.x - seatR * 8);
      maxX = Math.max(maxX, apiLayout.stage.x + seatR * 8);
      minY = Math.min(minY, apiLayout.stage.y - seatR * 4);
      maxY = Math.max(maxY, apiLayout.stage.y + seatR * 4);
    }
    const pad = seatR * 4;
    return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
  }, [apiLayout, venueInfo, mappedSeats, seatR]);


  // Medição do container do mapa.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const frame = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [open, hasCoords, activeSector]);

  // Piso de zoom responsivo: em telas grandes o "fit" já deixa os assentos
  // legíveis, então não forçamos ampliação. Em telas pequenas subimos até o
  // teto para garantir que o número do assento seja lido.
  const minZoomFactor = useMemo(() => {
    if (!bounds || !size.w || !size.h) return 1;
    const bw = bounds.maxX - bounds.minX || 1;
    const bh = bounds.maxY - bounds.minY || 1;
    const rawFit = Math.min(size.w / bw, size.h / bh) * 0.94 || 1;
    const minPx = size.w < 480 ? 28 : SEAT_MIN_PX; // no celular, alvo um pouco menor
    const needed = minPx / (2 * seatR); // escala necessária p/ legibilidade
    // Em telas pequenas o "fit" fica muito distante: liberamos um teto maior
    // para que os números continuem legíveis sem o usuário ter que ampliar.
    const cap = size.w < 480 ? LABEL_MIN_FACTOR_CAP * 1.4 : LABEL_MIN_FACTOR_CAP;
    return Math.min(Math.max(needed / rawFit, 1), cap);
  }, [bounds, size, seatR]);


  const fitTransform = useCallback((): ViewTransform => {
    if (!bounds || !size.w || !size.h) return { k: 1, x: 0, y: 0 };
    const bw = bounds.maxX - bounds.minX || 1;
    const bh = bounds.maxY - bounds.minY || 1;
    const rawFit = Math.min(size.w / bw, size.h / bh) * 0.94;
    // Garante o zoom mínimo legível (números sempre visíveis).
    const k = rawFit * minZoomFactor;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    return { k, x: size.w / 2 - cx * k, y: size.h / 2 - cy * k };
  }, [bounds, size, minZoomFactor]);

  // Ajuste cru (sem o piso de legibilidade) — referência para o clamp.
  const rawFitRef = useRef(1);
  useEffect(() => {
    if (!bounds || !size.w || !size.h) return;
    const bw = bounds.maxX - bounds.minX || 1;
    const bh = bounds.maxY - bounds.minY || 1;
    rawFitRef.current = Math.min(size.w / bw, size.h / bh) * 0.94 || 1;
  }, [bounds, size]);

  const minFactorRef = useRef(1);
  minFactorRef.current = minZoomFactor;

  const fitRef = useRef(fitTransform);
  fitRef.current = fitTransform;

  const [view, setView] = useState<ViewTransform>({ k: 1, x: 0, y: 0 });

  // Auto-fit ao abrir / trocar setor / redimensionar.
  useEffect(() => {
    if (!hasCoords || !bounds || !size.w || !size.h) return;
    const frame = requestAnimationFrame(() => setView(fitTransform()));
    return () => cancelAnimationFrame(frame);
  }, [hasCoords, bounds, size.w, size.h, activeSector, productPath, date, fitTransform]);

  const clampK = useCallback((k: number) => {
    const base = rawFitRef.current;
    return Math.min(Math.max(k, base * minFactorRef.current), base * ZOOM_MAX_FACTOR);
  }, []);



  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      setView((v) => {
        const px = cx ?? size.w / 2;
        const py = cy ?? size.h / 2;
        const k2 = clampK(v.k * factor);
        const scale = k2 / v.k;
        return { k: k2, x: px - (px - v.x) * scale, y: py - (py - v.y) * scale };
      });
    },
    [clampK, size]
  );

  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  // Zoom pela roda do mouse (listener não-passivo para poder prevenir o scroll).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasCoords) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAtRef.current(e.deltaY < 0 ? 1.18 : 0.85, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [hasCoords]);

  // Gestos: 1 dedo = pan, 2 dedos = pinch zoom.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pendingSeatRef = useRef<SeatMapSeat | null>(null);
  const toggleSeatRef = useRef<(seat: SeatMapSeat) => void>(() => undefined);
  const gestureRef = useRef<{
    moved: boolean;
    start: { x: number; y: number };
    lastDist: number;
    lastMid: { x: number; y: number };
  } | null>(null);
  const suppressClickRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    const seatId = (e.target as Element).closest<SVGGElement>("[data-seat-id]")?.dataset.seatId;
    pendingSeatRef.current = seatId ? mappedSeats.find((seat) => seat.id === seatId) ?? null : null;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Libera um novo toque para selecionar. O bloqueio anterior só deve
    // descartar o click gerado ao final daquele gesto de arrastar/pinçar.
    suppressClickRef.current = false;
    gestureRef.current = {
      moved: false,
      start: { x: e.clientX, y: e.clientY },
      lastDist: 0,
      lastMid: { x: e.clientX, y: e.clientY },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const pts = pointersRef.current;
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId)!;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pts.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      const g = gestureRef.current;
      // Tolera a pequena oscilação natural do dedo. Antes, qualquer variação
      // acima de 2 px transformava o toque em pan e bloqueava a escolha.
      if (g && Math.hypot(e.clientX - g.start.x, e.clientY - g.start.y) > 8) g.moved = true;
      if (gestureRef.current?.moved) {
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      }
    } else if (pts.size === 2) {
      const [p1, p2] = [...pts.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const g = gestureRef.current;
      if (g) {
        if (g.lastDist > 0) {
          const rect = containerRef.current?.getBoundingClientRect();
          zoomAtRef.current(dist / g.lastDist, mid.x - (rect?.left ?? 0), mid.y - (rect?.top ?? 0));
          const mdx = mid.x - g.lastMid.x;
          const mdy = mid.y - g.lastMid.y;
          setView((v) => ({ ...v, x: v.x + mdx, y: v.y + mdy }));
        }
        g.lastDist = dist;
        g.lastMid = mid;
        g.moved = true;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const moved = gestureRef.current?.moved ?? false;
    suppressClickRef.current = moved;
    if (!moved && pendingSeatRef.current) {
      toggleSeatRef.current(pendingSeatRef.current);
      // Evita um segundo acionamento pelo evento click sintetizado do browser.
      suppressClickRef.current = true;
    }
    pendingSeatRef.current = null;
    pointersRef.current.delete(e.pointerId);
    if (gestureRef.current) {
      gestureRef.current.lastDist = 0;
      if (pointersRef.current.size === 0) gestureRef.current = null;
    }
  };

  const toggleSeat = useCallback(
    (seat: SeatMapSeat) => {
      if (suppressClickRef.current) return;
      if (seat.status !== "free") {
        toast({
          title: "Assento indisponível",
          description: `${seat.fila ? `Fila ${seat.fila}, ` : ""}assento ${seat.label} não está livre.`,
          duration: 2000,
        });
        return;
      }
      setSelected((prev) => {
        if (prev.some((s) => s.id === seat.id)) return prev.filter((s) => s.id !== seat.id);
        if (prev.length >= MAX_SEATS) {
          toast({ title: `Máximo de ${MAX_SEATS} assentos por compra`, duration: 2500 });
          return prev;
        }
        return [...prev, seat];
      });
    },
    [toast]
  );
  toggleSeatRef.current = toggleSeat;

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  const seatClass = (seat: SeatMapSeat) => "seat-dot";

  const palette: VenuePalette = venueInfo?.venue.palette ?? DEFAULT_PALETTE;

  const showLabels = view.k * seatR * 2 >= SEAT_MIN_PX * 0.72;


  // Fallback sem coordenadas: grade agrupada por fila.
  const gridRows = useMemo(() => {
    if (hasCoords) return [] as [string, SeatMapSeat[]][];
    const map = new Map<string, SeatMapSeat[]>();
    for (const s of sector?.seats ?? []) {
      const key = s.fila ?? "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (parseInt(a.lugar ?? a.label) || 0) - (parseInt(b.lugar ?? b.label) || 0));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [hasCoords, sector]);

  const totalCents = selected.length * priceCents;
  const fmt = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const isRecoveringEmptyResponse =
    spacesQuery.isSuccess && sectors.length === 0 && emptyResponseRetries < 2;
  const isLoading =
    spacesQuery.isLoading || (spacesQuery.isFetching && !spacesQuery.data) || isRecoveringEmptyResponse;
  const isError = spacesQuery.isError && !spacesQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 w-full h-[100dvh] max-w-none rounded-none sm:max-w-3xl sm:h-[88vh] lg:max-w-5xl lg:h-[90vh] sm:rounded-xl overflow-hidden flex flex-col [&>div:nth-child(2)]:flex [&>div:nth-child(2)]:min-h-0 [&>div:nth-child(2)]:flex-1 [&>div:nth-child(2)]:flex-col">
        <DialogTitle className="sr-only">Escolha de assentos — {productName}</DialogTitle>
        <DialogDescription className="sr-only">
          Mapa interativo para escolher os assentos numerados do evento.
        </DialogDescription>

        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-border bg-background shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground leading-tight line-clamp-1">
                Escolha seus assentos
              </h2>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {productName}
                {dateLabel ? ` · ${dateLabel}` : ` · ${date}`}
              </p>
              {sector && (
                <p className="text-[11px] mt-1 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
                  </span>
                  <span className="font-semibold text-foreground">{sector.free}</span>
                  <span className="text-muted-foreground">
                    de {sector.total} lugares livres agora
                    {spacesQuery.isFetching ? " · atualizando…" : ""}
                  </span>
                </p>
              )}
            </div>

            <button
              type="button"
              aria-label="Fechar"
              onClick={() => onOpenChange(false)}
              className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Abas de setor (quando a API retorna mais de um) */}
          {sectors.length > 1 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
              {sectors.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setActiveSector(i)}
                  className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    i === activeSector
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {s.name} · {s.free} livres
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border-b border-border bg-background shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-2.5 sm:gap-4 overflow-x-auto scrollbar-hide">
            {[
              { label: "Livre", color: palette?.free },
              { label: "Selecionado", color: palette?.selected },
              { label: "Reservado", color: palette?.reserved },
              { label: "Ocupado", color: palette?.occupied },
              { label: "Bloqueado", color: palette?.blocked },
            ].map((item) => (
              <span
                key={item.label}
                className="flex shrink-0 items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground whitespace-nowrap"
              >
                <span
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full inline-block shrink-0"
                  style={item.color ? { background: item.color } : undefined}
                />
                {item.label}
              </span>
            ))}
          </div>
          {hasCoords && (
            <div className="shrink-0 flex items-center gap-0.5 sm:gap-1 pl-2 border-l border-border">
              <button
                type="button"
                aria-label="Diminuir zoom"
                onClick={() => zoomAt(0.8)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                aria-label="Aumentar zoom"
                onClick={() => zoomAt(1.25)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                aria-label="Ajustar mapa à tela"
                onClick={() => setView(fitRef.current())}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>


        {/* Corpo: mapa / grade / loading / erro */}
        <div className="flex-1 min-h-0 relative bg-zinc-950">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando mapa de assentos…</p>
              {spacesQuery.failureCount > 0 && (
                <p className="text-xs text-muted-foreground/70">
                  A API está limitando requisições, aguarde alguns segundos…
                </p>
              )}
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <p className="text-sm font-semibold text-foreground">Não foi possível carregar o mapa</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {spacesQuery.error?.message || "Tente novamente em instantes."}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Button size="sm" onClick={() => spacesQuery.refetch()}>
                  Tentar novamente
                </Button>
                {onFallback && (
                  <Button size="sm" variant="outline" onClick={onFallback}>
                    Continuar sem escolher assento
                  </Button>
                )}
              </div>
            </div>
          )}

          {!isLoading && !isError && hasCoords && bounds && (
            <div
              ref={containerRef}
              className="absolute inset-0 overflow-hidden touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <svg width="100%" height="100%" className="block" aria-label={`Mapa com ${mappedSeats.length} assentos`}>
                <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                  {!apiLayout && venueInfo && (
                    <VenueLayer venue={venueInfo.venue} activeSectorId={venueInfo.sector.id} dimInactive={false} />
                  )}
                  {apiLayout?.stage && (
                    <g>
                      <rect
                        x={apiLayout.stage.x - seatR * 8}
                        y={apiLayout.stage.y - seatR * 1.6}
                        width={seatR * 16}
                        height={seatR * 3.2}
                        rx={seatR}
                        fill="#27272a"
                        stroke="#52525b"
                        strokeWidth={seatR * 0.12}
                      />
                      <text
                        x={apiLayout.stage.x}
                        y={apiLayout.stage.y + seatR * 0.6}
                        textAnchor="middle"
                        fontSize={seatR * 1.6}
                        fill="#e4e4e7"
                        style={{ pointerEvents: "none" }}
                      >
                        PALCO
                      </text>
                    </g>
                  )}
                  {mappedSeats.map((seat) => (
                    <g key={seat.id} data-seat-id={seat.id} style={{ cursor: seat.status === "free" ? "pointer" : "not-allowed" }}>
                      <circle
                        cx={seat.x as number}
                        cy={seat.y as number}
                        r={seatR}
                        className={seatClass(seat)}
                        fill={seatFill(seat, selectedIds.has(seat.id), palette)}
                        fillOpacity={seat.status === "free" || selectedIds.has(seat.id) ? 1 : 0.55}
                        stroke={selectedIds.has(seat.id) ? "#ffffff" : undefined}
                        strokeWidth={selectedIds.has(seat.id) ? seatR * 0.25 : undefined}
                      />
                      {showLabels && (
                        <text
                          x={seat.x as number}
                          y={(seat.y as number) + seatR * 0.32}
                          textAnchor="middle"
                          fontSize={seatR * 0.85}
                          className="seat-label"
                          style={{ pointerEvents: "none" }}
                        >
                          {seat.lugar ?? seat.label}
                        </text>
                      )}
                    </g>
                  ))}
                </g>
              </svg>

            </div>
          )}

          {!isLoading && !isError && !hasCoords && gridRows.length > 0 && (
            <div className="absolute inset-0 overflow-y-auto bg-background p-4 space-y-4">
              {gridRows.map(([fila, seats]) => (
                <div key={fila}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Fila {fila}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {seats.map((seat) => {
                      const isSel = selectedIds.has(seat.id);
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={seat.status !== "free" && !isSel}
                          onClick={() => toggleSeat(seat)}
                          className={`min-w-[40px] h-9 px-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                            isSel
                              ? "bg-[#f97316] text-white"
                              : seat.status === "free"
                                ? "bg-[#22c55e] text-white hover:bg-[#16a34a]"
                                : seat.status === "blocked"
                                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                  : "bg-[#7c3aed] text-white/70 cursor-not-allowed"
                          }`}
                        >
                          {seat.lugar ?? seat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && sectors.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <p className="text-sm font-semibold text-foreground">
                Não há sessão com assentos numerados em {dateLabel ?? date}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Escolha outra data do evento no calendário para ver o mapa de lugares, ou siga sem
                escolher assento — o sistema marcará automaticamente.
              </p>
              {availableDates.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 max-w-sm">
                  {availableDates.map((d) => (
                    <span
                      key={d}
                      className="text-[11px] font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
              {onFallback && (
                <Button size="sm" variant="outline" onClick={onFallback}>
                  Continuar sem escolher assento
                </Button>
              )}
            </div>
          )}

        </div>

        {/* Footer: assentos selecionados + ações */}
        <div className="border-t border-border bg-background px-3 sm:px-4 py-2.5 sm:py-3 shrink-0 space-y-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:pb-3">
          {selected.length > 0 ? (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {selected.map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  onClick={() => toggleSeat(seat)}
                  className="whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/40 hover:bg-[#f97316]/25 transition-colors"
                >
                  {seat.fila ? `Fila ${seat.fila} · ` : ""}
                  {seat.lugar ?? seat.label} ✕
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Toque nos assentos verdes do mapa para selecionar.
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2">
            {onFallback && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground shrink-0 w-full sm:w-auto"
                onClick={onFallback}
              >
                Sem escolher assento
              </Button>
            )}
            <Button
              className="flex-1 h-11 gap-2 text-xs sm:text-sm px-3"
              disabled={selected.length === 0}
              onClick={() => onConfirm(selected)}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {selected.length > 0
                  ? `Adicionar ${selected.length} assento${selected.length > 1 ? "s" : ""} · ${fmt(totalCents)}`
                  : "Selecione um assento"}
              </span>
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default SeatMapModal;
