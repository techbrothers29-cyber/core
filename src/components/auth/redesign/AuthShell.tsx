import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import logoDesktop from "@/assets/logo-desktop.png";

interface AuthShellProps {
  /**
   * Título da barra superior do celular (com o X de fechar/voltar).
   * Sem título, o celular mostra só a logo (como no seletor de acesso).
   */
  mobileTitle?: string;
  /** Faixa com a logo no desktop. Desligue se a rota passar a ter o cabeçalho global. */
  showDesktopBrand?: boolean;
  children: ReactNode;
}

/** Largura e margens comuns às telas de login (mesma grade do restante do site). */
export const AUTH_CONTAINER = "w-full max-w-[1100px] mx-auto px-5 md:px-8";

const Brand = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    aria-label="Bah Ofertas — ir para a página inicial"
    className={`inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
  >
    <img src={logoDesktop} alt="" className="h-9 w-auto md:h-10" width={200} height={80} decoding="async" />
  </Link>
);

/**
 * Moldura das telas de autenticação no novo visual.
 * Celular: barra de 56px com X (volta para a tela anterior; sem histórico, vai para a Home).
 * Desktop: faixa fina com a logo.
 */
const AuthShell = ({ mobileTitle, showDesktopBrand = true, children }: AuthShellProps) => {
  const navigate = useNavigate();

  const handleClose = () => {
    // O React Router guarda a posição no histórico em history.state.idx.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/", { replace: true });
  };

  return (
    <div className="font-jakarta min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      {mobileTitle ? (
        <div className="md:hidden sticky top-0 z-20 flex h-14 items-center border-b border-[#ebebeb] dark:border-border bg-background">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar e voltar"
            className="ml-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
          </button>
          <p className="flex-1 truncate text-center text-[15px] font-semibold">{mobileTitle}</p>
          <span className="mr-1.5 h-11 w-11 shrink-0" aria-hidden="true" />
        </div>
      ) : (
        <div className={`md:hidden ${AUTH_CONTAINER} pt-6`}>
          <Brand />
        </div>
      )}

      {showDesktopBrand && (
        <div className="hidden md:block border-b border-[#ebebeb] dark:border-border">
          <div className={`${AUTH_CONTAINER} flex h-[72px] items-center justify-between`}>
            <Brand />
            <Link
              to="/"
              className="rounded-lg px-2 py-2 text-sm font-medium text-[#6b6b6b] dark:text-muted-foreground hover:text-foreground hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Voltar para o início
            </Link>
          </div>
        </div>
      )}

      <main>{children}</main>
    </div>
  );
};

export default AuthShell;
