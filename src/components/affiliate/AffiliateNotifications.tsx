import { useState, useEffect } from 'react';
import { Bell, Ticket, Check, Calendar, Tag, Copy, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

interface Props {
  affiliateId: string;
}

const NotificationDetailContent = ({ notification, copied, onCopy }: { notification: Notification; copied: boolean; onCopy: () => void }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Calendar className="h-3.5 w-3.5" />
      {new Date(notification.created_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })}
    </div>
    <p className="text-sm text-foreground leading-relaxed">
      {notification.message}
    </p>
    {notification.metadata?.coupon_code && (
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Cupom de Desconto</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-base font-mono tracking-wider px-4 py-1.5">
              {notification.metadata.coupon_code}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCopy}
            >
              {copied ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
          <span className="text-lg font-bold text-primary">
            {notification.metadata.discount_percent}% OFF
          </span>
        </div>
      </div>
    )}
  </div>
);

export const AffiliateNotifications = ({ affiliateId }: Props) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (affiliateId) {
      loadNotifications();
      loadReadStatus();
    }
  }, [affiliateId]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('affiliate_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  const loadReadStatus = async () => {
    const { data } = await supabase
      .from('affiliate_notification_reads')
      .select('notification_id')
      .eq('affiliate_id', affiliateId);
    if (data) setReadIds(new Set(data.map((r: any) => r.notification_id)));
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('affiliate_notification_reads')
      .upsert({ notification_id: notificationId, affiliate_id: affiliateId });
    setReadIds(prev => new Set([...prev, notificationId]));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !readIds.has(n.id));
    if (unread.length === 0) return;
    const rows = unread.map(n => ({ notification_id: n.id, affiliate_id: affiliateId }));
    await supabase.from('affiliate_notification_reads').upsert(rows);
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  const openNotification = (n: Notification) => {
    setSelectedNotification(n);
    setOpen(false);
    markAsRead(n.id);
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const formatFullDate = (d: string) => {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getIcon = (type: string) => {
    if (type === 'coupon') return <Ticket className="h-4 w-4 text-primary" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h4 className="font-semibold text-sm">Notificações</h4>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                <Check className="h-3 w-3 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${!isRead ? 'bg-primary/5' : ''}`}
                    onClick={() => openNotification(n)}
                  >
                    <div className="mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!isRead ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      {n.metadata?.coupon_code && (
                        <Badge variant="outline" className="mt-1 text-xs font-mono">
                          {n.metadata.coupon_code} - {n.metadata.discount_percent}% OFF
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</p>
                    </div>
                    {!isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {isMobile ? (
        <Drawer open={!!selectedNotification} onOpenChange={(v) => { if (!v) setSelectedNotification(null); }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                {selectedNotification && getIcon(selectedNotification.type)}
                {selectedNotification?.title}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              {selectedNotification && (
                <NotificationDetailContent
                  notification={selectedNotification}
                  copied={copied}
                  onCopy={() => {
                    navigator.clipboard.writeText(selectedNotification.metadata.coupon_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedNotification} onOpenChange={(v) => { if (!v) setSelectedNotification(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedNotification && getIcon(selectedNotification.type)}
                {selectedNotification?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedNotification && (
              <NotificationDetailContent
                notification={selectedNotification}
                copied={copied}
                onCopy={() => {
                  navigator.clipboard.writeText(selectedNotification.metadata.coupon_code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
