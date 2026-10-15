import { Facebook, Instagram, Twitter, Mail, MessageCircle, MapPin } from "lucide-react";
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

/** URL genérica (ex.: "https://facebook.com") = rede ainda não configurada: não mostra o ícone. */
const isRealProfile = (url?: string | null) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/+$/, "").length > 0;
  } catch {
    return false;
  }
};

const linkClass =
  "inline-flex items-center min-h-[40px] md:min-h-0 md:py-1 text-sm text-[#6b6b6b] hover:text-foreground hover:underline underline-offset-2 transition-colors";

/**
 * Rodapé no novo visual: fundo cinza claro, colunas de links simples,
 * contato direto e barra final com direitos, termos e redes sociais.
 * Mantém todos os links de antes (importantes para SEO).
 */
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
    <footer className="bg-[#f7f7f7] border-t border-[#ebebeb] font-jakarta text-foreground">
      <div className="w-full max-w-[1600px] mx-auto px-5 md:px-8 pt-8 md:pt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-x-8">
          {/* Marca */}
          <div className="pb-6 md:pb-8">
            <Link to="/" aria-label="Bah Ofertas — início" className="inline-block">
              <img
                src={logoDesktop}
                alt="Bah Ofertas"
                width={200}
                height={80}
                loading="lazy"
                decoding="async"
                className="h-12 md:h-14 w-auto"
              />
            </Link>
            <p className="m-0 mt-3 max-w-xs text-sm leading-relaxed text-[#6b6b6b]">
              Descontos em hospedagem, passeios e restaurantes em Gramado, Canela e toda a Serra Gaúcha.
            </p>
            <ul className="m-0 mt-5 p-0 list-none space-y-1">
              <li>
                <a href="https://wa.me/5554999978084" target="_blank" rel="noopener noreferrer" className={`${linkClass} gap-2`}>
                  <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  WhatsApp (54) 99997-8084
                </a>
              </li>
              <li>
                <a href="mailto:contato@bahofertas.com" className={`${linkClass} gap-2`}>
                  <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                  contato@bahofertas.com
                </a>
              </li>
              <li className="inline-flex items-center gap-2 min-h-[40px] md:min-h-0 md:py-1 text-sm text-[#6b6b6b]">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                Serra Gaúcha, RS
              </li>
            </ul>
          </div>

          {/* Colunas de links */}
          {SECTIONS.map((section) => (
            <nav
              key={section.title}
              aria-label={section.title}
              className="border-t border-[#dddddd] md:border-t-0 py-5 md:pt-0 md:pb-8"
            >
              <h2 className="m-0 mb-2 md:mb-3 text-sm font-bold text-foreground">{section.title}</h2>
              <ul className="m-0 p-0 list-none grid grid-cols-1 gap-x-6 md:block md:space-y-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className={linkClass}>
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Barra final */}
        <div className="border-t border-[#dddddd] py-5 flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-1 text-sm text-[#6b6b6b]">
            <span>© {currentYear} Bah Ofertas</span>
            <span aria-hidden="true">·</span>
            <Link to="/termos" className="inline-flex items-center min-h-[40px] md:min-h-0 hover:text-foreground hover:underline underline-offset-2">
              Termos de Uso
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacidade" className="inline-flex items-center min-h-[40px] md:min-h-0 hover:text-foreground hover:underline underline-offset-2">
              Privacidade
            </Link>
          </div>
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-1 -ml-2.5 md:ml-0 md:-mr-2.5">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Bah Ofertas no ${s.label}`}
                  className="w-11 h-11 inline-flex items-center justify-center rounded-full text-foreground hover:bg-black/5 transition-colors"
                >
                  <s.icon className="w-5 h-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
