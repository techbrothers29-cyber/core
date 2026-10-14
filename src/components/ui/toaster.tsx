import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useState, useRef } from "react";

export function Toaster() {
  const { toasts } = useToast();

  const handleSwipeUp = (toastId: string) => {
    const toastElement = document.querySelector(`[data-toast-id="${toastId}"]`);
    if (toastElement) {
      const closeButton = toastElement.querySelector('[toast-close]') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    }
  };

  const SwipeableToast = ({ id, title, description, action, ...props }: any) => {
    const [startY, setStartY] = useState<number | null>(null);
    const [currentY, setCurrentY] = useState<number | null>(null);
    const toastRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
      setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (startY === null) return;

      const currentY = e.touches[0].clientY;
      setCurrentY(currentY);

      const diff = startY - currentY;

      if (diff > 0 && toastRef.current) {
        // Swiping up
        toastRef.current.style.transform = `translateY(-${diff}px)`;
        toastRef.current.style.opacity = `${Math.max(0.3, 1 - diff / 100)}`;
      }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (startY === null || currentY === null) return;

      const diff = startY - currentY;

      if (diff > 50) {
        // Swipe up threshold reached
        handleSwipeUp(id);
      } else if (toastRef.current) {
        // Reset position if swipe wasn't enough
        toastRef.current.style.transform = 'translateY(0px)';
        toastRef.current.style.opacity = '1';
      }

      setStartY(null);
      setCurrentY(null);
    };

    return (
      <div
        ref={toastRef}
        data-toast-id={id}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('[toast-close]')) return;
          window.location.href = '/checkout';
        }}
        className="md:touch-none cursor-pointer"
      >
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      </div>
    );
  };

  return (
    <ToastProvider duration={2000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <SwipeableToast
            key={id}
            id={id}
            title={title}
            description={description}
            action={action}
            {...props}
          />
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
