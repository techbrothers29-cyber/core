import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const PrivacyBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem("privacy-policy-accepted")) setIsVisible(true);
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("privacy-policy-accepted", "true");
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    // Celular: cartão flutuante acima da barra de navegação inferior (64px + área segura do iPhone).
    // Desktop: cartão no canto inferior esquerdo.
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed z-[60] inset-x-3 bottom-[calc(64px+env(safe-area-inset-bottom)+12px)] md:inset-x-auto md:left-6 md:bottom-6 md:max-w-[440px] rounded-2xl border border-[#ebebeb] bg-card shadow-[0_12px_40px_rgba(0,0,0,0.18)] font-jakarta animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="hidden sm:flex w-9 h-9 shrink-0 rounded-full bg-primary/10 text-primary items-center justify-center">
            <Cookie className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="m-0 text-[13px] md:text-sm leading-relaxed text-foreground">
            Usamos cookies para melhorar o desempenho e a segurança do site e personalizar conteúdo e anúncios. Saiba mais na nossa{" "}
            <Link to="/privacidade" className="font-semibold underline underline-offset-2">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/cookies-config"
            className="h-11 inline-flex items-center justify-center rounded-xl border border-[#dddddd] text-sm font-semibold text-foreground hover:bg-[#f7f7f7]"
          >
            Configurar
          </Link>
          <button
            type="button"
            onClick={handleAccept}
            className="h-11 inline-flex items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Aceitar cookies
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyBanner;
