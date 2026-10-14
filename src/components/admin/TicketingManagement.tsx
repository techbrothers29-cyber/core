import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, RefreshCw, Search, Eye, XCircle, Ticket, FileDown } from 'lucide-react';

interface VoucherRow {
  id: string;
  user_id: string;
  voucher_id: string | null;
  offer_id: string | null;
  qr_code: string | null;
  purchase_price: number | null;
  original_price: number | null;
  status: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
  user_email?: string | null;
  user_name?: string | null;
  offer_title?: string | null;
}

interface TicketBookingRow {
  id: string;
  user_id: string;
  status: string;
  total_price: number | null;
  currency: string | null;
  novaxs_bill_id: number | null;
  localizador: string | null;
  voucher_id: string | null;
  use_date: string | null;
  establishment_name: string | null;
  buyer_info: any;
  products: any;
  created_at: string;
  email_sent_at: string | null;
}

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'active':
    case 'confirmed':
      return 'default';
    case 'used':
      return 'secondary';
    case 'cancelled':
    case 'refunded':
    case 'expired':
      return 'destructive';
    default:
      return 'outline';
  }
};

const formatCurrency = (value: number | null | undefined, currency = 'BRL') => {
  if (value == null) return '-';
  const amount = currency === 'BRL' && value > 1000 ? value / 100 : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(amount);
};

