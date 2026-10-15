import { useCallback, useSyncExternalStore } from "react";

/**
 * Favoritos guardados no próprio aparelho (localStorage).
 * Não depende de login: o visitante marca o coração e encontra os itens em /favoritos.
 */
export interface FavoriteItem {
  /** Identificador estável do item (ex.: "est:<id>" ou "offer:<id>"). */
  key: string;
  title: string;
  image?: string;
  /** Rota interna do item (mesmo destino do card). */
  path: string;
  subtitle?: string;
  priceLabel?: string;
  rating?: number;
  savedAt: number;
}

const STORAGE_KEY = "bah:favorites:v1";
const listeners = new Set<() => void>();
let cache: FavoriteItem[] | null = null;

function read(): FavoriteItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: FavoriteItem[]) {
  cache = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Navegação privada / armazenamento cheio: mantém só em memória nesta visita.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: FavoriteItem[] = [];

export function useFavorites() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const isFavorite = useCallback((key: string) => items.some((i) => i.key === key), [items]);

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, "savedAt">) => {
    const current = read();
    if (current.some((i) => i.key === item.key)) {
      write(current.filter((i) => i.key !== item.key));
      return false;
    }
    write([{ ...item, savedAt: Date.now() }, ...current]);
    return true;
  }, []);

  const removeFavorite = useCallback((key: string) => {
    write(read().filter((i) => i.key !== key));
  }, []);

  return { items, isFavorite, toggleFavorite, removeFavorite };
}
