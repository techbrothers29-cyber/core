import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Eye, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetric {
  metric_name: string;
  metric_value: number;
  description: string;
  severity: string; // Allow any string since it comes from database
}

export const SecurityMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurityMetrics = async () => {
      try {
        const { data, error } = await supabase.rpc('get_enhanced_security_metrics');

        if (error) {
          console.error('Error fetching security metrics:', error);
          return;
        }

        setMetrics(data || []);
      } catch (error) {
        console.error('Failed to fetch security metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityMetrics();

    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchSecurityMetrics, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Eye className="w-4 h-4" />;
      case 'low':
        return <Shield className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getMetricTitle = (metricName: string) => {
    switch (metricName) {
      case 'failed_login_attempts_last_24h':
        return 'Tentativas de Login Falharam (24h)';
      case 'locked_accounts':
        return 'Contas Bloqueadas';
      case 'high_value_transactions_last_24h':
        return 'Transações de Alto Valor (24h)';
      case 'sensitive_access_events_last_24h':
        return 'Acessos a Dados Sensíveis (24h)';
      default:
        return metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted rounded w-32"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Monitor de Segurança</h2>
        <Badge variant="outline" className="text-xs">
          Atualizado: {new Date().toLocaleTimeString('pt-BR')}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {getMetricTitle(metric.metric_name)}
              </CardTitle>
              {getSeverityIcon(metric.severity)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metric.metric_value.toLocaleString('pt-BR')}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getSeverityColor(metric.severity)}`}
                >
                  {metric.severity.toUpperCase()}
                </Badge>
              </div>
            </CardContent>

            {/* Visual indicator bar */}
            <div
              className={`absolute bottom-0 left-0 h-1 ${
                metric.severity === 'high'
                  ? 'bg-destructive'
                  : metric.severity === 'medium'
                    ? 'bg-warning'
                    : 'bg-success'
              }`}
              style={{
                width: `${Math.min((metric.metric_value / 100) * 100, 100)}%`
              }}
            />
          </Card>
        ))}
      </div>

      {/* Security recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Recomendações de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <h4 className="font-semibold mb-2">Status de Segurança:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Proteção contra senhas vazadas:
                <Badge variant="destructive" className="ml-2 text-xs">
                  DESATIVADA
                </Badge>
              </li>
              <li>• Monitoramento de transações:
                <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700 border-green-200">
                  ATIVO
                </Badge>
              </li>
              <li>• Auditoria de dados sensíveis:
                <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700 border-green-200">
                  ATIVO
                </Badge>
              </li>
              <li>• Controle de acesso por função:
                <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700 border-green-200">
                  ATIVO
                </Badge>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
            <p className="text-sm text-warning-foreground">
              <strong>Ação Necessária:</strong> Ativar proteção contra senhas vazadas nas configurações do Supabase Auth para melhorar a segurança das contas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
