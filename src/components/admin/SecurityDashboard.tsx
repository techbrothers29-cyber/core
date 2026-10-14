import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecurityMetric {
  metric_name: string;
  metric_value: number;
  description: string;
  severity: string;
}

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSecurityMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_enhanced_security_metrics');

      if (error) throw error;

      setMetrics(data || []);
    } catch (error) {
      console.error('Error loading security metrics:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar métricas de segurança",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const cleanupOldLogs = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_security_logs');

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Limpeza concluída. ${data || 0} logs antigos removidos.`
      });

      // Reload metrics after cleanup
      loadSecurityMetrics();
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      toast({
        title: "Erro",
        description: "Falha na limpeza dos logs",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadSecurityMetrics();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Shield className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Dashboard de Segurança</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitore métricas de segurança e eventos críticos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={loadSecurityMetrics} disabled={loading} size="sm" className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={cleanupOldLogs} variant="outline" size="sm" className="w-full sm:w-auto">
            Limpar Logs Antigos
          </Button>
        </div>
      </div>

      <Alert className="text-sm">
        <Shield className="h-4 w-4 shrink-0" />
        <AlertDescription className="leading-relaxed">
          Esta dashboard monitora eventos de segurança críticos. Métricas são atualizadas em tempo real.
          <br className="sm:hidden" />
          <strong className="block sm:inline sm:ml-1">Ação necessária:</strong> Configure a proteção contra senhas vazadas no painel do Supabase.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse pb-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse pt-0">
                <div className="h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {metrics.map((metric) => (
            <Card key={metric.metric_name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium leading-tight">
                  {metric.description}
                </CardTitle>
                {getSeverityIcon(metric.severity)}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl md:text-2xl font-bold">{metric.metric_value}</div>
                <Badge
                  variant={getSeverityColor(metric.severity)}
                  className="mt-2 text-xs"
                >
                  {metric.severity.toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Configurações de Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm">RLS habilitado em todas as tabelas</span>
              <Badge variant="secondary" className="w-fit">✓ Ativo</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm">Auditoria de dados sensíveis</span>
              <Badge variant="secondary" className="w-fit">✓ Ativo</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm">Rate limiting nos webhooks</span>
              <Badge variant="secondary" className="w-fit">✓ Ativo</Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm">Verificação de assinatura HMAC</span>
              <Badge variant="secondary" className="w-fit">✓ Ativo</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Ações Recomendadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <Alert className="text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <AlertDescription className="leading-relaxed">
                <strong>Alta Prioridade:</strong> Configure a proteção contra senhas vazadas no Supabase Auth → Settings → Password Security.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• Monitore regularmente tentativas de login falhadas</div>
              <div>• Execute limpeza de logs mensalmente</div>
              <div>• Revise políticas RLS trimestralmente</div>
              <div>• Monitore acesso a dados sensíveis de empresas</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
