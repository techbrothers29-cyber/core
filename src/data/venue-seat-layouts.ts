import type { SeatMapSeat } from "@/hooks/useNovaxsSpaces";

/**
 * Plantas dos mapas de assentos construídas pelo Bah Ofertas.
 *
 * A ParksNet entrega apenas o inventário (fila/lugar/status/IDs) via getSpaces —
 * o desenho do mapa (setores, lago, arquibancadas) é montado do nosso lado,
 * com base nas imagens oficiais do site do Natal Luz.
 */

export type VenueId = "nativitaten" | "desfile";

export interface VenueSectorDef {
  id: string;
  label: string;
  /** Cor oficial do setor no mapa do Natal Luz. */
  color: string;
  /** Se o setor é vendido via API (os demais são apenas informativos). */
  sellable: boolean;
  /** Casa com o nome do produto NovaXS (ex.: "NATIVITATEN - SETOR VIP - ADULTO"). */
  productMatch: RegExp;
}

export interface VenuePalette {
  free: string;
  reserved: string;
  selected: string;
  occupied: string;
  blocked: string;
}

export interface VenueDef {
  id: VenueId;
  viewBox: { w: number; h: number };
  palette: VenuePalette;
  sectors: VenueSectorDef[];
}

// ---------------------------------------------------------------------------
// NATIVITATEN — Serra Park: palco na beira do lago, setores em arco (VIP vermelho,
// OURO amarelo, PRATA cinza) + TEA roxo e PCD azul-petróleo (não vendidos na API).
// ---------------------------------------------------------------------------

export const NATIVITATEN_VENUE: VenueDef = {
  id: "nativitaten",
  viewBox: { w: 420, h: 330 },
  palette: {
    free: "#22c55e",
    reserved: "#eab308",
    selected: "#f97316",
    occupied: "#ef4444",
    blocked: "#18181b",
  },
  // Os nomes NovaXS seguem o padrão "Nativitaten - <SETOR> - <tipo> - 20:00",
  // então casamos o SEGMENTO do setor (entre hífens) para não confundir
  // "Ouro - PCD (Não Cadeirante)" (setor Ouro) com "Ouro PCD" (setor PCD).
  sectors: [
    { id: "vip", label: "VIP", color: "#e63946", sellable: true, productMatch: /(?:^|[-–])\s*(?:setor\s*)?vip\s*(?:[-–]|$)/i },
    { id: "ouro", label: "Ouro", color: "#eab308", sellable: true, productMatch: /(?:^|[-–])\s*(?:setor\s*)?ouro\s*(?:[-–]|$)/i },
    { id: "prata-1", label: "Prata 1", color: "#9ca3af", sellable: true, productMatch: /(?:^|[-–])\s*(?:setor\s*)?prata(?:\s*1)?\s*(?:[-–]|$)/i },
    { id: "prata-2", label: "Prata 2", color: "#9ca3af", sellable: true, productMatch: /(?:^|[-–])\s*(?:setor\s*)?prata\s*2\s*(?:[-–]|$)/i },
    { id: "ouro-pcd", label: "Ouro PCD", color: "#36a9b4", sellable: true, productMatch: /(?:^|[-–])\s*(?:setor\s*)?ouro\s*pcd\s*(?:[-–]|$)/i },
    { id: "prata-1-pcd", label: "Prata 1 PCD", color: "#36a9b4", sellable: true, productMatch: /(?:^|[-–])\s*(?:setor\s*)?prata\s*1?\s*pcd\s*(?:[-–]|$)/i },
    { id: "prata-2-pcd", label: "Prata 2 PCD", color: "#36a9b4", sellable: true, productMatch: /(?:^|[-–])\s*(?:setor\s*)?prata\s*2\s*pcd\s*(?:[-–]|$)/i },
    { id: "tea", label: "TEA", color: "#8b5cf6", sellable: true, productMatch: /\btea\b/i },
  ],



};

// ---------------------------------------------------------------------------
// O GRANDE DESFILE DE NATAL — mapa HORIZONTAL: avenida no centro, arquibancadas
// B/A (rosa) acima e C/D abaixo, cadeiras (verde) junto à avenida + TEA roxo
// (esquerda) e EXPERIENCE vermelho (direita) — não vendidos na API.
// ---------------------------------------------------------------------------

