import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Ticket, UtensilsCrossed, Tag, Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import HomeBottomNav from "@/components/home/HomeBottomNav";
import ReservationDetails from "@/components/reservas/ReservationDetails";
import tagIcon from "@/assets/icon-tag-oferta.png";

type Kind = "hospedagem" | "entretenimento" | "gastronomia" | "ofertas";
type Tone = "ok" | "wait" | "off" | "done";

interface Item {
  id: string;
  kind: Kind;
  title: string;
  subtitle: string;
  date: string;
  sortAt: string;
  price: number;
  status: { label: string; tone: Tone };
  source: "hotel" | "ticket" | "voucher";
  raw: any;
}

const TABS: { id: "todas" | Kind; label: string; icon: typeof Ticket }[] = [
  { id: "todas", label: "Todas", icon: Ticket },
  { id: "hospedagem", label: "Hospedagem", icon: Building2 },
  { id: "entretenimento", label: "Entretenimento", icon: Ticket },
  { id: "gastronomia", label: "Gastronomia", icon: UtensilsCrossed },
  { id: "ofertas", label: "Outras ofertas", icon: Tag },
];

const KIND_ICON: Record<Kind, typeof Ticket> = {
  hospedagem: Building2,
  entretenimento: Ticket,
  gastronomia: UtensilsCrossed,
  ofertas: Tag,
};

