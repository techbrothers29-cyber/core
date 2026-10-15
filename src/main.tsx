import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installDevtoolsBlocker } from "./lib/devtools-blocker";

installDevtoolsBlocker();

// Após cada publicação, os arquivos da versão anterior deixam de existir no Cloudflare.
// Quem estava com o site aberto e navega para uma página ainda não carregada recebia
// tela branca ("Failed to fetch dynamically imported module"). Recarrega uma vez
// para buscar a versão nova; a trava de 10s evita loop se o erro for outro.
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "bah:chunk-reload-at";
  let last = 0;
  try { last = Number(sessionStorage.getItem(KEY) || 0); } catch {}
  if (Date.now() - last < 10_000) return;
  try { sessionStorage.setItem(KEY, String(Date.now())); } catch {}
  event.preventDefault();
  window.location.reload();
});

const isInsideMapGestureZone = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("[data-map-gesture-zone='true']"));

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      'button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"], input, select, textarea, label, summary, [contenteditable="true"], [data-allow-tap="true"]'
    )
  );

// Prevent page-level pinch-zoom on iOS Safari outside interactive maps.
const blockPageZoomGesture = (e: Event) => {
  if (!isInsideMapGestureZone(e.target)) {
    e.preventDefault();
  }
};

document.addEventListener("gesturestart", blockPageZoomGesture);
document.addEventListener("gesturechange", blockPageZoomGesture);
document.addEventListener("gestureend", blockPageZoomGesture);

// Block double-tap zoom outside the map only.
// Track the last touch target so we only block real double-taps on the same spot,
// not two quick taps on different buttons (which iOS would otherwise cancel).
let lastTouchEnd = 0;
let lastTouchTarget: EventTarget | null = null;
document.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    const sameTarget = e.target === lastTouchTarget;
    if (
      now - lastTouchEnd <= 300 &&
      sameTarget &&
      !isInsideMapGestureZone(e.target) &&
      !isInteractiveTarget(e.target)
    ) {
      e.preventDefault();
    }
    lastTouchEnd = now;
    lastTouchTarget = e.target;
  },
  { passive: false }
);

createRoot(document.getElementById("root")!).render(<App />);

const hostname = window.location.hostname;
const isLovablePreview =
  import.meta.env.DEV ||
  hostname.includes("lovableproject.com") ||
  hostname.startsWith("id-preview--") ||
  window.location.search.includes("__lovable_token=");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    if (isLovablePreview) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("SW registered:", reg.scope);
      })
      .catch((err) => {
        console.log("SW registration failed:", err);
      });
  });
}
