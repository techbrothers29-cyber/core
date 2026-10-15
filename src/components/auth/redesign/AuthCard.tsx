import { ButtonHTMLAttributes, ReactNode } from "react";

interface AuthCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  /** No celular só o cartão ativo aparece; no desktop todos aparecem. */
  activeOnMobile?: boolean;
  /** Esconde o título no celular (quando a própria tela já tem um título acima). */
  hideTitleOnMobile?: boolean;
  /** Papel ARIA no celular, quando o cartão é o painel de uma aba. */
  tabbed?: boolean;
  children: ReactNode;
}

/**
 * Cartão de formulário: no desktop é um card branco (raio 16, borda clara e
 * sombra suave, como o card de compra da oferta); no celular fica "solto" na página.
 */
const AuthCard = ({
  id,
  title,
  subtitle,
  activeOnMobile = true,
  hideTitleOnMobile = false,
  tabbed = false,
  children,
}: AuthCardProps) => {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      {...(tabbed ? { role: "tabpanel" } : {})}
      className={`${activeOnMobile ? "block" : "hidden"} md:block min-w-0 md:rounded-2xl md:border md:border-[#dddddd] md:dark:border-border md:bg-card md:p-7 lg:p-8 md:shadow-[0_6px_20px_rgba(0,0,0,0.08)]`}
    >
      <h2
        id={headingId}
        className={`${hideTitleOnMobile ? "sr-only md:not-sr-only md:block" : ""} text-[22px] font-bold leading-tight text-foreground md:text-center md:font-extrabold`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`${hideTitleOnMobile ? "hidden md:block" : ""} mt-1 text-sm text-[#6b6b6b] dark:text-muted-foreground md:text-center`}>
          {subtitle}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
};

/** Botão principal vermelho do site (48px, raio 12). */
export const AuthSubmitButton = ({ className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="submit"
    className={`mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`}
    {...props}
  >
    {children}
  </button>
);

/** Link de texto sublinhado (ex.: "Esqueci minha senha"), com área de toque de 44px. */
export const AuthTextButton = ({ className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <div className="mt-2 flex justify-center">
    <button
      type="button"
      className={`inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-foreground underline underline-offset-2 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      {...props}
    >
      {children}
    </button>
  </div>
);

export default AuthCard;
