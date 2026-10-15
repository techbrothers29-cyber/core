import React from "react";

const KEY = "bah:boundary-reloads";
const isChunkError = (e: unknown) =>
  /dynamically imported module|module script|Importing a module|Loading chunk|reading 'default'|error loading dynamically/i.test(
    String((e as any)?.message ?? e ?? "")
  );

/** Recarrega buscando a versão mais nova do site (até 3 vezes em 2 min). */
const reloadFresh = (): boolean => {
  let tries: number[] = [];
  try { tries = JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch {}
  tries = tries.filter((t) => Date.now() - t < 120_000);
  if (tries.length >= 3) return false;
  tries.push(Date.now());
  try { sessionStorage.setItem(KEY, JSON.stringify(tries)); } catch {}
  const url = new URL(window.location.href);
  url.searchParams.set("_v", String(Date.now()));
  window.setTimeout(() => window.location.replace(url.toString()), (tries.length - 1) * 1500);
  return true;
};

/**
 * Evita tela branca: se uma parte do site não carregar (ex.: logo após uma atualização),
 * recarrega sozinho com a versão nova; se não resolver, mostra um aviso com botão.
 */
export default class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown; reloading: boolean }> {
  state = { error: null as unknown, reloading: false };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error("[AppErrorBoundary]", error);
    if (isChunkError(error) && reloadFresh()) this.setState({ reloading: true });
  }

  componentDidMount() {
    // Página carregou bem: limpa o parâmetro de recarga da URL.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("_v")) {
        url.searchParams.delete("_v");
        window.history.replaceState(window.history.state, "", url.toString());
      }
    } catch {}
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 font-jakarta text-center">
        <div className="max-w-sm">
          <img src="/logo-desktop.png" alt="Bah Ofertas" className="h-12 w-auto mx-auto" />
          <h1 className="mt-6 text-xl font-bold text-foreground">
            {this.state.reloading ? "Atualizando o site…" : "Algo não carregou"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {this.state.reloading
              ? "Saiu uma versão nova do Bah Ofertas. Só um instante."
              : "Pode ter sido a conexão ou uma atualização do site. Tente carregar de novo."}
          </p>
          {!this.state.reloading && (
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("_v", String(Date.now()));
                window.location.replace(url.toString());
              }}
              className="mt-6 h-12 w-full rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground"
            >
              Recarregar
            </button>
          )}
        </div>
      </div>
    );
  }
}
