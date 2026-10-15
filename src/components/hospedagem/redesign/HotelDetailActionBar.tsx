import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

interface Props {
  reserveHref: string;
}

/**
 * Barra fixa inferior (celular e tablet) com o botão de disponibilidade.
 * Vai direto para o <body>: o PageTransition aplica transform no conteúdo da rota,
 * o que prenderia um elemento "fixed" ao fim da página.
 */
const HotelDetailActionBar: React.FC<Props> = ({ reserveHref }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#ebebeb] pb-[env(safe-area-inset-bottom)] font-jakarta">
      <div className="h-20 px-5 md:px-8 flex items-center justify-between gap-3">
        <div className="min-w-0 leading-tight">
          <p className="m-0 text-sm font-semibold text-foreground">Sem taxa extra</p>
          <p className="m-0 text-xs text-muted-foreground">Preços em tempo real</p>
        </div>
        <Link
          to={reserveHref}
          className="shrink-0 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition"
        >
          Ver disponibilidade
        </Link>
      </div>
    </div>,
    document.body,
  );
};

export default HotelDetailActionBar;
