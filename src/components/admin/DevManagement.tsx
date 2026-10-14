import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  Image,
  Bell,
  Settings,
  Star,
  Eye,
  EyeOff,
  Send,
  Palette,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";

const DevManagement = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [certResult, setCertResult] = useState<any>(null);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [siteConfig, setSiteConfig] = useState({
    siteName: "BahOfertas",
    logoUrl: "",
    bannerUrl: "",
    headerColor: "#3b82f6",
    primaryColor: "#3b82f6",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com",
    twitterUrl: "https://twitter.com"
  });

  const [notification, setNotification] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "success" | "warning" | "error",
    targetAudience: "all" as "all" | "users" | "affiliates" | "partners"
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Buscar notificações recentes
      const { data: notifications, error: notifError } = await supabase
        .from('audit_logs')
        .select('description, created_at, metadata')
        .eq('action', 'notification_sent')
        .order('created_at', { ascending: false })
        .limit(5);

      if (notifError) throw notifError;

      setRecentNotifications(notifications || []);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

  const handleSiteConfigUpdate = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert([
          { key: 'site_name', value: siteConfig.siteName, category: 'appearance', is_public: true },
          { key: 'logo_url', value: siteConfig.logoUrl, category: 'appearance', is_public: true },
          { key: 'banner_url', value: siteConfig.bannerUrl, category: 'appearance', is_public: true },
          { key: 'header_color', value: siteConfig.headerColor, category: 'appearance', is_public: true },
          { key: 'primary_color', value: siteConfig.primaryColor, category: 'appearance', is_public: true },
          { key: 'facebook_url', value: siteConfig.facebookUrl, category: 'appearance', is_public: true },
          { key: 'instagram_url', value: siteConfig.instagramUrl, category: 'appearance', is_public: true },
          { key: 'twitter_url', value: siteConfig.twitterUrl, category: 'appearance', is_public: true }
        ], { onConflict: 'key' });

      if (error) throw error;

      toast({
        title: "Configurações atualizadas!",
        description: "As alterações do site foram salvas com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = async () => {
    if (!notification.title || !notification.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e mensagem são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Aqui você pode implementar a lógica de notificação push
      // Por enquanto vou simular salvando no audit_logs
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          action: 'notification_sent',
          entity_type: 'notification',
          description: `Notificação enviada: ${notification.title}`,
          metadata: {
            title: notification.title,
            message: notification.message,
            type: notification.type,
            targetAudience: notification.targetAudience
          }
        });

      if (error) throw error;

      toast({
        title: "Notificação enviada!",
        description: `Notificação enviada para ${notification.targetAudience === 'all' ? 'todos os usuários' : notification.targetAudience}.`
      });

      setNotification({
        title: "",
        message: "",
        type: "info",
        targetAudience: "all"
      });
    } catch (error) {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a notificação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Área de Desenvolvimento</h2>
          <p className="text-muted-foreground">
            Gerencie a aparência do site e notificações
          </p>
        </div>
      </div>

      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-fit mx-auto">
          <TabsTrigger value="appearance" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
            <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Configurações Visuais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="siteName">Nome do Site</Label>
                    <Input
                      id="siteName"
                      value={siteConfig.siteName}
                      onChange={(e) => setSiteConfig(prev => ({ ...prev, siteName: e.target.value }))}
                      placeholder="Nome do site"
                    />
                  </div>

                  <div>
                    <Label htmlFor="logoUrl">URL do Logo</Label>
                    <Input
                      id="logoUrl"
                      value={siteConfig.logoUrl}
                      onChange={(e) => setSiteConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bannerUrl">URL do Banner Principal</Label>
                    <Input
                      id="bannerUrl"
                      value={siteConfig.bannerUrl}
                      onChange={(e) => setSiteConfig(prev => ({ ...prev, bannerUrl: e.target.value }))}
                      placeholder="https://exemplo.com/banner.jpg"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="headerColor">Cor do Cabeçalho</Label>
                    <div className="flex gap-2">
                      <Input
                        id="headerColor"
                        type="color"
                        value={siteConfig.headerColor}
                        onChange={(e) => setSiteConfig(prev => ({ ...prev, headerColor: e.target.value }))}
                        className="w-20 h-10"
                      />
                      <Input
                        value={siteConfig.headerColor}
                        onChange={(e) => setSiteConfig(prev => ({ ...prev, headerColor: e.target.value }))}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="primaryColor">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={siteConfig.primaryColor}
                        onChange={(e) => setSiteConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-20 h-10"
                      />
                      <Input
                        value={siteConfig.primaryColor}
                        onChange={(e) => setSiteConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="text-lg font-semibold mb-4">Redes Sociais</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="facebookUrl">Facebook</Label>
                    <Input
                      id="facebookUrl"
                      value={siteConfig.facebookUrl}
                      onChange={(e) => setSiteConfig(prev => ({ ...prev, facebookUrl: e.target.value }))}
                      placeholder="https://facebook.com/..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="instagramUrl">Instagram</Label>
                    <Input
                      id="instagramUrl"
                      value={siteConfig.instagramUrl}
                      onChange={(e) => setSiteConfig(prev => ({ ...prev, instagramUrl: e.target.value }))}
                      placeholder="https://instagram.com/..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="twitterUrl">Twitter</Label>
                    <Input
                      id="twitterUrl"
                      value={siteConfig.twitterUrl}
                      onChange={(e) => setSiteConfig(prev => ({ ...prev, twitterUrl: e.target.value }))}
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSiteConfigUpdate} disabled={isLoading} className="w-full mt-6">
                <Upload className="h-4 w-4 mr-2" />
                {isLoading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações Push
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notificationTitle">Título da Notificação</Label>
                    <Input
                      id="notificationTitle"
                      value={notification.title}
                      onChange={(e) => setNotification(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Título da notificação"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notificationMessage">Mensagem</Label>
                    <Textarea
                      id="notificationMessage"
                      value={notification.message}
                      onChange={(e) => setNotification(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Conteúdo da notificação..."
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <Label htmlFor="notificationType">Tipo</Label>
                      <select
                        id="notificationType"
                        value={notification.type}
                        onChange={(e) => setNotification(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      >
                        <option value="info">Informação</option>
                        <option value="success">Sucesso</option>
                        <option value="warning">Aviso</option>
                        <option value="error">Erro</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="targetAudience">Público-alvo</Label>
                      <select
                        id="targetAudience"
                        value={notification.targetAudience}
                        onChange={(e) => setNotification(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      >
                        <option value="all">Todos</option>
                        <option value="users">Usuários</option>
                        <option value="affiliates">Afiliados</option>
                        <option value="partners">Parceiros</option>
                      </select>
                    </div>
                  </div>

                  <Button onClick={sendNotification} disabled={isLoading} className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    {isLoading ? "Enviando..." : "Enviar Notificação"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Prévia da Notificação</h3>
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Bell className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {notification.title || "Título da notificação"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message || "Mensagem da notificação aparecerá aqui..."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Para: {notification.targetAudience === 'all' ? 'Todos os usuários' : notification.targetAudience}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Notificações Recentes</h4>
                    <div className="space-y-2 text-sm">
                      {recentNotifications.length > 0 ? recentNotifications.map((notif, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="truncate flex-1 mr-2">
                            {notif.metadata?.title || notif.description}
                          </span>
                          <span className="text-muted-foreground whitespace-nowrap">
                            {new Date(notif.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )) : (
                        <div className="text-center py-2 text-muted-foreground">
                          Nenhuma notificação encontrada
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Certificação RateHawk */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Certificação RateHawk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Executa o fluxo completo de reserva de teste (search → prebook → book) no hotel de certificação HID 8473727.
                </p>

                <Button
                  onClick={async () => {
                    setCertLoading(true);
                    setCertResult(null);
                    try {
                      const { data, error } = await supabase.functions.invoke('etg-certification-test');
                      if (error) throw error;
                      setCertResult(data);
                      toast({
                        title: data?.success ? "Teste concluído com sucesso!" : "Teste concluído com erros",
                        description: data?.success
                          ? `Order ID: ${data.results?.order_id || 'N/A'}`
                          : "Verifique os detalhes abaixo.",
                        variant: data?.success ? "default" : "destructive",
                      });
                    } catch (err: any) {
                      setCertResult({ success: false, error: err.message });
                      toast({
                        title: "Erro ao executar teste",
                        description: err.message,
                        variant: "destructive",
                      });
                    } finally {
                      setCertLoading(false);
                    }
                  }}
                  disabled={certLoading}
                  className="w-full"
                >
                  {certLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Executando teste...
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Executar Teste de Certificação
                    </>
                  )}
                </Button>

                <Separator className="my-2" />

                <p className="text-sm text-muted-foreground">
                  Teste manual pelo frontend — abre o hotel de certificação com datas pré-definidas:
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.open('/hospedagem?test=true', '_blank');
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Abrir Hotel de Teste no Site
                </Button>

                {certResult && (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-2">
                      {certResult.success ? (
                        <Badge className="bg-green-600 text-white">✔ Certificação OK</Badge>
                      ) : (
                        <Badge variant="destructive">✘ Falha na Certificação</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{certResult.timestamp}</span>
                    </div>

                    {certResult.error && !certResult.results && (
                      <p className="text-sm text-destructive">{certResult.error}</p>
                    )}

                    {certResult.results && (
                      <div className="space-y-2">
                        {['search', 'prebook', 'booking'].map((step) => {
                          const s = certResult.results[step];
                          if (!s) return null;
                          return (
                            <div key={step} className="flex items-start gap-2 p-3 rounded-md border bg-muted/30">
                              {s.status === 'success' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                              ) : s.status === 'error' ? (
                                <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                              ) : (
                                <Loader2 className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm capitalize">{step}</p>
                                {s.error && <p className="text-xs text-destructive mt-1">{s.error}</p>}
                                {s.data && (
                                  <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(s.data, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {certResult.results.order_id && (
                          <Separator className="my-2" />
                        )}

                        {certResult.results.order_id && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Order ID:</span>
                              <p className="font-mono font-medium">{certResult.results.order_id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Partner Order:</span>
                              <p className="font-mono font-medium">{certResult.results.partner_order_id}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Confirmation:</span>
                              <p className="font-mono font-medium">{certResult.results.confirmation_number}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Booking ID (DB):</span>
                              <p className="font-mono font-medium">{certResult.results.booking_id || 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configurações Avançadas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Avançadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Modo Manutenção</p>
                      <p className="text-sm text-muted-foreground">Ativar página de manutenção para todos os usuários</p>
                    </div>
                    <Switch />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificações Push</p>
                      <p className="text-sm text-muted-foreground">Habilitar sistema de notificações push</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Registro de Novos Usuários</p>
                      <p className="text-sm text-muted-foreground">Permitir que novos usuários se registrem</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Modo Debug</p>
                      <p className="text-sm text-muted-foreground">Mostrar informações de debug no console</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Fazer Backup do Sistema
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DevManagement;
