import { ReactNode } from "react";
import AuthShell, { AUTH_CONTAINER } from "./AuthShell";
import AuthTabs, { AuthTabValue } from "./AuthTabs";
import AuthCard from "./AuthCard";
import RoleHero from "./RoleHero";

interface AuthSplitLayoutProps {
  activeTab: string;
  onTabChange: (tab: AuthTabValue) => void;
  hero: { title: string; subtitle: string };
  loginForm: ReactNode;
  signupForm: ReactNode;
  loginSubtitle?: string;
  signupSubtitle?: string;
}

const LOGIN_PANEL = "auth-panel-login";
const SIGNUP_PANEL = "auth-panel-signup";

/**
 * Tela "Entrar + Criar Conta" (cliente, parceiro e afiliado).
 * Desktop: faixa do perfil no topo e os dois cartões lado a lado.
 * Celular: barra com X, abas Entrar | Criar Conta e o cartão do perfil no fim.
 * Cada formulário é renderizado uma única vez (sem ids duplicados).
 */
const AuthSplitLayout = ({
  activeTab,
  onTabChange,
  hero,
  loginForm,
  signupForm,
  loginSubtitle = "Use seu e-mail para entrar",
  signupSubtitle = "Preencha seus dados para começar",
}: AuthSplitLayoutProps) => {
  const isSignup = activeTab === "signup";

  return (
    <AuthShell mobileTitle="Entrar ou cadastrar-se">
      <div className={`${AUTH_CONTAINER} py-6 md:py-10`}>
        <RoleHero variant="banner" title={hero.title} subtitle={hero.subtitle} />

        <AuthTabs
          className="md:hidden mb-6"
          value={isSignup ? "signup" : "login"}
          onChange={onTabChange}
          loginPanelId={LOGIN_PANEL}
          signupPanelId={SIGNUP_PANEL}
        />

        <div className="grid grid-cols-1 items-start gap-6 md:mt-6 md:grid-cols-2 lg:gap-7">
          <AuthCard id={LOGIN_PANEL} tabbed title="Bem-vindo de volta!" subtitle={loginSubtitle} activeOnMobile={!isSignup}>
            {loginForm}
          </AuthCard>
          <AuthCard id={SIGNUP_PANEL} tabbed title="Criar Conta" subtitle={signupSubtitle} activeOnMobile={isSignup}>
            {signupForm}
          </AuthCard>
        </div>

        <div className="mt-6">
          <RoleHero variant="card" title={hero.title} subtitle={hero.subtitle} />
        </div>
      </div>
    </AuthShell>
  );
};

export default AuthSplitLayout;
