import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [socialUrls, setSocialUrls] = useState({
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    twitter: "https://twitter.com",
  });

  useEffect(() => {
    const fetchSocialUrls = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ["facebook_url", "instagram_url", "twitter_url"]);

      if (data) {
        const urls = {
          facebook: (data.find((d) => d.key === "facebook_url")?.value as string) || "https://facebook.com",
          instagram:
            (data.find((d) => d.key === "instagram_url")?.value as string) || "https://instagram.com/bahofertas.rs",
          twitter: (data.find((d) => d.key === "twitter_url")?.value as string) || "https://twitter.com",
        };
        setSocialUrls(urls);
      }
    };

    fetchSocialUrls();
  }, []);
  const userLinks = [
    { title: "Hotéis em Gramado", href: "/hoteis-em-gramado" },
    { title: "Hotéis em Canela", href: "/hoteis-em-canela" },
    { title: "Pousadas em Gramado", href: "/pousadas-em-gramado" },
    { title: "Hotéis baratos em Gramado", href: "/hoteis-baratos-em-gramado" },
    { title: "Hotéis na Serra Gaúcha", href: "/hoteis-na-serra-gaucha" },
    { title: "Ofertas em Gramado", href: "/ofertas-em-gramado" },
    { title: "Ofertas em Canela", href: "/ofertas-em-canela" },
    { title: "Passeios em Gramado", href: "/passeios-em-gramado" },
    { title: "Restaurantes em Gramado", href: "/restaurantes-em-gramado" },
  ];
  const partnerLinks = [
    { title: "Área do Parceiro", href: "/parceiro/login" },
    { title: "Programa de Afiliados", href: "/programa-afiliados" },
  ];
  const socialLinks = [
    {
      icon: Facebook,
      href: socialUrls.facebook,
      label: "Facebook",
    },
    {
      icon: Instagram,
      href: socialUrls.instagram,
      label: "Instagram",
    },
    {
      icon: Twitter,
      href: socialUrls.twitter,
      label: "Twitter",
    },
  ];
  return (
    <footer className="relative bg-gradient-to-b from-card/95 via-card to-card/90 backdrop-blur-xl border-t border-border/60 mt-2 overflow-hidden">
      {/* Rich decorative elements */}
      <div className="absolute top-8 left-16 w-10 h-10 md:w-14 md:h-14 bg-primary/15 rounded-full blur-sm animate-pulse" />
      <div className="absolute top-20 right-20 w-6 h-6 md:w-8 md:h-8 bg-accent/20 rounded-full blur-sm animate-pulse delay-600" />
      <div className="absolute top-4 right-8 w-3 h-12 md:h-16 bg-gradient-to-b from-primary/10 to-transparent animate-pulse delay-300" />
      <div className="absolute top-32 left-8 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-secondary/12 to-transparent rounded-2xl blur-md animate-pulse delay-900" />
      <div className="absolute bottom-20 left-1/4 w-20 h-1 md:w-28 md:h-1 bg-gradient-to-r from-transparent via-primary/8 to-transparent rotate-6 animate-pulse delay-900" />
      <div className="absolute top-1/2 right-8 w-4 h-16 md:h-20 bg-gradient-to-b from-transparent via-secondary/6 to-transparent animate-pulse delay-1300" />
      <div className="absolute bottom-8 right-1/3 w-8 h-8 md:w-10 md:h-10 border border-accent/15 rounded-lg animate-pulse delay-1100" />
      <div className="absolute bottom-32 left-1/3 w-2 h-8 md:h-12 bg-gradient-to-b from-red-500/8 to-transparent animate-pulse delay-1500" />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>

      <div className="container mx-auto px-4 pt-4 pb-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-12">
          {/* Brand Section */}
          <div className="space-y-4 md:space-y-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4 md:mb-6">
              <div className="relative">
                <img
                  src="/lovable-uploads/878abd68-logo-280.png"
                  alt="Bah Ofertas — Descontos em Porto Alegre e Serra Gaúcha"
                  width={280}
                  height={280}
                  loading="lazy"
                  decoding="async"
                  className="h-28 md:h-24 lg:h-28 w-auto relative z-10"
                />
                <div className="absolute inset-0 bg-primary/20 blur-lg scale-110 -z-10"></div>
              </div>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed mx-auto md:mx-0 max-w-sm px-4 md:px-0">
              As melhores ofertas de Porto Alegre e Serra Gaúcha estão aqui. Descontos exclusivos em Gramado, Canela,
              Caxias do Sul e região.
            </p>

            {/* Social Links */}
            <div className="flex items-center justify-center md:justify-start gap-2">
              {socialLinks.map((social, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 hover:bg-primary/20 hover:text-primary hover:scale-110 transition-all duration-200 rounded-xl"
                  asChild
                >
                  <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                    <social.icon className="w-5 h-5" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Cidades Atendidas e Para Parceiros - Lado a Lado */}
          <div className="grid grid-cols-2 gap-6 md:gap-8">
            {/* Para Usuários */}
            <div className="space-y-4 md:space-y-6 text-center md:text-left">
              <h3 className="text-foreground font-bold text-base md:text-lg mb-4 md:mb-6 tracking-wide relative inline-block">
                Hospedagem e Ofertas
                <div className="absolute -bottom-2 left-0 right-0 md:right-auto w-full md:w-8 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full"></div>
              </h3>
              <ul className="space-y-3">
                {userLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground text-sm font-medium hover:text-primary transition-all duration-200 hover:translate-x-2 inline-block leading-relaxed group"
                    >
                      <span className="relative">
                        {link.title}
                        <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Para Parceiros */}
            <div className="space-y-4 md:space-y-6 text-center md:text-left">
              <h3 className="text-foreground font-bold text-base md:text-lg mb-4 md:mb-6 tracking-wide relative inline-block">
                Para Parceiros
                <div className="absolute -bottom-2 left-0 right-0 md:right-auto w-full md:w-8 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full"></div>
              </h3>
              <ul className="space-y-4">
                {partnerLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground text-sm font-medium hover:text-primary transition-all duration-200 hover:translate-x-2 inline-block leading-relaxed group"
                    >
                      <span className="relative">
                        {link.title}
                        <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4 md:space-y-6">
            <h3 className="text-foreground font-bold text-base md:text-lg mb-4 md:mb-6 tracking-wide relative inline-block md:block text-center md:text-left">
              Contato
              <div className="absolute -bottom-2 left-0 right-0 md:right-auto w-full md:w-8 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full"></div>
            </h3>
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors duration-200">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <a
                  href="mailto:contato@bahofertas.com"
                  className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors leading-relaxed"
                >
                  contato@bahofertas.com
                </a>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors duration-200">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <a
                  href="https://wa.me/5554999978084"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground text-sm font-medium hover:text-primary transition-colors leading-relaxed"
                >
                  (54) 99997-8084
                </a>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors duration-200">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <span className="text-muted-foreground text-sm font-medium leading-relaxed">
                  Serra Gaúcha-RS
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="relative mt-8 md:mt-12 pt-6 md:pt-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <p className="text-muted-foreground text-xs md:text-sm font-medium text-center md:text-left">
              © {currentYear} <span className="text-primary font-semibold">Bah Ofertas</span>. Todos os direitos
              reservados.
            </p>
            <div className="flex items-center gap-4 md:gap-6">
              <Link
                to="/termos"
                className="text-muted-foreground text-xs md:text-sm font-medium hover:text-primary transition-colors duration-200 relative group"
              >
                Termos de Uso
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link
                to="/privacidade"
                className="text-muted-foreground text-xs md:text-sm font-medium hover:text-primary transition-colors duration-200 relative group"
              >
                Política de Privacidade
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
