interface RoleHeroProps {
  title: string;
  subtitle: string;
  /** "banner": faixa rosa clara no topo (desktop). "card": cartão cinza claro no fim (celular). */
  variant: "banner" | "card";
}

/** Mensagem do perfil (cliente, parceiro, afiliado) no padrão das faixas da Home. */
const RoleHero = ({ title, subtitle, variant }: RoleHeroProps) => {
  if (variant === "card") {
    return (
      <aside className="md:hidden rounded-2xl bg-[#f7f7f7] dark:bg-muted p-4">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6b6b6b] dark:text-muted-foreground">{subtitle}</p>
      </aside>
    );
  }

  return (
    <aside className="hidden md:block rounded-2xl bg-[#fff1f1] dark:bg-primary/10 px-7 py-6 text-center">
      <p className="text-[22px] font-extrabold leading-tight text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-2xl text-sm text-[#5f5f5f] dark:text-muted-foreground">{subtitle}</p>
    </aside>
  );
};

export default RoleHero;
