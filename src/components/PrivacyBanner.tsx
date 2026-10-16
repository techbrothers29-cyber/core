import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Cookie } from "lucide-react";
import { ALL_ON, CONSENT_EVENT, ONLY_NECESSARY, getConsent, saveConsent } from "@/lib/consent";

const PrivacyBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setIsVisible(!getConsent());
    const hide = () => setIsVisible(false);
    window.addEventListener(CONSENT_EVENT, hide);
    return () => window.removeEventListener(CONSENT_EVENT, hide);
  }, []);

  // Na própria tela de configurações o aviso só atrapalharia.
  if (!isVisible || pathname === "/cookies-config") return null;

  return (
    // Celular: cartão flutuante acima da barra de navegação inferior (64px + área segura do iPhone).
    // Desktop: cartão no canto inferior esquerdo.
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed z-[60] inset-x-3 bottom-[calc(64px_+_env(safe-area-inset-bottom)_+_12px)] md:inset-x-auto md:left-6 md:bottom-6 md:max-w-[440px] rounded-2xl border border-[#ebebeb] bg-card shadow-[0_12px_40px_rgba(0,0,0,0.18)] font-jakarta"
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="hidden sm:flex w-9 h-9 shrink-0 rounded-full bg-primary/10 text-primary items-center justify-center">
            <Cookie className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="m-0 text-[13px] md:text-sm leading-relaxed text-foreground">
            Usamos cookies para o site funcionar e, com a sua permissão, para medir visitas e mostrar anúncios relevantes.{" "}
            <Link to="/cookies-config" className="font-semibold underline underline-offset-2">
              Personalizar
            </Link>{" "}
            ·{" "}
            <Link to="/privacidade" className="font-semibold underline underline-offset-2">
              Privacidade
            </Link>
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => saveConsent(ONLY_NECESSARY)}
            className="h-11 inline-flex items-center justify-center rounded-xl border border-[#dddddd] text-sm font-semibold text-foreground hover:bg-[#f7f7f7]"
          >
            Só necessários
          </button>
          <button
            type="button"
            onClick={() => saveConsent(ALL_ON)}
            className="h-11 inline-flex items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyBanner;
