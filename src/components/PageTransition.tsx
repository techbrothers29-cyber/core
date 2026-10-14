import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      window.scrollTo({ top: 0 });
      return;
    }

    setIsVisible(false);
    window.scrollTo({ top: 0 });

    // Two-frame delay: first frame applies opacity-0, second frame triggers transition to opacity-1
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(raf2);
    });

    return () => cancelAnimationFrame(raf1);
  }, [location.pathname]);

  return (
    <div
      style={{
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        // will-change apenas durante a transição; mantê-lo sempre ligado força
        // a página inteira a virar uma camada de composição permanente.
        willChange: isVisible ? "auto" : "opacity, transform",
      }}
      className={`transition-all duration-[400ms] ${
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-[0.995]"
      }`}
    >
      {children}
    </div>
  );

};

export default PageTransition;
