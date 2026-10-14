import React, { useState, useCallback, useRef, useEffect } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

interface UseCarouselTouchPauseOptions {
  api: CarouselApi | undefined;
  interval?: number;
}

export const useCarouselTouchPause = ({ api, interval = 3000 }: UseCarouselTouchPauseOptions) => {
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollNext = useCallback(() => {
    if (api) {
      api.scrollNext();
    }
  }, [api]);

  // Use Embla's native events to pause/resume autoplay without interfering with drag
  useEffect(() => {
    if (!api) return;

    const onPointerDown = () => {
      isPausedRef.current = true;
      setIsPaused(true);
    };

    const onPointerUp = () => {
      isPausedRef.current = false;
      setIsPaused(false);
    };

    api.on("pointerDown", onPointerDown);
    api.on("pointerUp", onPointerUp);
    api.on("settle", onPointerUp);

    return () => {
      api.off("pointerDown", onPointerDown);
      api.off("pointerUp", onPointerUp);
      api.off("settle", onPointerUp);
    };
  }, [api]);

  // Auto-scroll effect
  useEffect(() => {
    if (!api) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        scrollNext();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [api, scrollNext, interval]);

  return {
    isPaused,
  };
};
