import { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Campos das telas de login.
 * Celular (estilo "bloco único"): os campos ficam dentro de um bloco arredondado
 * de 12px, separados por linhas finas, com o rótulo pequeno dentro do campo.
 * Desktop (md+): cada campo vira rótulo em cima + caixa de 48px com raio 12.
 */

/** Borda dos campos: mais forte que as divisórias para garantir contraste do contorno. */
const FIELD_BORDER = "border-[#8a8a8a] dark:border-border";

/** Classes da caixa de digitação (input ou gatilho de Select). */
export const AUTH_INPUT_CLASS =
  "block w-full h-6 border-0 bg-transparent p-0 text-base text-foreground placeholder:text-[#8a8a8a] focus:outline-none " +
  "md:h-12 md:text-[15px] md:rounded-xl md:border md:border-[#8a8a8a] md:dark:border-border md:bg-background md:px-3.5 " +
  "md:transition-shadow md:focus:border-foreground md:focus:ring-2 md:focus:ring-foreground/15";

export const AuthFieldGroup = ({ children }: { children: ReactNode }) => (
  <div
    className={`overflow-hidden rounded-xl border ${FIELD_BORDER} divide-y divide-[#b0b0b0] dark:divide-border md:overflow-visible md:rounded-none md:border-0 md:divide-y-0 md:space-y-3.5`}
  >
    {children}
  </div>
);

/** Dois campos lado a lado no desktop largo; empilhados no celular e no tablet. */
export const AuthFieldRow = ({ children }: { children: ReactNode }) => (
  <div className="divide-y divide-[#b0b0b0] dark:divide-border md:divide-y-0 md:space-y-3.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
    {children}
  </div>
);

interface AuthFieldShellProps {
  htmlFor: string;
  label: string;
  hint?: ReactNode;
  hintId?: string;
  children: ReactNode;
}

/** Rótulo + área do controle. Use direto quando o controle não for um <input> (ex.: Select). */
export const AuthFieldShell = ({ htmlFor, label, hint, hintId, children }: AuthFieldShellProps) => (
  <div className="relative bg-background md:bg-transparent px-3.5 py-2.5 focus-within:z-10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-foreground md:p-0 md:focus-within:ring-0">
    <label
      htmlFor={htmlFor}
      className="block text-[11px] leading-4 text-[#6b6b6b] dark:text-muted-foreground md:mb-1.5 md:text-[13px] md:font-semibold md:text-foreground"
    >
      {label}
    </label>
    {children}
    {hint && (
      <p id={hintId} className="mt-1 text-xs text-[#6b6b6b] dark:text-muted-foreground">
        {hint}
      </p>
    )}
  </div>
);

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: ReactNode;
  /** Botão dentro do campo, à direita (ex.: mostrar/ocultar senha). */
  endAdornment?: ReactNode;
}

const AuthField = ({ id, label, hint, endAdornment, className = "", ...inputProps }: AuthFieldProps) => {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <AuthFieldShell htmlFor={id} label={label} hint={hint} hintId={hintId}>
      <div className="relative">
        <input
          id={id}
          aria-describedby={hintId}
          className={`${AUTH_INPUT_CLASS} ${endAdornment ? "pr-11 md:pr-12" : ""} ${className}`}
          {...inputProps}
        />
        {endAdornment && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 md:right-0.5">{endAdornment}</div>
        )}
      </div>
    </AuthFieldShell>
  );
};

/** Botão de olho (mostrar/ocultar senha) com área de toque de 44px. */
export const PasswordToggle = ({ visible, onToggle }: { visible: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
    aria-pressed={visible}
    className="flex h-11 w-11 items-center justify-center rounded-full text-[#6b6b6b] dark:text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
    {visible ? (
      <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
    ) : (
      <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
    )}
  </button>
);

export default AuthField;
