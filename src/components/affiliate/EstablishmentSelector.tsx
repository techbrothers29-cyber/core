import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, Search, Check, Building2, Sparkles, Ticket, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNovaxsEstablishments } from "@/hooks/useNovaxsEstablishments";
import type { Establishment } from "@/data/novaxs-establishments";

interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  description: string | null;
  logo_url: string | null;
  is_verified: boolean;
}

interface EstablishmentSelectorProps {
  affiliateId: string;
  commissionRate?: number | null;
}

type CarouselTag = "primary" | "secondary" | "tertiary";

interface UnifiedItem {
  key: string;
  source: "bahofertas" | "novaxs";
  companyId?: string; // only bahofertas (selectable)
  name: string;
  description: string | null;
  imageUrl: string | null;
  carousels: CarouselTag[];
}

const carouselLabel: Record<CarouselTag, string> = {
  primary: "Carrossel Principal",
  secondary: "Carrossel Secundário",
  tertiary: "Carrossel Terciário",
};

export const EstablishmentSelector = ({ affiliateId, commissionRate }: EstablishmentSelectorProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [bahOverrides, setBahOverrides] = useState<Map<string, { carousels: CarouselTag[]; custom_name: string | null; custom_image_url: string | null; custom_description: string | null; is_visible: boolean }>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { establishments: novaxsEstablishments, loading: novaxsLoading } = useNovaxsEstablishments();

  useEffect(() => {
    fetchData();
  }, [affiliateId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [companiesRes, selectionsRes, overridesRes] = await Promise.all([
        supabase.rpc('get_public_company_marketplace_info'),
        supabase.from('affiliate_establishments').select('company_id').eq('affiliate_id', affiliateId),
        supabase.from('bahofertas_establishment_overrides').select('company_id,custom_name,custom_image_url,custom_description,carousel_primary,carousel_secondary,carousel_tertiary,is_visible'),
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (selectionsRes.error) throw selectionsRes.error;

      const ovMap = new Map<string, { carousels: CarouselTag[]; custom_name: string | null; custom_image_url: string | null; custom_description: string | null; is_visible: boolean }>();
      for (const o of (overridesRes.data || []) as any[]) {
        const carousels: CarouselTag[] = [];
        if (o.carousel_primary) carousels.push("primary");
        if (o.carousel_secondary) carousels.push("secondary");
        if (o.carousel_tertiary) carousels.push("tertiary");
        ovMap.set(o.company_id, {
          carousels,
          custom_name: o.custom_name,
          custom_image_url: o.custom_image_url,
          custom_description: o.custom_description,
          is_visible: o.is_visible,
        });
      }

      setCompanies((companiesRes.data || []) as Company[]);
      setBahOverrides(ovMap);
      setSelectedIds(new Set(selectionsRes.data?.map((s: any) => s.company_id) || []));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar estabelecimentos",
        description: "Não foi possível carregar a lista de estabelecimentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (companyId: string) => {
    const newSelected = new Set(selectedIds);
    const isCurrentlySelected = selectedIds.has(companyId);

    try {
      setSaving(true);

      if (isCurrentlySelected) {
        const { error } = await supabase
          .from('affiliate_establishments')
          .delete()
          .eq('affiliate_id', affiliateId)
          .eq('company_id', companyId);

        if (error) throw error;
        newSelected.delete(companyId);
      } else {
        const { error } = await supabase
          .from('affiliate_establishments')
          .insert({ affiliate_id: affiliateId, company_id: companyId });

        if (error) throw error;
        newSelected.add(companyId);
      }

      setSelectedIds(newSelected);
    } catch (error) {
      console.error('Error toggling establishment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a seleção.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Build unified list: Bah Ofertas (selectable) + NovaXS (informational)
  const items = useMemo<UnifiedItem[]>(() => {
    const result: UnifiedItem[] = [];

    // Bah Ofertas — only those with at least one carousel active OR all approved
    for (const c of companies) {
      const ov = bahOverrides.get(c.id);
      if (ov && ov.is_visible === false) continue;
      result.push({
        key: `bah-${c.id}`,
        source: "bahofertas",
        companyId: c.id,
        name: ov?.custom_name || c.trade_name || c.name,
        description: ov?.custom_description || c.description,
        imageUrl: ov?.custom_image_url || c.logo_url,
        carousels: ov?.carousels || [],
      });
    }

    // NovaXS — show those active in any carousel
    for (const e of novaxsEstablishments as Establishment[]) {
      const carousels: CarouselTag[] = [];
      if (e.carouselPrimary) carousels.push("primary");
      if (e.carouselSecondary) carousels.push("secondary");
      if (e.carouselTertiary) carousels.push("tertiary");
      // Only list NovaXS with at least one carousel flag (admin-curated)
      if (carousels.length === 0) continue;
      result.push({
        key: `nx-${e.id}`,
        source: "novaxs",
        name: e.displayName || e.name,
        description: e.aboutText || null,
        imageUrl: e.image || null,
        carousels,
      });
    }

    return result;
  }, [companies, bahOverrides, novaxsEstablishments]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const isLoading = loading || novaxsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Estabelecimentos para Indicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-6" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Estabelecimentos para Indicação
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecione os estabelecimentos Bah Ofertas que deseja promover.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estabelecimentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm sm:text-base"
          />
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <Badge variant="secondary" className="text-xs">
            <Check className="h-3 w-3 mr-1" />
            {selectedIds.size} selecionados
          </Badge>
          <span className="text-muted-foreground">
            {items.length} estabelecimentos disponíveis
          </span>
        </div>

        {/* Unified List */}
        <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto -mx-1 px-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum estabelecimento encontrado</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isBah = item.source === "bahofertas";
              const isSelected = isBah && item.companyId ? selectedIds.has(item.companyId) : false;
              const interactive = isBah;

              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 border rounded-lg transition-colors ${
                    interactive ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default bg-muted/20'
                  } ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => interactive && !saving && item.companyId && handleToggle(item.companyId)}
                >
                  {/* Logo */}
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : item.source === "novaxs" ? (
                      <Ticket className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    ) : (
                      <Store className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate text-sm sm:text-base">
                        {item.name}
                      </h4>
                      <Badge
                        variant={item.source === "novaxs" ? "default" : "outline"}
                        className="text-[10px] h-4 px-1.5"
                      >
                        {item.source === "novaxs" ? "NovaXS" : "Bah Ofertas"}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {item.description}
                      </p>
                    )}
                    {item.carousels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.carousels.map(c => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5"
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            {carouselLabel[c]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Checkbox / Indicator */}
                  {interactive ? (
                    <Checkbox
                      checked={isSelected}
                      disabled={saving}
                      className="flex-shrink-0"
                    />
                  ) : (
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                      Disponível
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
