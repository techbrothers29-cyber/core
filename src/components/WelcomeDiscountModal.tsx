import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const DISMISS_KEY = "bah-welcome-offer-dismissed";
const SHOW_DELAY_MS = 2500;

/**
 * Modal de primeira visita: oferece 5% OFF na compra total para quem se cadastrar.
 * - Aparece apenas para visitantes NÃO autenticados, uma única vez (localStorage).
 * - Pode ser dispensado pelo X, tocando fora (overlay), tecla ESC ou "Agora não".
 * - Responsivo: bottom-sheet no mobile, card centralizado no desktop.
 */
const WelcomeDiscountModal = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    let dismissed = false;
    let referred = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      // Visitantes vindos de link de afiliado não recebem o bônus de boas-vindas
      referred =
        !!localStorage.getItem("referrer_affiliate_code") ||
        !!new URLSearchParams(window.location.search).get("ref");
    } catch {}
    if (dismissed || referred) return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading, user]);

  useEffect(() => {
    if (!visible) return;
    document.body.classList.add('welcome-modal-active');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove('welcome-modal-active');
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Esconde imediatamente se o usuário logar com o modal aberto
  useEffect(() => {
    if (user) setVisible(false);
  }, [user]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setVisible(false);
  };

  const handleCta = () => {
    dismiss();
    navigate("/auth?mode=signup");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-discount-title"
    >
      {/* Overlay — tocar fora dispensa a oferta */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={dismiss}
      />

      <div className="relative w-full sm:max-w-md bg-card text-card-foreground border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 animate-fadeInUp overflow-hidden" style={{ animationDuration: "0.45s" }}>
        {/* Brilho decorativo da marca */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-success/10 blur-2xl" />

        <button
          onClick={dismiss}
          aria-label="Fechar oferta"
          className="overlay-close top-3 right-3"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative flex flex-col items-center text-center">
          <img
            src="/logo-desktop.png"
            alt="Bah Ofertas"
            className="h-8 w-auto mb-5"
            loading="lazy"
          />

          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <span className="absolute -top-2 -right-8 inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-md rotate-3">
              <Sparkles className="w-3 h-3" />
              5% OFF
            </span>
          </div>

          <h2
            id="welcome-discount-title"
            className="text-[1.75rem] sm:text-[2.25rem] font-black text-foreground mb-3 leading-tight tracking-tight"
          >
            Bah, parabéns! 🎉
          </h2>

          <p className="text-base sm:text-lg text-foreground/90 font-semibold leading-relaxed mb-2">
            Além dos{" "}
            <span className="font-black text-primary">5% de desconto</span>,
            economize até{" "}
            <span className="font-black text-primary">70%</span> na sua viagem
            com o Bah Ofertas!
          </p>
          <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed mb-6">
            Aproveite este momento — sua viagem se inicia com economia no Bah
            Ofertas!
          </p>

          <Button
            onClick={handleCta}
            size="lg"
            className="w-full h-12 text-base font-bold shadow-lg"
          >
            Cadastre-se e ganhe 5% OFF
          </Button>

          <button
            onClick={dismiss}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Agora não, obrigado
          </button>

          <p className="mt-4 text-[11px] text-muted-foreground/80">
            Desconto aplicado automaticamente no checkout após o cadastro. Válido
            para 1 compra.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDiscountModal;
