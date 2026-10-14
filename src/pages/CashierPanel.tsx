import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import CashierQRScanner from '@/components/cashier/CashierQRScanner';
import { ScanLine, LogOut, Search, Play, Square, Receipt } from 'lucide-react';

interface Cashier {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  shift_label: string | null;
}

interface Shift {
  id: string;
  shift_label: string | null;
  opened_at: string;
  closed_at: string | null;
  total_validations: number;
  total_amount: number;
}

interface Validation {
  id: string;
  voucher_code: string;
  offer_title: string | null;
  amount: number;
  status: string;
  validated_at: string;
}

const CashierPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cashier, setCashier] = useState<Cashier | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/caixa/login', { replace: true });
      return;
    }
    const { data: c } = await supabase
      .from('partner_cashiers')
      .select('id, company_id, full_name, email, shift_label')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!c) {
      toast({ title: 'Caixa não encontrado', variant: 'destructive' });
      await supabase.auth.signOut();
      navigate('/caixa/login', { replace: true });
      return;
    }
    setCashier(c as Cashier);

    const { data: s } = await supabase
      .from('cashier_shifts')
      .select('*')
      .eq('cashier_id', c.id)
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setShift((s as Shift) || null);

    const { data: vs } = await supabase
      .from('cashier_voucher_validations')
      .select('*')
      .eq('cashier_id', c.id)
      .order('validated_at', { ascending: false })
      .limit(50);
    setValidations((vs as Validation[]) || []);
  };

  useEffect(() => { loadAll(); }, []);

  const openShift = async () => {
    if (!cashier) return;
    const { data, error } = await supabase
      .from('cashier_shifts')
      .insert({ cashier_id: cashier.id, company_id: cashier.company_id, shift_label: cashier.shift_label })
      .select()
      .single();
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setShift(data as Shift);
    toast({ title: 'Turno aberto' });
  };

  const closeShift = async () => {
    if (!shift) return;
    if (!confirm('Fechar o turno atual?')) return;
    const { error } = await supabase
      .from('cashier_shifts')
      .update({ closed_at: new Date().toISOString() })
      .eq('id', shift.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setShift(null);
    toast({ title: 'Turno fechado' });
    loadAll();
  };

  const validateCode = async (code: string) => {
    if (!code.trim()) return;
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('cashier-validate-voucher', {
        body: { voucher_code: code.trim() },
      });
      if (error) throw new Error(error.message);
      const r: any = data;
      if (r?.success) {
        toast({ title: '✅ Voucher validado', description: r.offer_title });
      } else {
        toast({ title: '❌ Falha', description: r?.error || 'Voucher inválido', variant: 'destructive' });
      }
      setManualCode('');
      loadAll();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setValidating(false);
      setShowScanner(false);
    }
  };

  const searchCustomer = async () => {
    if (searchQ.trim().length < 3) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('cashier-search-customer', {
        body: { query: searchQ.trim() },
      });
      if (error) throw new Error(error.message);
      setSearchResults((data as any)?.results || []);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/caixa/login', { replace: true });
  };

  if (!cashier) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <ScanLine className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{cashier.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {cashier.shift_label || 'Sem turno definido'} {shift && <Badge className="ml-1 text-[10px]">Turno aberto</Badge>}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Shift card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Meu turno</CardTitle>
            {shift ? (
              <Button size="sm" variant="destructive" onClick={closeShift}><Square className="h-3 w-3 mr-1" />Fechar turno</Button>
            ) : (
              <Button size="sm" onClick={openShift}><Play className="h-3 w-3 mr-1" />Abrir turno</Button>
            )}
          </CardHeader>
          {shift && (
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Vouchers validados</p>
                <p className="text-2xl font-bold">{shift.total_validations}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de vendas (R$)</p>
                <p className="text-2xl font-bold">{Number(shift.total_amount).toFixed(2)}</p>
              </div>
            </CardContent>
          )}
        </Card>

        <Tabs defaultValue="validate">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="validate"><ScanLine className="h-4 w-4 mr-1" />Validar</TabsTrigger>
            <TabsTrigger value="customer"><Search className="h-4 w-4 mr-1" />Cliente</TabsTrigger>
            <TabsTrigger value="history"><Receipt className="h-4 w-4 mr-1" />Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="validate" className="space-y-3 pt-3">
            <Button className="w-full h-14" onClick={() => setShowScanner(true)} disabled={!shift}>
              <ScanLine className="h-5 w-5 mr-2" />Escanear QR Code
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="Ou digite o código do voucher"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                disabled={!shift}
              />
              <Button onClick={() => validateCode(manualCode)} disabled={!shift || validating || !manualCode}>
                Validar
              </Button>
            </div>
            {!shift && <p className="text-xs text-destructive">Abra um turno para validar vouchers.</p>}
          </TabsContent>

          <TabsContent value="customer" className="space-y-3 pt-3">
            <div className="flex gap-2">
              <Input
                placeholder="CPF, email ou nome (mín. 3 caracteres)"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              <Button onClick={searchCustomer} disabled={searching || searchQ.trim().length < 3}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>CPF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.full_name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.cpf || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="pt-3">
            <Card>
              <CardContent className="pt-4">
                {validations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma validação ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quando</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Oferta</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validations.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="text-xs">{new Date(v.validated_at).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="font-mono text-xs">{v.voucher_code}</TableCell>
                          <TableCell>{v.offer_title || '—'}</TableCell>
                          <TableCell>
                            {v.status === 'validated'
                              ? <Badge>OK</Badge>
                              : <Badge variant="destructive">Falha</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CashierQRScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScan={(code) => validateCode(code)}
      />
    </div>
  );
};

export default CashierPanel;
