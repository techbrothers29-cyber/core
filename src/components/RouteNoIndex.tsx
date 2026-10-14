import React from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";

/**
 * SEO-only: emite `noindex, nofollow` nas rotas privadas/transacionais.
 * Não altera layout nem comportamento — apenas metadados para o Google.
 */
const NOINDEX_PREFIXES = [
  "/auth",
  "/login",
  "/auth-redirect",
  "/reset-password",
  "/completar-cadastro",
  "/checkout",
  "/dashboard",
  "/cookies-config",
  "/unsubscribe",
  "/admin",
  "/afiliado",
  "/parceiro/login",
  "/parceiro/painel",
  "/caixa",
  "/hospedagem/checkout",
  "/hospedagem/confirmacao",
  "/hospedagem/reservas",
];

const RouteNoIndex: React.FC = () => {
  const { pathname } = useLocation();
  const path = pathname.toLowerCase();
  const isPrivate = NOINDEX_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!isPrivate) return null;

  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="googlebot" content="noindex, nofollow" />
    </Helmet>
  );
};

export default RouteNoIndex;
