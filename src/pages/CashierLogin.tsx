import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getDeviceFingerprint, getDeviceLabel } from '@/lib/device-fingerprint';
import { ScanLine } from 'lucide-react';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { clearSessionForNewLogin } from '@/lib/session-guard';
import { useAuth } from '@/hooks/useAuth';

const CASHIER_EMAIL_DOMAIN = 'caixa.bahofertas.local';

const CashierLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpInfo, setOtpInfo] = useState<{ sent_to?: string } | null>(null);
  const { loading: authLoading } = useAuth();

  const buildEmail = (u: string) => `${u.trim().toLowerCase()}@${CASHIER_EMAIL_DOMAIN}`;

  // Swap manifest + app title to the Cashier PWA while on this route.
  useEffect(() => {
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousManifest = manifestLink?.getAttribute('href') ?? '/manifest.json';
    if (manifestLink) manifestLink.setAttribute('href', '/manifest-caixa.json');

    const previousTitle = document.title;
    document.title = 'Caixa Bah Ofertas';

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      const previous = el?.getAttribute('content') ?? null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
      return { el, previous };
    };

    const appleTitle = setMeta('apple-mobile-web-app-title', 'Caixa Bah');
    const appName = setMeta('application-name', 'Caixa Bah');

    return () => {
      if (manifestLink) manifestLink.setAttribute('href', previousManifest);
      document.title = previousTitle;
      if (appleTitle.previous !== null) appleTitle.el.setAttribute('content', appleTitle.previous);
      if (appName.previous !== null) appName.el.setAttribute('content', appName.previous);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading || loading) return;
    setLoading(true);
    try {
      await clearSessionForNewLogin('cashier');
      const email = buildEmail(username);
      // 1) sign in via supabase auth
      const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signErr) {
        toast({ title: 'Usuário ou senha incorretos', variant: 'destructive' });
        return;
      }

      // 2) confirm cashier role
      const { data: cashier } = await supabase
        .from('partner_cashiers')
        .select('id, is_active')
        .eq('email', email)
        .maybeSingle();
      if (!cashier || !cashier.is_active) {
        await supabase.auth.signOut();
        toast({ title: 'Acesso negado', description: 'Caixa não encontrado ou inativo.', variant: 'destructive' });
        return;
      }

      // 3) check trusted device
      const device_fingerprint = getDeviceFingerprint();
      const { data, error } = await supabase.functions.invoke('cashier-request-otp', {
        body: { email, device_fingerprint },
      });
      if (error) throw new Error(error.message);
      const r: any = data;
      if (r?.trusted) {
        await supabase.from('partner_cashiers').update({ last_login_at: new Date().toISOString() }).eq('id', cashier.id);
        navigate('/caixa/painel', { replace: true });
        return;
      }
      setOtpInfo({ sent_to: r?.sent_to });
      setStep('otp');
      toast({ title: 'Código enviado', description: `Enviado ao email da empresa (${r?.sent_to}).` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const email = buildEmail(username);
      const device_fingerprint = getDeviceFingerprint();
      const device_label = getDeviceLabel();
      const { data, error } = await supabase.functions.invoke('cashier-verify-otp', {
        body: { email, device_fingerprint, device_label, code },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || 'Código inválido');
      }
      const { data: cashier } = await supabase.from('partner_cashiers').select('id').eq('email', email).maybeSingle();
      if (cashier) await supabase.from('partner_cashiers').update({ last_login_at: new Date().toISOString() }).eq('id', cashier.id);
      navigate('/caixa/painel', { replace: true });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ScanLine className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Acesso Caixa</CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === 'login' ? 'Entre com seu usuário e senha' : 'Informe o código enviado ao parceiro'}
          </p>
        </CardHeader>
        <CardContent>
          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <Label>Usuário</Label>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="ex.: caixa01"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())}
                  required
                />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading || authLoading}>{loading || authLoading ? 'Entrando...' : 'Entrar'}</Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Solicite ao parceiro o código de 6 dígitos enviado para <strong>{otpInfo?.sent_to}</strong>.
              </p>
              <div>
                <Label>Código (6 dígitos)</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? 'Verificando...' : 'Confirmar'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('login')}>
                Voltar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <PWAInstallBanner variant="cashier" />
    </div>
  );
};

export default CashierLogin;
