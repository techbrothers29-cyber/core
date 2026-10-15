import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Botão redondo branco com sombra, sobreposto à foto no celular
 * (voltar, compartilhar, favoritar). Área de toque de 44px.
 */
const OfferRoundButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#222222]",
        "shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-transform active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  ),
);
OfferRoundButton.displayName = "OfferRoundButton";

export default OfferRoundButton;
