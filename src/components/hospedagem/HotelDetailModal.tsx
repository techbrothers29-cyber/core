import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Star, MapPin, Check, Calendar, Users, ChevronLeft,
  ChevronRight, Wifi, Car, Coffee, Dumbbell, Bath,
  AlertTriangle, Loader2,
  Phone, Mail, ExternalLink, Baby, BedDouble, UtensilsCrossed,
  ParkingCircle, PawPrint, Bus, CreditCard, Info, Shield,
  Plug, Building2, Plane
} from "lucide-react";
import DOMPurify from "dompurify";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { Hotel } from "@/pages/Hospedagem";
import useEmblaCarousel from "embla-carousel-react";
import RoomSelector from "./RoomSelector";
import { formatDateForApi } from "@/lib/date";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { buildHotelSeo, jsonLdHotel, jsonLdBreadcrumb, slugify, absoluteUrl } from "@/lib/seo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SocketIcon from "./SocketIcon";
import { translateAmenity, translateAmenityGroup } from "@/lib/amenity-translate";
import { useNearbyAirports } from "@/hooks/useNearbyAirports";

const DESC_TITLE_MAP: Record<string, string> = {
  "location": "Localização",
  "at the hotel": "No hotel",
  "room amenities": "Comodidades do quarto",
  "about the property": "Sobre a propriedade",
  "policies": "Políticas",
  "nearby attractions": "Atrações próximas",
  "good to know": "Bom saber",
  "getting around": "Como se locomover",
  "services and amenities": "Serviços e comodidades",
  "dining": "Restaurantes",
  "things to do": "O que fazer",
  "in the area": "Na região",
  "hotel description": "Descrição do hotel",
  "property description": "Descrição da propriedade",
  "general": "Geral",
  "sports and leisure": "Esportes e lazer",
  "wellness": "Bem-estar",
  "meals": "Refeições",
  "children": "Crianças",
  "parking": "Estacionamento",
  "internet": "Internet",
  "pool and beach": "Piscina e praia",
  "beauty and wellness": "Beleza e bem-estar",
  "kids": "Crianças",
  "pets": "Pets",
  "health and safety measures": "Saúde e segurança",
  "languages spoken": "Idiomas falados",
  "tourist services": "Serviços turísticos",
  "recreation": "Lazer",
  "business": "Negócios",
  "transfer": "Transfer",
  "sports & nature": "Esportes e natureza",
  "sports and nature": "Esportes e natureza",
  "media": "Mídia",
  "accessibility": "Acessibilidade",
  "safety": "Segurança",
  "shops": "Lojas",
  "view": "Vista",
};

function translateDescTitle(raw: string): string {
  if (!raw || typeof raw !== "string") return raw;
  const key = raw.trim().toLowerCase();
  return DESC_TITLE_MAP[key] || raw;
}

interface RoomGuests {
  adults: number;
  children: number[];
}

interface HotelDetailModalProps {
  hotel: Hotel;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
  adults: number;
  children?: number[];
  roomGuests?: RoomGuests[];
  onClose: () => void;
  searchResults?: Hotel[];
  destinationLabel?: string;
  destination?: string;
}

