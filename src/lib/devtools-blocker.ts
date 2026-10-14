/**
 * DevTools / media hardening
 * Dificulta F12, atalhos de inspeção, menu de contexto e cópia/arraste de mídia.
 * Observação: bloqueio 100% no navegador não existe, pois o arquivo precisa ser entregue ao cliente.
 */

const MEDIA_SELECTOR = "img, picture, video, canvas, svg";
const MAP_GESTURE_ZONE_SELECTOR = "[data-map-gesture-zone='true']";
const CAROUSEL_GESTURE_ZONE_SELECTOR = "[data-carousel-gesture-zone='true']";
const STYLE_ID = "bah-devtools-blocker-style";

function shouldSkipBlocker() {
  if (typeof window === "undefined") return true;

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;

  // Pular em todas as rotas administrativas (debug temporário)
  if (window.location.pathname.startsWith("/admin")) return true;

  // Pular dentro de iframes (preview do Lovable, editores, etc.)
  // O alternador de viewport mobile gera diff grande entre outerWidth/innerWidth
  // e dispara o falso positivo do detector de devtools.
  try {
    if (window.self !== window.top) return true;
  } catch {
    // cross-origin → estamos em iframe
    return true;
  }

  // Domínios de preview/editor do Lovable
  if (
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovable.dev") ||
    hostname.endsWith(".lovableproject.com")
  ) {
    return true;
  }

  return false;
}

function preventEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  return false;
}

function isInsideMapZone(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(MAP_GESTURE_ZONE_SELECTOR);
}

function isMediaTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (isInsideMapZone(target)) return false;
  return !!target.closest(MEDIA_SELECTOR);
}

function isInsideCarouselGestureZone(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(CAROUSEL_GESTURE_ZONE_SELECTOR);
}

/**
 * O endurecimento de mídia é feito 100% via CSS global (injectGlobalStyle):
 * user-drag/user-select/touch-callout já cobrem todas as mídias, inclusive as
 * inseridas depois. Escrever estilo inline por elemento a cada mutação do DOM
 * causava recalcs de estilo durante a rolagem.
 */

function injectGlobalStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ${MEDIA_SELECTOR} {
      -webkit-user-drag: none !important;
      -khtml-user-drag: none !important;
      -moz-user-drag: none !important;
      -o-user-drag: none !important;
      user-drag: none !important;
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      pointer-events: none !important;
    }

    /* Bloqueia long-press / menu de salvar imagem em qualquer container que envolva mídia */
    a:has(${MEDIA_SELECTOR}),
    button:has(${MEDIA_SELECTOR}),
    [data-gallery-image] {
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
      user-drag: none !important;
    }

    ${MAP_GESTURE_ZONE_SELECTOR} ${MEDIA_SELECTOR} {
      -webkit-user-drag: auto !important;
      -khtml-user-drag: auto !important;
      -moz-user-drag: auto !important;
      -o-user-drag: auto !important;
      user-drag: auto !important;
      -webkit-touch-callout: initial !important;
      -webkit-user-select: auto !important;
      user-select: auto !important;
      pointer-events: auto !important;
    }
  `;

  document.head.appendChild(style);
}

export function installDevtoolsBlocker() {
  if (typeof window === "undefined" || shouldSkipBlocker()) return;

  injectGlobalStyle();

  const mediaOnlyBlock = (event: Event) => {
    if (event.type === "touchstart" && isInsideCarouselGestureZone(event.target)) return;
    if (isMediaTarget(event.target)) {
      preventEvent(event);
    }
  };

  const globalBlock = (event: Event) => {
    if (isInsideMapZone(event.target)) return;
    preventEvent(event);
  };

  document.addEventListener("contextmenu", globalBlock, { capture: true });
  document.addEventListener("dragstart", mediaOnlyBlock, { capture: true });
  document.addEventListener("selectstart", mediaOnlyBlock, { capture: true });
  document.addEventListener("copy", mediaOnlyBlock, { capture: true });
  document.addEventListener("cut", mediaOnlyBlock, { capture: true });
  // Nada de preventDefault em touchstart: isso matava a rolagem/arrasto no mobile.
  // O long-press de salvar imagem já é bloqueado via -webkit-touch-callout + contextmenu.

  document.addEventListener(
    "keydown",
    (event) => {
      const key = event.key?.toLowerCase();
      const ctrlOrMeta = event.ctrlKey || event.metaKey;

      if (event.key === "F12" || event.keyCode === 123) return void preventEvent(event);
      if (ctrlOrMeta && event.shiftKey && ["i", "j", "c"].includes(key)) return void preventEvent(event);
      if (ctrlOrMeta && ["u", "s"].includes(key)) return void preventEvent(event);
    },
    { capture: true }
  );

  // Sem MutationObserver: o CSS global já cobre mídia inserida dinamicamente.

}
