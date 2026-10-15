import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/** Faixa "5% OFF" para visitantes sem login. Leva ao mesmo cadastro do modal de boas-vindas. */
const HomeSignupStrip = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading || user) return null;

  const go = () => navigate("/auth?mode=signup");

  return (
    <div className="px-5 md:px-8 mt-5 md:mt-7">
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between gap-6 max-w-[1280px] mx-auto bg-[#fff1f1] dark:bg-primary/10 rounded-2xl px-6 py-4">
        <p className="m-0 text-[15px] text-foreground">
          <b className="text-primary">5% OFF</b> na primeira compra. Cadastre-se e economize até 70% na viagem.
        </p>
        <button
          type="button"
          onClick={go}
          className="shrink-0 h-11 px-6 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Cadastrar
        </button>
      </div>
      {/* Celular */}
      <button
        type="button"
        onClick={go}
        className="md:hidden w-full flex items-center gap-3 text-left bg-muted rounded-2xl px-4 py-3.5"
      >
        <span className="flex-1">
          <b className="block text-sm font-semibold text-foreground">Cadastre-se e ganhe 5% OFF</b>
          <span className="block text-xs text-muted-foreground mt-0.5">Economize até 70% na sua viagem</span>
        </span>
        <ChevronRight className="w-[18px] h-[18px] text-foreground" strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
};

export default HomeSignupStrip;
