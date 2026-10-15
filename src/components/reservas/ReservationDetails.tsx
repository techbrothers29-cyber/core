import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Copy, Download, Loader2, MapPin, Clock, BedDouble, UtensilsCrossed, Users, ShieldCheck, Receipt, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

type Props = { source: "hotel" | "ticket" | "voucher"; raw: any; active: boolean };

const fmtDate = (d?: string | null, withTime = false) => {
  if (!d) return "";
  const date = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).then(
    () => toast.success("Código copiado"),
    () => toast.error("Não foi possível copiar")
  );
};

/** Abre o PDF gerado pelas funções do servidor (mesmo fluxo da página "Meus vouchers"). */
const openPdf = async (fn: string, body: Record<string, string>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sessão expirada");
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const url = URL.createObjectURL(await resp.blob());
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const QrBlock = ({ value, label, caption }: { value: string; label: string; caption?: string }) => (
  <div className="rounded-2xl border-2 border-dashed border-[#dddddd] bg-white p-4 text-center">
    {caption && <p className="m-0 mb-3 text-[13px] font-semibold">{caption}</p>}
    <div className="mx-auto w-48 max-w-full">
      <QRCode value={value} size={192} style={{ height: "auto", width: "100%" }} />
    </div>
    <p className="m-0 mt-3 text-xs text-muted-foreground">{label}</p>
    <button
      type="button"
      onClick={() => copy(value)}
      className="mt-1 inline-flex max-w-full items-center gap-2 rounded-lg bg-[#f7f7f7] px-3 py-2 font-mono text-sm font-semibold tracking-wider break-all"
    >
      {value}
      <Copy className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Copiar código" />
    </button>
  </div>
);

const PdfButton = ({ fn, body, label }: { fn: string; body: Record<string, string>; label: string }) => {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await openPdf(fn, body);
        } catch {
          toast.error("Não foi possível gerar o PDF agora.");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#dddddd] text-[15px] font-semibold hover:border-[#1f1f1f] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {label}
    </button>
  );
};

const Inactive = ({ text }: { text: string }) => <p className="m-0 text-sm text-muted-foreground">{text}</p>;

/* ---------------- Ingressos Parksnet / NovaXS ---------------- */
const TicketDetails = ({ raw, active }: { raw: any; active: boolean }) => {
  if (!active) return <Inactive text="Este ingresso não está mais ativo, então o QR Code não é exibido." />;
  const tickets = (Array.isArray(raw.tickets) ? raw.tickets : []).filter((t: any) => t?.barcode);
  const fallback = raw.localizador || raw.voucher_id;
  return (
    <div>
      <p className="m-0 mb-3 text-sm text-muted-foreground">
        Apresente o QR Code de cada ingresso na bilheteria{raw.establishment_name ? ` do ${raw.establishment_name}` : ""}.
      </p>
      {tickets.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {tickets.map((t: any, i: number) => (
            <QrBlock
              key={`${t.barcode}-${i}`}
              value={String(t.barcode)}
              label="Código do ingresso (Parksnet)"
              caption={`Ingresso ${i + 1} de ${tickets.length}${t.product_name ? ` · ${t.product_name}` : ""}${t.date ? ` · ${fmtDate(t.date)}` : ""}`}
            />
          ))}
        </div>
      ) : fallback ? (
        <QrBlock value={String(fallback)} label="Localizador" />
      ) : (
        <Inactive text="O código deste ingresso ainda está sendo emitido. Baixe o voucher em PDF ou fale com a gente." />
      )}
      <PdfButton fn="bahofertas-voucher-pdf" body={{ booking_id: raw.id }} label="Baixar voucher (PDF)" />
    </div>
  );
};

/* ---------------- Vouchers Bah Ofertas ---------------- */
const VoucherDetails = ({ raw, active }: { raw: any; active: boolean }) => {
  if (!active) return <Inactive text="Este voucher não está mais ativo, então o QR Code não é exibido." />;
  if (!raw.qr_code) return <Inactive text="Código do voucher indisponível. Fale com a gente pelo WhatsApp." />;
  return (
    <div>
      <p className="m-0 mb-3 text-sm text-muted-foreground">
        Mostre o QR Code ou informe o código no {raw.company || "estabelecimento"} para usar.
      </p>
      <div className="mx-auto max-w-xs">
        <QrBlock value={String(raw.qr_code)} label="Código do voucher" />
      </div>
      {raw.expires_at && <p className="m-0 mt-3 text-center text-xs text-muted-foreground">Válido até {fmtDate(raw.expires_at)}</p>}
      <PdfButton fn="bahofertas-offer-voucher-pdf" body={{ voucher_id: raw.id }} label="Baixar voucher (PDF)" />
    </div>
  );
};

