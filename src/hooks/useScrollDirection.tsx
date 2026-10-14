import { useEffect, useRef, useState } from "react";

/**
 * Direção do scroll com listener passivo e leitura em requestAnimationFrame.
 * O efeito é montado uma única vez e só atualiza o estado quando a direção
 * (ou o estado de "rolando") realmente muda — evita re-render a cada evento.
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const directionRef = useRef<"up" | "down" | null>(null);
  const scrollingRef = useRef(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let scrollTimer: ReturnType<typeof setTimeout>;

    const read = () => {
      ticking = false;
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY;

      if (Math.abs(delta) > 10) {
        const direction = delta > 0 ? "down" : "up";
        if (direction !== directionRef.current) {
          directionRef.current = direction;
          setScrollDirection(direction);
        }
        lastScrollY = scrollY > 0 ? scrollY : 0;
      }

      if (!scrollingRef.current) {
        scrollingRef.current = true;
        setIsScrolling(true);
      }

      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrollingRef.current = false;
        setIsScrolling(false);
      }, 150);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(read);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimer);
    };
  }, []);

  return { scrollDirection, isScrolling };
}
