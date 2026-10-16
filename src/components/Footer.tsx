import {
  MapPin,
  ShieldCheck,
  Headset,
  BadgePercent,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoDesktop from "@/assets/logo-desktop.png";
import gmailIcon from "@/assets/icon-gmail.png";
import instagramIcon from "@/assets/icon-instagram.png";
import facebookIcon from "@/assets/icon-facebook.png";
import xIcon from "@/assets/icon-x.png";
import tiktokIcon from "@/assets/icon-tiktok.png";
import kwaiIcon from "@/assets/icon-kwai.png";

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

const SOCIALS = [
  { key: "instagram", label: "Instagram", icon: instagramIcon },
  { key: "facebook", label: "Facebook", icon: facebookIcon },
  { key: "tiktok", label: "TikTok", icon: tiktokIcon },
  { key: "kwai", label: "Kwai", icon: kwaiIcon },
  { key: "twitter", label: "X", icon: xIcon },
];
const SOCIAL_DEFAULTS: Record<string, string> = {
  instagram: "https://instagram.com/bahofertas.rs",
  facebook: "https://www.facebook.com/bahofertas.rs",
  tiktok: "https://www.tiktok.com/@bahofertas.rs",
  kwai: "https://www.kwai.com/@bahofertas.rs",
  twitter: "https://x.com/bahofertas",
};

/** URL genérica (ex.: "https://facebook.com") = rede não configurada: não mostra o ícone. */
const isRealProfile = (url?: string | null) => {
  if (!url) return false;
  try {
    return new URL(url).pathname.replace(/\/+$/, "").length > 0;
  } catch {
    return false;
  }
};

/** Logotipo oficial do WhatsApp (glifo). */
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" focusable="false">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const linkClass =
  "inline-flex items-center min-h-[40px] lg:min-h-0 lg:py-[3px] text-sm text-[#5c5c5c] hover:text-primary transition-colors";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const isHome = useLocation().pathname === "/";
  // Links das redes: vêm de system_config quando cadastrados; senão, o perfil padrão @bahofertas.rs.
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>(SOCIAL_DEFAULTS);

  useEffect(() => {
    let active = true;
    supabase
      .from("system_config")
      .select("key, value")
      .in("key", SOCIALS.map((s) => `${s.key}_url`))
      .then(({ data }) => {
        if (!active || !data) return;
        const next = { ...SOCIAL_DEFAULTS };
        for (const s of SOCIALS) {
          const v = data.find((d) => d.key === `${s.key}_url`)?.value as string | undefined;
          if (isRealProfile(v)) next[s.key] = v as string;
        }
        setSocialUrls(next);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="font-jakarta text-foreground bg-white border-t border-[#ebebeb]">
      {/* Faixa de confiança (fora da página inicial) */}
      {!isHome && (
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
      )}

      {/* Conteúdo principal */}
      <div className="w-full max-w-[1600px] mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-4 md:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_0.9fr_auto] gap-x-10">
          {/* Marca */}
          <div className="pb-6 lg:pb-0 text-center lg:text-left">
            <Link to="/" aria-label="Bah Ofertas — página inicial" className="inline-block">
              <img src={logoDesktop} alt="Bah Ofertas" width={200} height={80} loading="lazy" decoding="async" className="h-14 md:h-16 w-auto" />
            </Link>
            <p className="m-0 mt-4 mx-auto lg:mx-0 max-w-sm text-sm leading-relaxed text-[#5c5c5c]">
              As melhores ofertas de Porto Alegre e da Serra Gaúcha em um só lugar. Descontos exclusivos em Gramado,
              Canela, Caxias do Sul e região.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Falar com a Bah Ofertas no WhatsApp"
                className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-95 transition"
              >
                <WhatsAppIcon className="w-6 h-6" />
              </a>
              {SOCIALS.map((s) => (
                <a
                  key={s.key}
                  href={socialUrls[s.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Bah Ofertas no ${s.label}`}
                  className="w-11 h-11 inline-flex items-center justify-center rounded-full hover:brightness-95 hover:scale-105 transition"
                >
                  <img src={s.icon} alt="" width={44} height={44} loading="lazy" className="w-11 h-11 object-contain" />
                </a>
              ))}
            </div>
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
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-[#25D366] text-white flex items-center justify-center">
                    <WhatsAppIcon className="w-6 h-6" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-xs text-[#6b6b6b]">WhatsApp</span>
                    <b className="text-sm font-semibold group-hover:text-primary transition-colors">(54) 99997-8084</b>
                  </span>
                </a>
              </li>
              <li>
                <a href="mailto:contato@bahofertas.com" className="group flex items-center gap-3 min-h-[44px]">
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-[#f7f7f7] flex items-center justify-center">
                    <img src={gmailIcon} alt="" width={24} height={24} className="w-6 h-6" />
                  </span>
                  <span className="leading-tight min-w-0">
                    <span className="block text-xs text-[#6b6b6b]">E-mail</span>
                    <b className="text-sm font-semibold break-words group-hover:text-primary transition-colors">contato@bahofertas.com</b>
                  </span>
                </a>
              </li>
              {!isHome && (
              <li className="flex items-center gap-3 min-h-[44px]">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-[#f2f2f2] text-[#5c5c5c] flex items-center justify-center">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="leading-tight">
                  <span className="block text-xs text-[#6b6b6b]">Região</span>
                  <b className="text-sm font-semibold">Serra Gaúcha, RS</b>
                </span>
              </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Barra final */}
      <div className="bg-white border-t border-[#ebebeb] text-[#5c5c5c]">
        <div className="w-full max-w-[1600px] mx-auto px-5 md:px-8 py-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[13px]">
          <p className="m-0">
            © {currentYear} <span className="text-foreground font-semibold">Bah Ofertas</span>. Todos os direitos reservados.
          </p>
          <nav aria-label="Informações legais" className="flex flex-wrap items-center gap-x-5">
            <Link to="/termos" className="inline-flex items-center min-h-[40px] md:min-h-0 hover:text-primary transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="inline-flex items-center min-h-[40px] md:min-h-0 hover:text-primary transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/cookies-config" className="inline-flex items-center min-h-[40px] md:min-h-0 hover:text-primary transition-colors">
              Preferências de cookies
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
