import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NearbyAirport = {
  name: string;
  distance_km: number;
  latitude: number;
  longitude: number;
};

// A 403 from Places is a project-wide authorization failure, not a hotel error.
// Avoid one failing request for every hotel opened in this browser session.
let placesUnavailable = false;

export function useNearbyAirports(hid?: string | number, lat?: number | null, lng?: number | null) {
  return useQuery({
    queryKey: ["nearby-airports", String(hid ?? ""), lat, lng],
    enabled: !placesUnavailable && !!hid && typeof lat === "number" && typeof lng === "number" && /^\d+$/.test(String(hid)),
    staleTime: 1000 * 60 * 60 * 24, // 24h client cache
    gcTime: 1000 * 60 * 60 * 24,
    retry: false, // upstream pode responder 403; não insistir (evita travar a página do hotel)
    refetchOnWindowFocus: false,

    queryFn: async (): Promise<NearbyAirport[]> => {
      const { data, error } = await supabase.functions.invoke("get-nearby-airports", {
        body: { hid: String(hid), lat, lng },
      });
      if (data?.error === "places_unauthorized") placesUnavailable = true;
      if (error) return [];
      return Array.isArray(data?.airports) ? data.airports : [];
    },
  });
}
