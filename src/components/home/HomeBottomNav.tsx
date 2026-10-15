import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Heart, Ticket, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getEffectiveUserAccess } from "@/lib/user-role";
import { useFavorites } from "@/hooks/useFavorites";

type Role = "admin" | "partner" | "affiliate" | "user" | "client";

const PANEL_BY_ROLE: Record<Role, string> = {
  admin: "/admin/dashboard",
  partner: "/parceiro/painel",
  affiliate: "/afiliado/painel",
  user: "/dashboard",
  client: "/dashboard",
};

/**
 * Barra inferior do celular (proposta visual): Explorar · Favoritos · Reservas · Perfil.
 * - Reservas: ingressos, cupons e reservas do cliente (painel /dashboard).
 * - Perfil: dados do cliente, ou o painel do parceiro/afiliado/admin.
 * Sem login, Reservas e Perfil levam ao login.
 */
const HomeBottomNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { items } = useFavorites();
  const [role, setRole] = useState<Role>("user");

  useEffect(() => {
    let alive = true;
    if (!user?.id) {
      setRole("user");
      return;
    }
    getEffectiveUserAccess(user.id, user.email).then(({ role }) => {
      if (alive) setRole(role as Role);
    }).catch(() => {});
    return () => { alive = false; };
  }, [user?.id, user?.email]);

  const panel = PANEL_BY_ROLE[role] || "/dashboard";
  const isClient = role === "user" || role === "client";
  const tabs = [
    { label: "Explorar", to: "/", icon: Search, active: pathname === "/" },
    { label: "Favoritos", to: "/favoritos", icon: Heart, active: pathname === "/favoritos", badge: items.length },
    {
      label: "Reservas",
      to: user ? (isClient ? "/dashboard" : panel) : "/auth",
      icon: Ticket,
      active: false,
    },
    {
      label: "Perfil",
      to: user ? (isClient ? "/dashboard?aba=perfil" : panel) : "/auth",
      icon: User,
      active: false,
    },
  ];

  return (
    <>
      {/* Espaço para a barra fixa não cobrir o fim da página */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <nav
        aria-label="Navegação principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-[#ebebeb] pb-[env(safe-area-inset-bottom)] font-jakarta"
      >
        <ul className="flex h-16 m-0 p-0 list-none">
          {tabs.map(({ label, to, icon: Icon, active, badge }) => (
            <li key={label} className="flex-1">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`relative h-full flex flex-col items-center justify-center gap-[3px] text-[10.5px] font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-6 h-6" strokeWidth={1.8} aria-hidden="true" />
                {label}
                {!!badge && (
                  <span className="absolute top-2 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-[18px] text-center">
                    {badge > 99 ? "99+" : badge}
                    <span className="sr-only"> salvos</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default HomeBottomNav;