const HotelDetailModal = ({ hotel, checkIn, checkOut, adults, children = [], roomGuests, onClose, searchResults, destinationLabel, destination }: HotelDetailModalProps) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hotelDetails, setHotelDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 25 });

  // Room availability state — rooms auto-load on mount (no manual button)
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [prebookLoading, setPrebookLoading] = useState(false);
  const [showContactFallback, setShowContactFallback] = useState(false);
  const [roomsLoaded, setRoomsLoaded] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentImageIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-advance gallery every 3 seconds
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 3000);
    return () => clearInterval(interval);
  }, [emblaApi]);


  // Fetch hotel details AND room availability in parallel on mount
  useEffect(() => {
    let cancelled = false;

    // Evita que uma chamada lenta deixe a tela "travada" carregando para sempre
    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      let timer: any;
      try {
        return await Promise.race([
          p,
          new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), ms);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    };

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await withTimeout(
          supabase.functions.invoke('get-hotel-details', {
            body: {
              hotelId: hotel.id,
              checkIn: checkIn ? formatDateForApi(checkIn) : undefined,
              checkOut: checkOut ? formatDateForApi(checkOut) : undefined,
              adults,
              children,
            },
          }),
          15000,
        );

        if (error) throw error;
        // Soft "rate limited" response: keep the data we already have from the search.
        if (!cancelled && data && !data.rateLimited) setHotelDetails(data);
      } catch (err) {
        console.error('Error fetching hotel details:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const fetchRooms = async () => {
      if (!checkIn || !checkOut) return;
      try {
        setRoomsLoading(true);
        const isTestHotel = hotel.id === '8473727' || hotel.isTestHotel === true;
        const body: any = {
          hotelId: hotel.id,
          checkIn: formatDateForApi(checkIn),
          checkOut: formatDateForApi(checkOut),
          adults: isTestHotel ? 2 : adults,
          children: isTestHotel ? [] : children,
          rooms: isTestHotel ? 1 : (roomGuests?.length || 1),
        };
        // Override params for ETG certification test hotel — match exact Mikhail params
        if (isTestHotel) {
          body.residency = 'uz';
          body.guests = [{ adults: 2, children: [] }];
        } else if (roomGuests && roomGuests.length > 0) {
          body.guests = roomGuests;
        }

        const { data, error } = await withTimeout(
          supabase.functions.invoke('hotel-availability', { body }),
          20000,
        );

        if (error) throw error;
        if (cancelled) return;

        if (!data?.available || !data?.rooms?.length) {
          setShowContactFallback(true);
        } else {
          setRooms(data.rooms);
        }
      } catch (err: any) {
        console.error('Availability check error:', err);
        if (!cancelled) setShowContactFallback(true);
      } finally {
        if (!cancelled) {
          setRoomsLoading(false);
          setRoomsLoaded(true);
        }
      }
    };

    fetchDetails();
    fetchRooms();

    return () => {
      cancelled = true;
    };
  }, [hotel.id, checkIn, checkOut, adults]);


  const photos = (hotelDetails?.photos?.length ? hotelDetails.photos : [hotel.image]).map(
    (url: string) => url.replace("/max1280x900/", "/1024x768/")
  );
  // Fallback to the search nights so "price x nights = total" stays consistent
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : (hotel.nights || 1);
  // When real rooms are loaded from ETG, use the cheapest rate instead of hardcoded search price
  const cheapestRoomPrice = rooms.length > 0 ? Math.min(...rooms.map(r => r.price)) : null;
  const perNight = cheapestRoomPrice !== null ? cheapestRoomPrice / Math.max(nights, 1) : (hotel.pricePerNight || hotel.price);
  const totalPrice = cheapestRoomPrice !== null ? cheapestRoomPrice : (hotel.nights ? hotel.price : perNight * nights);
  const displayCurrency = rooms.length > 0 ? (rooms[0].currency || 'BRL') : (hotel.currency || 'BRL');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: displayCurrency,
    }).format(price);
  };

  // Room availability is now auto-loaded on mount (see useEffect above)

  // Proceed to checkout with selected room
  const handleProceedToCheckout = async (paymentType: 'now' | 'pay_later') => {
    if (!selectedRoom) {
      toast.error('Selecione um quarto');
      return;
    }

    try {
      setPrebookLoading(true);

      // Navigate to checkout with booking params
      const params = new URLSearchParams({
        book_hash: selectedRoom.book_hash,
        hotel: hotel.name,
        checkin: formatDateForApi(checkIn!),
        checkout: formatDateForApi(checkOut!),
        price: selectedRoom.price.toString(),
        payment: paymentType,
        adults: String(adults),
      });
      if (children.length > 0) {
        params.set('children', children.join(','));
      }
      // Pass per-room guest configuration for ETG booking/finish
      if (roomGuests && roomGuests.length > 0) {
        params.set('room_guests', JSON.stringify(roomGuests));
      }
      // Pass non-included taxes for checkout display
      if (selectedRoom.taxes?.excluded && selectedRoom.taxes.excluded.length > 0) {
        params.set('excluded_taxes', JSON.stringify(selectedRoom.taxes.excluded));
      }

      onClose();
      navigate(`/hospedagem/checkout?${params.toString()}`, {
        state: { hotel, checkIn: checkIn?.toISOString(), checkOut: checkOut?.toISOString(), adults, children, searchResults, destinationLabel, destination }
      });
    } catch (err: any) {
      console.error('Checkout navigation error:', err);
      toast.error('Erro ao prosseguir para checkout');
    } finally {
      setPrebookLoading(false);
    }
  };

  const nextImage = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const prevImage = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const amenityIcons: Record<string, any> = {
    wifi: Wifi,
    parking: Car,
    breakfast: Coffee,
    gym: Dumbbell,
    spa: Bath,
  };

  const airportLat = hotelDetails?.latitude ?? hotel.latitude ?? null;
  const airportLng = hotelDetails?.longitude ?? hotel.longitude ?? null;
  const { data: nearbyAirports } = useNearbyAirports(hotel.id, airportLat, airportLng);

  const hotelCity = hotel.location?.split(",")[0]?.trim() || destinationLabel || "Gramado";
  const hotelSeo = buildHotelSeo({
    name: hotel.name,
    city: hotelCity,
    starRating: hotel.rating,
    pricePerNightBRL: hotel.pricePerNight || hotel.price,
    description: hotelDetails?.description_struct?.[0]?.paragraphs?.[0],
  });
  const hotelCanonical = `/hospedagem?hid=${encodeURIComponent(hotel.id)}&slug=${slugify(hotel.name)}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <SEOHead
        title={hotelSeo.title}
        description={hotelSeo.description}
        keywords={hotelSeo.keywords}
        canonical={hotelCanonical}
        image={hotel.image || hotel.images?.[0]}
        type="place"
        city={hotelCity}
        latitude={hotel.latitude}
        longitude={hotel.longitude}
        jsonLd={[
          jsonLdHotel({
            name: hotel.name,
            url: absoluteUrl(hotelCanonical),
            image: hotel.image || hotel.images?.[0],
            description: hotelSeo.description,
            city: hotelCity,
            address: hotel.location,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            starRating: hotel.rating,
            pricePerNightBRL: hotel.pricePerNight || hotel.price,
            rating: hotel.rating,
            reviewCount: hotel.reviewCount || undefined,
          }),
          jsonLdBreadcrumb([
            { name: "Início", url: absoluteUrl("/") },
            { name: "Hospedagem", url: absoluteUrl("/hospedagem") },
            { name: hotel.name, url: absoluteUrl(hotelCanonical) },
          ]),
        ]}
      />
      <DialogContent aria-describedby={undefined} className="w-screen max-w-none sm:w-[94vw] sm:max-w-6xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90dvh] overflow-x-hidden overflow-y-auto overscroll-contain p-0 gap-0 rounded-none sm:rounded-lg border-0 sm:border scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40">
        <DialogHeader className="sr-only absolute">
          <DialogTitle>{hotel.name}</DialogTitle>
        </DialogHeader>

        {/* Image Gallery with Swipe */}
        <div className="relative h-[clamp(220px,56vw,280px)] sm:h-[clamp(280px,32vw,380px)] bg-muted sm:rounded-t-lg overflow-hidden">
          <div ref={emblaRef} className="overflow-hidden h-full">
            <div className="flex h-full">
              {photos.map((photo: string, index: number) => (
                <div key={index} className="flex-[0_0_100%] min-w-0 h-full relative">
                  <img
                    src={photo}
                    alt={`${hotel.name} - ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full transition-colors z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background p-2 rounded-full transition-colors z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm z-10">
                {currentImageIndex + 1} / {photos.length}
              </div>
            </>
          )}

          {hotel.freeCancellation && (
            <Badge className="absolute top-4 left-4 bg-green-600">
              <Check className="h-3 w-3 mr-1" />
              Cancelamento grátis
            </Badge>
          )}
        </div>


        <div className="min-w-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:p-6">
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] gap-5 sm:gap-6">
            {/* Main Content */}
            <div className="min-w-0 space-y-4 sm:space-y-6 break-words">
              {/* Header */}
              <div>
                <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wide">
                  {hotel.propertyType}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">{hotel.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{hotelDetails?.city || hotel.location}</span>
                  </div>
                  {hotel.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{hotel.rating.toFixed(1)}</span>
                      {hotel.reviewCount > 0 && (
                        <span className="text-muted-foreground">
                          ({hotel.reviewCount} avaliações)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Sobre o hotel (description_struct real da API ETG) */}
              {Array.isArray(hotelDetails?.description_struct) && hotelDetails.description_struct.some((s: any) => Array.isArray(s?.paragraphs) && s.paragraphs.length > 0) && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Sobre o hotel
                  </h3>
                  <div className="space-y-4">
                    {hotelDetails.description_struct
                      .filter((s: any) => Array.isArray(s?.paragraphs) && s.paragraphs.length > 0)
                      .map((section: any, idx: number) => (
                        <div key={idx}>
                          {section.title && (
                            <h4 className="text-sm font-semibold text-foreground mb-1.5">{translateDescTitle(section.title)}</h4>
                          )}
                          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                            {section.paragraphs.map((p: string, i: number) => (
                              <p key={i}>{p}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Informações da propriedade (facts) */}
              {hotelDetails?.facts && (() => {
                const f = hotelDetails.facts;
                const hasRooms = typeof f.rooms_number === 'number' && f.rooms_number > 0;
                const hasFloors = typeof f.floors_number === 'number' && f.floors_number > 0;
                const hasSockets = Array.isArray(f.electricity?.sockets) && f.electricity.sockets.length > 0;
                if (!hasRooms && !hasFloors && !hasSockets) return null;
                return (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Informações da propriedade
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {hasRooms && (
                        <div className="flex items-center gap-2">
                          <BedDouble className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{f.rooms_number} quartos</span>
                        </div>
                      )}
                      {hasFloors && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{f.floors_number} andares</span>
                        </div>
                      )}
                      {hasSockets && (() => {
                        const voltage = Array.isArray(f.electricity?.voltage) && f.electricity.voltage.length > 0
                          ? `${f.electricity.voltage.join(', ')} V`
                          : null;
                        const frequency = Array.isArray(f.electricity?.frequency) && f.electricity.frequency.length > 0
                          ? `${f.electricity.frequency.join(', ')} Hz`
                          : null;
                        const specs = [voltage, frequency].filter(Boolean).join(' / ');
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                              <Plug className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span>Tipo de tomada elétrica</span>
                            </div>
                            <div className="pl-6 space-y-1">
                              {f.electricity.sockets.map((s: string, i: number) => (
                                <div key={i}>
                                  <div className="text-foreground font-medium flex items-center gap-1.5">
                                    <span>Tipo {s.toUpperCase()}</span>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          aria-label={`Ver formato da tomada Tipo ${s.toUpperCase()}`}
                                          className="inline-flex items-center justify-center h-4 w-4 rounded-sm bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors text-[10px] font-bold italic"
                                        >
                                          i
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-3" side="right">
                                        <div className="flex flex-col items-center gap-2">
                                          <SocketIcon type={s} className="h-20 w-20 text-foreground" />
                                          <div className="text-xs text-muted-foreground">Tomada Tipo {s.toUpperCase()}</div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  {specs && <div className="text-xs">{specs}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* Services & Amenities */}
              {(() => {
                const groups: Array<{ group_name: string; amenities: string[] }> =
                  Array.isArray(hotelDetails?.amenity_groups) && hotelDetails.amenity_groups.length > 0
                    ? hotelDetails.amenity_groups
                    : (hotelDetails?.amenities?.length
                        ? [{ group_name: 'general', amenities: hotelDetails.amenities }]
                        : []);
                if (groups.length === 0) return null;
                const iconFor = (name: string) => {
                  const n = name.toLowerCase();
                  if (/wifi|wi-fi|internet/.test(n)) return Wifi;
                  if (/parking|estacion/.test(n)) return ParkingCircle;
                  if (/meal|breakfast|food|refeiç|café|bar|restaur/.test(n)) return UtensilsCrossed;
                  if (/pet/.test(n)) return PawPrint;
                  if (/kid|child|cri/.test(n)) return Baby;
                  if (/room|quarto|bed/.test(n)) return BedDouble;
                  if (/pool|piscina|beach|praia|spa|wellness|beauty|bem-estar|beleza/.test(n)) return Bath;
                  if (/health|safety|saúde|seguran/.test(n)) return Shield;
                  if (/transfer|shuttle/.test(n)) return Bus;
                  return Building2;
                };
                return (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 text-lg">Serviços e comodidades</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                      {groups.map((g, gi) => {
                        const Icon = iconFor(g.group_name);
                        return (
                          <div key={gi} className="break-inside-avoid">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <h4 className="font-semibold text-sm text-foreground">{translateAmenityGroup(g.group_name)}</h4>
                            </div>
                            <ul className="space-y-1.5 pl-1">
                              {g.amenities.map((a, ai) => (
                                <li key={ai} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <span className="mt-1.5 h-1 w-1 rounded-full bg-primary/60 shrink-0" />
                                  <span>{translateAmenity(a)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Aeroportos próximos (via Google Places) */}
              {Array.isArray(nearbyAirports) && nearbyAirports.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Plane className="h-4 w-4 text-primary" />
                    Aeroportos
                  </h3>
                  <ul className="space-y-2">
                    {nearbyAirports.map((a, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Plane className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{a.name}</span>
                        <span className="text-muted-foreground ml-auto">{a.distance_km.toFixed(1)} km</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}



              {/* Check-in/out Info */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Check-in</span>
                    <p className="font-medium">{hotelDetails?.checkin || '14:00'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-out</span>
                    <p className="font-medium">{hotelDetails?.checkout || '12:00'}</p>
                  </div>
              </div>
            </div>

              {/* Hotel Policies - metapolicy_struct & metapolicy_extra_info */}
              {hotelDetails && (hotelDetails.metapolicy_struct || hotelDetails.metapolicy_extra_info) && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Políticas do Hotel
                  </h3>
                  <div className="space-y-3">
                    {hotelDetails.metapolicy_struct && (() => {
                      const mp = hotelDetails.metapolicy_struct;
                      const policyItems: { icon: any; label: string; value: any }[] = [];

                      if (mp.check_in) policyItems.push({ icon: Calendar, label: 'Check-in / Check-out', value: mp.check_in });
                      if (mp.add_fee) policyItems.push({ icon: CreditCard, label: 'Taxas adicionais', value: mp.add_fee });
                      if (mp.children) policyItems.push({ icon: Baby, label: 'Crianças', value: mp.children });
                      if (mp.cot) policyItems.push({ icon: Baby, label: 'Berço', value: mp.cot });
                      if (mp.extra_bed) policyItems.push({ icon: BedDouble, label: 'Cama extra', value: mp.extra_bed });
                      if (mp.internet) policyItems.push({ icon: Wifi, label: 'Internet', value: mp.internet });
                      if (mp.meal) policyItems.push({ icon: UtensilsCrossed, label: 'Refeições', value: mp.meal });
                      if (mp.parking) policyItems.push({ icon: ParkingCircle, label: 'Estacionamento', value: mp.parking });
                      if (mp.pets) policyItems.push({ icon: PawPrint, label: 'Animais de estimação', value: mp.pets });
                      if (mp.shuttle) policyItems.push({ icon: Bus, label: 'Transfer', value: mp.shuttle });
                      if (mp.deposit) policyItems.push({ icon: CreditCard, label: 'Depósito / Caução', value: mp.deposit });

                      if (policyItems.length === 0) return null;

                      const policyFieldTranslations: Record<string, string> = {
                        availability: 'Disponibilidade',
                        currency: 'Moeda',
                        deposit_type: 'Tipo',
                        payment_type: 'Pagamento',
                        price: 'Valor',
                        price_unit: 'Cobrança',
                        pricing_method: 'Método',
                        inclusion: 'Inclusão',
                        extra_bed: 'Cama extra',
                        age_start: 'Idade mínima',
                        age_end: 'Idade máxima',
                      };

                      const policyValueTranslations: Record<string, string> = {
                        available: 'Disponível',
                        unavailable: 'Indisponível',
                        unspecified: 'Não especificado',
                        cash: 'Dinheiro',
                        card: 'Cartão',
                        per_room_per_stay: 'por quarto/estadia',
                        per_room_per_night: 'por quarto/noite',
                        per_guest_per_stay: 'por hóspede/estadia',
                        per_guest_per_night: 'por hóspede/noite',
                        per_car_per_stay: 'por carro/estadia',
                        per_car_per_night: 'por carro/noite',
                        per_person_per_stay: 'por pessoa/estadia',
                        per_person_per_night: 'por pessoa/noite',
                        per_night: 'por noite',
                        per_stay: 'por estadia',
                        per_day: 'por dia',
                        per_use: 'por utilização',
                        fixed: 'Fixo',
                        percent: 'Percentual',
                        breakage: 'Danos',
                        keys: 'Chaves',
                        pet: 'Animal de estimação',
                        included_in_price: 'Incluído no preço',
                        not_included: 'Não incluído',
                        free: 'Grátis',
                      };

                      const formatCurrency = (value: any, currency?: string): string => {
                        const num = typeof value === 'number' ? value : parseFloat(String(value));
                        if (!isFinite(num)) return String(value);
                        const cur = (currency || 'BRL').toUpperCase();
                        try {
                          return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur }).format(num);
                        } catch {
                          return `${cur} ${num.toFixed(2)}`;
                        }
                      };


                      const translateField = (key: string) => policyFieldTranslations[key] || key;
                      const translateValue = (val: any): string => {
                        if (typeof val === 'string') return policyValueTranslations[val] || val;
                        return String(val);
                      };

                      const formatPolicyValue = (val: any): string => {
                        if (typeof val === 'string') return translateValue(val);
                        if (Array.isArray(val)) {
                          return val.map((v: any) => {
                            if (typeof v === 'string') return translateValue(v);
                            if (typeof v === 'object' && v !== null) {
                              if ('age_start' in v && 'age_end' in v) {
                                const age = `${v.age_start}–${v.age_end} anos`;
                                const price = v.price && v.price !== '0' && v.price !== 0
                                  ? formatCurrency(v.price, v.currency)
                                  : 'Grátis';

                                const bed = v.extra_bed === 'available' ? 'cama extra disponível' : v.extra_bed === 'unavailable' ? 'sem cama extra' : '';
                                return [age, price, bed].filter(Boolean).join(' · ');
                              }
                              // Format with translated keys/values, skip noise fields
                              const skipKeys = new Set(['availability']);
                              const parts: string[] = [];
                              const entries = Object.entries(v).filter(([k, fv]) => fv !== null && fv !== undefined && fv !== '' && !skipKeys.has(k));

                              const typeVal = v.deposit_type || v.payment_type;
                              const priceVal = v.price;
                              const currencyVal = v.currency;
                              const unitVal = v.price_unit;

                              if (typeVal && typeVal !== 'unspecified') {
                                parts.push(translateValue(typeVal));
                              }
                              if (priceVal) {
                                const priceStr = formatCurrency(priceVal, currencyVal);
                                parts.push(priceStr);
                              }

                              if (unitVal) {
                                parts.push(translateValue(unitVal));
                              }
                              if (v.pricing_method === 'percent') {
                                parts.push('(percentual)');
                              }

                              if (parts.length > 0) return parts.join(' · ');

                              // Fallback to generic translation
                              return entries
                                .map(([k, fv]) => `${translateField(k)}: ${translateValue(fv)}`)
                                .join(' · ');
                            }
                            return String(v);
                          }).join('\n');
                        }
                        if (typeof val === 'object' && val !== null) {
                          return Object.entries(val)
                            .filter(([, fv]) => fv !== null && fv !== undefined && fv !== '')
                            .map(([k, fv]) => `${translateField(k)}: ${translateValue(fv)}`)
                            .join(' · ');
                        }
                        return String(val);
                      };

                      return policyItems.map((item, idx) => {
                        const Icon = item.icon;
                        const valueText = formatPolicyValue(item.value);

                        if (!valueText || valueText === '{}' || valueText === '[]') return null;

                        return (
                          <div key={idx} className="flex gap-3 text-sm">
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-foreground">{item.label}</span>
                              <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-line">{valueText}</p>
                            </div>
                          </div>
                        );
                      });
                    })()}

                    {hotelDetails.metapolicy_extra_info && (() => {
                      // Comprehensive EN->PT translation for ETG static metapolicy text.
                      // ETG returns this field only in English even with language=pt.
                      const translations: [RegExp, string][] = [
                        // Headings
                        [/\bKnow Before You Go\b/gi, 'Antes de viajar'],
                        [/\bMandatory Fees and Taxes\b/gi, 'Taxas e impostos obrigatórios'],
                        [/>\s*Fees\s*</gi, '>Taxas<'],
                        // Long boilerplate sentences
                        [/Additional transaction fees may apply for local residents\. Guests may also be subject to additional taxes, which may vary by city and hotel\. Information about the fees charged must be clarified with the accommodation facility\.?/gi,
                          'Podem ser cobradas taxas adicionais para residentes locais. Os hóspedes também podem estar sujeitos a impostos adicionais, que variam conforme a cidade e o hotel. Informações sobre as taxas cobradas devem ser confirmadas diretamente com a acomodação.'],
                        [/Parents or a legal guardian traveling with children under 18 years must present the child's birth certificate and an identity card with photo \(passport, for example\) at the check-in\.?/gi,
                          'Pais ou responsável legal viajando com crianças menores de 18 anos devem apresentar a certidão de nascimento da criança e um documento de identidade com foto (passaporte, por exemplo) no check-in.'],
                        [/For international travels from Brazil, if just one of the parents is traveling with the child, she\/he must present – in addition to the child's certificate of birth and identity card with photo – a letter authorizing the trip signed by the other parent with a notarial certification of signature\.?/gi,
                          'Para viagens internacionais saindo do Brasil, se apenas um dos pais estiver viajando com a criança, deverá apresentar – além da certidão de nascimento e do documento de identidade com foto – uma autorização de viagem assinada pelo outro genitor, com reconhecimento de firma em cartório.'],
                        [/For international travels to Brazil, if just one of the parents is traveling with the child, she\/he must present – in addition to the child's certificate of birth and identity card with photo – a letter authorizing the trip signed by the other parent with a notarial certification of signature\.?/gi,
                          'Para viagens internacionais com destino ao Brasil, se apenas um dos pais estiver viajando com a criança, deverá apresentar – além da certidão de nascimento e do documento de identidade com foto – uma autorização de viagem assinada pelo outro genitor, com reconhecimento de firma em cartório.'],
                        [/In case the parents or the legal guardian, as applicable, cannot or are unwilling to give this authorization, a judicial authorization is required\.?/gi,
                          'Caso os pais ou responsável legal, conforme o caso, não possam ou não queiram conceder essa autorização, será necessária autorização judicial.'],
                        [/People who intend to travel to Brazil with children must consult with the Brazilian consulate before traveling for more information\.?/gi,
                          'Pessoas que pretendem viajar ao Brasil com crianças devem consultar o consulado brasileiro antes da viagem para mais informações.'],
                        [/The following fees and deposits are charged by the property at time of service, check-in, or check-out\.?/gi,
                          'As taxas e depósitos a seguir são cobrados pela acomodação no momento do serviço, check-in ou check-out.'],
                        [/You'll be asked to pay the following charges at the property:?/gi,
                          'Você deverá pagar as seguintes taxas na acomodação:'],
                        [/We have included all charges provided to us by the property\. However, charges can vary, for example, based on length of stay or the room you book\.?/gi,
                          'Incluímos todas as taxas informadas pela acomodação. No entanto, os valores podem variar, por exemplo, conforme a duração da estadia ou o quarto reservado.'],
                        [/The above list may not be comprehensive\. Fees and deposits may not include tax and are subject to change\.?/gi,
                          'A lista acima pode não ser completa. Taxas e depósitos podem não incluir impostos e estão sujeitos a alterações.'],
                        [/Pool access available from ([\d:]+\s?[AP]M) to ([\d:]+\s?[AP]M)\.?/gi,
                          'Acesso à piscina disponível das $1 às $2.'],
                        [/Reservations are required for massage services and spa treatments\. Reservations can be made by contacting the hotel prior to arrival, using the contact information on the booking confirmation\.?/gi,
                          'É necessário fazer reserva para massagens e tratamentos de spa. As reservas podem ser feitas entrando em contato com o hotel antes da chegada, pelos dados de contato da confirmação da reserva.'],
                        [/No pets and no service animals are allowed at this property\.?/gi,
                          'Animais de estimação e animais de serviço não são permitidos nesta acomodação.'],
                        [/Cashless payment methods are available for all transactions\.?/gi,
                          'Métodos de pagamento sem dinheiro estão disponíveis para todas as transações.'],
                        [/Contactless check-in and contactless check-out are available\.?/gi,
                          'Check-in e check-out sem contato estão disponíveis.'],
                        [/Late check-in fee for check-in between ([\d:]+\s?[AP]M) and ([\w:]+)/gi,
                          'Taxa de check-in tardio para check-in entre $1 e $2'],
                        [/Onsite credit card charges are subject to a surcharge of (\d+) percent\.?/gi,
                          'Pagamentos com cartão de crédito na acomodação estão sujeitos a sobretaxa de $1%.'],
                        // Fee labels
                        [/Covered self parking fee:/gi, 'Estacionamento coberto (self):'],
                        [/Covered valet parking fee:/gi, 'Estacionamento coberto com manobrista:'],
                        [/Self parking fee:/gi, 'Estacionamento (self):'],
                        [/Valet parking fee:/gi, 'Estacionamento com manobrista:'],
                        [/City\/local tax:/gi, 'Taxa municipal:'],
                        [/Resort fee:/gi, 'Taxa do resort:'],
                        [/Tourism tax:/gi, 'Taxa de turismo:'],
                        [/City tax:/gi, 'Taxa da cidade:'],
                        [/Service charge:/gi, 'Taxa de serviço:'],
                        [/Cleaning fee:/gi, 'Taxa de limpeza:'],
                        // Units
                        [/per accommodation, per night/gi, 'por acomodação, por noite'],
                        [/per person, per night/gi, 'por pessoa, por noite'],
                        [/per night/gi, 'por noite'],
                        [/per person/gi, 'por pessoa'],
                        [/per stay/gi, 'por estadia'],
                        [/per room/gi, 'por quarto'],
                        [/per day/gi, 'por dia'],
                        [/The resort fee includes/gi, 'A taxa do resort inclui'],
                        [/Housekeeping/gi, 'Serviço de limpeza'],
                        [/Breakfast/gi, 'Café da manhã'],
                        [/Deposit/gi, 'Depósito'],
                      ];
                      let translated = hotelDetails.metapolicy_extra_info;
                      for (const [pattern, replacement] of translations) {
                        translated = translated.replace(pattern, replacement);
                      }
                      const sanitized = DOMPurify.sanitize(translated, { ALLOWED_TAGS: ['p', 'b', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'span'] });
                      return (
                        <div className="flex gap-3 text-sm border-t border-border pt-3 mt-3">
                          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium text-foreground">Informações adicionais</span>
                            <div 
                              className="text-muted-foreground text-xs mt-0.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_li]:my-0.5 [&_p]:my-1 [&_b]:text-foreground [&_strong]:text-foreground"
                              dangerouslySetInnerHTML={{ __html: sanitized }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
          </div>

            {/* Booking Card — sticky sidebar on desktop, inline on mobile */}
            <div className="min-w-0">
              <div className="min-w-0 border border-border rounded-lg p-4 sm:p-5 lg:sticky lg:top-4 lg:max-h-[calc(90dvh-3rem)] lg:overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                {/* Header: price + dates */}
                {hotel.priceUnavailable ? (
                  <div className="mb-4">
                    <span className="text-lg font-semibold text-primary">Verifique disponibilidade</span>
                    <p className="text-xs text-muted-foreground mt-1">Consulte diretamente ou verifique online</p>
                    {hotel.isTestHotel && (
                      <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <div className="flex gap-2 items-start">
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              Restrição de estadia mínima
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Este hotel exige estadia mínima de <strong>1 diária</strong> e check-in com no mínimo <strong>7 dias de antecedência</strong> da data atual. 
                              As datas serão ajustadas automaticamente caso necessário.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-bold text-foreground">
                      {formatPrice(perNight)}
                    </span>
                    <span className="text-muted-foreground">/ noite</span>
                  </div>
                )}

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Datas: </span>
                      {checkIn && checkOut ? (
                        <span className="font-medium">
                          {format(checkIn, "dd/MM", { locale: ptBR })} - {format(checkOut, "dd/MM", { locale: ptBR })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Não selecionadas</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Hóspedes: </span>
                      <span className="font-medium">{adults} adulto{adults > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {!hotel.priceUnavailable && !roomsLoading && rooms.length === 0 && !showContactFallback && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted-foreground">
                        {formatPrice(perNight)} x {nights} noite{nights > 1 ? 's' : ''}
                      </span>
                      <span className="font-bold text-lg">{formatPrice(totalPrice)}</span>
                    </div>
                  </>
                )}

                <Separator className="my-4" />

                {/* Room availability section — auto-loaded */}
                {roomsLoading ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando quartos disponíveis...
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse rounded-lg bg-muted h-16" />
                      ))}
                    </div>
                  </div>
                ) : showContactFallback ? (
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex gap-3 items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            Disponibilidade sob consulta
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Não foi possível verificar a disponibilidade online para as datas selecionadas. 
                            Entre em contato diretamente com o hotel para consultar vagas e valores.
                          </p>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-semibold text-foreground text-sm">Entre em contato</h4>

                    {hotelDetails?.phone && (
                      <a 
                        href={`tel:${hotelDetails.phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Phone className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Ligar</p>
                          <p className="text-xs text-muted-foreground">{hotelDetails.phone}</p>
                        </div>
                      </a>
                    )}

                    {hotelDetails?.email && (
                      <a 
                        href={`mailto:${hotelDetails.email}?subject=Consulta de disponibilidade - ${hotel.name}${checkIn && checkOut ? `&body=Olá, gostaria de verificar disponibilidade para:${encodeURIComponent('\n')}Check-in: ${format(checkIn, "dd/MM/yyyy", { locale: ptBR })}${encodeURIComponent('\n')}Check-out: ${format(checkOut, "dd/MM/yyyy", { locale: ptBR })}${encodeURIComponent('\n')}Hóspedes: ${adults}` : ''}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Enviar email</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{hotelDetails.email}</p>
                        </div>
                      </a>
                    )}

                    {hotelDetails?.website && (
                      <a 
                        href={hotelDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="bg-primary/10 p-2 rounded-full">
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Site do hotel</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{hotelDetails.website}</p>
                        </div>
                      </a>
                    )}

                    {!hotelDetails?.phone && !hotelDetails?.email && !hotelDetails?.website && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Informações de contato não disponíveis.
                      </p>
                    )}
                  </div>
                ) : rooms.length > 0 ? (
                  <RoomSelector
                    rooms={rooms}
                    selectedRoom={selectedRoom}
                    onSelectRoom={setSelectedRoom}
                    onProceed={handleProceedToCheckout}
                    isLoading={prebookLoading}
                    roomGroups={hotelDetails?.room_groups || []}
                    fallbackImages={photos}
                  />
                ) : !checkIn || !checkOut ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Selecione as datas de check-in e check-out para verificar disponibilidade.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-center text-muted-foreground">
                    Selecione um quarto e forma de pagamento
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HotelDetailModal;
