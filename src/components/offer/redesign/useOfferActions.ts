import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useFavorites, type FavoriteItem } from "@/hooks/useFavorites";

/**
 * Ações da página de oferta: voltar, compartilhar e favoritar.
 * - Voltar: histórico do navegador; sem histórico, vai para a Home.
 * - Compartilhar: menu nativo (navigator.share) ou copia o link.
 * - Favoritar: favoritos locais, mesma chave `offer:<id>` usada na Home.
 */
export function useOfferActions(fav: Omit<FavoriteItem, "savedAt"> | null, shareTitle: string, shareUrl: string) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = fav ? isFavorite(fav.key) : false;

  const goBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  }, [navigate]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copiado", description: "Agora é só colar e enviar." });
    } catch {
      toast({ title: "Não foi possível copiar o link", description: shareUrl, variant: "destructive" });
    }
  }, [shareUrl, toast]);

  const share = useCallback(async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      } catch (err) {
        // Usuário cancelou o menu nativo: não faz nada.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await copyLink();
  }, [shareTitle, shareUrl, copyLink]);

  const toggleFav = useCallback(() => {
    if (!fav) return;
    const added = toggleFavorite(fav);
    toast({ title: added ? "Salvo nos favoritos" : "Removido dos favoritos" });
  }, [fav, toggleFavorite, toast]);

  return { goBack, share, toggleFav, favorited };
}
