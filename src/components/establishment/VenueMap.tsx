import React from "react";
import type { VenueDef, VenueSectorDef } from "@/data/venue-seat-layouts";

/**
 * Mapas SVG dos venues do Natal Luz (desenhados pelo Bah Ofertas com base nas
 * imagens oficiais do site natalluzdegramado.com.br — a ParksNet não entrega o
 * desenho do mapa, apenas o inventário de assentos).
 *
 * Dois usos:
 * - `VenueLayer`: camada <g> para ser embutida no SVG com pan/zoom do SeatMapModal.
 * - `VenueSectorMap`: SVG completo e clicável para a página do estabelecimento
 *   (seleção de setor antes da escolha do produto).
 */

// ---------------------------------------------------------------------------
// Helpers geométricos
// ---------------------------------------------------------------------------

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** Faixa anular (arco com espessura) entre os ângulos a0→a1. */
function annularPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

// ---------------------------------------------------------------------------
// NATIVITATEN — réplica do mapa oficial: lago do Serra Park (azul claro) com a
// silhueta do palco/carrossel ao centro e os setores em arco na margem esquerda
// (PRATA 1, VIP, OURO, PRATA 2), com os três módulos PCD azul-petróleo.
// ---------------------------------------------------------------------------

const NAT_CX = 232;
const NAT_CY = 196;

/** Contorno do lago do Serra Park (traçado a partir do mapa oficial). */
const NAT_LAKE_PATH =
  "M207 72 C224 62 244 59 260 66 C286 76 305 99 319 126 C331 151 338 181 330 207 C320 239 302 266 277 289 C257 307 239 320 222 323 C214 324 209 316 204 303 C195 281 177 263 166 242 C153 217 148 186 151 157 C155 122 172 91 207 72 Z";

type NatCallout = { x: number; y: number; w: number; anchor: [number, number]; elbow?: [number, number] };

/** Faixas dos setores: curvas espessas acompanhando a margem esquerda do lago. */
const NAT_SECTOR_SHAPES: Record<
  string,
  {
    bands?: { d: string; w: number }[];
    rect?: { x: number; y: number; w: number; h: number; rotate?: number };
    callouts?: { text: string; box: NatCallout }[];
  }
> = {
  "prata-1": {
    bands: [{ d: "M120 224 C119 195 123 164 137 135", w: 25 }],
    callouts: [{ text: "PRATA 1", box: { x: 12, y: 174, w: 80, anchor: [119, 184] } }],
  },
  "prata-2": {
    bands: [{ d: "M211 44 C235 36 263 37 285 50", w: 25 }],
    callouts: [{ text: "PRATA 2", box: { x: 306, y: 22, w: 82, anchor: [282, 48] } }],
  },

  ouro: {
    bands: [{ d: "M137 132 C151 101 174 73 204 55", w: 25 }],
    callouts: [{ text: "OURO", box: { x: 40, y: 82, w: 68, anchor: [148, 101] } }],
  },
  vip: {
    bands: [{ d: "M145 155 C158 126 178 99 204 80", w: 10 }],
    callouts: [{ text: "VIP", box: { x: 230, y: 75, w: 54, anchor: [204, 80] } }],
  },
  "prata-1-pcd": {
    rect: { x: 128, y: 188, w: 9, h: 15, rotate: 2 },
    callouts: [{ text: "PRATA 1 PCD", box: { x: 12, y: 202, w: 102, anchor: [133, 195] } }],
  },
  "ouro-pcd": {
    rect: { x: 151, y: 83, w: 11, h: 16, rotate: 35 },
    callouts: [{ text: "OURO PCD", box: { x: 30, y: 104, w: 86, anchor: [157, 91] } }],
  },
  "prata-2-pcd": {
    rect: { x: 267, y: 57, w: 12, h: 16, rotate: 20 },
    callouts: [{ text: "PRATA 2 PCD", box: { x: 306, y: 46, w: 104, anchor: [273, 65] } }],
  },
  tea: {
    rect: { x: 120, y: 232, w: 23, h: 8, rotate: -4 },
    callouts: [{ text: "TEA", box: { x: 54, y: 231, w: 58, anchor: [121, 235] } }],
  },
};





// ---------------------------------------------------------------------------
// DESFILE — mapa horizontal (igual ao oficial): avenida no centro,
// arquibancadas B/A acima, C/D abaixo, cadeiras junto à avenida.
// ---------------------------------------------------------------------------

