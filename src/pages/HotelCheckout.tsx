import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import CategoryNav from "@/components/CategoryNav";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Calendar, Users, CreditCard, Building2,
  Check, Loader2, AlertCircle, Lock, User, Baby
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GuestName {
  first_name: string;
  last_name: string;
}

interface RoomGuestsConfig {
  adults: number;
  children: number[];
}
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrebookData {
  prebook_hash: string;
  hotel_id: string;
  hotel_name: string;
  room_name: string;
  check_in: string;
  check_out: string;
  total_price: number;
  payment_options: {
    now: {
      amount: number;
      requires_3ds: boolean;
      free_cancellation_before: string | null;
      cancellation_policies?: any[];
    } | null;
    pay_later: {
      deposit_amount: number;
      at_property_amount: number;
      card_required: boolean;
    } | null;
  };
}

const redirectTo3DS = (url: string, method?: string, formData?: Record<string, string> | null) => {
  const normalizedMethod = (method || 'get').toLowerCase();

  if (normalizedMethod === 'post') {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.style.display = 'none';

    Object.entries(formData || {}).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value ?? '');
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    return;
  }

  window.location.href = url;
};

const HotelCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [prebookData, setPrebookData] = useState<PrebookData | null>(null);
  const [paymentType, setPaymentType] = useState<'now' | 'pay_later'>('pay_later');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardRequired, setCardRequired] = useState(false);

  // Primary guest data
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Additional guests per room: [roomIndex][guestIndex] = {first_name, last_name}
  const [additionalGuests, setAdditionalGuests] = useState<GuestName[][]>([]);

  // Card data (kept for future use if needed)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  const bookHash = searchParams.get('book_hash');
  const hotelName = searchParams.get('hotel') || 'Hotel';
  const checkIn = searchParams.get('checkin');
  const checkOut = searchParams.get('checkout');
  const roomPrice = searchParams.get('price');
  const paymentParam = searchParams.get('payment') as 'now' | 'pay_later' | null;
  const adultsParam = parseInt(searchParams.get('adults') || '2', 10);
  const childrenParam = searchParams.get('children'); // comma-separated ages e.g. "5,8"
  const roomGuestsParam = searchParams.get('room_guests'); // JSON array of {adults, children[]}
  const excludedTaxesParam = searchParams.get('excluded_taxes');

  // Parse room guests configuration
  const parsedRoomGuests: RoomGuestsConfig[] = (() => {
    try {
      if (roomGuestsParam) {
        const parsed = JSON.parse(roomGuestsParam);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    // Fallback: single room from adults/children params
    const childAges = childrenParam ? childrenParam.split(',').map(Number) : [];
    return [{ adults: adultsParam, children: childAges }];
  })();

  // Initialize additional guests structure when room config changes
  useEffect(() => {
    setAdditionalGuests(prev => {
      return parsedRoomGuests.map((room, roomIdx) => {
        // Total guests in this room minus the first adult (primary guest in room 0, or first adult in other rooms)
        const totalExtra = (room.adults - 1) + room.children.length;
        // For room 0, all extra adults + children need names. For other rooms, ALL guests need names.
        const totalNeeded = roomIdx === 0 ? totalExtra : room.adults + room.children.length;
        const existing = prev[roomIdx] || [];
        const result: GuestName[] = [];
        for (let i = 0; i < totalNeeded; i++) {
          result.push(existing[i] || { first_name: '', last_name: '' });
        }
        return result;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomGuestsParam, adultsParam, childrenParam]);

  const updateAdditionalGuest = (roomIdx: number, guestIdx: number, field: 'first_name' | 'last_name', value: string) => {
    setAdditionalGuests(prev => {
      const updated = prev.map(room => [...room]);
      if (!updated[roomIdx]) updated[roomIdx] = [];
      if (!updated[roomIdx][guestIdx]) updated[roomIdx][guestIdx] = { first_name: '', last_name: '' };
      updated[roomIdx][guestIdx] = { ...updated[roomIdx][guestIdx], [field]: value };
      return updated;
    });
  };

  const excludedTaxes: { name: string; amount: string; currency_code: string }[] = (() => {
    try {
      return excludedTaxesParam ? JSON.parse(excludedTaxesParam) : [];
    } catch { return []; }
  })();

  const taxNameMap: Record<string, string> = {
    city_tax: 'Taxa da cidade',
    resort_fee: 'Taxa do resort',
    tourism_tax: 'Taxa de turismo',
    service_charge: 'Taxa de serviço',
    service_fee: 'Taxa de serviço',
    vat: 'IVA',
    electricity_fee: 'Taxa de energia',
    cleaning_fee: 'Taxa de limpeza',
    occupancy_tax: 'Taxa de ocupação',
  };

  const formatTaxAmount = (amount: string, currencyCode: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return `${amount} ${currencyCode}`;
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(num);
    } catch {
      return `${num.toFixed(2)} ${currencyCode}`;
    }
  };

  // Payment type will be determined by prebook data

  useEffect(() => {
    const loadPrebook = async () => {
      if (!bookHash) {
        toast.error("Dados de reserva não encontrados");
        navigate('/hospedagem');
        return;
      }

      try {
        setIsLoading(true);

        const { data, error } = await supabase.functions.invoke('hotel-prebook', {
          body: { book_hash: bookHash },
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error || 'Erro ao preparar reserva');
        }

        setPrebookData(data);

        // Determine payment type from prebook response
        const hasPayLater = !!data.payment_options?.pay_later;
        const hasNow = !!data.payment_options?.now;

        // ETG certification: force "now" payment for test hotel to complete 3DS verification
        const isTestHotel = data.hotel_id === '8473727' || hotelName?.includes('TESTE') || hotelName?.includes('test_hotel');

        if (isTestHotel && hasNow) {
          // Force "now" payment for certification 3DS test
          setPaymentType('now');
          setCardRequired(true);
          console.log('[ETG Cert] Forcing payment type "now" for test hotel 3DS verification');
        } else if (hasPayLater) {
          setPaymentType('pay_later');
          setCardRequired(data.payment_options.pay_later.card_required || false);
        } else if (hasNow) {
          setPaymentType('now');
          setCardRequired(true);
        } else {
          setPaymentType('pay_later');
        }
      } catch (err: any) {
        console.error('Prebook error:', err);
        toast.error(err.message || 'Erro ao carregar dados da reserva');
        navigate('/hospedagem');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrebook();
  }, [bookHash, navigate]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : digits;
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prebookData) return;

    // Validate guest data
    if (!firstName || !lastName || !email) {
      toast.error('Preencha os dados do hóspede');
      return;
    }

    // Validate card if required
    if (cardRequired) {
      if (!cardNumber || !cardExpiry || !cardCvc || !cardHolder) {
        toast.error('Este hotel exige cartão de crédito. Preencha os dados do cartão.');
        return;
      }
      const expiryParts = cardExpiry.split('/');
      const expMonth = parseInt(expiryParts[0], 10);
      if (expiryParts.length !== 2 || expMonth < 1 || expMonth > 12 || expiryParts[1]?.length !== 2) {
        toast.error('Validade do cartão inválida. Use o formato MM/AA (ex: 02/31)');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();


      const bookingPayload: any = {
        book_hash: prebookData.prebook_hash,
        payment_type: paymentType,
        guest_data: {
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
        },
        all_guests: additionalGuests, // per-room additional guest names
        user_id: user?.id,
        hotel_name: prebookData.hotel_name || hotelName,
        check_in: prebookData.check_in || checkIn,
        check_out: prebookData.check_out || checkOut,
        total_price: prebookData.total_price || parseFloat(roomPrice || '0'),
        adults: adultsParam,
        children: childrenParam ? childrenParam.split(',').map(Number) : [],
        rooms_guests: parsedRoomGuests,
      };

      // Add card data if required
      if (cardRequired && cardNumber) {
        bookingPayload.card_data = {
          pan: cardNumber.replace(/\s/g, ''),
          exp_date: cardExpiry,
          cvc: cardCvc,
          cardholder_name: cardHolder,
        };
      }

      const { data, error } = await supabase.functions.invoke('hotel-book', {
        body: bookingPayload,
      });

      if (error) throw error;

      if (!data.success) {
        if (data.requires_3ds && data.redirect_url) {
          toast.info('Redirecionando para autenticação do cartão...');
          redirectTo3DS(data.redirect_url, data.redirect_method, data.redirect_form_data);
          return;
        }
        if (data.error_code === 'pay_later_not_available' || data.requires_card) {
          setCardRequired(true);
          toast.error('Este hotel exige pagamento com cartão de crédito. Preencha os dados abaixo.');
          return;
        }
        throw new Error(data.error || 'Erro ao processar reserva');
      }

      // Success!
      toast.success('Reserva confirmada com sucesso!');

      navigate(`/hospedagem/confirmacao?order=${data.order_id}&booking=${data.booking_id}`);

    } catch (err: any) {
      console.error('Booking error:', err);
      toast.error(err.message || 'Erro ao processar reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 gap-6 animate-fade-in">
          {/* Animated icons */}
          <div className="relative flex items-center gap-6">
            <div className="animate-float" style={{ animationDelay: '0ms' }}>
              <Calendar className="h-7 w-7 text-primary/60" />
            </div>
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="animate-float" style={{ animationDelay: '600ms' }}>
              <CreditCard className="h-7 w-7 text-primary/60" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <p className="text-foreground font-medium text-lg">Preparando sua reserva...</p>
            <p className="text-muted-foreground text-sm">Verificando disponibilidade e condições</p>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 300}ms` }}
              />
            ))}
          </div>
        </div>
        <Footer />
        <CategoryNav />
      </div>
    );
  }

  const displayPrice = prebookData?.total_price || parseFloat(roomPrice || '0');
  const payLaterAmount = prebookData?.payment_options?.pay_later?.at_property_amount || displayPrice;

  return (
    <>
      <Helmet>
        <title>Finalizar Reserva | Bah Ofertas</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        <div className="container mx-auto px-4 py-8 pt-24">
          <Button
            variant="ghost"
            onClick={() => navigate('/hospedagem', {
              state: location.state
            })}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para busca
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados do hóspede principal</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Nome *</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="João"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Sobrenome *</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Silva"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="joao@email.com"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(51) 99999-9999"
                      />
                    </div>

                    {/* Additional guests per room */}
                    {parsedRoomGuests.map((room, roomIdx) => {
                      const guestsForRoom = additionalGuests[roomIdx] || [];
                      if (guestsForRoom.length === 0 && roomIdx === 0) return null;

                      // For room 0: extra adults start at index 0, children follow
                      // For other rooms: all adults start at index 0, children follow
                      const extraAdults = roomIdx === 0 ? room.adults - 1 : room.adults;

                      return (
                        <div key={roomIdx} className="space-y-3">
                          <Separator className="my-4" />
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">
                              {parsedRoomGuests.length > 1
                                ? `Quarto ${roomIdx + 1} — Hóspedes adicionais`
                                : 'Hóspedes adicionais'
                              }
                            </h3>
                          </div>

                          {guestsForRoom.map((guest, guestIdx) => {
                            const isChild = guestIdx >= extraAdults;
                            const childAge = isChild ? room.children[guestIdx - extraAdults] : null;
                            const label = isChild
                              ? `Criança${childAge !== null ? ` (${childAge} ano${childAge !== 1 ? 's' : ''})` : ''}`
                              : `Adulto ${roomIdx === 0 ? guestIdx + 2 : guestIdx + 1}`;

                            return (
                              <div key={guestIdx} className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs flex items-center gap-1">
                                    {isChild ? <Baby className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                    {label} — Nome *
                                  </Label>
                                  <Input
                                    value={guest.first_name}
                                    onChange={(e) => updateAdditionalGuest(roomIdx, guestIdx, 'first_name', e.target.value)}
                                    placeholder="Nome"
                                    required
                                    className="h-9 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Sobrenome *</Label>
                                  <Input
                                    value={guest.last_name}
                                    onChange={(e) => updateAdditionalGuest(roomIdx, guestIdx, 'last_name', e.target.value)}
                                    placeholder="Sobrenome"
                                    required
                                    className="h-9 text-sm"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* Card form - shown when hotel requires card */}
                    {cardRequired && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Dados do cartão</h3>
                            <Lock className="h-4 w-4 text-muted-foreground ml-auto" />
                          </div>

                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                            <div className="flex gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700 dark:text-amber-400">
                                Este hotel exige cartão de crédito para confirmar a reserva.
                              </p>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="cardHolder">Nome no cartão *</Label>
                            <Input
                              id="cardHolder"
                              value={cardHolder}
                              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                              placeholder="JOÃO SILVA"
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="cardNumber">Número do cartão *</Label>
                            <Input
                              id="cardNumber"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                              placeholder="0000 0000 0000 0000"
                              maxLength={19}
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="cardExpiry">Validade *</Label>
                              <Input
                                id="cardExpiry"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                placeholder="MM/AA"
                                maxLength={5}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="cardCvc">CVV *</Label>
                              <Input
                                id="cardCvc"
                                value={cardCvc}
                                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="123"
                                maxLength={4}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Pay at hotel info - only when pay_later is available and no card needed */}
                    {!cardRequired && paymentType === 'pay_later' && (
                      <>
                        <Separator className="my-6" />
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">Pagamento no hotel</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            O pagamento de {formatPrice(payLaterAmount)} será realizado diretamente no hotel durante o check-in. Nenhum valor será cobrado agora.
                          </p>
                        </div>
                      </>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando reserva...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Confirmar reserva
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo da reserva</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {prebookData?.hotel_name || hotelName}
                    </h4>
                    {prebookData?.room_name && (
                      <p className="text-sm text-muted-foreground">{prebookData.room_name}</p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {checkIn && checkOut ? (
                          <>
                            {format(new Date(checkIn), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(checkOut), "dd/MM/yyyy", { locale: ptBR })}
                          </>
                        ) : 'Datas não informadas'}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Forma de pagamento</span>
                    <Badge variant="secondary">
                      {cardRequired || paymentType === 'now' ? 'Cartão de crédito' : 'Pagar no hotel'}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">
                      {cardRequired || paymentType === 'now' ? 'Total' : 'Total (no check-in)'}
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(displayPrice)}
                    </span>
                  </div>

                  {/* Non-included taxes */}
                  {excludedTaxes.length > 0 && (
                    <>
                      <Separator />
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md space-y-1">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                          Taxas adicionais (pagas diretamente no check-in):
                        </p>
                        {excludedTaxes.map((tax, i) => (
                          <div key={i} className="flex justify-between text-xs text-amber-700 dark:text-amber-400">
                            <span>{taxNameMap[tax.name] || tax.name}</span>
                            <span className="font-medium">{formatTaxAmount(tax.amount, tax.currency_code)}</span>
                          </div>
                        ))}
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                          * Estas taxas não estão incluídas no preço e devem ser pagas no hotel.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Footer />
        <CategoryNav />
      </div>
    </>
  );
};

export default HotelCheckout;
