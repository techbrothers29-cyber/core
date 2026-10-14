import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Info, CheckCircle2, XCircle, AlertTriangle, Star, MapPin, MessageSquare, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { Establishment, EstablishmentCategory } from "@/data/novaxs-establishments";

// Mapbox is heavy — load the map chunk only when this sidebar actually renders.
const EstablishmentMap = lazy(() => import("./EstablishmentMap"));

/**
 * Renders the map only when the container is actually visible in the viewport.
 * The page renders two sidebars (desktop + mobile) and only one is displayed,
 * so this also guarantees a single Mapbox instance per page.
 */
function MapWhenVisible(props: { name: string; latitude: number; longitude: number; address?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Só monta o Mapbox quando a seção está perto da viewport E o navegador já
  // está ocioso. O Mapbox é um chunk WebGL pesado: inicializá-lo na primeira
  // pintura disputa a thread principal com o render dos cards/produtos e gera
  // o "travamento" percebido ao abrir a página. Deferimos para depois que o
  // conteúdo já apareceu, então o mapa carrega sem bloquear o usuário.
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
      // Sem observer, aguarda apenas o idle para não travar a primeira pintura.
      const schedule = () => {
        if (typeof requestIdleCallback === "function") idleId = requestIdleCallback(() => release());
        else rafId = requestAnimationFrame(() => release());
      };
      schedule();
      return () => {
        released = true;
        io?.disconnect();
        if (idleId !== undefined && typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
        if (rafId !== undefined) cancelAnimationFrame(rafId);
      };
    }

    io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // Dentro da janela: espera o navegador ocioso (thread livre) antes de
          // baixar/inicializar o Mapbox, sem prejudicar a percepção de fluidez.
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
    <div ref={ref} className="h-[180px] lg:h-[220px] w-full">
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


// Mock data generators based on establishment
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

// Per-company opening dates: reviews dated before this are filtered out
// because the establishment didn't exist yet.
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
  // Show most recent first; cap at the number of names available
  const dates = validDates.slice(0, names.length).map((d) => d.label);

  return dates.map((dateLabel, i) => ({
    name: names[i],
    rating: Math.max(4, Math.min(5, Math.round(rating + (Math.random() - 0.5)))),
    comment: comments[i],
    date: dateLabel,
  }));
}

// Establishment coordinates mock (Serra Gaúcha area)
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
  // Slightly randomize around Gramado center
  return [
    -29.3740 + (Math.random() - 0.5) * 0.02,
    -50.8750 + (Math.random() - 0.5) * 0.02,
  ];
}

interface Props {
  establishment: Establishment;
}

export default function EstablishmentSidebar({ establishment }: Props) {
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
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isIncludesOpen, setIsIncludesOpen] = useState(false);
  const [isImportantOpen, setIsImportantOpen] = useState(false);
  const coords = useMemo<[number, number]>(() => {
    // Prefer admin-defined coordinates when available
    if (
      typeof establishment.latitude === 'number' &&
      typeof establishment.longitude === 'number' &&
      !Number.isNaN(establishment.latitude) &&
      !Number.isNaN(establishment.longitude)
    ) {
      return [establishment.latitude, establishment.longitude];
    }
    return getCoordinates(establishment.name);
  }, [establishment.name, establishment.latitude, establishment.longitude]);

  // Always link to the exact pin coordinates so it matches what the user sees on the map.
  // The address label is included as the visible query text when available.
  const mapsQuery = establishment.addressLabel?.trim() || name;
  const googleMapsUrl = `https://maps.google.com/maps?q=${coords[0]},${coords[1]}(${encodeURIComponent(mapsQuery)})&ll=${coords[0]},${coords[1]}&z=18&t=h&hl=pt-BR&gl=BR`;

  const handleOpenGoogleMaps = () => {
    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      {/* 0. Mapa / Localização — sempre acima do "Sobre" (desktop e mobile) */}
      <Card className="border-border/60 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Localização
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <MapWhenVisible
            name={name}
            latitude={coords[0]}
            longitude={coords[1]}
            address={establishment.addressLabel}
          />

          <div className="px-4 py-3 space-y-1 border-t border-border/40">
            {establishment.addressLabel && (
              <p className="text-xs text-muted-foreground leading-snug break-words">
                {establishment.addressLabel}
              </p>
            )}
            <button
              type="button"
              onClick={handleOpenGoogleMaps}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <MapPin className="w-3 h-3" />
              Ver no Google Maps
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 1. Sobre */}
      <Card className="border-border/60">
        <button
          type="button"
          onClick={() => setIsAboutOpen((v) => !v)}
          aria-expanded={isAboutOpen}
          className="w-full text-left"
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Sobre
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${isAboutOpen ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
        </button>
        {isAboutOpen && (
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground leading-relaxed">{about}</p>
          </CardContent>
        )}
      </Card>

      {/* 2. O que inclui */}
      <Card className="border-border/60">
        <button
          type="button"
          onClick={() => setIsIncludesOpen((v) => !v)}
          aria-expanded={isIncludesOpen}
          className="w-full text-left"
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              O que inclui
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${isIncludesOpen ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
        </button>
        {isIncludesOpen && (
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              {includes.included.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/40 pt-2 space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Não incluído</p>
              {includes.notIncluded.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <XCircle className="w-3.5 h-3.5 text-destructive/70 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* 3. Importante */}
      <Card className="border-warning/30 bg-warning/5">
        <button
          type="button"
          onClick={() => setIsImportantOpen((v) => !v)}
          aria-expanded={isImportantOpen}
          className="w-full text-left"
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Importante
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${isImportantOpen ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
        </button>
        {isImportantOpen && (
          <CardContent className="px-4 pb-4">
            <ul className="space-y-1.5">
              {importantNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="text-warning font-bold mt-px">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>


      {/* 5. Perguntas Frequentes */}
      <Card className="border-border/60">
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-2">
          <Accordion type="single" collapsible className="w-full">
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
                <AccordionTrigger className="text-xs font-medium py-3 hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground pb-3">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* 6. Avaliações */}
      <Card className="border-border/60">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Star className="w-4 h-4 text-warning fill-warning" />
            Avaliações
            <Badge variant="secondary" className="text-[10px] ml-auto">{rating.toFixed(1)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {reviews.slice(0, 3).map((review, i) => (
            <div key={i} className="border-b border-border/30 last:border-0 pb-2.5 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">{review.name}</span>
                <span className="text-[10px] text-muted-foreground">{review.date}</span>
              </div>
              <div className="flex items-center gap-0.5 mb-1">
                {[...Array(5)].map((_, s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${s < review.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
