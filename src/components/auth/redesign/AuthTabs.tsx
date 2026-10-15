import { KeyboardEvent, useRef } from "react";

export type AuthTabValue = "login" | "signup";

interface AuthTabsProps {
  value: string;
  onChange: (tab: AuthTabValue) => void;
  loginPanelId: string;
  signupPanelId: string;
  className?: string;
}

const TABS: { value: AuthTabValue; label: string }[] = [
  { value: "login", label: "Entrar" },
  { value: "signup", label: "Criar Conta" },
];

/** Abas "Entrar | Criar Conta" do celular (sublinhado escuro na aba ativa). */
const AuthTabs = ({ value, onChange, loginPanelId, signupPanelId, className = "" }: AuthTabsProps) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    onChange(TABS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Entrar ou criar conta" className={`flex border-b border-[#ebebeb] dark:border-border ${className}`}>
      {TABS.map((tab, i) => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${tab.value === "login" ? loginPanelId : signupPanelId}-tab`}
            aria-selected={selected}
            aria-controls={tab.value === "login" ? loginPanelId : signupPanelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`-mb-px flex-1 h-11 border-b-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
              selected
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent font-medium text-[#6b6b6b] dark:text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default AuthTabs;
