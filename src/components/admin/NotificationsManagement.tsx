import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Bell, Send, Users, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const NotificationsManagement = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const { data: subscriberCount } = useQuery({
    queryKey: ['push-subscriber-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      return count || 0;
    },
    refetchInterval: 5000,
  });

  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ['push-notification-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('push_notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: 'Preencha título e mensagem', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { title: title.trim(), body: body.trim() },
      });

      if (error) throw error;

      toast({
        title: 'Notificação enviada!',
        description: `Enviada para ${data?.sent || 0} dispositivos.`,
      });
      setTitle('');
      setBody('');
      refetchLogs();
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notificações Push</h2>
          <p className="text-muted-foreground text-sm">
            Envie notificações para usuários com o PWA instalado
          </p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{subscriberCount ?? 0} inscritos</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Nova Notificação
          </CardTitle>
          <CardDescription>
            A notificação será enviada para todos os dispositivos com o app instalado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Título</label>
            <Input
              placeholder="Ex: Nova oferta imperdível!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <span className="text-xs text-muted-foreground mt-1 block">{title.length}/100</span>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mensagem</label>
            <Textarea
              placeholder="Ex: Confira os novos descontos de até 50% em restaurantes!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={300}
              rows={3}
            />
            <span className="text-xs text-muted-foreground mt-1 block">{body.length}/300</span>
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full"
            size="lg"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Enviando...' : 'Enviar Notificação'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Envios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{log.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.body}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground ml-4 shrink-0">
                    <p>{format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                    <p className="text-primary font-medium">{log.total_sent} enviados</p>
                    {log.total_failed > 0 && (
                      <p className="text-destructive">{log.total_failed} falhas</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma notificação enviada ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
