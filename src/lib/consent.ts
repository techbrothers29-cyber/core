// Consentimento de cookies (LGPD) ligado ao Google Consent Mode v2.
// O index.html começa com tudo opcional "denied" e reaplica a escolha salva antes de carregar o gtag;
// aqui ficam a leitura/gravação da escolha e a atualização ao vivo quando o visitante muda de ideia.

export type ConsentPrefs = {
  necessary: true;
  functional: boolean; // lembrar buscas, filtros e preferências de navegação
  analytics: boolean; // medição de visitas (Google)
  advertising: boolean; // conversões e anúncios (Google Ads)
};

const KEY = "cookie-preferences";
const ACCEPTED_KEY = "privacy-policy-accepted";
export const CONSENT_EVENT = "bah:consent-changed";

export const ALL_ON: ConsentPrefs = { necessary: true, functional: true, analytics: true, advertising: true };
export const ONLY_NECESSARY: ConsentPrefs = { necessary: true, functional: false, analytics: false, advertising: false };

/** Escolha salva; null quando o visitante ainda não decidiu. */
export function getConsent(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { necessary: true, functional: !!p.functional, analytics: !!p.analytics, advertising: !!p.advertising };
    }
    // Quem clicou em "Aceitar" no aviso antigo aceitou todos.
    if (localStorage.getItem(ACCEPTED_KEY) === "true") return ALL_ON;
  } catch {}
  return null;
}

function toGoogle(p: ConsentPrefs) {
  const v = (on: boolean) => (on ? "granted" : "denied");
  return {
    analytics_storage: v(p.analytics),
    ad_storage: v(p.advertising),
    ad_user_data: v(p.advertising),
    ad_personalization: v(p.advertising),
    functionality_storage: v(p.functional),
    personalization_storage: v(p.functional),
    security_storage: "granted",
  };
}

export function saveConsent(p: ConsentPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    localStorage.setItem(ACCEPTED_KEY, "true");
  } catch {}
  const w = window as any;
  if (typeof w.gtag === "function") w.gtag("consent", "update", toGoogle(p));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: p }));
}
