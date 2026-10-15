import { slugify } from "@/lib/seo";

/** Mesma chave usada por src/pages/Hospedagem.tsx para guardar a última busca. */
export const HOTEL_SEARCH_STATE_KEY = "hospedagem_search_state";

export interface HotelRoomGuests {
  adults: number;
  children: number[];
}

/** Dados que a página do hotel precisa para mostrar quartos e preços da busca. */
export interface HotelPageState {
  hotel: any;
  checkIn?: string;
  checkOut?: string;
  rooms?: HotelRoomGuests[];
  adults?: number;
  children?: number[];
  searchResults?: any[];
  destinationLabel?: string;
  destination?: string;
}

/** Rota da página de um hotel vindo da busca (quartos e reserva). */
export const hotelPagePath = (hotel: { id: string; name: string }) =>
  `/hospedagem/h/${encodeURIComponent(hotel.id)}/${slugify(hotel.name || "hotel")}`;

export const loadHotelSearchState = (): any => {
  try {
    const raw = sessionStorage.getItem(HOTEL_SEARCH_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
