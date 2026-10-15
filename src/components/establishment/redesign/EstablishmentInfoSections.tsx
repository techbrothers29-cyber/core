import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Star, MapPin, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Establishment, EstablishmentCategory } from "@/data/novaxs-establishments";

/**
 * "Informações" da página de estabelecimento no visual novo.
 *
 * Variante visual de `EstablishmentSidebar` (que continua intacto porque também é
 * usado em CompanyOffers). Conteúdo, textos e regras são cópia fiel daquele arquivo:
 * se mudar um texto lá, mude aqui também.
 *
 * - variant="list"  (desktop/tablet): acordeões com divisórias finas.
 * - variant="cards" (celular): cada seção em um cartão com borda clara.
 */

// Mapbox é pesado — o chunk do mapa só carrega quando a seção é aberta e fica visível.
const EstablishmentMap = lazy(() => import("@/components/establishment/EstablishmentMap"));

function MapWhenVisible(props: { name: string; latitude: number; longitude: number; address?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    let released = false;
    let io: IntersectionObserver | undefined;
    let idleId: number | undefined;
    let rafId: number | undefined;

    const release = () => {
      if (released) return;
      released = true;
      io?.disconnect();
      if (idleId !== undefined && typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      setVisible(true);
    };

    if (typeof IntersectionObserver === "undefined") {
      if (typeof requestIdleCallback === "function") idleId = requestIdleCallback(() => release());
      else rafId = requestAnimationFrame(() => release());
      return () => {
        released = true;
        if (idleId !== undefined && typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
        if (rafId !== undefined) cancelAnimationFrame(rafId);
      };
    }

    io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          if (typeof requestIdleCallback === "function") idleId = requestIdleCallback(() => release(), { timeout: 2500 });
          else rafId = requestAnimationFrame(() => release());
        }
      },
      { rootMargin: "-5% 0px -5% 0px" },
    );
    io.observe(el);

    return () => {
      released = true;
      io?.disconnect();
      if (idleId !== undefined && typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, [visible]);

  return (
    <div ref={ref} className="h-[180px] lg:h-[200px] w-full overflow-hidden rounded-xl">
      {visible ? (
        <Suspense fallback={<div className="h-full w-full bg-muted animate-pulse" />}>
          <EstablishmentMap {...props} />
        </Suspense>
      ) : (
        <div className="h-full w-full bg-muted animate-pulse" />
      )}
    </div>
  );
}

// ---- Conteúdo (cópia fiel de EstablishmentSidebar) ----

function getAboutText(name: string, category: EstablishmentCategory): string {
  const templates: Record<EstablishmentCategory, string[]> = {
    entretenimento: [
      `${name} é uma das principais atrações da Serra Gaúcha, oferecendo experiências inesquecíveis para toda a família. Localizado em um cenário deslumbrante, combina diversão, cultura e natureza em um só lugar.`,
    ],
    restaurante: [
      `${name} é referência em gastronomia na Serra Gaúcha, proporcionando uma experiência culinária única com ingredientes selecionados e um ambiente acolhedor. Ideal para momentos especiais.`,
    ],
    servicos: [
      `${name} oferece serviços exclusivos na Serra Gaúcha, com atendimento personalizado e experiências diferenciadas para tornar sua visita ainda mais especial.`,
    ],
  };
  return templates[category][0];
}

function getIncludes(category: EstablishmentCategory) {
  const data: Record<EstablishmentCategory, { included: string[]; notIncluded: string[] }> = {
    entretenimento: {
      included: [
        "Acesso às atrações principais",
        "Estacionamento gratuito",
        "Seguro de atividades",
        "Guia de orientação",
      ],
      notIncluded: [
        "Alimentação",
        "Transporte até o local",
        "Fotos e souvenirs",
      ],
    },
    restaurante: {
      included: [
        "Refeição conforme descrição",
        "Ambiente climatizado",
        "Wi-Fi gratuito",
        "Estacionamento",
      ],
      notIncluded: [
        "Bebidas alcoólicas (cobradas à parte)",
        "Sobremesas especiais",
        "Serviço de valet",
      ],
    },
    servicos: {
      included: [
        "Serviço conforme descrição",
        "Atendimento personalizado",
        "Material necessário incluso",
      ],
      notIncluded: [
        "Transporte até o local",
        "Itens adicionais sob consulta",
      ],
    },
  };
  return data[category];
}

function getImportantNotes(category: EstablishmentCategory): string[] {
  const notes: Record<EstablishmentCategory, string[]> = {
    entretenimento: [
      "Chegue com 30 minutos de antecedência.",
      "Crianças menores de 12 anos devem estar acompanhadas por um adulto.",
      "Em caso de mau tempo, algumas atividades ao ar livre podem ser alteradas.",
      "Apresente o voucher digital no momento da entrada.",
    ],
    restaurante: [
      "Reservas são recomendadas, especialmente nos finais de semana.",
      "Informe restrições alimentares ao realizar o pedido.",
      "Apresente o voucher digital ao chegar.",
      "Horários podem variar em feriados.",
    ],
    servicos: [
      "Agende com antecedência para garantir disponibilidade.",
      "Apresente o voucher digital no atendimento.",
      "Consulte condições de cancelamento.",
    ],
  };
  return notes[category];
}

function getFAQ(name: string, category: EstablishmentCategory) {
  const base = [
    {
      q: "Como utilizo meu voucher?",
      a: `Após a compra, você receberá um voucher digital. Basta apresentá-lo na recepção do ${name} no dia da sua visita.`,
    },
    {
      q: "Posso cancelar minha compra?",
      a: "Consulte a política de cancelamento de cada produto. Em geral, cancelamentos podem ser feitos até 48h antes da data agendada.",
    },
    {
      q: "O local é acessível para pessoas com mobilidade reduzida?",
      a: "Sim, o estabelecimento conta com infraestrutura acessível. Para necessidades específicas, entre em contato previamente.",
    },
  ];

  if (category === "entretenimento") {
    base.push({
      q: "Posso levar crianças pequenas?",
      a: "Sim! Verifique as restrições de idade e altura de cada atração individualmente na descrição do produto.",
    });
  }
  if (category === "restaurante") {
    base.push({
      q: "É necessário fazer reserva?",
      a: "Recomendamos, especialmente em alta temporada e finais de semana. Para grupos maiores, a reserva é obrigatória.",
    });
  }

  return base;
}

const COMPANY_OPENING_DATES: Record<string, string> = {
  // Churrascaria — inaugurada em Março 2026
  "93e66d28-2de1-45a3-b4c5-8c9aeb50f027": "2026-03-01",
};

function getMockReviews(name: string, rating: number, companyId?: string) {
  const names = ["Ana C.", "Roberto M.", "Fernanda S.", "Lucas P.", "Mariana L."];
  const comments = [
    `Experiência incrível no ${name}! Superou todas as expectativas. Recomendo para toda a família.`,
    `Muito bom! Ambiente agradável e atendimento excelente. Voltarei com certeza.`,
    `Adoramos! As crianças se divertiram muito. O preço pelo Bah Ofertas foi ótimo.`,
    `Lugar maravilhoso na Serra Gaúcha. A compra pelo site foi super fácil e prática.`,
    `Nota ${rating.toFixed(1)} merecida! Tudo muito bem organizado e limpo. Parabéns à equipe.`,
  ];
  const allDates: { label: string; date: Date }[] = [
    { label: "Maio 2026", date: new Date(2026, 4, 1) },
    { label: "Abril 2026", date: new Date(2026, 3, 1) },
    { label: "Março 2026", date: new Date(2026, 2, 1) },
    { label: "Fevereiro 2026", date: new Date(2026, 1, 1) },
    { label: "Janeiro 2026", date: new Date(2026, 0, 1) },
    { label: "Dezembro 2025", date: new Date(2025, 11, 1) },
    { label: "Novembro 2025", date: new Date(2025, 10, 1) },
  ];
  const openingISO = companyId ? COMPANY_OPENING_DATES[companyId] : undefined;
  const opening = openingISO ? new Date(openingISO) : null;
  const validDates = allDates.filter((d) => !opening || d.date >= opening);
  const dates = validDates.slice(0, names.length).map((d) => d.label);

  return dates.map((dateLabel, i) => ({
    name: names[i],
    rating: Math.max(4, Math.min(5, Math.round(rating + (Math.random() - 0.5)))),
    comment: comments[i],
    date: dateLabel,
  }));
}

const COORDINATES: Record<string, [number, number]> = {
  "snowland": [-29.3775, -50.8760],
  "acquamotion": [-29.3810, -50.8720],
  "alpen": [-29.3632, -50.8416],
  "caracol": [-29.3159, -50.8507],
  "bondinhos": [-29.3170, -50.8520],
  "skyglass": [-29.3150, -50.8530],
  "chocoland": [-29.3728, -50.8754],
  "gatzz": [-29.3730, -50.8740],
  "hard rock": [-29.3740, -50.8760],
  "default": [-29.3740, -50.8750],
};

function getCoordinates(name: string): [number, number] {
  const lower = name.toLowerCase();
  for (const [key, coords] of Object.entries(COORDINATES)) {
    if (lower.includes(key)) return coords;
  }
  return [
    -29.3740 + (Math.random() - 0.5) * 0.02,
    -50.8750 + (Math.random() - 0.5) * 0.02,
  ];
}

// ---- Apresentação ----

type Variant = "list" | "cards";

function Section({
  variant,
  title,
  aside,
  children,
  defaultOpen = false,
}: {
  variant: Variant;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isCards = variant === "cards";

  return (
    <div
      className={cn(
        isCards
          ? "rounded-[14px] border border-[#ebebeb] bg-card px-4"
          : "border-t border-[#ebebeb]",
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "flex min-h-[48px] flex-1 items-center justify-between gap-3 text-left font-semibold text-foreground",
            isCards ? "py-3 text-sm" : "py-3.5 text-[15px]",
          )}
        >
          <span className="min-w-0">{title}</span>
          {isCards ? (
            <ChevronDown
              className={cn("h-5 w-5 shrink-0 text-foreground transition-transform", open && "rotate-180")}
              aria-hidden="true"
            />
          ) : (
            <Plus
              className={cn("h-[18px] w-[18px] shrink-0 text-foreground transition-transform", open && "rotate-45")}
              aria-hidden="true"
            />
          )}
        </button>
        {aside}
      </div>
      {open && <div className="animate-in fade-in duration-200 pb-4">{children}</div>}
    </div>
  );
}

interface Props {
  establishment: Establishment;
  variant: Variant;
  className?: string;
}

export default function EstablishmentInfoSections({ establishment, variant, className }: Props) {
  const { category, rating } = establishment;
  const name = establishment.displayName || establishment.name;
  const about = useMemo(() => establishment.aboutText || getAboutText(name, category), [establishment.aboutText, name, category]);
  const includes = useMemo(() => {
    const defaults = getIncludes(category);
    return {
      included: establishment.includesIncluded || defaults.included,
      notIncluded: establishment.includesNotIncluded || defaults.notIncluded,
    };
  }, [category, establishment.includesIncluded, establishment.includesNotIncluded]);
  const importantNotes = useMemo(() => establishment.importantNotes || getImportantNotes(category), [establishment.importantNotes, category]);
  const faq = useMemo(() => getFAQ(name, category), [name, category]);
  const reviews = useMemo(() => getMockReviews(name, rating, establishment.companyId), [name, rating, establishment.companyId]);
  const coords = useMemo<[number, number]>(() => {
    if (
      typeof establishment.latitude === "number" &&
      typeof establishment.longitude === "number" &&
      !Number.isNaN(establishment.latitude) &&
      !Number.isNaN(establishment.longitude)
    ) {
      return [establishment.latitude, establishment.longitude];
    }
    return getCoordinates(establishment.name);
  }, [establishment.name, establishment.latitude, establishment.longitude]);

  const mapsQuery = establishment.addressLabel?.trim() || name;
  const googleMapsUrl = `https://maps.google.com/maps?q=${coords[0]},${coords[1]}(${encodeURIComponent(mapsQuery)})&ll=${coords[0]},${coords[1]}&z=18&t=h&hl=pt-BR&gl=BR`;

  const handleOpenGoogleMaps = () => {
    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  const isCards = variant === "cards";
  const ratingLabel = rating.toFixed(1).replace(".", ",");

  const mapsLink = (
    <button
      type="button"
      onClick={handleOpenGoogleMaps}
      className="inline-flex min-h-[44px] shrink-0 items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
    >
      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
      Ver no Google Maps
    </button>
  );

  const faqItems = faq.map((item, i) => (
    <Section key={`faq-${i}`} variant={variant} title={item.q}>
      <p className="m-0 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
    </Section>
  ));

  return (
    <div className={cn(isCards ? "space-y-2.5" : "border-b border-[#ebebeb]", className)}>
      {/* Localização — sempre acima do "Sobre" */}
      <Section variant={variant} title="Localização" aside={mapsLink}>
        <MapWhenVisible
          name={name}
          latitude={coords[0]}
          longitude={coords[1]}
          address={establishment.addressLabel}
        />
        {establishment.addressLabel && (
          <p className="mt-2 mb-0 text-sm leading-snug text-muted-foreground break-words">
            {establishment.addressLabel}
          </p>
        )}
      </Section>

      <Section variant={variant} title="Sobre">
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">{about}</p>
      </Section>

      <Section variant={variant} title="O que inclui">
        <div className="space-y-2">
          {includes.included.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2 border-t border-[#ebebeb] pt-3">
          <p className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Não incluído</p>
          {includes.notIncluded.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" aria-hidden="true" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section variant={variant} title="Importante">
        <ul className="m-0 list-none space-y-2 p-0">
          {importantNotes.map((note, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-px font-bold text-primary" aria-hidden="true">•</span>
              {note}
            </li>
          ))}
        </ul>
      </Section>

      {/* Perguntas frequentes: no desktop cada pergunta é uma linha; no celular ficam num cartão só */}
      {isCards ? (
        <Section variant={variant} title="Perguntas frequentes">
          <div>
            {faq.map((item, i) => (
              <Section key={i} variant="list" title={<span className="text-sm">{item.q}</span>}>
                <p className="m-0 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </Section>
            ))}
          </div>
        </Section>
      ) : (
        faqItems
      )}

      <Section
        variant={variant}
        title={
          <span className="inline-flex items-center gap-1.5">
            Avaliações
            <span aria-hidden="true">·</span>
            <Star className="h-3.5 w-3.5 fill-foreground text-foreground" aria-hidden="true" />
            <span>{ratingLabel}</span>
          </span>
        }
      >
        <div className="space-y-3">
          {reviews.slice(0, 3).map((review, i) => (
            <div key={i} className="border-b border-[#ebebeb] pb-3 last:border-0 last:pb-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{review.name}</span>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
              <div className="mb-1 flex items-center gap-0.5" aria-label={`${review.rating} de 5 estrelas`}>
                {[...Array(5)].map((_, s) => (
                  <Star
                    key={s}
                    className={`h-3 w-3 ${s < review.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30"}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">{review.comment}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