/** Blocos de arquibancada (B | A em cima, C | D embaixo) — igual ao mapa oficial. */
const DESFILE_BLOCKS: Record<string, { x: number; y: number; w: number; h: number; letter: string; labelY: number }> = {
  "arq-b": { x: 64, y: 60, w: 190, h: 40, letter: "B", labelY: 52 },
  "arq-a": { x: 268, y: 60, w: 150, h: 40, letter: "A", labelY: 52 },
  "arq-c": { x: 40, y: 188, w: 195, h: 44, letter: "C", labelY: 248 },
  "arq-d": { x: 262, y: 188, w: 145, h: 44, letter: "D", labelY: 248 },
};

/** Faixas de cadeiras (verdes) coladas na avenida. */
const DESFILE_CADEIRA_STRIPS: Record<string, { x: number; y: number; w: number; h: number; letter: string }> = {
  "cad-b": { x: 64, y: 104, w: 190, h: 12, letter: "B" },
  "cad-a": { x: 268, y: 104, w: 150, h: 12, letter: "A" },
  "cad-c": { x: 40, y: 172, w: 195, h: 12, letter: "C" },
  "cad-d": { x: 262, y: 172, w: 145, h: 12, letter: "D" },
};




// ---------------------------------------------------------------------------
// Camada do venue (para dentro de um <svg>)
// ---------------------------------------------------------------------------

export interface VenueLayerProps {
  venue: VenueDef;
  activeSectorId?: string | null;
  onSectorClick?: (sectorId: string) => void;
  /** Quando true, setores inativos ficam esmaecidos. */
  dimInactive?: boolean;
}

function SectorShape({
  venue,
  sector,
  activeSectorId,
  onSectorClick,
  dimInactive,
  children,
}: VenueLayerProps & { sector: VenueSectorDef; children: React.ReactNode }) {
  const isActive = activeSectorId === sector.id;
  const dimmed = dimInactive && activeSectorId && !isActive;
  return (
    <g
      onClick={sector.sellable && onSectorClick ? () => onSectorClick(sector.id) : undefined}
      style={{ cursor: sector.sellable && onSectorClick ? "pointer" : "default" }}
      opacity={dimmed ? 0.3 : 1}
    >
      {children}
      {isActive && (
        // contorno de destaque no setor ativo
        <g pointerEvents="none">{null}</g>
      )}
    </g>
  );
}