export const DESFILE_VENUE: VenueDef = {
  id: "desfile",
  viewBox: { w: 480, h: 300 },
  palette: {
    free: "#2563eb",
    reserved: "#eab308",
    selected: "#f97316",
    occupied: "#a855f7",
    blocked: "#18181b",
  },
  // Setores individuais: arquibancadas A–D (venda livre, sem assento numerado)
  // e cadeiras A–D (assentos numerados via getSpaces).
  sectors: [
    { id: "arq-b", label: "Arquibancada B", color: "#ec5fa8", sellable: true, productMatch: /arquibancada\s*b\b/i },
    { id: "arq-a", label: "Arquibancada A", color: "#ec5fa8", sellable: true, productMatch: /arquibancada\s*a\b/i },
    { id: "arq-c", label: "Arquibancada C", color: "#ec5fa8", sellable: true, productMatch: /arquibancada\s*c\b/i },
    { id: "arq-d", label: "Arquibancada D", color: "#ec5fa8", sellable: true, productMatch: /arquibancada\s*d\b/i },
    { id: "cad-b", label: "Cadeiras B", color: "#22c55e", sellable: true, productMatch: /cadeiras?\s*b\b/i },
    { id: "cad-a", label: "Cadeiras A", color: "#22c55e", sellable: true, productMatch: /cadeiras?\s*a\b/i },
    { id: "cad-c", label: "Cadeiras C", color: "#22c55e", sellable: true, productMatch: /cadeiras?\s*c\b/i },
    { id: "cad-d", label: "Cadeiras D", color: "#22c55e", sellable: true, productMatch: /cadeiras?\s*d\b/i },
    { id: "tea", label: "TEA", color: "#8b5cf6", sellable: true, productMatch: /\btea\b/i },
  ],
};


export const VENUES: Record<VenueId, VenueDef> = {
  nativitaten: NATIVITATEN_VENUE,
  desfile: DESFILE_VENUE,
};

/** Identifica o venue e o setor a partir do nome do produto NovaXS. */
export function detectVenueFromProduct(productName: string): { venue: VenueDef; sector: VenueSectorDef } | null {
  const name = productName.toLowerCase();
  if (name.includes("nativitaten")) {
    const sector = NATIVITATEN_VENUE.sectors.find((s) => s.sellable && s.productMatch.test(productName));
    return sector ? { venue: NATIVITATEN_VENUE, sector } : null;
  }
  if (name.includes("desfile") || name.includes("natal luz")) {
    const sector = DESFILE_VENUE.sectors.find((s) => s.sellable && s.productMatch.test(productName));
    return sector ? { venue: DESFILE_VENUE, sector } : null;
  }
  return null;
}

/** Identifica o venue a partir do nome/id do estabelecimento. */
export function detectVenueFromEstablishment(est?: { id?: string; displayName?: string; name?: string } | null): VenueDef | null {
  if (!est) return null;
  const label = `${est.id || ""} ${est.displayName || ""} ${est.name || ""}`.toLowerCase();
  if (label.includes("nativitaten")) return NATIVITATEN_VENUE;
  if (label.includes("desfile") || label.includes("natal-luz") || label.includes("natal luz")) return DESFILE_VENUE;
  return null;
}

// ---------------------------------------------------------------------------
// Posicionamento dos assentos sobre a geometria do mapa.
// ---------------------------------------------------------------------------

export interface PositionedSeat extends SeatMapSeat {
  x: number;
  y: number;
}

