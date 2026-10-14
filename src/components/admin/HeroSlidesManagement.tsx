import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from "lucide-react";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  mobile_image_url?: string | null;
  desktop_image_url?: string | null;
  is_active: boolean;
  display_order: number;
}

const emptySlide: HeroSlide = {
  id: "",
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  mobile_image_url: "",
  desktop_image_url: "",
  is_active: true,
  display_order: 1,
};

const HeroSlidesManagement = () => {
  const { toast } = useToast();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  useEffect(() => {
    loadSlides();
    const channel = supabase
      .channel("admin-hero-slides")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banner_slides" },
        () => loadSlides()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSlides = async () => {
    const { data, error } = await supabase
      .from("banner_slides")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os slides", variant: "destructive" });
      return;
    }
    setSlides((data || []) as HeroSlide[]);
  };

  const uploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "image_url" | "mobile_image_url" | "desktop_image_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erro", description: "Selecione uma imagem válida", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "Imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }
    const isMobile = target === "mobile_image_url";
    isMobile ? setUploadingMobile(true) : setUploadingDesktop(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `hero-${target}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("banners").upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(fileName);
      setEditing({ ...editing, [target]: publicUrl });
      toast({ title: "Sucesso", description: "Imagem carregada" });
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha no upload", variant: "destructive" });
    } finally {
      isMobile ? setUploadingMobile(false) : setUploadingDesktop(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.image_url) {
      toast({ title: "Atenção", description: "A imagem principal é obrigatória", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        title: editing.title || "",
        subtitle: editing.subtitle || "",
        description: editing.description || "",
        image_url: editing.image_url,
        mobile_image_url: editing.mobile_image_url || null,
        desktop_image_url: editing.desktop_image_url || null,
        is_active: editing.is_active,
        display_order: editing.display_order,
      };
      if (isCreating) {
        const { error } = await supabase.from("banner_slides").insert([payload]);
        if (error) throw error;
        toast({ title: "Slide criado!" });
      } else {
        const { error } = await supabase.from("banner_slides").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Slide atualizado!" });
      }
      setEditing(null);
      setIsCreating(false);
      loadSlides();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao salvar", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este slide do banner principal?")) return;
    const { error } = await supabase.from("banner_slides").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Slide excluído" });
    loadSlides();
  };

  const handleToggleActive = async (slide: HeroSlide) => {
    const { error } = await supabase
      .from("banner_slides")
      .update({ is_active: !slide.is_active })
      .eq("id", slide.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    loadSlides();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Banner Principal (Topo)</h2>
          <p className="text-muted-foreground">
            Slides do carrossel exibido no topo da página inicial
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing({ ...emptySlide, display_order: slides.length + 1 });
            setIsCreating(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Slide
        </Button>
      </div>

      {editing && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isCreating ? "Criar Novo Slide" : "Editar Slide"}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setIsCreating(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <span>📐</span> Guia de dimensões recomendadas
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  <strong>🖥️ Desktop:</strong> 1600 × 500px (proporção 3.2:1) — usado em telas ≥ 768px
                </li>
                <li>
                  <strong>📱 Mobile:</strong> 716 × 320px (proporção ~2.24:1) — usado em telas &lt; 768px
                </li>
                <li>
                  <strong>🖼️ Principal (fallback):</strong> 1600 × 500px — usada quando Mobile/Desktop não são enviadas
                </li>
                <li>Formato: JPG ou WebP otimizado • Máx. 5MB cada</li>
              </ul>
            </div>

            <div className="space-y-2 p-4 border border-border rounded-lg">
              <Label className="flex items-center gap-2">
                <span className="text-lg">🖼️</span>
                Imagem Principal (fallback) *
              </Label>
              <p className="text-xs text-muted-foreground">
                Exibida quando não há versão específica. Recomendado: <strong>1600 × 500px</strong>
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => uploadImage(e, "image_url")}
                disabled={uploadingDesktop}
              />
              {editing.image_url && (
                <img
                  src={editing.image_url}
                  alt="Preview"
                  className="rounded mt-2 max-h-40 object-contain"
                />
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <Label className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  Imagem Mobile (opcional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recomendado: <strong>716 × 320px</strong> (proporção ~2.24:1)
                  <br />
                  Exibida em telas menores que 768px
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadImage(e, "mobile_image_url")}
                  disabled={uploadingMobile}
                />
                {editing.mobile_image_url && (
                  <img
                    src={editing.mobile_image_url}
                    alt="Preview mobile"
                    className="rounded mt-2 max-h-32 object-contain"
                  />
                )}
              </div>

              <div className="space-y-2 p-4 border border-border rounded-lg">
                <Label className="flex items-center gap-2">
                  <span className="text-lg">🖥️</span>
                  Imagem Desktop (opcional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recomendado: <strong>1600 × 500px</strong> (proporção 3.2:1)
                  <br />
                  Exibida em telas a partir de 768px
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadImage(e, "desktop_image_url")}
                  disabled={uploadingDesktop}
                />
                {editing.desktop_image_url && (
                  <img
                    src={editing.desktop_image_url}
                    alt="Preview desktop"
                    className="rounded mt-2 max-h-32 object-contain"
                  />
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Deixe vazio para banner sem texto"
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo (destaque)</Label>
                <Input
                  value={editing.subtitle}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={editing.display_order}
                  onChange={(e) =>
                    setEditing({ ...editing, display_order: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <Button
                    type="button"
                    variant={editing.is_active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                  >
                    {editing.is_active ? "Ativo" : "Inativo"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={isLoading || !editing.image_url}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Slide
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setIsCreating(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {slides.map((slide) => (
          <Card key={slide.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {slide.image_url && (
                  <img
                    src={slide.image_url}
                    alt={slide.title || "Slide"}
                    className="w-32 h-20 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold">
                      {slide.title || <span className="text-muted-foreground italic">Sem título</span>}
                    </h3>
                    <Badge variant={slide.is_active ? "default" : "secondary"}>
                      {slide.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline">Ordem: {slide.display_order}</Badge>
                  </div>
                  {slide.subtitle && (
                    <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                  )}
                  {slide.description && (
                    <p className="text-xs text-muted-foreground mt-1">{slide.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(slide)}>
                    {slide.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(slide);
                      setIsCreating(false);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(slide.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {slides.length === 0 && !editing && (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum slide cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie o primeiro slide do banner principal
            </p>
            <Button
              onClick={() => {
                setEditing(emptySlide);
                setIsCreating(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Slide
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HeroSlidesManagement;