const toCsv = (rows: Record<string, any>[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""');
    return `"${s}"`;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
};

const downloadFile = (content: string, filename: string, mime = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([`﻿${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const TicketingManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'vouchers' | 'tickets'>('vouchers');
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [tickets, setTickets] = useState<TicketBookingRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detail, setDetail] = useState<VoucherRow | TicketBookingRow | null>(null);
  const [refundTarget, setRefundTarget] = useState<{ kind: 'voucher' | 'ticket'; row: any } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vouchersRes, ticketsRes] = await Promise.all([
        supabase
          .from('user_vouchers')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('ticket_bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (vouchersRes.error) throw vouchersRes.error;
      if (ticketsRes.error) throw ticketsRes.error;

      const userIds = Array.from(
        new Set([
          ...(vouchersRes.data ?? []).map((v) => v.user_id),
          ...(ticketsRes.data ?? []).map((t) => t.user_id),
        ]),
      );
      const offerIds = Array.from(
        new Set((vouchersRes.data ?? []).map((v) => v.offer_id).filter(Boolean) as string[]),
      );

      const [usersRes, offersRes] = await Promise.all([
        userIds.length
          ? supabase.from('users').select('id, email, full_name').in('id', userIds)
          : Promise.resolve({ data: [], error: null } as any),
        offerIds.length
          ? supabase.from('offers').select('id, title').in('id', offerIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const userMap = new Map<string, { email?: string; full_name?: string }>(
        (usersRes.data ?? []).map((u: any) => [u.id, u]),
      );
      const offerMap = new Map<string, { title?: string }>(
        (offersRes.data ?? []).map((o: any) => [o.id, o]),
      );

      setVouchers(
        (vouchersRes.data ?? []).map((v: any) => ({
          ...v,
          user_email: userMap.get(v.user_id)?.email ?? null,
          user_name: userMap.get(v.user_id)?.full_name ?? null,
          offer_title: v.offer_id ? offerMap.get(v.offer_id)?.title ?? null : null,
        })),
      );
      setTickets(
        (ticketsRes.data ?? []).map((t: any) => ({
          ...t,
          user_email: userMap.get(t.user_id)?.email ?? null,
          user_name: userMap.get(t.user_id)?.full_name ?? null,
        })) as any,
      );
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar bilheteria',
        description: err?.message ?? 'Falha desconhecida',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVouchers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!term) return true;
      return [v.qr_code, v.user_email, v.user_name, v.offer_title, v.id]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [vouchers, search, statusFilter]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!term) return true;
      const buyerName = (t.buyer_info as any)?.name ?? '';
      const buyerEmail = (t.buyer_info as any)?.email ?? '';
      return [
        t.localizador,
        String(t.novaxs_bill_id ?? ''),
        t.establishment_name,
        buyerName,
        buyerEmail,
        (t as any).user_email,
        t.id,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [tickets, search, statusFilter]);

  const exportCsv = () => {
    if (activeTab === 'vouchers') {
      const rows = filteredVouchers.map((v) => ({
        id: v.id,
        codigo: v.qr_code ?? '',
        oferta: v.offer_title ?? '',
        cliente: v.user_name ?? '',
        email: v.user_email ?? '',
        status: v.status,
        valor: v.purchase_price ?? '',
        criado_em: v.created_at,
        expira_em: v.expires_at ?? '',
        usado_em: v.used_at ?? '',
      }));
      downloadFile(toCsv(rows), `vouchers-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`);
    } else {
      const rows = filteredTickets.map((t) => ({
        id: t.id,
        localizador: t.localizador ?? '',
        bill_id: t.novaxs_bill_id ?? '',
        estabelecimento: t.establishment_name ?? '',
        cliente: (t.buyer_info as any)?.name ?? '',
        email: (t.buyer_info as any)?.email ?? '',
        status: t.status,
        valor: t.total_price ?? '',
        moeda: t.currency ?? 'BRL',
        data_uso: t.use_date ?? '',
        criado_em: t.created_at,
        email_enviado_em: t.email_sent_at ?? '',
      }));
      downloadFile(toCsv(rows), `ingressos-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`);
    }
  };

  const confirmRefund = async () => {
    if (!refundTarget) return;
    try {
      if (refundTarget.kind === 'voucher') {
        const { error } = await supabase
          .from('user_vouchers')
          .update({ status: 'cancelled' })
          .eq('id', refundTarget.row.id);
        if (error) throw error;
        toast({ title: 'Voucher cancelado', description: 'Status atualizado para cancelado.' });
      } else {
        const billId = refundTarget.row.novaxs_bill_id;
        if (billId) {
          const { data, error } = await supabase.functions.invoke('novaxs-cancel-ticket', {
            body: { bill_id: billId },
          });
          const ctx: any = (error as any)?.context;
          let errBody: any = null;
          try { errBody = ctx ? await ctx.json() : null; } catch { /* ignore */ }
          if (errBody?.deadline_exceeded) {
            const ok = window.confirm(
              `A NovaXS não permite cancelar via API (${errBody.error}).\n\nDeseja marcar este ingresso como cancelado APENAS no sistema (sem estornar na NovaXS)?`,
            );
            if (!ok) { setRefundTarget(null); return; }
            const { error: forceErr } = await supabase.functions.invoke('novaxs-cancel-ticket', {
              body: { bill_id: billId, force: true },
            });
            if (forceErr) throw forceErr;
            toast({ title: 'Cancelado localmente', description: 'Marcado como cancelado no sistema (NovaXS não estornada).' });
          } else if (error) {
            throw new Error(errBody?.error || error.message);
          } else if (data?.cancelled) {
            toast({ title: 'Ingresso estornado', description: 'Cancelamento realizado com sucesso.' });
          }
        } else {
          const { error } = await supabase
            .from('ticket_bookings')
            .update({ status: 'cancelled' })
            .eq('id', refundTarget.row.id);
          if (error) throw error;
          toast({ title: 'Ingresso estornado', description: 'Cancelamento realizado com sucesso.' });
        }
      }
      setRefundTarget(null);
      await loadData();
    } catch (err: any) {
      toast({
        title: 'Erro ao estornar',
        description: err?.message ?? 'Não foi possível concluir o estorno.',
        variant: 'destructive',
      });
    }
  };

  const statusOptions = activeTab === 'vouchers'
    ? ['all', 'active', 'used', 'expired', 'cancelled']
    : ['all', 'pending', 'confirmed', 'cancelled', 'refunded'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Bilheteria
            </CardTitle>
            <CardDescription>
              Gerencie vouchers de ofertas e ingressos NovaXS — visualize, filtre, exporte e estorne.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'vouchers' | 'tickets')}>
            <TabsList>
              <TabsTrigger value="vouchers">
                Vouchers ({vouchers.length})
              </TabsTrigger>
              <TabsTrigger value="tickets">
                Ingressos NovaXS ({tickets.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap gap-2 mt-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, cliente, e-mail, localizador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt === 'all' ? 'Todos os status' : opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="vouchers" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Oferta</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Criado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {loading ? 'Carregando...' : 'Nenhum voucher encontrado.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredVouchers.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">{v.qr_code ?? '-'}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{v.offer_title ?? '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <div className="text-sm">{v.user_name ?? '-'}</div>
                          <div className="text-xs text-muted-foreground">{v.user_email ?? '-'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(v.purchase_price)}</TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(v.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => setDetail(v)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {v.status === 'active' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setRefundTarget({ kind: 'voucher', row: v })}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="tickets" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Localizador</TableHead>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data uso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {loading ? 'Carregando...' : 'Nenhum ingresso encontrado.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredTickets.map((t) => {
                      const buyer = (t.buyer_info as any) ?? {};
                      return (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="font-mono text-xs">{t.localizador ?? '-'}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Bill: {t.novaxs_bill_id ?? '-'}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {t.establishment_name ?? '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            <div className="text-sm">{buyer.name ?? '-'}</div>
                            <div className="text-xs text-muted-foreground">{buyer.email ?? '-'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(t.total_price, t.currency ?? 'BRL')}</TableCell>
                          <TableCell className="text-xs">{t.use_date ?? '-'}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="icon" variant="ghost" onClick={() => setDetail(t)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {t.status === 'confirmed' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setRefundTarget({ kind: 'ticket', row: t })}
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da compra</DialogTitle>
            <DialogDescription>Dados completos do registro selecionado.</DialogDescription>
          </DialogHeader>
          {detail && (
            <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
              {JSON.stringify(detail, null, 2)}
            </pre>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar estorno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação cancelará{' '}
              {refundTarget?.kind === 'ticket' ? 'o ingresso na NovaXS' : 'o voucher'} e não poderá
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRefund}>Confirmar estorno</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TicketingManagement;
