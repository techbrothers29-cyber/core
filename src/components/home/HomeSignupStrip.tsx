import { useNavigate } from "react-router-dom";
import { ChevronRight, Gift } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { HOME_CONTAINER } from "@/components/home/layout";

/**
 * Faixa "5% OFF" para visitantes sem login. Leva ao mesmo cadastro do modal de boas-vindas.
 * Como na proposta: no desktop fica no topo (faixa rosa); no celular, entre os dois primeiros
 * carrosséis (cartão cinza). `variant` escolhe qual das duas posições este bloco ocupa.
 */
const HomeSignupStrip = ({ variant }: { variant: "desktop" | "mobile" }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading || user) return null;

  const go = () => navigate("/auth?mode=signup");

  if (variant === "mobile") {
    return (
      <div className={`${HOME_CONTAINER} md:hidden mt-6`}>
        <button
          type="button"
          onClick={go}
          className="w-full flex items-center gap-3 text-left bg-gradient-to-r from-[#fff1f1] to-[#fff7ec] border border-[#ffe1e1] rounded-2xl px-4 py-3.5"
        >
          <span className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Gift className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <b className="block text-sm font-semibold text-foreground">Cadastre-se e ganhe 5% OFF</b>
            <span className="block text-xs text-muted-foreground mt-0.5">Economize até 70% na sua viagem</span>
          </span>
          <ChevronRight className="w-[18px] h-[18px] text-foreground" strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={`${HOME_CONTAINER} hidden md:block mt-5`}>
      <div className="flex items-center justify-between gap-6 bg-gradient-to-r from-[#fff1f1] to-[#fff7ec] dark:bg-primary/10 border border-[#ffe1e1] rounded-2xl px-6 py-4">
        <p className="m-0 flex items-center gap-3 text-[15px] text-foreground">
          <span className="w-10 h-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Gift className="w-5 h-5" aria-hidden="true" />
          </span>
          <span>
          <b className="text-primary">5% OFF</b> na primeira compra. Cadastre-se e economize até 70% na viagem.
          </span>
        </p>
        <button
          type="button"
          onClick={go}
          className="shrink-0 h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Cadastrar
        </button>
      </div>
    </div>
  );
};

export default HomeSignupStrip;
