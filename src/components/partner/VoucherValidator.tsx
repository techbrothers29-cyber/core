import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, XCircle, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface ValidationResult {
  success: boolean;
  error?: string;
  voucher_id?: string;
  offer_title?: string;
  company_name?: string;
  purchase_price?: number;
  original_price?: number;
  economy_amount?: number;
}

interface VoucherValidatorProps {
  companyId: string;
}

const VoucherValidator = ({ companyId }: VoucherValidatorProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const { toast } = useToast();

  const handleValidate = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length === 0) {
      toast({ title: 'Erro', description: 'Digite o código do voucher.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc('validate_voucher_by_code', {
        voucher_code: trimmedCode,
        partner_company_id: companyId,
      });

      if (error) throw error;

      const validationResult = data as unknown as ValidationResult;
      setResult(validationResult);

      if (validationResult.success) {
        toast({ title: '✅ Voucher validado!', description: `${validationResult.offer_title} marcado como usado.` });
        setCode('');
      }
    } catch (err) {
      console.error('Validation error:', err);
      toast({ title: 'Erro', description: 'Erro ao validar voucher.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Validar Voucher do Cliente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Digite o código de 8 caracteres apresentado pelo cliente
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input */}
        <div className="flex gap-3">
          <Input
            placeholder="Ex: AB12CD34"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleValidate()}
            className="font-mono text-xl tracking-[0.3em] text-center uppercase"
            maxLength={8}
          />
          <Button onClick={handleValidate} disabled={loading || code.length < 1} className="px-6">
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className={`p-5 rounded-xl border-2 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {result.success ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-lg font-bold">Voucher Validado!</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Oferta:</strong> {result.offer_title}</p>
                  <p><strong>Valor pago:</strong> {formatCurrency(result.purchase_price || 0)}</p>
                  {result.original_price && (
                    <p><strong>Valor original:</strong> {formatCurrency(result.original_price)}</p>
                  )}
                  {result.economy_amount && Number(result.economy_amount) > 0 && (
                    <p className="text-green-700 font-semibold">
                      Economia do cliente: {formatCurrency(Number(result.economy_amount))}
                    </p>
                  )}
                </div>
                <Badge className="bg-green-600 text-white">Marcado como Usado</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                <p className="text-red-700 font-medium">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground space-y-2">
          <p><strong>Como funciona:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>O cliente apresenta o QR Code ou o código de 8 caracteres</li>
            <li>Digite o código acima e clique em validar</li>
            <li>O voucher será automaticamente marcado como utilizado</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoucherValidator;
