import { useEffect, useRef, useState } from "react";

/**
 * Observa um elemento e informa se ele está (perto de) visível na viewport.
 * Usado para pausar animações caras em elementos fora da tela.
 */
export function useInViewport<T extends HTMLElement = HTMLDivElement>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting);
        }
      },
      { rootMargin }
    );

    io.observe(node);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
