import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Calendar, Users, CreditCard, Building2,
  Check, Loader2, AlertCircle, Lock, User, Baby, ShieldCheck, UtensilsCrossed
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

        if (paymentParam === 'now' && hasNow && !isTestHotel) {
          // Cliente escolheu "Pagar agora" na tela de quartos: respeita a escolha.
          setPaymentType('now');
          setCardRequired(true);
        } else if (isTestHotel && hasNow) {
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

  const TopBar = () => (
    <header className="sticky top-0 z-40 bg-card border-b border-[#ebebeb]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/hospedagem', { state: location.state }))}
            aria-label="Voltar"
            className="w-10 h-10 shrink-0 rounded-full border border-[#dddddd] flex items-center justify-center hover:bg-[#f7f7f7]"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => navigate('/')} aria-label="Bah Ofertas — página inicial">
            <img src="/logo-desktop.png" alt="Bah Ofertas" className="h-9 md:h-10 w-auto" />
          </button>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#137a3f]">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          Reserva segura
        </span>
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] font-jakarta text-foreground">
        {TopBar()}
        <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center text-center gap-4" role="status" aria-live="polite">
          <span className="relative w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" aria-hidden="true" />
            <Building2 className="w-6 h-6" aria-hidden="true" />
          </span>
          <div>
            <p className="m-0 text-lg font-bold">Preparando sua reserva</p>
            <p className="m-0 mt-1 text-sm text-muted-foreground">Confirmando disponibilidade, preço e condições com o hotel…</p>
          </div>
        </div>
      </div>
    );
  }

  const displayPrice = prebookData?.total_price || parseFloat(roomPrice || '0');
  const payLaterAmount = prebookData?.payment_options?.pay_later?.at_property_amount || displayPrice;
  const hasNowOption = !!prebookData?.payment_options?.now;
  const hasPayLaterOption = !!prebookData?.payment_options?.pay_later;
  const isPayingNow = cardRequired && paymentType === 'now';
  const isPayAtHotel = paymentType === 'pay_later';

  // Dados exibidos no resumo — sempre a partir do prebook (regra RateHawk)
  const rawRate = (prebookData as any)?.raw_prebook_data?.hotels?.[0]?.rates?.[0];
  const mealItems = rawRate?.meal_data ? (Array.isArray(rawRate.meal_data) ? rawRate.meal_data : [rawRate.meal_data]) : [];
  const mealLabel: string | null = mealItems[0]?.value || rawRate?.meal || (prebookData as any)?.meal || null;
  const cancellation = (prebookData as any)?.cancellation as
    | { free_before: string | null; policies: { start: string | null; end: string | null; amount: number; currency: string }[] }
    | undefined;
  const priceChanged = !!(prebookData as any)?.price_changed;
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  const ciDate = prebookData?.check_in || checkIn;
  const coDate = prebookData?.check_out || checkOut;
  const nights = ciDate && coDate ? Math.max(1, Math.round((new Date(coDate).getTime() - new Date(ciDate).getTime()) / 86400000)) : null;
  const totalAdults = parsedRoomGuests.reduce((s, r) => s + (r.adults || 0), 0);
  const totalChildren = parsedRoomGuests.reduce((s, r) => s + (r.children?.length || 0), 0);
  const guestsLabel = [
    `${parsedRoomGuests.length} quarto${parsedRoomGuests.length > 1 ? 's' : ''}`,
    `${totalAdults} adulto${totalAdults > 1 ? 's' : ''}`,
    ...(totalChildren > 0 ? [`${totalChildren} criança${totalChildren > 1 ? 's' : ''}`] : []),
  ].join(' · ');

  const choosePayment = (type: 'now' | 'pay_later') => {
    setPaymentType(type);
    setCardRequired(type === 'now' ? true : !!prebookData?.payment_options?.pay_later?.card_required);
  };

  const inputCls = 'h-12 rounded-xl border-[#dddddd] bg-card text-[15px] focus-visible:ring-primary';
  const sectionCls = 'rounded-2xl border border-[#ebebeb] bg-card p-5 md:p-6';
  const stepBadge = (n: number) => (
    <span className="w-7 h-7 shrink-0 rounded-full bg-[#1f1f1f] text-white text-sm font-bold flex items-center justify-center">{n}</span>
  );

  const submitLabel = isSubmitting
    ? 'Processando reserva…'
    : isPayAtHotel
      ? 'Confirmar reserva'
      : `Pagar ${formatPrice(displayPrice)} e reservar`;

  const Summary = (
    <aside className={`${sectionCls} lg:sticky lg:top-24`} aria-labelledby="hc-resumo">
      <h2 id="hc-resumo" className="m-0 text-[17px] font-bold">Resumo da reserva</h2>
      <div className="mt-4">
        <p className="m-0 text-base font-bold leading-snug">{prebookData?.hotel_name || hotelName}</p>
        {prebookData?.room_name && <p className="m-0 mt-0.5 text-sm text-muted-foreground">{prebookData.room_name}</p>}
      </div>
      <dl className="m-0 mt-4 space-y-3 border-t border-[#ebebeb] pt-4 text-sm">
        <div className="flex gap-3">
          <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">Datas</dt>
            <dd className="m-0 font-medium">
              {ciDate && coDate
                ? `${format(new Date(`${ciDate}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })} – ${format(new Date(`${coDate}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}`
                : 'Datas não informadas'}
              {nights ? <span className="text-muted-foreground"> · {nights} noite{nights > 1 ? 's' : ''}</span> : null}
            </dd>
          </div>
        </div>
        <div className="flex gap-3">
          <Users className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">Hóspedes</dt>
            <dd className="m-0 font-medium">{guestsLabel}</dd>
          </div>
        </div>
        {mealLabel && (
          <div className="flex gap-3">
            <UtensilsCrossed className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <dt className="text-xs text-muted-foreground">Refeição</dt>
              <dd className="m-0 font-medium">{mealLabel}</dd>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <dt className="text-xs text-muted-foreground">Cancelamento</dt>
            <dd className="m-0 font-medium">
              {cancellation?.free_before ? (
                <span className="text-[#137a3f]">Grátis até {fmtDateTime(cancellation.free_before)} (UTC)</span>
              ) : (
                <span>Tarifa não reembolsável ou com multa</span>
              )}
              {cancellation?.policies?.some((p) => p.amount > 0) && (
                <ul className="m-0 mt-1 p-0 list-none text-xs font-normal text-muted-foreground space-y-0.5">
                  {cancellation.policies.filter((p) => p.amount > 0).map((p, i) => (
                    <li key={i}>
                      {p.start ? `A partir de ${fmtDateTime(p.start)}` : 'Desde a reserva'}
                      {p.end ? ` até ${fmtDateTime(p.end)}` : ''}: multa de {formatTaxAmount(String(p.amount), p.currency || 'BRL')}
                    </li>
                  ))}
                  <li>Horários em UTC (Brasília = UTC−3).</li>
                </ul>
              )}
            </dd>
          </div>
        </div>
      </dl>

      {priceChanged && (
        <p className="m-0 mt-4 flex gap-2 rounded-xl bg-[#fff6e0] p-3 text-[13px] text-[#8a5a00]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          O preço desta tarifa foi atualizado pelo hotel. Confira o valor abaixo antes de confirmar.
        </p>
      )}

      <div className="mt-4 border-t border-[#ebebeb] pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold">{isPayAtHotel ? 'Total (pago no hotel)' : 'Total'}</span>
          <span className="text-2xl font-bold tabular-nums">{formatPrice(isPayAtHotel ? payLaterAmount : displayPrice)}</span>
        </div>
        <p className="m-0 mt-1 text-xs text-muted-foreground">
          {isPayAtHotel ? 'Nada é cobrado agora.' : 'Cobrado no cartão ao confirmar a reserva.'}
        </p>
      </div>

      {excludedTaxes.length > 0 && (
        <div className="mt-4 rounded-xl bg-[#fff6e0] p-3 text-[13px] text-[#8a5a00]">
          <p className="m-0 font-semibold">Taxas pagas no hotel (não incluídas no total)</p>
          <ul className="m-0 mt-1 p-0 list-none space-y-0.5">
            {excludedTaxes.map((tax, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{taxNameMap[tax.name] || tax.name}</span>
                <span className="font-semibold tabular-nums">{formatTaxAmount(tax.amount, tax.currency_code)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );

  return (
    <>
      <Helmet>
        <title>Finalizar Reserva | Bah Ofertas</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-[#fafafa] font-jakarta text-foreground pb-28 lg:pb-12">
        {TopBar()}

        <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">
          <h1 className="m-0 text-xl md:text-2xl font-bold">Finalizar reserva</h1>
          <p className="m-0 mt-1 text-sm text-muted-foreground">Confira os dados e confirme sua hospedagem.</p>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
            {/* Resumo primeiro no celular, à direita no desktop */}
            <div className="lg:order-2 min-w-0">{Summary}</div>

            <form id="hotel-checkout-form" onSubmit={handleSubmit} className="lg:order-1 min-w-0 space-y-5" noValidate={false}>
              {/* 1. Hóspedes */}
              <section className={sectionCls} aria-labelledby="hc-hospede">
                <div className="flex items-center gap-3">
                  {stepBadge(1)}
                  <h2 id="hc-hospede" className="m-0 text-[17px] font-bold">Hóspede principal</h2>
                </div>
                <p className="m-0 mt-2 text-[13px] text-muted-foreground">
                  Escreva os nomes como no documento, com letras sem acento (ex.: Joao Goncalves). O hotel usa esses dados no check-in.
                </p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Joao" autoComplete="given-name" required className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Silva" autoComplete="family-name" required className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@email.com" autoComplete="email" required className={inputCls} />
                    <p className="m-0 text-xs text-muted-foreground">A confirmação da reserva chega aqui.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                    <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(51) 99999-9999" autoComplete="tel" className={inputCls} />
                  </div>
                </div>

                {parsedRoomGuests.map((room, roomIdx) => {
                  const guestsForRoom = additionalGuests[roomIdx] || [];
                  if (guestsForRoom.length === 0 && roomIdx === 0) return null;
                  const extraAdults = roomIdx === 0 ? room.adults - 1 : room.adults;
                  return (
                    <fieldset key={roomIdx} className="m-0 mt-6 border-0 border-t border-[#ebebeb] p-0 pt-5">
                      <legend className="sr-only">{parsedRoomGuests.length > 1 ? `Quarto ${roomIdx + 1}` : 'Outros hóspedes'}</legend>
                      <h3 className="m-0 flex items-center gap-2 text-[15px] font-bold">
                        <Users className="w-4 h-4 text-primary" aria-hidden="true" />
                        {parsedRoomGuests.length > 1 ? `Quarto ${roomIdx + 1} — hóspedes` : 'Outros hóspedes'}
                      </h3>
                      <div className="mt-3 space-y-3">
                        {guestsForRoom.map((guest, guestIdx) => {
                          const isChild = guestIdx >= extraAdults;
                          const childAge = isChild ? room.children[guestIdx - extraAdults] : null;
                          const label = isChild
                            ? `Criança${childAge !== null && childAge !== undefined ? ` (${childAge} ano${childAge !== 1 ? 's' : ''})` : ''}`
                            : `Adulto ${roomIdx === 0 ? guestIdx + 2 : guestIdx + 1}`;
                          return (
                            <div key={guestIdx}>
                              <p className="m-0 mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold">
                                {isChild ? <Baby className="w-3.5 h-3.5" aria-hidden="true" /> : <User className="w-3.5 h-3.5" aria-hidden="true" />}
                                {label}
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  aria-label={`${label} — nome`}
                                  value={guest.first_name}
                                  onChange={(e) => updateAdditionalGuest(roomIdx, guestIdx, 'first_name', e.target.value)}
                                  placeholder="Nome"
                                  required
                                  className={inputCls}
                                />
                                <Input
                                  aria-label={`${label} — sobrenome`}
                                  value={guest.last_name}
                                  onChange={(e) => updateAdditionalGuest(roomIdx, guestIdx, 'last_name', e.target.value)}
                                  placeholder="Sobrenome"
                                  required
                                  className={inputCls}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </section>

              {/* 2. Pagamento */}
              <section className={sectionCls} aria-labelledby="hc-pagamento">
                <div className="flex items-center gap-3">
                  {stepBadge(2)}
                  <h2 id="hc-pagamento" className="m-0 text-[17px] font-bold">Pagamento</h2>
                  <Lock className="w-4 h-4 ml-auto text-muted-foreground" aria-hidden="true" />
                </div>

                {hasNowOption && hasPayLaterOption && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Forma de pagamento">
                    {[
                      { id: 'now' as const, title: 'Pagar agora', text: `${formatPrice(displayPrice)} no cartão de crédito`, icon: CreditCard },
                      { id: 'pay_later' as const, title: 'Pagar no hotel', text: `${formatPrice(payLaterAmount)} no check-in`, icon: Building2 },
                    ].map((opt) => {
                      const active = paymentType === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => choosePayment(opt.id)}
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                            active ? 'border-[#1f1f1f] ring-1 ring-[#1f1f1f] bg-[#f7f7f7]' : 'border-[#dddddd] hover:border-[#1f1f1f]'
                          }`}
                        >
                          <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
                          <span>
                            <span className="block text-[15px] font-semibold">{opt.title}</span>
                            <span className="block text-[13px] text-muted-foreground">{opt.text}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isPayAtHotel && (
                  <p className="m-0 mt-4 flex gap-2 rounded-xl bg-[#e8f6ee] p-3 text-[13px] text-[#137a3f]">
                    <Building2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    {cardRequired
                      ? `Nada é cobrado agora. O hotel pede um cartão como garantia; o pagamento de ${formatPrice(payLaterAmount)} é feito no check-in.`
                      : `Nada é cobrado agora. O pagamento de ${formatPrice(payLaterAmount)} é feito diretamente no hotel, no check-in.`}
                  </p>
                )}

                {cardRequired && (
                  <div className="mt-5 space-y-4">
                    {isPayingNow && (
                      <p className="m-0 flex gap-2 rounded-xl bg-[#f7f7f7] p-3 text-[13px] text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#137a3f]" aria-hidden="true" />
                        O pagamento é processado com segurança pela operadora da reserva. Seu banco pode pedir uma confirmação (3D Secure).
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="cardHolder">Nome impresso no cartão</Label>
                      <Input id="cardHolder" value={cardHolder} onChange={(e) => setCardHolder(e.target.value.toUpperCase())} placeholder="JOAO SILVA" autoComplete="cc-name" required className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cardNumber">Número do cartão</Label>
                      <div className="relative">
                        <Input id="cardNumber" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} placeholder="0000 0000 0000 0000" maxLength={19} autoComplete="cc-number" required className={`${inputCls} pr-11 tabular-nums`} />
                        <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="cardExpiry">Validade</Label>
                        <Input id="cardExpiry" inputMode="numeric" value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))} placeholder="MM/AA" maxLength={5} autoComplete="cc-exp" required className={`${inputCls} tabular-nums`} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cardCvc">CVV</Label>
                        <Input id="cardCvc" inputMode="numeric" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" maxLength={4} autoComplete="cc-csc" required className={`${inputCls} tabular-nums`} />
                      </div>
                    </div>
                  </div>
                )}

                <p className="m-0 mt-5 text-xs text-muted-foreground">
                  Ao confirmar, você concorda com as condições de cancelamento e pagamento descritas no resumo e com os{' '}
                  <a href="/termos" target="_blank" rel="noopener noreferrer" className="underline">Termos de Uso</a>.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 hidden lg:inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {submitLabel}
                </button>
              </section>
            </form>
          </div>
        </main>

        {/* Celular: total e confirmar sempre à mão */}
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#ebebeb] bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <div className="leading-tight min-w-0">
            <span className="block text-xs text-muted-foreground">{isPayAtHotel ? 'No check-in' : 'Total'}</span>
            <span className="text-lg font-bold tabular-nums">{formatPrice(isPayAtHotel ? payLaterAmount : displayPrice)}</span>
          </div>
          <button
            type="submit"
            form="hotel-checkout-form"
            disabled={isSubmitting}
            className="h-12 flex-1 max-w-[230px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isSubmitting ? 'Processando…' : isPayAtHotel ? 'Confirmar reserva' : 'Pagar e reservar'}
          </button>
        </div>
      </div>
    </>
  );
};

export default HotelCheckout;
