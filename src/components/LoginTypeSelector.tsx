import { Link } from "react-router-dom";
import { User, Shield, Store, Users, ArrowRight, ChevronRight, type LucideIcon } from "lucide-react";
import AuthShell, { AUTH_CONTAINER } from "@/components/auth/redesign/AuthShell";

interface LoginOption {
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  badge?: string;
}

const loginOptions: LoginOption[] = [
  {
    title: "Usuário / Cliente",
    description: "Acesse ofertas e gerencie seus vouchers",
    icon: User,
    route: "/auth",
    badge: "Público",
  },
  {
    title: "Afiliado",
    description: "Ganhe comissões promovendo ofertas",
    icon: Users,
    route: "/afiliado/auth",
    badge: "Programa",
  },
  {
    title: "Parceiro",
    description: "Gerencie seu estabelecimento e ofertas",
    icon: Store,
    route: "/parceiro/login",
    badge: "Empresa",
  },
  {
    title: "Administrador",
    description: "Controle total da plataforma",
    icon: Shield,
    route: "/admin/login",
    badge: "Sistema",
  },
];

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const LoginTypeSelector = () => {
  return (
    <AuthShell>
      <div className={`${AUTH_CONTAINER} pb-12 pt-6 md:pt-12`}>
        <div className="md:text-center">
          <h1 className="text-[26px] font-bold leading-tight text-foreground md:text-[32px] md:font-extrabold">
            Escolha seu tipo de acesso
          </h1>
          <p className="mt-1.5 text-[15px] text-[#6b6b6b] dark:text-muted-foreground md:text-base">
            Selecione a categoria que corresponde ao seu perfil
          </p>
        </div>

        {/* Celular: lista com ícone em círculo de borda fina e divisórias */}
        <ul className="md:hidden mt-5 border-b border-[#ebebeb] dark:border-border">
          {loginOptions.map(({ title, description, icon: Icon, route }) => (
            <li key={route} className="border-t border-[#ebebeb] dark:border-border">
              <Link to={route} className={`flex items-center gap-4 rounded-lg py-[18px] ${FOCUS_RING}`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#dddddd] dark:border-border text-foreground">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-foreground">{title}</span>
                  <span className="mt-0.5 block text-[13px] text-[#6b6b6b] dark:text-muted-foreground">{description}</span>
                </span>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#6b6b6b]" strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Tablet/desktop: cartões lado a lado */}
        <ul className="hidden md:grid mt-9 grid-cols-2 gap-5 lg:grid-cols-4">
          {loginOptions.map(({ title, description, icon: Icon, route, badge }) => (
            <li key={route} className="min-w-0">
              <Link
                to={route}
                className={`group relative flex h-full flex-col items-center rounded-2xl border border-[#dddddd] dark:border-border bg-card px-5 pb-5 pt-8 text-center shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_10px_28px_rgba(0,0,0,0.14)] ${FOCUS_RING}`}
              >
                {badge && (
                  <span className="absolute right-3 top-3 rounded-full bg-[#f7f7f7] dark:bg-muted px-2.5 py-0.5 text-xs font-semibold text-[#5f5f5f] dark:text-muted-foreground">
                    {badge}
                  </span>
                )}
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#dddddd] dark:border-border text-foreground transition-colors group-hover:border-primary group-hover:text-primary">
                  <Icon className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="mt-4 text-lg font-bold text-foreground">{title}</span>
                <span className="mt-1.5 mb-5 text-sm text-[#6b6b6b] dark:text-muted-foreground">{description}</span>
                <span className="mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
                  Acessar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 text-xs leading-relaxed text-[#6b6b6b] dark:text-muted-foreground md:mt-10 md:text-center">
          <p className="md:text-sm">Cada tipo de usuário tem acesso exclusivo à sua área específica</p>
          <p className="mt-1 md:mt-2">Segurança garantida • Acesso controlado por perfil • Suporte personalizado</p>
        </div>
      </div>
    </AuthShell>
  );
};

export default LoginTypeSelector;
