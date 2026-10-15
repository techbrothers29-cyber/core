import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installDevtoolsBlocker } from "./lib/devtools-blocker";

installDevtoolsBlocker();

// Após cada publicação, os arquivos da versão anterior deixam de existir no Cloudflare
// (e, por alguns segundos, os novos ainda podem não ter chegado a todos os servidores).
// Quem estava com o site aberto recebia tela branca ("Failed to fetch dynamically imported module").
// Recarrega para buscar a versão nova: até 3 tentativas em 1 minuto, com espera crescente, sem loop infinito.
const CHUNK_RELOAD_KEY = "bah:chunk-reloads";
const isChunkError = (msg: unknown) =>
  /dynamically imported module|Importing a module script failed|Failed to load module script|error loading dynamically imported/i.test(String(msg ?? ""));
let chunkReloadScheduled = false;
const reloadForNewVersion = () => {
  if (chunkReloadScheduled) return true;
  let tries: number[] = [];
  try { tries = JSON.parse(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "[]"); } catch {}
  tries = tries.filter((t) => Date.now() - t < 60_000);
  if (tries.length >= 3) return false;
  tries.push(Date.now());
  try { sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify(tries)); } catch {}
  chunkReloadScheduled = true;
  window.setTimeout(() => window.location.reload(), (tries.length - 1) * 2000);
  return true;
};
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});
window.addEventListener("error", (event) => {
  if (isChunkError(event.message) || isChunkError((event as ErrorEvent).error?.message)) reloadForNewVersion();
});
window.addEventListener("unhandledrejection", (event) => {
  if (isChunkError(event.reason?.message ?? event.reason)) reloadForNewVersion();
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
