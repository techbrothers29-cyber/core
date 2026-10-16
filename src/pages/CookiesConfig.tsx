import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Check, Lock, Megaphone, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ALL_ON, ONLY_NECESSARY, getConsent, saveConsent, type ConsentPrefs } from "@/lib/consent";

type Key = "functional" | "analytics" | "advertising";

const CATEGORIES: { key: Key | "necessary"; title: string; icon: typeof Lock; text: string; examples: string }[] = [
  {
    key: "necessary",
    title: "Necessários",
    icon: Lock,
    text: "Fazem o site funcionar: login, carrinho, pagamento seguro, proteção contra fraudes e o registro desta escolha.",
    examples: "Bah Ofertas · sempre ativos",
  },
  {
    key: "functional",
    title: "Funcionais",
    icon: SlidersHorizontal,
    text: "Lembram suas preferências, como buscas, filtros e destinos, para você não precisar repetir tudo a cada visita.",
    examples: "Bah Ofertas · Google",
  },
  {
    key: "analytics",
    title: "Análise",
    icon: BarChart3,
    text: "Medem visitas e o uso das páginas de forma agregada, para entendermos o que melhorar no site.",
    examples: "Google (tag do Google)",
  },
  {
    key: "advertising",
    title: "Publicidade",
    icon: Megaphone,
    text: "Medem o resultado das nossas campanhas e permitem mostrar ofertas mais relevantes para você em outros sites.",
    examples: "Google Ads",
  },
];

const CookiesConfig = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState<ConsentPrefs | null>(null);
  const [prefs, setPrefs] = useState<ConsentPrefs>(ONLY_NECESSARY);

  useEffect(() => {
    window.scrollTo(0, 0);
    const current = getConsent();
    setSaved(current);
    if (current) setPrefs(current);
  }, []);

  const apply = (p: ConsentPrefs, msg: string) => {
    saveConsent(p);
    setPrefs(p);
    setSaved(p);
    toast.success(msg);
  };

  const dirty = !saved || (["functional", "analytics", "advertising"] as Key[]).some((k) => saved[k] !== prefs[k]);
  const activeCount = (["functional", "analytics", "advertising"] as Key[]).filter((k) => saved?.[k]).length;
  const statusLabel = !saved
    ? "Você ainda não fez sua escolha"
    : activeCount === 3
      ? "Todos os cookies ativos"
      : activeCount === 0
        ? "Somente cookies necessários"
        : `Necessários + ${activeCount} categoria${activeCount > 1 ? "s" : ""} opcional${activeCount > 1 ? "is" : ""}`;

  return (
    <div className="min-h-screen bg-[#fafafa] font-jakarta text-foreground">
      <SEOHead title="Preferências de cookies | Bah Ofertas" description="Escolha quais cookies o Bah Ofertas pode usar." canonical="/cookies-config" type="website" />

      <header className="sticky top-0 z-40 bg-card border-b border-[#ebebeb]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            aria-label="Voltar"
            className="w-10 h-10 shrink-0 rounded-full border border-[#dddddd] flex items-center justify-center hover:bg-[#f7f7f7]"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <Link to="/" aria-label="Bah Ofertas — página inicial">
            <img src="/logo-desktop.png" alt="Bah Ofertas" className="h-9 md:h-10 w-auto" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-32 md:pb-12">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-primary">Privacidade</p>
        <h1 className="m-0 mt-1 text-2xl md:text-4xl font-bold">Preferências de cookies</h1>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Você decide o que o Bah Ofertas pode usar além do essencial. A escolha vale para este navegador e pode ser mudada a qualquer
          momento por aqui ou pelo link no rodapé do site.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-[#ebebeb] bg-card p-4">
          <span className="flex-1 text-sm">
            <span className="text-muted-foreground">Situação atual: </span>
            <strong>{statusLabel}</strong>
          </span>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => apply(ONLY_NECESSARY, "Pronto! Usaremos só os cookies necessários.")}
              className="h-10 px-4 rounded-xl border border-[#dddddd] text-sm font-semibold hover:bg-[#f7f7f7]"
            >
              Só necessários
            </button>
            <button
              type="button"
              onClick={() => apply(ALL_ON, "Pronto! Todos os cookies foram aceitos.")}
              className="h-10 px-4 rounded-xl bg-[#1f1f1f] text-white text-sm font-semibold hover:bg-black"
            >
              Aceitar todos
            </button>
          </div>
        </div>

        <ul className="m-0 mt-4 p-0 list-none space-y-3">
          {CATEGORIES.map(({ key, title, icon: Icon, text, examples }) => {
            const locked = key === "necessary";
            const on = locked ? true : prefs[key as Key];
            const id = `cookie-${key}`;
            return (
              <li key={key} className="rounded-2xl border border-[#ebebeb] bg-card p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${on ? "bg-primary/10 text-primary" : "bg-[#f2f2f2] text-muted-foreground"}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor={id} className="text-base font-bold">{title}</label>
                      {locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-semibold text-[#137a3f]">
                          <Check className="w-3.5 h-3.5" aria-hidden="true" /> Sempre ativos
                        </span>
                      ) : (
                        <Switch
                          id={id}
                          checked={on}
                          onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                          aria-label={`Cookies de ${title.toLowerCase()}`}
                        />
                      )}
                    </div>
                    <p className="m-0 mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                    <p className="m-0 mt-2 text-xs text-muted-foreground">Quem usa: {examples}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="m-0 mt-5 text-xs leading-relaxed text-muted-foreground">
          Sem a sua permissão, a tag do Google funciona no modo sem cookies: não grava identificadores no seu navegador e envia apenas
          sinais anônimos. Saiba mais na nossa{" "}
          <Link to="/privacidade" className="font-semibold text-foreground underline underline-offset-2">Política de Privacidade</Link> e nos{" "}
          <Link to="/termos" className="font-semibold text-foreground underline underline-offset-2">Termos de Uso</Link>.
        </p>

        <div className="hidden md:flex mt-6 justify-end">
          <button
            type="button"
            disabled={!dirty}
            onClick={() => apply(prefs, "Preferências salvas.")}
            className="h-12 px-8 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {dirty ? "Salvar minhas escolhas" : "Escolhas salvas"}
          </button>
        </div>
      </main>

      {/* Celular: salvar sempre à mão, acima da área segura do iPhone */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#ebebeb] bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => apply(prefs, "Preferências salvas.")}
          className="h-12 w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {dirty ? "Salvar minhas escolhas" : "Escolhas salvas"}
        </button>
      </div>

      <Footer />
      <div className="h-20 md:hidden" aria-hidden="true" />
    </div>
  );
};

export default CookiesConfig;