const TONE: Record<Tone, string> = {
  ok: "bg-[#e8f6ee] text-[#137a3f]",
  wait: "bg-[#fff6e0] text-[#8a5a00]",
  off: "bg-[#fdecec] text-[#b4141a]",
  done: "bg-[#f2f2f2] text-[#5c5c5c]",
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";

const HOTEL_STATUS: Record<string, { label: string; tone: Tone }> = {
  confirmed: { label: "Confirmada", tone: "ok" },
  processing: { label: "Processando", tone: "wait" },
  pending: { label: "Pendente", tone: "wait" },
  pending_3ds: { label: "Aguardando pagamento", tone: "wait" },
  cancelled: { label: "Cancelada", tone: "off" },
  failed: { label: "Não concluída", tone: "off" },
};

const voucherStatus = (status: string, expiresAt?: string | null): { label: string; tone: Tone } => {
  if (status === "used") return { label: "Utilizado", tone: "done" };
  if (status === "cancelled" || status === "canceled") return { label: "Cancelado", tone: "off" };
  if (status === "expired" || (expiresAt && new Date(expiresAt) < new Date())) return { label: "Expirado", tone: "off" };
  return { label: "Ativo", tone: "ok" };
};

const isFood = (...vals: (string | null | undefined)[]) =>
  vals.some((v) => /restaur|gastron|aliment|caf[eé]|bar\b|pizz|churras/i.test(v || ""));

/** Área "Reservas": hospedagens (RateHawk), ingressos/entretenimento e cupons de gastronomia em um só lugar. */
const Reservas = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tipo") as (typeof TABS)[number]["id"]) || "todas";
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }
      const [hotels, tickets, vouchers, cats] = await Promise.all([
        supabase.from("etg_bookings").select("id,hotel_name,hotel_hid,check_in,check_out,rooms,guests,total_price,currency,status,payment_type,order_id,partner_order_id,voucher_url,created_at").eq("user_id", user.id),
        supabase.from("ticket_bookings").select("id,status,establishment_name,localizador,voucher_id,products,tickets,total_price,use_date,created_at").eq("user_id", user.id),
        supabase
          .from("user_vouchers")
          .select("id,status,qr_code,purchase_price,expires_at,used_at,created_at,offers:offer_id(title,category,companies(name,category_id))")
          .eq("user_id", user.id),
        supabase.from("categories").select("id,slug,name"),
      ]);
      const catById = new Map(((cats.data || []) as any[]).map((c) => [c.id, c]));
      if (!alive) return;

      const list: Item[] = [];
      for (const b of (hotels.data || []) as any[]) {
        list.push({
          id: `h-${b.id}`,
          kind: "hospedagem",
          title: b.hotel_name || "Hospedagem",
          subtitle: "Hospedagem",
          date: `${fmtDate(b.check_in)} – ${fmtDate(b.check_out)}`,
          sortAt: b.check_in || b.created_at,
          price: Number(b.total_price) || 0,
          status: HOTEL_STATUS[b.status] || { label: b.status, tone: "wait" },
          source: "hotel",
          raw: b,
        });
      }
      for (const t of (tickets.data || []) as any[]) {
        const product = Array.isArray(t.products) ? t.products[0]?.name || t.products[0]?.title : null;
        list.push({
          id: `t-${t.id}`,
          kind: "entretenimento",
          title: product || t.establishment_name || "Ingresso",
          subtitle: t.establishment_name || "Ingresso",
          date: t.use_date ? `Uso em ${fmtDate(t.use_date)}` : `Compra em ${fmtDate(t.created_at)}`,
          sortAt: t.use_date || t.created_at,
          price: Number(t.total_price) || 0,
          status: voucherStatus(t.status, t.use_date ? `${t.use_date}T23:59:59` : null),
          source: "ticket",
          raw: t,
        });
      }
      for (const v of (vouchers.data || []) as any[]) {
        const offer = v.offers || {};
        const company = offer.companies || {};
        const cat = catById.get(company.category_id) || {};
        // Sem oferta vinculada = ingresso de parque/atração (NovaXS), que é entretenimento.
        const kind: Kind = !v.offers
          ? "entretenimento"
          : isFood(offer.category, cat.slug, cat.name)
          ? "gastronomia"
          : /entreten|lazer|passeio|parque|ingresso/i.test(`${offer.category} ${cat.slug}`)
            ? "entretenimento"
            : "ofertas";
        list.push({
          id: `v-${v.id}`,
          kind,
          title: offer.title || "Ingresso",
          subtitle: company.name || "Parques e atrações",
          date: v.used_at ? `Usado em ${fmtDate(v.used_at)}` : `Válido até ${fmtDate(v.expires_at)}`,
          sortAt: v.created_at,
          price: Number(v.purchase_price) || 0,
          status: voucherStatus(v.status, v.expires_at),
          source: "voucher",
          raw: { ...v, title: offer.title || "Ingresso", company: company.name || "Parques e atrações" },
        });
      }
      // Ativas/confirmadas primeiro; depois as mais recentes
      const rank = (i: Item) => (i.status.tone === "ok" || i.status.tone === "wait" ? 0 : 1);
      list.sort((a, b) => rank(a) - rank(b) || String(b.sortAt).localeCompare(String(a.sortAt)));
      setItems(list);
      setLoading(false);
    })().catch(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [navigate]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: items.length };
    for (const i of items) c[i.kind] = (c[i.kind] || 0) + 1;
    return c;
  }, [items]);
  const visibleTabs = TABS.filter((t) => t.id !== "ofertas" || counts.ofertas);
  const shown = tab === "todas" ? items : items.filter((i) => i.kind === tab);

  const EMPTY: Record<string, { text: string; cta: string; to: string }> = {
    hospedagem: { text: "Você ainda não tem reservas de hospedagem.", cta: "Buscar hospedagem", to: "/hospedagem" },
    entretenimento: { text: "Nenhum ingresso ou passeio por aqui.", cta: "Ver passeios", to: "/passeios-em-gramado" },
    gastronomia: { text: "Nenhum cupom de gastronomia ainda.", cta: "Ver restaurantes", to: "/restaurantes-em-gramado" },
  };
  const empty = EMPTY[tab] || { text: "Você ainda não tem reservas.", cta: "Explorar ofertas", to: "/" };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fafafa] font-jakarta text-foreground pb-24 md:pb-10">
      <Helmet>
        <title>Minhas reservas | Bah Ofertas</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="sticky top-0 z-40 bg-card border-b border-[#ebebeb]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            aria-label="Voltar"
            className="w-10 h-10 shrink-0 rounded-full border border-[#dddddd] flex items-center justify-center hover:bg-[#f7f7f7]"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <h1 className="m-0 text-lg md:text-xl font-bold">Minhas reservas</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-5 md:py-8">
        <nav aria-label="Tipo de reserva" className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="m-0 p-0 list-none flex gap-2">
            {visibleTabs.map((t) => {
              const active = tab === t.id;
              const Icon = t.icon;
              return (
                <li key={t.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setParams(t.id === "todas" ? {} : { tipo: t.id }, { replace: true })}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                      active ? "bg-[#1f1f1f] border-[#1f1f1f] text-white" : "bg-card border-[#dddddd] hover:border-[#1f1f1f]"
                    }`}
                  >
                    {t.id !== "todas" && <Icon className="w-4 h-4" aria-hidden="true" />}
                    {t.label}
                    {!loading && <span className="text-xs opacity-70">{counts[t.id] || 0}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="mt-5">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              Carregando reservas…
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dddddd] bg-card py-14 px-6 text-center">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/60" aria-hidden="true" />
              <p className="m-0 mt-3 text-sm text-muted-foreground">{empty.text}</p>
              <button type="button" onClick={() => navigate(empty.to)} className="mt-4 h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
                {empty.cta}
              </button>
            </div>
          ) : (
            <ul className="m-0 p-0 list-none grid gap-3 md:grid-cols-2">
              {shown.map((i) => {
                const Icon = KIND_ICON[i.kind];
                return (
                  <li key={i.id} className={`rounded-2xl border bg-card transition-shadow ${openId === i.id ? "border-[#1f1f1f] shadow-[0_6px_20px_rgba(0,0,0,0.08)] md:col-span-2" : "border-[#ebebeb] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)]"}`}>
                    <button
                      type="button"
                      aria-expanded={openId === i.id}
                      aria-controls={`det-${i.id}`}
                      onClick={() => setOpenId((cur) => (cur === i.id ? null : i.id))}
                      className={`w-full text-left p-4 md:p-5 ${
                        openId !== i.id && (i.status.tone === "off" || i.status.tone === "done") ? "opacity-80" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          {i.kind === "hospedagem" ? (
                            <Icon className="w-5 h-5" aria-hidden="true" />
                          ) : (
                            <img src={tagIcon} alt="" width={28} height={28} className="w-7 h-7" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE[i.status.tone]}`}>{i.status.label}</span>
                            <span className="text-[15px] font-bold tabular-nums">{formatCurrency(i.price)}</span>
                          </div>
                          <h2 className="m-0 mt-1.5 text-[15px] font-bold leading-snug line-clamp-2">{i.title}</h2>
                          <p className="m-0 mt-0.5 text-[13px] text-muted-foreground truncate">{i.subtitle}</p>
                          <p className="m-0 mt-2 flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" aria-hidden="true" />
                              {i.date}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              {openId === i.id ? "Fechar" : i.source === "hotel" ? "Detalhes" : i.status.tone === "ok" ? "Ver QR Code" : "Detalhes"}
                              <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${openId === i.id ? "-rotate-90" : "rotate-90"}`} aria-hidden="true" />
                            </span>
                          </p>
                        </div>
                      </div>
                    </button>
                    {openId === i.id && (
                      <div id={`det-${i.id}`} className="border-t border-[#ebebeb] px-4 pb-5 pt-4 md:px-5">
                        <ReservationDetails source={i.source} raw={i.raw} active={i.status.tone === "ok"} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <HomeBottomNav />
    </div>
  );
};

export default Reservas;
