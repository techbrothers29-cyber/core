/**
 * Route prefetch helpers — pre-load lazy route chunks before the user clicks.
 * Each prefetcher caches its promise, so multiple hover/intersect calls only
 * trigger a single network/parse pass.
 */

const cache = new Map<string, Promise<unknown>>();

const memo = (key: string, loader: () => Promise<unknown>) => {
  if (!cache.has(key)) {
    cache.set(
      key,
      loader().catch((err) => {
        // Don't poison the cache — allow a retry on a future call.
        cache.delete(key);
        throw err;
      }),
    );
  }
  return cache.get(key);
};

export const prefetchEstabelecimento = () =>
  memo("estabelecimento", () => import("@/pages/Estabelecimento"));

export const prefetchCheckout = () =>
  memo("checkout", () => import("@/pages/Checkout"));

export const prefetchAuth = () =>
  memo("auth", () => import("@/pages/Auth"));

export const prefetchHospedagem = () =>
  memo("hospedagem", () => import("@/pages/Hospedagem"));