const SEAT_GAP = 1.05; // espaçamento entre assentos (unidades do mapa)

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Agrupa assentos por fila (ou fatia em fileiras quando a API não informa). */
function groupRows(seats: SeatMapSeat[], fallbackSize: number): SeatMapSeat[][] {
  const byFila = new Map<string, SeatMapSeat[]>();
  let hasFila = false;
  for (const s of seats) {
    if (s.fila) hasFila = true;
    const key = s.fila ?? "—";
    if (!byFila.has(key)) byFila.set(key, []);
    byFila.get(key)!.push(s);
  }
  const num = (s: SeatMapSeat) => parseInt(s.lugar ?? s.label, 10) || 0;
  if (hasFila) {
    const rows = [...byFila.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
    return rows.map(([, arr]) => arr.sort((a, b) => num(a) - num(b)));
  }
  const sorted = [...seats].sort((a, b) => num(a) - num(b));
  const rows: SeatMapSeat[][] = [];
  for (let i = 0; i < sorted.length; i += fallbackSize) rows.push(sorted.slice(i, i + fallbackSize));
  return rows;
}

/**
 * NATIVITATEN — fileiras curvas acompanhando a beira do lago.
 * Centro do arco ≈ centro do lago (232, 196). VIP fica rente ao lago,
 * OURO na faixa externa superior e PRATA na faixa externa esquerda.
 */
const NAT_ARC: Record<string, { cx: number; cy: number; r0: number; rowGap: number; a0: number; a1: number; perRow: number }> = {
  vip:   { cx: 232, cy: 196, r0: 106, rowGap: 7.5, a0: 192, a1: 282, perRow: 44 },
  ouro:  { cx: 232, cy: 196, r0: 128, rowGap: 9,   a0: 178, a1: 288, perRow: 52 },
  prata: { cx: 232, cy: 196, r0: 122, rowGap: 9,   a0: 132, a1: 176, perRow: 30 },
};

/**
 * DESFILE — mapa horizontal (avenida no centro). Cada setor tem a sua própria
 * zona: arquibancadas B/A acima e C/D abaixo; cadeiras coladas na avenida.
 */
const DESFILE_ZONES: Record<string, { x: number; y: number; w: number; h: number; rowGap: number; perRow: number }[]> = {
  "arq-b": [{ x: 64, y: 60, w: 190, h: 40, rowGap: 8, perRow: 40 }],
  "arq-a": [{ x: 268, y: 60, w: 150, h: 40, rowGap: 8, perRow: 34 }],
  "arq-c": [{ x: 40, y: 188, w: 195, h: 44, rowGap: 8, perRow: 40 }],
  "arq-d": [{ x: 262, y: 188, w: 145, h: 44, rowGap: 8, perRow: 34 }],
  "cad-b": [{ x: 64, y: 104, w: 190, h: 12, rowGap: 6, perRow: 46 }],
  "cad-a": [{ x: 268, y: 104, w: 150, h: 12, rowGap: 6, perRow: 38 }],
  "cad-c": [{ x: 40, y: 172, w: 195, h: 12, rowGap: 6, perRow: 46 }],
  "cad-d": [{ x: 262, y: 172, w: 145, h: 12, rowGap: 6, perRow: 38 }],
};




/**
 * Gera as coordenadas (x, y) de cada assento dentro do mapa do venue.
 * Casa por fila quando a API informa; senão distribui sequencialmente.
 */
export function positionSeatsForSector(venue: VenueDef, sectorId: string, seats: SeatMapSeat[]): PositionedSeat[] {
  if (!seats.length) return [];

  if (venue.id === "nativitaten") {
    const cfg = NAT_ARC[sectorId];
    if (!cfg) return [];
    const rows = groupRows(seats, cfg.perRow);
    const out: PositionedSeat[] = [];
    rows.forEach((row, ri) => {
      const r = cfg.r0 + ri * cfg.rowGap;
      const n = row.length;
      row.forEach((seat, si) => {
        const t = n === 1 ? 0.5 : si / (n - 1);
        const deg = cfg.a0 + t * (cfg.a1 - cfg.a0);
        const { x, y } = polar(cfg.cx, cfg.cy, r, deg);
        out.push({ ...seat, x, y });
      });
    });
    return out;
  }

  // Desfile: fileiras retas dentro das zonas do setor.
  const zones = DESFILE_ZONES[sectorId];
  if (!zones) return [];
  const rows = groupRows(seats, zones[0].perRow);
  const out: PositionedSeat[] = [];
  // Distribui as fileiras pelas zonas em ordem (enche uma zona antes da próxima).
  let zoneIdx = 0;
  let rowInZone = 0;
  // Quantas fileiras cabem na zona conforme a altura disponível.
  const rowsPerZone = (z: (typeof zones)[number]) => Math.max(1, Math.floor(z.h / z.rowGap));
  for (const row of rows) {
    const zone = zones[Math.min(zoneIdx, zones.length - 1)];
    const n = row.length;
    const y = zone.y + zone.rowGap / 2 + rowInZone * zone.rowGap;
    row.forEach((seat, si) => {
      const t = n === 1 ? 0.5 : si / (n - 1);
      const x = zone.x + 4 + t * (zone.w - 8);
      out.push({ ...seat, x, y });
    });
    rowInZone += 1;
    if (rowInZone >= rowsPerZone(zone) && zoneIdx < zones.length - 1) {
      zoneIdx += 1;
      rowInZone = 0;
    }
  }
  return out;
}

/**
 * Layout REAL vindo da API (getSpaces já devolve x/y de cada assento).
 * Preferimos sempre esse desenho — é o mesmo mapa físico do ParksNet,
 * atualizado em tempo real com o status de cada lugar.
 */
export interface ApiSeatLayout {
  seats: PositionedSeat[];
  radius: number;
  stage: { x: number; y: number } | null;
}

/** Verdadeiro quando a API entregou coordenadas para (quase) todos os assentos. */
export function hasApiCoords(seats: SeatMapSeat[]): boolean {
  if (!seats.length) return false;
  const withCoords = seats.filter((s) => s.x !== null && s.y !== null).length;
  return withCoords / seats.length >= 0.8;
}

/**
 * Converte as coordenadas do ParksNet para o espaço da tela (y invertido)
 * e calcula o raio ideal do assento + a posição do palco/avenida.
 */
export function layoutSeatsFromApi(seats: SeatMapSeat[]): ApiSeatLayout {
  const valid = seats.filter((s) => s.x !== null && s.y !== null);
  const positioned: PositionedSeat[] = valid.map((s) => ({ ...s, x: s.x as number, y: -(s.y as number) }));
  if (!positioned.length) return { seats: [], radius: 0.4, stage: null };

  // Agrupa por fila preservando a ordem de lugar para medir o espaçamento real.
  const rows = new Map<string, PositionedSeat[]>();
  for (const s of positioned) {
    const key = s.fila ?? "—";
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key)!.push(s);
  }
  const num = (s: PositionedSeat) => parseInt(s.lugar ?? s.label, 10) || 0;
  const gaps: number[] = [];
  for (const arr of rows.values()) {
    arr.sort((a, b) => num(a) - num(b));
    for (let i = 1; i < arr.length; i++) {
      const d = Math.hypot(arr[i].x - arr[i - 1].x, arr[i].y - arr[i - 1].y);
      if (d > 0.0001) gaps.push(d);
    }
  }
  gaps.sort((a, b) => a - b);
  const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 1;
  const radius = Math.max(median * 0.42, 0.05);

  // Palco/avenida: extrapola da última fila em direção à primeira.
  const keys = [...rows.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  let stage: { x: number; y: number } | null = null;
  if (keys.length >= 2) {
    const centroid = (k: string) => {
      const arr = rows.get(k)!;
      return {
        x: arr.reduce((t, s) => t + s.x, 0) / arr.length,
        y: arr.reduce((t, s) => t + s.y, 0) / arr.length,
      };
    };
    const first = centroid(keys[0]);
    const last = centroid(keys[keys.length - 1]);
    const dx = first.x - last.x;
    const dy = first.y - last.y;
    const len = Math.hypot(dx, dy) || 1;
    const step = median * 6;
    stage = { x: first.x + (dx / len) * step, y: first.y + (dy / len) * step };
  }

  return { seats: positioned, radius, stage };
}

/** Cor do assento conforme status + paleta oficial do venue. */
export function seatFill(seat: SeatMapSeat, selected: boolean, palette: VenuePalette): string {
  if (selected) return palette.selected;
  if (seat.status === "free") return palette.free;
  if (seat.status === "reserved") return palette.reserved;
  if (seat.status === "blocked") return palette.blocked;
  return palette.occupied;
}
