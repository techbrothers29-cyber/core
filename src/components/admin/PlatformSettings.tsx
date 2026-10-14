import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Bell, CreditCard, Shield, Globe, Mail, Smartphone, Lock, Percent } from 'lucide-react';

interface PlatformConfig {
  siteName: string;
  contactEmail: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
}

interface SecurityConfig {
  twoFactorAuth: boolean;
  requireLogin: boolean;
  emailVerification: boolean;
  auditLog: boolean;
  sessionTimeout: number;
}

interface NotificationConfig {
  emailNotifications: boolean;
  pushNotifications: boolean;
  securityAlerts: boolean;
  weeklyReports: boolean;
}

interface PaymentConfig {
  pixKey: string;
  bankAccount: string;
  pixEnabled: boolean;
  creditCardEnabled: boolean;
  boletoEnabled: boolean;
}

interface FinancialConfig {
  affiliatePercentage: number;
  partnerPercentage: number;
  platformPercentage: number;
}

export const PlatformSettings = () => {
  const [config, setConfig] = useState<PlatformConfig>({
    siteName: 'BahOfertas',
    contactEmail: 'contato@bahofertas.com.br',
    siteDescription: 'A melhor plataforma de ofertas gastronômicas do Rio Grande do Sul',
    maintenanceMode: false,
    allowNewRegistrations: true
  });

  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    twoFactorAuth: false,
    requireLogin: false,
    emailVerification: true,
    auditLog: true,
    sessionTimeout: 60
  });

  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    emailNotifications: true,
    pushNotifications: true,
    securityAlerts: true,
    weeklyReports: true
  });

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    pixKey: '',
    bankAccount: '',
    pixEnabled: true,
    creditCardEnabled: true,
    boletoEnabled: false
  });

  const [financialConfig, setFinancialConfig] = useState<FinancialConfig>({
    affiliatePercentage: 10,
    partnerPercentage: 85,
    platformPercentage: 5
  });

  const [loading, setLoading] = useState(false);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const { data: configs, error } = await supabase
        .from('system_config')
        .select('*');

      if (error) throw error;

      // Load configurations from database
      configs?.forEach(config => {
        const configValue = config.value as any;
        switch (config.key) {
          case 'site_name':
            setConfig(prev => ({ ...prev, siteName: configValue.value || prev.siteName }));
            break;
          case 'contact_email':
            setConfig(prev => ({ ...prev, contactEmail: configValue.value || prev.contactEmail }));
            break;
          case 'site_description':
            setConfig(prev => ({ ...prev, siteDescription: configValue.value || prev.siteDescription }));
            break;
          case 'maintenance_mode':
            setConfig(prev => ({ ...prev, maintenanceMode: configValue.enabled || prev.maintenanceMode }));
            break;
          case 'allow_registrations':
            setConfig(prev => ({ ...prev, allowNewRegistrations: configValue.enabled || prev.allowNewRegistrations }));
            break;
          case 'security_settings':
            setSecurityConfig(prev => ({ ...prev, ...configValue }));
            break;
          case 'notification_settings':
            setNotificationConfig(prev => ({ ...prev, ...configValue }));
            break;
          case 'payment_settings':
            setPaymentConfig(prev => ({ ...prev, ...configValue }));
            break;
          case 'financial_settings':
            setFinancialConfig(prev => ({ ...prev, ...configValue }));
            break;
        }
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveConfiguration = async (key: string, value: any, section: string) => {
    setLoadingSection(section);
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key,
          value,
          category: 'platform',
          description: `Configuração de ${section}`,
          is_public: false
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: `As configurações de ${section} foram atualizadas com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoadingSection(null);
    }
  };

  const handleGeneralSave = async () => {
    setLoading(true);
    try {
      await Promise.all([
        saveConfiguration('site_name', { value: config.siteName }, 'geral'),
        saveConfiguration('contact_email', { value: config.contactEmail }, 'geral'),
        saveConfiguration('site_description', { value: config.siteDescription }, 'geral'),
        saveConfiguration('maintenance_mode', { enabled: config.maintenanceMode }, 'geral'),
        saveConfiguration('allow_registrations', { enabled: config.allowNewRegistrations }, 'geral')
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySave = async () => {
    await saveConfiguration('security_settings', securityConfig, 'segurança');
  };

  const handleNotificationSave = async () => {
    await saveConfiguration('notification_settings', notificationConfig, 'notificações');
  };

  const handlePaymentSave = async () => {
    await saveConfiguration('payment_settings', paymentConfig, 'pagamentos');
  };

  const handleFinancialSave = async () => {
    // Validar se a soma das porcentagens é 100%
    const total = financialConfig.affiliatePercentage + financialConfig.partnerPercentage + financialConfig.platformPercentage;
    if (total !== 100) {
      toast({
        title: "Erro de validação",
        description: `A soma das porcentagens deve ser exatamente 100%. Atual: ${total}%`,
        variant: "destructive",
      });
      return;
    }

    await saveConfiguration('financial_settings', financialConfig, 'configurações financeiras');
  };

  const handlePercentageChange = (field: keyof FinancialConfig, value: number) => {
    // Limitar valores entre 0 e 100
    const clampedValue = Math.max(0, Math.min(100, value));

    setFinancialConfig(prev => {
      const newConfig = { ...prev, [field]: clampedValue };

      // Calcular a diferença para distribuir entre os outros campos
      const total = newConfig.affiliatePercentage + newConfig.partnerPercentage + newConfig.platformPercentage;

      // Se passou de 100, ajustar automaticamente
      if (total > 100) {
        const excess = total - 100;
        const otherFields = Object.keys(newConfig).filter(key => key !== field) as (keyof FinancialConfig)[];

        // Distribuir o excesso proporcionalmente entre os outros campos
        otherFields.forEach(otherField => {
          const currentValue = newConfig[otherField];
          const reduction = Math.min(currentValue, Math.round((excess * currentValue) / (total - clampedValue)));
          newConfig[otherField] = Math.max(0, currentValue - reduction);
        });
      }

      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Configurações da Plataforma</h2>
        <p className="text-muted-foreground">Gerencie as configurações gerais da plataforma</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Configurações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Nome do Site</Label>
                  <Input
                    id="siteName"
                    value={config.siteName}
                    onChange={(e) => setConfig(prev => ({ ...prev, siteName: e.target.value }))}
                    placeholder="Nome da plataforma"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">E-mail de Contato</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={config.contactEmail}
                    onChange={(e) => setConfig(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Descrição do Site</Label>
                <Textarea
                  id="siteDescription"
                  value={config.siteDescription}
                  onChange={(e) => setConfig(prev => ({ ...prev, siteDescription: e.target.value }))}
                  placeholder="Descreva sua plataforma..."
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo de Manutenção</Label>
                    <p className="text-sm text-muted-foreground">
                      Desabilita o acesso público ao site
                    </p>
                  </div>
                  <Switch
                    checked={config.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({ ...prev, maintenanceMode: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Novos Cadastros</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir novos usuários se cadastrarem
                    </p>
                  </div>
                  <Switch
                    checked={config.allowNewRegistrations}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({ ...prev, allowNewRegistrations: checked }))
                    }
                  />
                </div>
              </div>

              <Button onClick={handleGeneralSave} disabled={loading} className="w-full md:w-auto">
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Configurações Financeiras
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure a divisão de comissões para cada venda realizada na plataforma.
                A soma das porcentagens deve ser exatamente 100%.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="affiliatePercentage">Porcentagem do Afiliado (%)</Label>
                  <Input
                    id="affiliatePercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={financialConfig.affiliatePercentage}
                    onChange={(e) => handlePercentageChange('affiliatePercentage', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comissão paga ao afiliado por cada venda
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partnerPercentage">Porcentagem do Parceiro (%)</Label>
                  <Input
                    id="partnerPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={financialConfig.partnerPercentage}
                    onChange={(e) => handlePercentageChange('partnerPercentage', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor repassado ao restaurante parceiro
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platformPercentage">Porcentagem da Plataforma (%)</Label>
                  <Input
                    id="platformPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={financialConfig.platformPercentage}
                    onChange={(e) => handlePercentageChange('platformPercentage', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Taxa da plataforma para operação
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Total das Porcentagens:</span>
                  <span className={`font-bold text-lg ${
                    financialConfig.affiliatePercentage + financialConfig.partnerPercentage + financialConfig.platformPercentage === 100
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {financialConfig.affiliatePercentage + financialConfig.partnerPercentage + financialConfig.platformPercentage}%
                  </span>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Afiliado: {financialConfig.affiliatePercentage}%</p>
                  <p>• Parceiro: {financialConfig.partnerPercentage}%</p>
                  <p>• Plataforma: {financialConfig.platformPercentage}%</p>
                </div>
                {financialConfig.affiliatePercentage + financialConfig.partnerPercentage + financialConfig.platformPercentage !== 100 && (
                  <p className="text-red-600 text-sm mt-2 font-medium">
                    ⚠️ A soma deve ser exatamente 100% para salvar as configurações.
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Exemplo de Divisão:</h4>
                <p className="text-sm text-blue-800 mb-2">
                  Para uma venda de R$ 100,00:
                </p>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>• Afiliado recebe: R$ {((100 * financialConfig.affiliatePercentage) / 100).toFixed(2)}</p>
                  <p>• Parceiro recebe: R$ {((100 * financialConfig.partnerPercentage) / 100).toFixed(2)}</p>
                  <p>• Plataforma recebe: R$ {((100 * financialConfig.platformPercentage) / 100).toFixed(2)}</p>
                </div>
              </div>

              <Button
                onClick={handleFinancialSave}
                disabled={
                  loadingSection === 'configurações financeiras' ||
                  financialConfig.affiliatePercentage + financialConfig.partnerPercentage + financialConfig.platformPercentage !== 100
                }
                className="w-full md:w-auto"
              >
                {loadingSection === 'configurações financeiras' ? 'Salvando...' : 'Salvar Configurações Financeiras'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Configurações de Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Notificações por E-mail
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificações importantes por e-mail
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationConfig(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Notificações Push
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Notificações push para dispositivos móveis
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationConfig(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas de Segurança</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar sobre tentativas de login suspeitas
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.securityAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationConfig(prev => ({ ...prev, securityAlerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Relatórios Semanais</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber relatórios automáticos por e-mail
                    </p>
                  </div>
                  <Switch
                    checked={notificationConfig.weeklyReports}
                    onCheckedChange={(checked) =>
                      setNotificationConfig(prev => ({ ...prev, weeklyReports: checked }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleNotificationSave}
                disabled={loadingSection === 'notificações'}
                className="w-full md:w-auto"
              >
                {loadingSection === 'notificações' ? 'Salvando...' : 'Salvar Configurações de Notificações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Configurações de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input
                    id="pixKey"
                    value={paymentConfig.pixKey}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, pixKey: e.target.value }))}
                    placeholder="Chave PIX para recebimentos"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Conta Bancária</Label>
                  <Input
                    id="bankAccount"
                    value={paymentConfig.bankAccount}
                    onChange={(e) => setPaymentConfig(prev => ({ ...prev, bankAccount: e.target.value }))}
                    placeholder="Banco, agência e conta"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Pagamento via PIX</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar pagamentos via PIX
                    </p>
                  </div>
                  <Switch
                    checked={paymentConfig.pixEnabled}
                    onCheckedChange={(checked) =>
                      setPaymentConfig(prev => ({ ...prev, pixEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cartão de Crédito</Label>
                    <p className="text-sm text-muted-foreground">
                      Aceitar pagamentos via cartão de crédito
                    </p>
                  </div>
                  <Switch
                    checked={paymentConfig.creditCardEnabled}
                    onCheckedChange={(checked) =>
                      setPaymentConfig(prev => ({ ...prev, creditCardEnabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Boleto Bancário</Label>
                    <p className="text-sm text-muted-foreground">
                      Aceitar pagamentos via boleto
                    </p>
                  </div>
                  <Switch
                    checked={paymentConfig.boletoEnabled}
                    onCheckedChange={(checked) =>
                      setPaymentConfig(prev => ({ ...prev, boletoEnabled: checked }))
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handlePaymentSave}
                disabled={loadingSection === 'pagamentos'}
                className="w-full md:w-auto"
              >
                {loadingSection === 'pagamentos' ? 'Salvando...' : 'Salvar Configurações de Pagamento'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Autenticação de Dois Fatores
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Exigir verificação adicional no login
                    </p>
                  </div>
                  <Switch
                    checked={securityConfig.twoFactorAuth}
                    onCheckedChange={(checked) =>
                      setSecurityConfig(prev => ({ ...prev, twoFactorAuth: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Login Obrigatório</Label>
                    <p className="text-sm text-muted-foreground">
                      Exigir login para visualizar ofertas
                    </p>
                  </div>
                  <Switch
                    checked={securityConfig.requireLogin}
                    onCheckedChange={(checked) =>
                      setSecurityConfig(prev => ({ ...prev, requireLogin: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Verificação de E-mail</Label>
                    <p className="text-sm text-muted-foreground">
                      Obrigar verificação de e-mail no cadastro
                    </p>
                  </div>
                  <Switch
                    checked={securityConfig.emailVerification}
                    onCheckedChange={(checked) =>
                      setSecurityConfig(prev => ({ ...prev, emailVerification: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Log de Auditoria</Label>
                    <p className="text-sm text-muted-foreground">
                      Registrar todas as ações importantes
                    </p>
                  </div>
                  <Switch
                    checked={securityConfig.auditLog}
                    onCheckedChange={(checked) =>
                      setSecurityConfig(prev => ({ ...prev, auditLog: checked }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={securityConfig.sessionTimeout}
                  onChange={(e) => setSecurityConfig(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 60 }))}
                  placeholder="Tempo limite da sessão"
                />
              </div>

              <Button
                onClick={handleSecuritySave}
                disabled={loadingSection === 'segurança'}
                className="w-full md:w-auto"
              >
                {loadingSection === 'segurança' ? 'Salvando...' : 'Salvar Configurações de Segurança'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
