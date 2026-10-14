import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MapPin, Users, Search, Loader2, Baby, Plus, Minus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { HOTEL_DESTINATIONS } from "@/data/hotel-destinations";

export interface RoomGuests {
  adults: number;
  children: number[];
}

// ETG limits
const MAX_ROOMS = 9;
const MAX_ADULTS_PER_ROOM = 6;
const MAX_CHILDREN_PER_ROOM = 4;
const MAX_GUESTS_PER_ROOM = 10;

interface HotelSearchBarProps {
  destination: string;
  setDestination: (value: string) => void;
  checkIn: Date | undefined;
  setCheckIn: (date: Date | undefined) => void;
  checkOut: Date | undefined;
  setCheckOut: (date: Date | undefined) => void;
  rooms: RoomGuests[];
  setRooms: (value: RoomGuests[]) => void;
  residency: string;
  setResidency: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

const RESIDENCY_OPTIONS = [
  { value: 'br', label: 'Brasil', flag: 'br' },
  { value: 'us', label: 'EUA', flag: 'us' },
  { value: 'ar', label: 'Argentina', flag: 'ar' },
  { value: 'uy', label: 'Uruguai', flag: 'uy' },
  { value: 'py', label: 'Paraguai', flag: 'py' },
  { value: 'cl', label: 'Chile', flag: 'cl' },
  { value: 'co', label: 'Colômbia', flag: 'co' },
  { value: 'de', label: 'Alemanha', flag: 'de' },
  { value: 'fr', label: 'França', flag: 'fr' },
  { value: 'gb', label: 'Reino Unido', flag: 'gb' },
  { value: 'it', label: 'Itália', flag: 'it' },
  { value: 'pt', label: 'Portugal', flag: 'pt' },
  { value: 'es', label: 'Espanha', flag: 'es' },
  { value: 'uz', label: 'Uzbequistão', flag: 'uz' },
];

const FlagIcon = ({ code, className = "" }: { code: string; className?: string }) => (
  <img
    src={`https://flagcdn.com/w20/${code}.png`}
    srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
    width="20"
    height="15"
    alt=""
    className={cn("inline-block rounded-sm object-cover", className)}
    loading="lazy"
  />
);

const HotelSearchBar = ({
  destination,
  setDestination,
  checkIn,
  setCheckIn,
  checkOut,
  setCheckOut,
  rooms,
  setRooms,
  residency,
  setResidency,
  onSearch,
  isLoading,
}: HotelSearchBarProps) => {

  const normalizedRooms = useMemo<RoomGuests[]>(() => {
    if (!Array.isArray(rooms)) {
      return [{ adults: 2, children: [] }];
    }

    const sanitized = rooms.slice(0, MAX_ROOMS).map((room) => {
      const rawAdults = typeof room?.adults === "number" ? room.adults : 1;
      const adults = Math.min(MAX_ADULTS_PER_ROOM, Math.max(1, rawAdults));

      const parsedChildren = Array.isArray(room?.children)
        ? room.children
            .map((age) => (typeof age === "number" ? Math.min(17, Math.max(0, age)) : 5))
            .slice(0, MAX_CHILDREN_PER_ROOM)
        : [];

      while (adults + parsedChildren.length > MAX_GUESTS_PER_ROOM) {
        parsedChildren.pop();
      }

      return { adults, children: parsedChildren };
    });

    return sanitized.length > 0 ? sanitized : [{ adults: 2, children: [] }];
  }, [rooms]);

  const totalAdults = useMemo(() => normalizedRooms.reduce((sum, r) => sum + r.adults, 0), [normalizedRooms]);
  const totalChildren = useMemo(() => normalizedRooms.reduce((sum, r) => sum + r.children.length, 0), [normalizedRooms]);

  const addRoom = () => {
    if (normalizedRooms.length < MAX_ROOMS) {
      setRooms([...normalizedRooms, { adults: 1, children: [] }]);
    }
  };

  const removeRoom = (index: number) => {
    if (normalizedRooms.length > 1) {
      setRooms(normalizedRooms.filter((_, i) => i !== index));
    }
  };

  const updateRoomAdults = (roomIndex: number, delta: number) => {
    const updated = [...normalizedRooms];
    const room = { ...updated[roomIndex] };
    const newAdults = room.adults + delta;
    const totalGuests = newAdults + room.children.length;
    if (newAdults >= 1 && newAdults <= MAX_ADULTS_PER_ROOM && totalGuests <= MAX_GUESTS_PER_ROOM) {
      room.adults = newAdults;
      updated[roomIndex] = room;
      setRooms(updated);
    }
  };

  const addChild = (roomIndex: number) => {
    const updated = [...normalizedRooms];
    const room = { ...updated[roomIndex], children: [...updated[roomIndex].children] };
    const totalGuests = room.adults + room.children.length + 1;
    if (room.children.length < MAX_CHILDREN_PER_ROOM && totalGuests <= MAX_GUESTS_PER_ROOM) {
      room.children.push(5);
      updated[roomIndex] = room;
      setRooms(updated);
    }
  };

  const removeChild = (roomIndex: number, childIndex: number) => {
    const updated = [...normalizedRooms];
    const room = { ...updated[roomIndex], children: [...updated[roomIndex].children] };
    room.children.splice(childIndex, 1);
    updated[roomIndex] = room;
    setRooms(updated);
  };

  const updateChildAge = (roomIndex: number, childIndex: number, age: number) => {
    const updated = [...normalizedRooms];
    const room = { ...updated[roomIndex], children: [...updated[roomIndex].children] };
    room.children[childIndex] = age;
    updated[roomIndex] = room;
    setRooms(updated);
  };

  const guestSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${normalizedRooms.length} quarto${normalizedRooms.length > 1 ? 's' : ''}`);
    parts.push(`${totalAdults} adulto${totalAdults > 1 ? 's' : ''}`);
    if (totalChildren > 0) {
      parts.push(`${totalChildren} criança${totalChildren > 1 ? 's' : ''}`);
    }
    return parts.join(', ');
  }, [normalizedRooms, totalAdults, totalChildren]);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  return (

    <div className="bg-card rounded-2xl shadow-xl border border-border/50 p-4 md:p-6 fluid-card">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Destination Selector */}
        <div className="col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Destino
          </label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <SelectValue placeholder="Selecione o destino" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {HOTEL_DESTINATIONS.map((dest) => (
                <SelectItem key={dest.value} value={dest.value}>
                  {dest.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Check-in */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Check-in
          </label>
          <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !checkIn && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkIn ? format(checkIn, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={(date) => { setCheckIn(date); if (date) setCheckInOpen(false); }}
                disabled={(date) => date < new Date()}
                initialFocus
                className="pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

        </div>

        {/* Check-out */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Check-out
          </label>
          <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !checkOut && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOut ? format(checkOut, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
              <Calendar
                mode="single"
                selected={checkOut}
                onSelect={(date) => { setCheckOut(date); if (date) setCheckOutOpen(false); }}
                disabled={(date) => date < (checkIn || new Date())}
                initialFocus
                className="pointer-events-auto"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

        </div>

        {/* Guests & Rooms */}
        <div className="col-span-2 md:col-span-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Hóspedes e Quartos
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-sm truncate">
                <Users className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{guestSummary}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-popover z-50 p-0" align="start">
              <ScrollArea className="max-h-[400px]">
                <div className="p-4 space-y-4">
                  {normalizedRooms.map((room, roomIndex) => (
                    <div key={roomIndex}>
                      {roomIndex > 0 && <Separator className="mb-4" />}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-foreground">
                          Quarto {roomIndex + 1}
                        </span>
                        {normalizedRooms.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => removeRoom(roomIndex)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remover
                          </Button>
                        )}
                      </div>

                      {/* Adults for this room */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-foreground">Adultos</span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7"
                            onClick={() => updateRoomAdults(roomIndex, -1)}
                            disabled={room.adults <= 1}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{room.adults}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7"
                            onClick={() => updateRoomAdults(roomIndex, 1)}
                            disabled={room.adults >= MAX_ADULTS_PER_ROOM || (room.adults + room.children.length) >= MAX_GUESTS_PER_ROOM}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Children for this room */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground">Crianças</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs"
                            onClick={() => addChild(roomIndex)}
                            disabled={room.children.length >= MAX_CHILDREN_PER_ROOM || (room.adults + room.children.length) >= MAX_GUESTS_PER_ROOM}>
                            <Plus className="h-3 w-3 mr-1" /> Adicionar
                          </Button>
                        </div>
                        {room.children.map((age, childIndex) => (
                          <div key={childIndex} className="flex items-center gap-2 pl-2">
                            <Baby className="h-3 w-3 text-muted-foreground shrink-0" />
                            <Select value={String(age)} onValueChange={(v) => updateChildAge(roomIndex, childIndex, Number(v))}>
                              <SelectTrigger className="h-7 flex-1 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 18 }, (_, i) => (
                                  <SelectItem key={i} value={String(i)}>
                                    {i === 0 ? 'Menos de 1 ano' : `${i} ano${i > 1 ? 's' : ''}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                              onClick={() => removeChild(roomIndex, childIndex)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Room capacity hint */}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {room.adults + room.children.length}/{MAX_GUESTS_PER_ROOM} hóspedes
                      </p>
                    </div>
                  ))}

                  {/* Add room */}
                  {normalizedRooms.length < MAX_ROOMS && (
                    <>
                      <Separator />
                      <Button variant="outline" size="sm" className="w-full text-xs"
                        onClick={addRoom}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar quarto
                      </Button>
                    </>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Residency Selector */}
        <div className="col-span-2 md:col-span-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Nacionalidade
          </label>
          <Select value={residency} onValueChange={setResidency}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              {RESIDENCY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <FlagIcon code={opt.flag} />
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <div className="col-span-2 md:col-span-1 flex items-end">
          <Button
            onClick={onSearch}
            className="w-full h-10 ease-spring transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Buscar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HotelSearchBar;
