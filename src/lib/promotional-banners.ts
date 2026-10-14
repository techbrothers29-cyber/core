import { supabase } from "@/integrations/supabase/client";

type PromoBanner = {
  background_color: string;
  background_position: string;
  background_size: string;
  banner_position: string;
  button_link: string;
  button_text: string;
  container_height: string;
  container_max_width: string;
  container_padding: string;
  description: string;
  id: string;
  image_height: number;
  image_url: string;
  image_width: number;
  subtitle: string;
  title: string;
};

/**
 * Busca os banners promocionais das posições 'before_secondary' e
 * 'before_tertiary' em uma única chamada RPC, para que as duas seções da home
 * compartilhem o mesmo network request (menos latência na home).
 */
export async function fetchHomePromotionalBanners(): Promise<{
  before_secondary: PromoBanner | null;
  before_tertiary: PromoBanner | null;
}> {
  const [secondary, tertiary] = await Promise.all([
    supabase.rpc('get_promotional_banner', { position_param: 'before_secondary' }),
    supabase.rpc('get_promotional_banner', { position_param: 'before_tertiary' }),
  ]);
  return {
    before_secondary: (secondary.data && secondary.data.length > 0) ? secondary.data[0] as PromoBanner : null,
    before_tertiary: (tertiary.data && tertiary.data.length > 0) ? tertiary.data[0] as PromoBanner : null,
  };
}
