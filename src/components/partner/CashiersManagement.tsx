import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Power, Clock, Trash2 } from 'lucide-react';

interface Cashier {
  id: string;
  full_name: string;
  email: string;
  shift_label: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface Shift {
  id: string;
  cashier_id: string;
  shift_label: string | null;
  opened_at: string;
  closed_at: string | null;
  total_validations: number;
  total_amount: number;
}

interface Props {
  companyId: string;
}

const CashiersManagement = ({ companyId }: Props) => {
  const { toast } = useToast();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: '', username: '', password: '', shift_label: '' });

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const [{ data: cs }, { data: ss }] = await Promise.all([
      supabase.from('partner_cashiers').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('cashier_shifts').select('*').eq('company_id', companyId).order('opened_at', { ascending: false }).limit(50),
    ]);
    setCashiers((cs as Cashier[]) || []);
    setShifts((ss as Shift[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [companyId]);

  const createCashier = async () => {
    if (!form.full_name || !form.username || !form.password) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (!/^[a-z0-9_.]{3,30}$/.test(form.username.trim().toLowerCase())) {
      toast({ title: 'Usuário inválido', description: 'Use 3-30 caracteres (letras minúsculas, números, _ ou .)', variant: 'destructive' });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: 'Senha precisa ter ao menos 8 caracteres', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const payload = { ...form, username: form.username.trim().toLowerCase() };
      const { data, error } = await supabase.functions.invoke('cashier-create', { body: payload });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Erro ao criar caixa');
      }
      toast({ title: 'Caixa criado!', description: `${form.full_name} já pode acessar /caixa/login com o usuário ${payload.username}` });
      setForm({ full_name: '', username: '', password: '', shift_label: '' });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (c: Cashier) => {
    const { error } = await supabase
      .from('partner_cashiers')
      .update({ is_active: !c.is_active })
      .eq('id', c.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: c.is_active ? 'Caixa desativado' : 'Caixa ativado' });
    load();
  };

  const removeCashier = async (c: Cashier) => {
    if (!confirm(`Remover o caixa ${c.full_name}? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('partner_cashiers').delete().eq('id', c.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Caixa removido' });
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Caixas</CardTitle>
            <p className="text-sm text-muted-foreground">Gerencie os usuários caixa do seu estabelecimento</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Caixa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar acesso de caixa</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome completo</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Usuário do caixa</Label>
                  <Input
                    type="text"
                    placeholder="ex.: caixa01"
                    autoComplete="off"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase() })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">3-30 caracteres. Apenas letras minúsculas, números, _ ou .</p>
                </div>
                <div>
                  <Label>Senha inicial (mín. 8)</Label>
                  <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div>
                  <Label>Turno (opcional)</Label>
                  <Input placeholder="Ex.: Manhã, Tarde, Noite" value={form.shift_label} onChange={(e) => setForm({ ...form, shift_label: e.target.value })} />
                </div>
                <p className="text-xs text-muted-foreground">
                  No 1º acesso (ou em um novo dispositivo), um código OTP será enviado ao email da empresa para autorizar.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={createCashier} disabled={creating}>{creating ? 'Criando...' : 'Criar caixa'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : cashiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum caixa cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último login</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashiers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="font-mono text-sm">{c.email.split('@')[0]}</TableCell>
                    <TableCell>{c.shift_label || '—'}</TableCell>
                    <TableCell>
                      {c.is_active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.last_login_at ? new Date(c.last_login_at).toLocaleString('pt-BR') : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>
                        <Power className="h-3 w-3 mr-1" />
                        {c.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeCashier(c)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Histórico de turnos</CardTitle>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum turno registrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caixa</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Aberto</TableHead>
                  <TableHead>Fechado</TableHead>
                  <TableHead className="text-right">Vouchers</TableHead>
                  <TableHead className="text-right">Total (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => {
                  const c = cashiers.find((x) => x.id === s.cashier_id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{c?.full_name || '—'}</TableCell>
                      <TableCell>{s.shift_label || '—'}</TableCell>
                      <TableCell className="text-xs">{new Date(s.opened_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-xs">
                        {s.closed_at ? new Date(s.closed_at).toLocaleString('pt-BR') : <Badge>Aberto</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{s.total_validations}</TableCell>
                      <TableCell className="text-right">{Number(s.total_amount).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashiersManagement;
