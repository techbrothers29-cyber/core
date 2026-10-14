import { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  loginForm: ReactNode;
  signupForm: ReactNode;
  accentColor: "destructive" | "success" | "primary";
  logoSrc: string;
  logoAlt: string;
  loginCta: { title: string; subtitle: string; buttonText: string };
  signupCta: { title: string; subtitle: string; buttonText: string };
}

const accentStyles = {
  destructive: {
    ball1: "bg-destructive/30",
    ball2: "bg-destructive/25",
    ball3: "bg-destructive/20",
    ball4: "bg-destructive/25",
    ball5: "bg-destructive/30",
    panelGradient: "from-destructive via-destructive/90 to-[hsl(30,90%,55%)]",
    btnBorder: "border-white/60 text-white hover:bg-white/10",
  },
  success: {
    ball1: "bg-success/30",
    ball2: "bg-success/25",
    ball3: "bg-success/20",
    ball4: "bg-success/25",
    ball5: "bg-success/30",
    panelGradient: "from-success via-success/90 to-[hsl(160,60%,45%)]",
    btnBorder: "border-white/60 text-white hover:bg-white/10",
  },
  primary: {
    ball1: "bg-primary/30",
    ball2: "bg-primary/25",
    ball3: "bg-primary/20",
    ball4: "bg-primary/25",
    ball5: "bg-primary/30",
    panelGradient: "from-primary via-primary/90 to-[hsl(20,85%,55%)]",
    btnBorder: "border-white/60 text-white hover:bg-white/10",
  },
};

const AuthLayout = ({
  activeTab,
  onTabChange,
  loginForm,
  signupForm,
  accentColor,
  logoSrc,
  logoAlt,
  loginCta,
  signupCta,
}: AuthLayoutProps) => {
  const styles = accentStyles[accentColor];
  const isSignup = activeTab === "signup";
  const cta = isSignup ? signupCta : loginCta;
  const switchTo = isSignup ? "login" : "signup";

  return (
    <div className="md:min-h-screen h-[100dvh] md:h-auto flex items-center justify-center p-2 sm:p-4 relative overflow-hidden md:overflow-visible bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Animated floating balls */}
      <div className={`absolute top-[15%] left-[10%] sm:left-[20%] w-40 sm:w-64 h-40 sm:h-64 ${styles.ball1} rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]`} />
      <div className={`absolute bottom-[20%] right-[10%] sm:right-[20%] w-36 sm:w-56 h-36 sm:h-56 ${styles.ball2} rounded-full blur-2xl animate-[pulse_5s_ease-in-out_infinite_1s]`} />
      <div className={`absolute top-[40%] right-[25%] sm:right-[35%] w-32 sm:w-48 h-32 sm:h-48 ${styles.ball3} rounded-full blur-2xl animate-[pulse_6s_ease-in-out_infinite_0.5s]`} />
      <div className={`hidden sm:block absolute bottom-[35%] left-[15%] w-40 h-40 ${styles.ball4} rounded-full blur-xl animate-[pulse_4.5s_ease-in-out_infinite_2s]`} />
      <div className={`hidden sm:block absolute top-[10%] right-[15%] w-32 h-32 ${styles.ball5} rounded-full blur-xl animate-[pulse_5.5s_ease-in-out_infinite_1.5s]`} />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-4xl md:h-auto h-full flex md:block items-center">

        {/* ===== MOBILE LAYOUT ===== */}
        <div className="md:hidden w-full max-h-full flex flex-col">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-border/50 flex flex-col max-h-full">
            {/* Mini accent bar top */}
            <div className={`h-1.5 bg-gradient-to-r ${styles.panelGradient} shrink-0`} />

            <div className="px-4 py-3 flex flex-col min-h-0 overflow-y-auto">
              <div className="flex justify-center mb-1">
                <img src={logoSrc} alt={logoAlt} className="h-16 w-auto" />
              </div>

              <h2 className="text-base font-bold text-center text-foreground leading-tight">
                {isSignup ? "Criar Conta" : "Bem-vindo de volta!"}
              </h2>
              <p className="text-muted-foreground text-[11px] text-center mb-2 leading-tight">
                {isSignup ? "Preencha seus dados para começar" : "Use seu e-mail para entrar"}
              </p>

              <div className="auth-mobile-compact">
                {isSignup ? signupForm : loginForm}
              </div>

              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => onTabChange(switchTo)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isSignup ? "Já tem conta? " : "Não tem conta? "}
                  <span className="font-semibold underline">
                    {isSignup ? "Entrar" : "Cadastre-se"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== DESKTOP LAYOUT (sliding panels) ===== */}
        <div className="hidden md:block">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-border/50 relative">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                width: '200%',
                transform: isSignup ? 'translateX(-25%)' : 'translateX(0%)',
              }}
            >
              {/* Login form panel */}
              <div className="w-1/4 p-8 flex flex-col justify-center">
                <div className="flex justify-center mb-4">
                  <img src={logoSrc} alt={logoAlt} className="h-20 lg:h-24 w-auto" />
                </div>
                <h2 className="text-2xl font-bold text-center text-foreground mb-1">
                  Bem-vindo de volta!
                </h2>
                <p className="text-muted-foreground text-xs text-center mb-4">
                  Use seu e-mail para entrar
                </p>
                <div className="px-1">
                  {loginForm}
                </div>
              </div>

              {/* CTA panel */}
              <div className={`w-1/4 bg-gradient-to-br ${styles.panelGradient} p-8 flex flex-col items-center justify-center text-center relative overflow-hidden`}>
                <div className="absolute top-8 right-8 w-20 h-20 border border-white/20 rounded-full animate-float" />
                <div className="absolute bottom-12 left-8 w-14 h-14 border border-white/15 rounded-full animate-[float_4s_ease-in-out_infinite_0.8s]" />
                <div className="absolute top-1/2 right-4 w-8 h-8 bg-white/10 rounded-full animate-[bounce_2.5s_ease-in-out_infinite]" />
                <div className="absolute top-[20%] left-[15%] w-6 h-6 bg-white/15 rounded-full animate-[float_5s_ease-in-out_infinite_1.2s]" />
                <div className="absolute bottom-[25%] right-[20%] w-10 h-10 border border-white/10 rounded-full animate-[pulse_3s_ease-in-out_infinite_0.3s]" />

                <h3 className="text-2xl font-bold text-white mb-3 relative z-10 whitespace-pre-line">
                  {cta.title}
                </h3>
                <p className="text-white/80 text-sm mb-6 max-w-[240px] relative z-10">
                  {cta.subtitle}
                </p>
                <Button
                  variant="outline"
                  onClick={() => onTabChange(switchTo)}
                  className={`rounded-full px-8 py-2 border-2 ${styles.btnBorder} bg-transparent font-semibold transition-all duration-300 hover:scale-105 relative z-10`}
                >
                  {cta.buttonText}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Signup form panel */}
              <div className="w-1/4 p-8 flex flex-col justify-center">
                <div className="flex justify-center mb-4">
                  <img src={logoSrc} alt={logoAlt} className="h-20 lg:h-24 w-auto" />
                </div>
                <h2 className="text-2xl font-bold text-center text-foreground mb-1">
                  Criar Conta
                </h2>
                <p className="text-muted-foreground text-xs text-center mb-4">
                  Preencha seus dados para começar
                </p>
                <div className="px-1">
                  {signupForm}
                </div>
              </div>

              {/* Spacer */}
              <div className="w-1/4" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;
