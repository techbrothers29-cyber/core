import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Headset,
  BadgePercent,
  ChevronDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoDesktop from "@/assets/logo-desktop.png";

type FooterLink = { title: string; href: string };

const SECTIONS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Hospedagem",
    links: [
      { title: "Hotéis em Gramado", href: "/hoteis-em-gramado" },
      { title: "Hotéis em Canela", href: "/hoteis-em-canela" },
      { title: "Pousadas em Gramado", href: "/pousadas-em-gramado" },
      { title: "Hotéis baratos em Gramado", href: "/hoteis-baratos-em-gramado" },
      { title: "Hotéis na Serra Gaúcha", href: "/hoteis-na-serra-gaucha" },
    ],
  },
  {
    title: "Ofertas e passeios",
    links: [
      { title: "Ofertas em Gramado", href: "/ofertas-em-gramado" },
      { title: "Ofertas em Canela", href: "/ofertas-em-canela" },
      { title: "Passeios em Gramado", href: "/passeios-em-gramado" },
      { title: "Restaurantes em Gramado", href: "/restaurantes-em-gramado" },
    ],
  },
  {
    title: "Para parceiros",
    links: [
      { title: "Área do Parceiro", href: "/parceiro/login" },
      { title: "Programa de Afiliados", href: "/programa-afiliados" },
    ],
  },
];

const TRUST = [
  { icon: ShieldCheck, title: "Pagamento seguro", text: "PIX ou cartão de crédito" },
  { icon: BadgePercent, title: "Descontos exclusivos", text: "Hospedagem, passeios e restaurantes" },
  { icon: Headset, title: "Atendimento humano", text: "Fale com a gente pelo WhatsApp" },
];

const WHATSAPP_URL = "https://wa.me/5554999978084";

/** URL genérica (ex.: "https://facebook.com") = rede não configurada: não mostra o ícone. */
const isRealProfile = (url?: string | null) => {
  if (!url) return false;
  try {
    return new URL(url).pathname.replace(/\/+$/, "").length > 0;
  } catch {
    return false;
  }
};

const linkClass =
  "inline-flex items-center min-h-[40px] lg:min-h-0 lg:py-[3px] text-sm text-[#5c5c5c] hover:text-primary transition-colors";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [socialUrls, setSocialUrls] = useState<{ facebook?: string; instagram?: string; twitter?: string }>({
    instagram: "https://instagram.com/bahofertas.rs",
  });

  useEffect(() => {
    let active = true;
    supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["facebook_url", "instagram_url", "twitter_url"])
      .then(({ data }) => {
        if (!active || !data) return;
        const get = (k: string) => {
          const v = data.find((d) => d.key === k)?.value as string | undefined;
          return isRealProfile(v) ? v : undefined;
        };
        setSocialUrls({
          facebook: get("facebook_url"),
          instagram: get("instagram_url") || "https://instagram.com/bahofertas.rs",
          twitter: get("twitter_url"),
        });
      });
    return () => {
      active = false;
    };
  }, []);

  const socialLinks = [
    { icon: Instagram, href: socialUrls.instagram, label: "Instagram" },
    { icon: Facebook, href: socialUrls.facebook, label: "Facebook" },
    { icon: Twitter, href: socialUrls.twitter, label: "X (Twitter)" },
  ].filter((s) => isRealProfile(s.href));

  return (
    <footer className="font-jakarta text-foreground bg-white border-t border-[#ebebeb]">
      {/* Faixa de confiança */}
      <div className="bg-[#fafafa] border-b border-[#ebebeb]">
        <ul className="w-full max-w-[1600px] mx-auto px-5 md:px-8 py-5 md:py-6 m-0 list-none grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="w-11 h-11 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="leading-tight">
                <b className="block text-sm font-bold">{title}</b>
                <span className="text-[13px] text-[#6b6b6b]">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Conteúdo principal */}
      <div className="w-full max-w-[1600px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-4 md:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_0.9fr_auto] gap-x-10">
          {/* Marca */}
          <div className="pb-6 lg:pb-0">
            <Link to="/" aria-label="Bah Ofertas — página inicial" className="inline-block">
              <img src={logoDesktop} alt="Bah Ofertas" width={200} height={80} loading="lazy" decoding="async" className="h-14 md:h-16 w-auto" />
            </Link>
            <p className="m-0 mt-4 max-w-sm text-sm leading-relaxed text-[#5c5c5c]">
              As melhores ofertas de Porto Alegre e da Serra Gaúcha em um só lugar. Descontos exclusivos em Gramado,
              Canela, Caxias do Sul e região.
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Bah Ofertas no ${s.label}`}
                    className="w-11 h-11 inline-flex items-center justify-center rounded-full border border-[#dddddd] text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <s.icon className="w-[18px] h-[18px]" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Colunas de links: lista aberta no desktop, sanfona no celular (links sempre no HTML para SEO) */}
          {SECTIONS.map((section) => (
            <nav key={section.title} aria-label={section.title} className="border-t border-[#ebebeb] lg:border-t-0">
              <details className="group lg:hidden">
                <summary className="flex items-center justify-between min-h-[52px] cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[15px] font-bold">
                  {section.title}
                  <ChevronDown className="w-5 h-5 text-[#6b6b6b] transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ul className="m-0 p-0 pb-3 list-none">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className={linkClass}>
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
              <div className="hidden lg:block">
                <h2 className="m-0 mb-4 text-[15px] font-bold">{section.title}</h2>
                <ul className="m-0 p-0 list-none space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className={linkClass}>
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          ))}

          {/* Atendimento */}
          <div className="border-t border-[#ebebeb] lg:border-t-0 pt-5 lg:pt-0">
            <h2 className="m-0 mb-4 text-[15px] font-bold">Atendimento</h2>
            <ul className="m-0 p-0 list-none space-y-3">
              <li>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 min-h-[44px]">
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-[#25d366]/10 text-[#128c4a] flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-xs text-[#6b6b6b]">WhatsApp</span>
                    <b className="text-sm font-semibold group-hover:text-primary transition-colors">(54) 99997-8084</b>
                  </span>
                </a>
              </li>
              <li>
                <a href="mailto:contato@bahofertas.com" className="group flex items-center gap-3 min-h-[44px]">
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="leading-tight min-w-0">
                    <span className="block text-xs text-[#6b6b6b]">E-mail</span>
                    <b className="text-sm font-semibold break-words group-hover:text-primary transition-colors">contato@bahofertas.com</b>
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-3 min-h-[44px]">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-[#f2f2f2] text-[#5c5c5c] flex items-center justify-center">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="leading-tight">
                  <span className="block text-xs text-[#6b6b6b]">Região</span>
                  <b className="text-sm font-semibold">Serra Gaúcha, RS</b>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Barra final */}
      <div className="bg-[#1f1f1f] text-white/75">
        <div className="w-full max-w-[1600px] mx-auto px-5 md:px-8 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[13px]">
          <p className="m-0">
            © {currentYear} <span className="text-white font-semibold">Bah Ofertas</span>. Todos os direitos reservados.
          </p>
          <nav aria-label="Informações legais" className="flex flex-wrap items-center gap-x-5">
            <Link to="/termos" className="inline-flex items-center min-h-[40px] md:min-h-0 hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="inline-flex items-center min-h-[40px] md:min-h-0 hover:text-white transition-colors">
              Política de Privacidade
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