/* ---------------- Hospedagem (RateHawk / ETG) ---------------- */
const Row = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="flex gap-3 py-3">
    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    <div className="min-w-0">
      <p className="m-0 text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  </div>
);

const money = (m: any, fallbackCurrency = "BRL") => {
  if (m == null) return null;
  const amount = typeof m === "object" ? Number(m.amount) : Number(m);
  if (!Number.isFinite(amount)) return null;
  const currency = (typeof m === "object" && (m.currency_code || m.currency)) || fallbackCurrency;
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const HotelDetails = ({ raw }: { raw: any }) => {
  const [order, setOrder] = useState<any>(null);
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [status, setStatus] = useState<string>(raw.status);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [info, content] = await Promise.all([
        raw.order_id || raw.partner_order_id
          ? supabase.functions
              .invoke("hotel-order-info", { body: { order_id: raw.order_id, partner_order_id: raw.partner_order_id } })
              .then((r) => (r.data?.success ? r.data : null))
              .catch(() => null)
          : Promise.resolve(null),
        raw.hotel_hid
          ? supabase
              .from("etg_hotels")
              .select("address, raw_data")
              .eq("hid", String(raw.hotel_hid))
              .maybeSingle()
              .then((r) => r.data)
              .then(null, () => null)
          : Promise.resolve(null),
      ]);
      if (!alive) return;
      const rawOrder = info?.raw_data;
      setOrder(rawOrder?.orders?.[0] ?? rawOrder ?? null);
      setHotel(content);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [raw.order_id, raw.partner_order_id, raw.hotel_hid]);

  const hc = hotel?.raw_data || {};
  const rooms: any[] = Array.isArray(order?.rooms_data) ? order.rooms_data : [];
  const guestNames = rooms
    .flatMap((r) => r?.guest_data?.guests || [])
    .map((g: any) => [g?.first_name, g?.last_name].filter(Boolean).join(" "))
    .filter(Boolean);
  const localGuests = Array.isArray(raw.guests)
    ? raw.guests.map((g: any) => [g?.first_name, g?.last_name].filter(Boolean).join(" ")).filter(Boolean)
    : [];
  const cancel = order?.cancellation_info || {};
  const freeBefore = cancel.free_cancellation_before;
  const policies: any[] = Array.isArray(cancel.policies) ? cancel.policies : [];
  const taxes: any[] = (order?.taxes || order?.tax_data?.taxes || []).filter((t: any) => t && t.included_by_supplier === false);
  const supplierConfirmation = order?.supplier_data?.confirmation_id;
  const total = money(order?.amount_sell || order?.amount_payable) || formatCurrency(Number(raw.total_price) || 0);
  const canCancel = ["confirmed", "pending"].includes(status);

  const doCancel = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("hotel-order-cancel", {
        body: { order_id: raw.order_id, partner_order_id: raw.partner_order_id },
      });
      if (error || !data?.success) throw new Error(data?.error || "Erro ao cancelar");
      setStatus("cancelled");
      toast.success("Reserva cancelada");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível cancelar agora.");
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  return (
    <div>
      {loading && (
        <p className="m-0 mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Atualizando dados da reserva com o fornecedor…
        </p>
      )}

      <div className="grid gap-x-6 md:grid-cols-2 divide-y divide-[#ebebeb] md:divide-y-0">
        <div className="divide-y divide-[#ebebeb]">
          {(hotel?.address || hc.address) && (
            <Row icon={MapPin} label="Endereço">{hotel?.address || hc.address}</Row>
          )}
          <Row icon={Clock} label="Check-in e check-out">
            {fmtDate(order?.checkin_at || raw.check_in)}
            {hc.check_in_time ? ` a partir das ${String(hc.check_in_time).slice(0, 5)}` : ""}
            <br />
            {fmtDate(order?.checkout_at || raw.check_out)}
            {hc.check_out_time ? ` até ${String(hc.check_out_time).slice(0, 5)}` : ""}
          </Row>
          {rooms.length > 0 ? (
            rooms.map((r, i) => (
              <Row key={i} icon={BedDouble} label={rooms.length > 1 ? `Quarto ${i + 1}` : "Quarto"}>
                {r?.room_name || r?.room_data?.name || "Quarto reservado"}
                {r?.bedding_name ? ` · ${r.bedding_name}` : ""}
                {(r?.meal_name || r?.meal) && (
                  <span className="mt-0.5 flex items-center gap-1.5 font-normal text-muted-foreground">
                    <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
                    Refeição: {r.meal_name || r.meal}
                  </span>
                )}
              </Row>
            ))
          ) : (
            <Row icon={BedDouble} label="Quartos">{raw.rooms || 1} quarto(s)</Row>
          )}
          {(guestNames.length > 0 || localGuests.length > 0) && (
            <Row icon={Users} label="Hóspedes">{(guestNames.length ? guestNames : localGuests).join(", ")}</Row>
          )}
        </div>

        <div className="divide-y divide-[#ebebeb]">
          <Row icon={ShieldCheck} label="Cancelamento">
            {freeBefore ? (
              <>Grátis até {fmtDate(freeBefore, true)} (horário UTC). Depois disso, pode haver multa.</>
            ) : policies.length > 0 ? (
              <>Tarifa com multa de cancelamento.</>
            ) : (
              <>Consulte a política informada no momento da reserva.</>
            )}
            {policies.length > 0 && (
              <ul className="m-0 mt-1 list-none p-0 text-[13px] font-normal text-muted-foreground">
                {policies.map((p, i) => (
                  <li key={i}>
                    {p.start_at ? `De ${fmtDate(p.start_at, true)}` : "Desde a reserva"}
                    {p.end_at ? ` até ${fmtDate(p.end_at, true)}` : " em diante"}:{" "}
                    {Number(p?.amount_charge ?? p?.penalty?.amount ?? 0) > 0 ? `multa de ${money(p.amount_charge ?? p.penalty)}` : "sem multa"}
                  </li>
                ))}
              </ul>
            )}
          </Row>
          <Row icon={Receipt} label="Pagamento">
            {total}
            {raw.payment_type && (
              <span className="block font-normal text-muted-foreground">
                {raw.payment_type === "now" ? "Pago online" : raw.payment_type === "hotel" ? "Pagamento no hotel" : raw.payment_type}
              </span>
            )}
            {taxes.length > 0 && (
              <span className="mt-1 block rounded-lg bg-[#fff6e0] px-2.5 py-1.5 text-[13px] font-normal text-[#8a5a00]">
                Taxas a pagar no hotel:{" "}
                {taxes.map((t) => `${t.name || "taxa"} ${money(t.amount_tax || t.amount, t.currency_code) || ""}`).join(" · ")}
              </span>
            )}
          </Row>
          <Row icon={Receipt} label="Números da reserva">
            {raw.partner_order_id && <span className="block">Pedido Bah Ofertas: <span className="font-mono">{raw.partner_order_id}</span></span>}
            {(order?.order_id || raw.order_id) && <span className="block">Reserva RateHawk: <span className="font-mono">{order?.order_id || raw.order_id}</span></span>}
            {supplierConfirmation && <span className="block">Confirmação do hotel: <span className="font-mono">{supplierConfirmation}</span></span>}
          </Row>
        </div>
      </div>

      {status === "cancelled" && (
        <p className="m-0 mt-3 rounded-xl bg-[#fdecec] px-3 py-2 text-sm text-[#b4141a]">Esta reserva foi cancelada.</p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {(order?.voucher_url || raw.voucher_url) && (
          <a
            href={order?.voucher_url || raw.voucher_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Abrir voucher da hospedagem
          </a>
        )}
        {canCancel &&
          (confirmCancel ? (
            <div className="flex flex-1 flex-col gap-2 rounded-xl border border-[#f3c4c6] bg-[#fdecec] p-3 sm:flex-row sm:items-center">
              <p className="m-0 flex-1 text-[13px] text-[#b4141a]">
                <AlertTriangle className="mr-1 inline h-4 w-4 align-[-3px]" aria-hidden="true" />
                Confirmar cancelamento? Veja acima se há multa.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmCancel(false)} className="h-10 flex-1 rounded-lg border border-[#dddddd] bg-white px-3 text-sm font-semibold">
                  Voltar
                </button>
                <button type="button" onClick={doCancel} disabled={cancelling} className="h-10 flex-1 rounded-lg bg-[#b4141a] px-3 text-sm font-semibold text-white disabled:opacity-60">
                  {cancelling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Cancelar reserva"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dddddd] px-5 text-[15px] font-semibold hover:border-[#b4141a] hover:text-[#b4141a]"
            >
              Cancelar reserva
            </button>
          ))}
      </div>
    </div>
  );
};

const ReservationDetails = ({ source, raw, active }: Props) => {
  if (source === "hotel") return <HotelDetails raw={raw} />;
  if (source === "ticket") return <TicketDetails raw={raw} active={active} />;
  return <VoucherDetails raw={raw} active={active} />;
};

export default ReservationDetails;
