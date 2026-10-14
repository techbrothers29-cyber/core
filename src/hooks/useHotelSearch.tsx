import React, { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Hotel, HotelFilters } from "@/pages/Hospedagem";
import type { RoomGuests } from "@/components/hospedagem/HotelSearchBar";
import { toast } from "sonner";

interface SearchParams {
  destination: string;
  checkIn?: string;
  checkOut?: string;
  rooms: RoomGuests[];
  residency?: string;
  filters: HotelFilters;
  testMode?: boolean;
}

export const useHotelSearch = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destinationLabel, setDestinationLabel] = useState<string>("");
  const requestId = useRef(0);

  const resetSearch = () => {
    requestId.current += 1;
    setHotels([]);
    setDestinationLabel("");
    setError(null);
    setIsLoading(false);
  };

  const search = async (params: SearchParams) => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);
    setHotels([]);
    setDestinationLabel("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-hotels', {
        body: {
          destination: params.destination,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          guests: params.rooms,
          residency: params.residency || 'br',
          filters: params.filters,
          testMode: params.testMode || false,
        },
      });

      if (currentRequest !== requestId.current) return;

      if (fnError) {
        console.error('Function error:', fnError);
        throw new Error("Serviço temporariamente indisponível");
      }

      if (data.error) {
        console.error('API error:', data.error);
        throw new Error(data.error);
      }

      if (data.message === "Destino não encontrado") {
        setHotels([]);
        setDestinationLabel(params.destination);
        toast.info("Destino não encontrado.");
        return;
      }

      const apiHotels = Array.isArray(data.hotels) ? data.hotels.filter((hotel: Hotel) => {
        const hasRealEtgId = /^\d+$/.test(String(hotel.id));
        const hasRealPhoto = Array.isArray(hotel.images) && hotel.images.length > 0 && hotel.image !== '/placeholder.svg';
        const hasLivePrice = !hotel.priceUnavailable && Number(hotel.price) > 0;
        return hasRealEtgId && hasRealPhoto && hasLivePrice && !hotel.isTestHotel;
      }) : [];

      setHotels(apiHotels);
      setDestinationLabel(data.destination || params.destination);

      if (apiHotels.length === 0) {
        setError("Nenhuma hospedagem disponível com preço em tempo real para estas datas.");
        toast.info("Nenhuma hospedagem disponível para estas datas. Tente outro período.");
      } else if (data.cached) {
        toast.info(`${apiHotels.length} hospedagens encontradas na região. Preços em tempo real indisponíveis no momento.`);
      } else {
        toast.success(`${apiHotels.length} hospedagens encontradas!`);
      }

    } catch (err: any) {
      if (currentRequest !== requestId.current) return;
      console.error('Hotel search error:', err);
      setHotels([]);
      setDestinationLabel(params.destination);
      setError(err.message || "Erro ao buscar hospedagens");
      toast.error("Erro ao buscar hospedagens.");
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  };

  return {
    hotels,
    setHotels,
    isLoading,
    error,
    search,
    destinationLabel,
    setDestinationLabel,
    resetSearch,
  };
};
