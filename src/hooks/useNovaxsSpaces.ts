import { useQuery } from "@tanstack/react-query";
import { invokeInBrazil } from "@/lib/supabase-region";

export interface SeatMapSeat {
  id: string;
  label: string;
  fila: string | null;
  lugar: string | null;
  status: "free" | "occupied" | "reserved" | "blocked";
  x: number | null;
  y: number | null;
  idmapa_assento_fis: string;
  idmapa_fis: string;
  idmapa_bloco_fis: string;
}

export interface SeatMapSector {
  name: string;
  total: number;
  free: number;
  seats: SeatMapSeat[];
}

export interface SeatMapResponse {
  product: string;
  date: string;
  sectors: SeatMapSector[];
  totalSeats: number;
  freeSeats: number;
}

/**
 * Consulta os assentos (getSpaces) de um produto NovaXS/ParksNet para uma data.
 * date deve estar no formato dd/MM/yyyy (exigido pela API).
 */
export function useNovaxsSpaces(productPath?: string | null, date?: string | null, enabled = true) {
  return useQuery<SeatMapResponse, Error>({
    queryKey: ["novaxs-spaces", productPath, date],
    enabled: !!productPath && !!date && enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    // Disponibilidade em tempo real: revalida a cada 60s enquanto o mapa
    // estiver aberto (respeitando o rate limit de ~10 req/min da ParksNet).
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: true,
    // A ParksNet tem rate limit agressivo (~10 req/min) — retentamos com
    // backoff longo para dar tempo da janela liberar.
    retry: 3,
    retryDelay: (attempt) => (attempt + 1) * 10_000,

    queryFn: async () => {
      const { data, error } = await invokeInBrazil<SeatMapResponse & { error?: string; retryable?: boolean }>(
        "novaxs-get-spaces",
        { product: productPath, date },
        { allowFallback: false }
      );
      if (error) {
        throw new Error(error?.error || error?.message || "Falha ao consultar assentos");
      }
      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }
      if (!data || !Array.isArray((data as any).sectors)) {
        throw new Error("Resposta inválida do mapa de assentos");
      }
      return data as SeatMapResponse;
    },
  });
}