export function VenueLayer({ venue, activeSectorId, onSectorClick, dimInactive = true }: VenueLayerProps) {
  if (venue.id === "nativitaten") {
    return (
      <g>
        {/* Fundo limpo (igual ao mapa oficial) */}
        <rect x={0} y={0} width={venue.viewBox.w} height={venue.viewBox.h} fill="#ffffff" rx={10} />

        {/* Lago do Serra Park */}
        <path d={NAT_LAKE_PATH} fill="#bfe6f5" />

        {/* Silhueta do palco / carrossel ao centro do lago */}
        <g fill="#050505" stroke="#050505" transform="translate(245 177)">
          <circle cx={0} cy={9} r={25} stroke="none" />
          <path d="M-7 -16 L-32 -42 L-27 -47 L0 -18 Z" stroke="none" />
          <circle cx={-35} cy={-47} r={8} stroke="none" />
          <path d="M-29 -52 C-17 -67 3 -68 16 -65 L15 -58 C3 -61 -11 -59 -23 -46 Z" stroke="none" />
          <path d="M-48 -16 Q-47 -43 -34 -57" fill="none" strokeWidth={6} />
          <path d="M-32 -9 L-9 -28 L-5 -24 L-28 -4 Z" stroke="none" />
          <path d="M-28 -9 V-35 M-28 -9 H-49 M-49 -9 V-29 M-28 -35 H22 M22 -35 V-59" fill="none" strokeWidth={5} />
          <polygon points="-28,-43 -35,-35 -28,-27 -21,-35" stroke="none" />
          <polygon points="-49,-37 -56,-29 -49,-21 -42,-29" stroke="none" />
          <polygon points="22,-67 15,-58 22,-49 29,-58" stroke="none" />
          <path d="M-15 29 L52 -38 L64 -26 L-3 41 Z" stroke="none" />
          <path d="M9 31 L36 58 L47 47 L21 21 Z" stroke="none" />
          <path d="M-5 30 L7 43 L16 34 L4 22 Z" stroke="none" />
        </g>



        {/* Setores */}
        {venue.sectors.map((sector) => {
          const shape = NAT_SECTOR_SHAPES[sector.id];
          if (!shape) return null;
          const isActive = activeSectorId === sector.id;
          const dimmed = dimInactive && activeSectorId && !isActive;
          const clickable = sector.sellable && onSectorClick;
          return (
            <g
              key={sector.id}
              onClick={clickable ? () => onSectorClick!(sector.id) : undefined}
              style={{ cursor: clickable ? "pointer" : "default" }}
              opacity={dimmed ? 0.3 : 1}
            >
              {shape.bands?.map((band, i) => (
                <g key={i}>
                  {isActive && (
                    <path
                      d={band.d}
                      fill="none"
                      stroke="#111827"
                      strokeWidth={band.w + 4}
                      strokeLinecap="butt"
                    />
                  )}
                   <path d={band.d} fill="none" stroke={sector.color} strokeWidth={band.w} strokeLinecap="butt" />
                   {clickable && (
                     // Área de toque ampliada (mobile): faixa invisível mais grossa
                     <path
                       d={band.d}
                       fill="none"
                       stroke="transparent"
                       strokeWidth={Math.max(band.w + 12, 16)}
                       strokeLinecap="round"
                       pointerEvents="stroke"
                     />
                   )}
                 </g>
               ))}

              {shape.rect && (
                <rect
                  x={shape.rect.x}
                  y={shape.rect.y}
                  width={shape.rect.w}
                  height={shape.rect.h}
                   rx={shape.rect.w > 15 ? 4 : 0}
                  fill={sector.color}
                   stroke="#ffffff"
                   strokeWidth={shape.rect.w > 15 ? 0 : 2}
                  transform={
                    shape.rect.rotate
                      ? `rotate(${shape.rect.rotate} ${shape.rect.x + shape.rect.w / 2} ${shape.rect.y + shape.rect.h / 2})`
                      : undefined
                  }
                 />
               )}
               {shape.rect && clickable && (
                 <rect
                   x={shape.rect.x + shape.rect.w / 2 - Math.max(shape.rect.w, 18) / 2}
                   y={shape.rect.y + shape.rect.h / 2 - Math.max(shape.rect.h, 18) / 2}
                   width={Math.max(shape.rect.w, 18)}
                   height={Math.max(shape.rect.h, 18)}
                   fill="transparent"
                   transform={
                     shape.rect.rotate
                       ? `rotate(${shape.rect.rotate} ${shape.rect.x + shape.rect.w / 2} ${shape.rect.y + shape.rect.h / 2})`
                       : undefined
                   }
                 />
               )}

               {/* Balões de identificação com linha-guia */}
              {shape.callouts?.map((c) => {
                const box = c.box;
                const h = 22;
                const cy = box.y + h / 2;
                const boxSide = box.anchor[0] > box.x ? box.x + box.w : box.x;
                const points = c.box.elbow
                  ? `${boxSide},${cy} ${c.box.elbow[0]},${cy} ${box.anchor[0]},${box.anchor[1]}`
                  : `${boxSide},${cy} ${box.anchor[0]},${box.anchor[1]}`;
                return (
                  <g key={c.text} pointerEvents="none">
                    <polyline points={points} fill="none" stroke="#c7cbd1" strokeWidth={1.6} />
                    <circle cx={box.anchor[0]} cy={box.anchor[1]} r={3.4} fill={sector.color} />
                    <rect
                      x={box.x}
                      y={box.y}
                      width={box.w}
                      height={h}
                      rx={11}
                      fill="#ffffff"
                      stroke="#e3e6ea"
                      strokeWidth={1.4}
                    />
                    <circle cx={box.x + 13} cy={cy} r={4.2} fill={sector.color} />
                    <text
                      x={box.x + 23}
                      y={cy + 3.6}
                      fontSize={10}
                      fontWeight={700}
                      fill="#1f2937"
                      letterSpacing={0.4}
                    >
                      {c.text}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    );

  }

  // Desfile — mapa horizontal igual ao oficial: avenida ao centro,
  // arquibancadas B/A acima e C/D abaixo, cadeiras coladas na avenida.
  return (
    <g>
      {/* Fundo */}
      <rect x={0} y={0} width={venue.viewBox.w} height={venue.viewBox.h} fill="#ffffff" rx={10} />

      {/* Avenida do desfile (horizontal, no centro) */}
      <rect x={30} y={122} width={390} height={48} fill="#f7f6f2" />
      <line x1={36} y1={146} x2={414} y2={146} stroke="#dcd8cc" strokeWidth={1.4} strokeDasharray="9 8" />
      <text x={225} y={140} textAnchor="middle" fontSize={7.5} fontWeight={800} fill="#b3ae9c" letterSpacing={2.4}>
        AVENIDA DO DESFILE
      </text>

      {/* Corredor de acesso central (entre C e D) */}
      <line x1={248} y1={168} x2={248} y2={236} stroke="#d9d5c8" strokeWidth={1.4} />
      <text
        x={244}
        y={202}
        textAnchor="middle"
        fontSize={7.5}
        fontWeight={800}
        fill="#8a8570"
        letterSpacing={1.6}
        transform="rotate(-90 244 202)"
      >
        ACESSO
      </text>

      {/* Setores: arquibancadas A–D (blocos) e cadeiras A–D (faixas) */}
      {venue.sectors.map((sector) => {
        const isActive = activeSectorId === sector.id;
        const dimmed = dimInactive && activeSectorId && !isActive;
        const clickable = sector.sellable && onSectorClick;
        const common = {
          onClick: clickable ? () => onSectorClick!(sector.id) : undefined,
          style: { cursor: clickable ? "pointer" : "default" } as React.CSSProperties,
          opacity: dimmed ? 0.35 : 1,
        };

        const block = DESFILE_BLOCKS[sector.id];
        if (block) {
          return (
            <g key={sector.id} {...common}>
              <rect
                x={block.x}
                y={block.y}
                width={block.w}
                height={block.h}
                fill={sector.color}
                stroke={isActive ? "#111827" : "#00000014"}
                strokeWidth={isActive ? 2.5 : 0.8}
              />
              <text
                x={block.x + block.w / 2}
                y={block.labelY}
                textAnchor="middle"
                fontSize={17}
                fontWeight={800}
                fill="#1f2937"
                pointerEvents="none"
              >
                {block.letter}
              </text>
            </g>
          );
        }

        const strip = DESFILE_CADEIRA_STRIPS[sector.id];
        if (strip) {
          return (
            <g key={sector.id} {...common}>
              <rect
                x={strip.x}
                y={strip.y}
                width={strip.w}
                height={strip.h}
                rx={2}
                fill={sector.color}
                stroke={isActive ? "#111827" : "#00000014"}
                strokeWidth={isActive ? 2.5 : 0.6}
              />
              <text
                x={strip.x + strip.w / 2}
                y={strip.y + strip.h / 2 + 3.2}
                textAnchor="middle"
                fontSize={7.5}
                fontWeight={800}
                fill="#ffffff"
                letterSpacing={1.2}
                pointerEvents="none"
              >
                {`CADEIRAS ${strip.letter}`}
              </text>
            </g>
          );
        }

        if (sector.id === "tea") {
          return (
            <g key={sector.id} {...common}>
              <rect
                x={34}
                y={104}
                width={24}
                height={12}
                rx={2}
                fill={sector.color}
                stroke={isActive ? "#111827" : "#00000014"}
                strokeWidth={isActive ? 2.5 : 0.6}
              />
              <text
                x={46}
                y={100}
                textAnchor="middle"
                fontSize={7}
                fontWeight={800}
                fill="#4b5563"
                letterSpacing={1}
                pointerEvents="none"
              >
                TEA
              </text>
            </g>
          );
        }

        return null;
      })}

      {/* Área Experience (informativa, à direita das cadeiras D) */}
      <rect x={380} y={172} width={28} height={10} rx={2} fill="#dc2626" />
      <text x={394} y={166} textAnchor="middle" fontSize={7} fontWeight={800} fill="#4b5563" letterSpacing={0.8}>
        EXPERIENCE
      </text>

      {/* Cortinas laterais (junto aos blocos C e D) */}
      <rect x={30} y={188} width={4} height={44} rx={2} fill="#d9d5c8" />
      <rect x={410} y={188} width={4} height={44} rx={2} fill="#d9d5c8" />
      <text x={26} y={210} textAnchor="middle" fontSize={7} fontWeight={800} fill="#8a8570" letterSpacing={1.4} transform="rotate(-90 26 210)">
        CORTINA
      </text>
      <text x={420} y={210} textAnchor="middle" fontSize={7} fontWeight={800} fill="#8a8570" letterSpacing={1.4} transform="rotate(-90 420 210)">
        CORTINA
      </text>
    </g>
  );
}



// ---------------------------------------------------------------------------
// SVG completo para a página do estabelecimento (seleção de setor)
// ---------------------------------------------------------------------------

export interface VenueSectorMapProps extends VenueLayerProps {
  className?: string;
}

export function VenueSectorMap({ venue, activeSectorId, onSectorClick, dimInactive, className }: VenueSectorMapProps) {
  return (
    <svg
      viewBox={`0 0 ${venue.viewBox.w} ${venue.viewBox.h}`}
      className={className}
      style={{ touchAction: "pan-y" }}
      role="img"
      aria-label={`Mapa de setores — ${venue.id === "nativitaten" ? "Nativitaten" : "O Grande Desfile de Natal"}`}
    >
      <VenueLayer venue={venue} activeSectorId={activeSectorId} onSectorClick={onSectorClick} dimInactive={dimInactive} />
    </svg>
  );
}

export default VenueSectorMap;
