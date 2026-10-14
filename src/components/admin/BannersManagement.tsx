import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  EyeOff
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  bullet_points?: string[];
  description: string;
  image_url: string;
  mobile_image_url?: string;
  image_width?: number;
  image_height?: number;
  button_text?: string;
  button_link?: string;
  background_color?: string;
  background_size?: string;
  background_position?: string;
  container_height?: string;
  container_padding?: string;
  container_max_width?: string;
  banner_position: string;
  is_active: boolean;
  display_order: number;
}

const BannersManagement = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  const emptyBanner: Banner = {
    id: "",
    title: "Banner Promocional",
    subtitle: "",
    bullet_points: [],
    description: "Banner promocional",
    image_url: "",
    mobile_image_url: "",
    image_width: 1920,
    image_height: 600,
    button_text: "",
    button_link: "#",
    background_color: "linear-gradient(135deg, hsl(345, 70%, 30%), hsl(345, 65%, 40%))",
    background_size: "cover",
    background_position: "center",
    container_height: "auto",
    container_padding: "py-8 md:py-12",
    container_max_width: "container",
    banner_position: "before_secondary",
    is_active: true,
    display_order: 1
  };

  useEffect(() => {
    loadBanners();

    // Real-time subscription
    const bannersChannel = supabase
      .channel('admin-banners-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'promotional_banners'
      }, () => {
        loadBanners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bannersChannel);
    };
  }, []);

  const loadBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_banners')
        .select('*')
        .order('banner_position', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Converter os dados do Supabase para o tipo Banner
      const formattedBanners: Banner[] = (data || []).map(banner => ({
        ...banner,
        bullet_points: Array.isArray(banner.bullet_points) ? banner.bullet_points as string[] : []
      }));

      setBanners(formattedBanners);
    } catch (error) {
      console.error('Erro ao carregar banners:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os banners",
        variant: "destructive"
      });
    }
  };

  const handleSaveBanner = async () => {
    if (!editingBanner) return;

    setIsLoading(true);
    try {
      const bannerData = {
        title: editingBanner.title,
        subtitle: editingBanner.subtitle,
        bullet_points: editingBanner.bullet_points || [],
        description: editingBanner.description,
        image_url: editingBanner.image_url,
        mobile_image_url: editingBanner.mobile_image_url || null,
        image_width: editingBanner.image_width,
        image_height: editingBanner.image_height,
        button_text: editingBanner.button_text,
        button_link: editingBanner.button_link,
        background_color: editingBanner.background_color,
        background_size: editingBanner.background_size,
        background_position: editingBanner.background_position,
        container_height: editingBanner.container_height,
        container_padding: editingBanner.container_padding,
        container_max_width: editingBanner.container_max_width,
        banner_position: editingBanner.banner_position,
        is_active: editingBanner.is_active,
        display_order: editingBanner.display_order
      };

      if (isCreating) {
        const { error } = await supabase
          .from('promotional_banners')
          .insert([bannerData]);

        if (error) throw error;

        toast({
          title: "Banner criado!",
          description: "O banner foi criado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('promotional_banners')
          .update(bannerData)
          .eq('id', editingBanner.id);

        if (error) throw error;

        toast({
          title: "Banner atualizado!",
          description: "As alterações foram salvas"
        });
      }

      setEditingBanner(null);
      setIsCreating(false);
      loadBanners();
    } catch (error: any) {
      console.error('Erro ao salvar banner:', error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível salvar o banner",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('promotional_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Banner excluído!",
        description: "O banner foi removido com sucesso"
      });

      loadBanners();
    } catch (error) {
      console.error('Erro ao excluir banner:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o banner",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('promotional_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;

      toast({
        title: banner.is_active ? "Banner desativado" : "Banner ativado",
        description: `O banner foi ${banner.is_active ? 'desativado' : 'ativado'} com sucesso`
      });

      loadBanners();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, isMobile: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem válido",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (máximo 5MB para desktop, 2MB para mobile)
    const maxSize = isMobile ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    const maxSizeLabel = isMobile ? "2MB" : "5MB";
    if (file.size > maxSize) {
      toast({
        title: "Erro",
        description: `A imagem deve ter no máximo ${maxSizeLabel}`,
        variant: "destructive"
      });
      return;
    }

    isMobile ? setUploadingMobile(true) : setUploading(true);
    try {
      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const prefix = isMobile ? 'mobile-' : 'desktop-';
      const fileName = `${prefix}${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('promotional-banners')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('promotional-banners')
        .getPublicUrl(filePath);

      // Atualizar o banner com a URL da imagem
      if (isMobile) {
        setEditingBanner({
          ...editingBanner!,
          mobile_image_url: publicUrl
        });
      } else {
        setEditingBanner({
          ...editingBanner!,
          image_url: publicUrl
        });
      }

      toast({
        title: "Sucesso",
        description: `Imagem ${isMobile ? 'mobile' : 'desktop'} carregada com sucesso`
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem",
        variant: "destructive"
      });
    } finally {
      isMobile ? setUploadingMobile(false) : setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Banners Promocionais</h2>
          <p className="text-muted-foreground">Gerencie os banners que aparecem entre os carrosséis</p>
        </div>
        <Button
          onClick={() => {
            setEditingBanner(emptyBanner);
            setIsCreating(true);
          }}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Banner
        </Button>
      </div>

      {/* Editor/Criação de Banner */}
      {editingBanner && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isCreating ? "Criar Novo Banner" : "Editar Banner"}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingBanner(null);
                  setIsCreating(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-6">
              {/* Desktop Banner Upload */}
              <div className="space-y-2 p-4 border border-border rounded-lg">
                <Label htmlFor="imageUpload" className="flex items-center gap-2">
                  <span className="text-lg">🖥️</span>
                  Upload da Imagem Desktop *
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
                </div>
                <div className="bg-muted/50 p-3 rounded-md space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong>📐 Dimensões recomendadas:</strong> 1200 × 260 pixels
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>📦 Tamanho máximo:</strong> 5MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>📁 Formatos aceitos:</strong> JPG, PNG, WEBP
                  </p>
                </div>
                {editingBanner.image_url && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Preview Desktop:</p>
                    <img
                      src={editingBanner.image_url}
                      alt="Preview do banner desktop"
                      className="rounded max-w-full"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>

              {/* Mobile Banner Upload */}
              <div className="space-y-2 p-4 border border-border rounded-lg bg-accent/5">
                <Label htmlFor="mobileImageUpload" className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  Upload da Imagem Mobile (Opcional)
                </Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="mobileImageUpload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    disabled={uploadingMobile}
                    className="flex-1"
                  />
                  {uploadingMobile && <span className="text-sm text-muted-foreground">Enviando...</span>}
                </div>
                <div className="bg-muted/50 p-3 rounded-md space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong>📐 Dimensões recomendadas:</strong> 600 × 400 pixels (proporção 3:2)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>📦 Tamanho máximo:</strong> 2MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>📁 Formatos aceitos:</strong> JPG, PNG, WEBP
                  </p>
                  <p className="text-xs text-primary">
                    💡 Se não enviar uma imagem mobile, será usada a imagem desktop
                  </p>
                </div>
                {editingBanner.mobile_image_url && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Preview Mobile:</p>
                    <img
                      src={editingBanner.mobile_image_url}
                      alt="Preview do banner mobile"
                      className="rounded max-w-full"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bannerPosition">Posição do Banner *</Label>
                <Select
                  value={editingBanner.banner_position}
                  onValueChange={(value) => setEditingBanner({
                    ...editingBanner,
                    banner_position: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a posição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before_secondary">1º Carrossel</SelectItem>
                    <SelectItem value="before_tertiary">2º Carrossel</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Escolha onde o banner será exibido na página inicial
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveBanner}
                disabled={isLoading || !editingBanner.image_url}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Banner
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingBanner(null);
                  setIsCreating(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Banners */}
      <div className="grid gap-4">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{banner.title}</h3>
                    <Badge variant={banner.is_active ? "default" : "secondary"}>
                      {banner.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline">
                      {banner.banner_position === 'before_secondary' ? '1º Carrossel' : '2º Carrossel'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{banner.description}</p>
                  {banner.subtitle && (
                    <p className="text-xs text-muted-foreground italic">Subtítulo: {banner.subtitle}</p>
                  )}
                  {banner.bullet_points && banner.bullet_points.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {banner.bullet_points.length} pontos de destaque
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(banner)}
                    disabled={isLoading}
                  >
                    {banner.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingBanner(banner);
                      setIsCreating(false);
                    }}
                    disabled={isLoading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBanner(banner.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {banners.length === 0 && !editingBanner && (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum banner criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro banner promocional para começar
            </p>
            <Button
              onClick={() => {
                setEditingBanner(emptyBanner);
                setIsCreating(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Banner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BannersManagement;
