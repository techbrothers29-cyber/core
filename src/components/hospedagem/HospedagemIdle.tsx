import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/seo";

type IdleHotel = { hid: string; name: string; address: string | null; star_rating: number | null; images: unknown };

const photo = (images: unknown) => {
  const first = Array.isArray(images) ? String(images[0] || "") : "";
  if (first.includes("{size}")) return first.replace("{size}", "640x400");
  return first.replace(/\/t\/[^/]+\/content\//, "/t/640x400/content/");
};

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Sugestões de datas: este fim de semana, o próximo e uma semana a partir de amanhã. */
function dateShortcuts(now = new Date()) {
  const day = (d: Date, add: number) => {
    const x = new Date(d);
    x.setHours(12, 0, 0, 0);
    x.setDate(x.getDate() + add);
    return x;
  };
  const dow = now.getDay(); // 0 = domingo, 6 = sábado
  const thisWeekendStart = dow === 6 ? day(now, 0) : day(now, dow === 0 ? 5 : 5 - dow);
  const thisWeekendEnd = day(thisWeekendStart, dow === 6 ? 1 : 2);
  const nextFriday = dow === 6 ? day(now, 6) : day(thisWeekendStart, 7);
  const tomorrow = day(now, 1);
  return [
    { label: "Este fim de semana", from: thisWeekendStart, to: thisWeekendEnd },
    { label: "Próximo fim de semana", from: nextFriday, to: day(nextFriday, 2) },
    { label: "Uma semana", from: tomorrow, to: day(tomorrow, 7) },
  ];
}

const fmt = (d: Date) => format(d, "d MMM", { locale: ptBR }).replace(".", "");

interface Props {
  destinationLabel: string;
  onPickDates: (from: Date, to: Date) => void;
}

const HospedagemIdle = ({ destinationLabel, onPickDates }: Props) => {
  const city = destinationLabel.split(",")[0].trim();
  const [hotels, setHotels] = useState<IdleHotel[] | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const shortcuts = useMemo(() => dateShortcuts(), []);

  useEffect(() => {
    let cancelled = false;
    setHotels(null);
    const plain = stripAccents(city);
    supabase
      .from("etg_hotels")
      .select("hid, name, address, star_rating, images")
      .or(plain === city ? `city.ilike.${city}` : `city.ilike.${city},city.ilike.${plain}`)
      .not("name", "ilike", "%test%")
      .order("star_rating", { ascending: false, nullsFirst: false })
      .limit(24)
      .then(({ data }) => {
        if (cancelled) return;
        setHotels(((data as IdleHotel[]) || []).filter((h) => photo(h.images)));
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  return (
    <div className="py-2 md:py-4 space-y-8 md:space-y-10">
      <section aria-labelledby="idle-dates">
        <h2 id="idle-dates" className="m-0 text-lg md:text-xl font-bold">Quando você vai?</h2>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          Escolha um atalho ou as datas acima para ver os preços em tempo real.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onPickDates(s.from, s.to)}
              className="flex items-center gap-3 rounded-2xl border border-[#ebebeb] bg-card p-3 sm:p-4 text-left transition-colors hover:border-[#1f1f1f]"
            >
              <span className="hidden sm:flex w-11 h-11 shrink-0 rounded-xl bg-primary/10 text-primary items-center justify-center">
                <CalendarDays className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] sm:text-[15px] font-semibold leading-tight">{s.label}</span>
                <span className="block mt-0.5 text-xs sm:text-[13px] text-muted-foreground">
                  {fmt(s.from)} – {fmt(s.to)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {hotels === null ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : hotels.length > 0 ? (
        <section aria-labelledby="idle-hotels">
          <h2 id="idle-hotels" className="m-0 text-lg md:text-xl font-bold">Hospedagens em {city}</h2>
          <p className="m-0 mt-1 text-sm text-muted-foreground">Veja fotos e detalhes. Os preços aparecem quando você escolher as datas.</p>
          <ul className="m-0 mt-4 p-0 list-none grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
            {hotels.filter((h) => !broken.has(h.hid)).slice(0, 12).map((h) => (
              <li key={h.hid} className="min-w-0">
                <Link to={`/hospedagem/hotel/${encodeURIComponent(h.hid)}/${slugify(h.name)}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                    <img
                      src={photo(h.images)}
                      alt=""
                      loading="lazy"
                      onError={() => setBroken((b) => new Set(b).add(h.hid))}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <p className="m-0 text-[15px] font-semibold leading-snug line-clamp-2">{h.name}</p>
                    {h.star_rating ? (
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[13px] font-semibold" aria-label={`${h.star_rating} estrelas`}>
                        <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        {h.star_rating}
                      </span>
                    ) : null}
                  </div>
                  {h.address && (
                    <p className="m-0 mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{h.address}</span>
                    </p>
                  )}
                  <p className="m-0 mt-1 text-[13px] font-semibold underline underline-offset-2">Ver detalhes</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default HospedagemIdle;
