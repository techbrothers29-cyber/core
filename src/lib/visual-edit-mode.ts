/**
 * Detecta se a aplicação está rodando dentro do iframe das "Edições Visuais"
 * do Lovable. Nesse caso, certas verificações de auth/redirect devem ser
 * suprimidas para permitir que o layout renderize para edição.
 *
 * IMPORTANTE: isso é apenas visual. As queries reais ao Supabase continuam
 * sujeitas a RLS — sem sessão, nenhum dado sensível é exposto.
 */
export function isLovableVisualEditIframe(): boolean {
  if (typeof window === "undefined") return false;

  // Precisa estar em iframe
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true; // cross-origin → é iframe
  }
  if (!inIframe) return false;

  const hostname = window.location.hostname;
  return (
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovable.dev") ||
    hostname.endsWith(".lovableproject.com")
  );
}
