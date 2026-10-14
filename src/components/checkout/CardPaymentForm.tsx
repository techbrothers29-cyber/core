import { useEffect, useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CardPaymentFormProps {
  amount: number;
  userId: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    price: number;
    category: string;
    metadata?: Record<string, any>;
  }>;
  buyer?: { name: string; email: string; cpf: string; phone: string } | null;
  welcomeEligible?: boolean;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
}

const MERCADOPAGO_PUBLIC_KEY = 'APP_USR-727d76b3-81dd-4a09-baab-5109f61e1fb5';

const CardPaymentForm = ({ amount, userId, items, buyer, welcomeEligible = false, onSuccess, onError }: CardPaymentFormProps) => {
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      initMercadoPago(MERCADOPAGO_PUBLIC_KEY, {
        locale: 'pt-BR'
      });
      setIsInitialized(true);
      console.log('MercadoPago SDK initialized');
    } catch (err) {
      console.error('Error initializing MercadoPago SDK:', err);
      setError('Erro ao inicializar pagamento');
    }

    return () => {
      // Cleanup
      try {
        const controller = (window as any).cardPaymentBrickController;
        if (controller?.unmount) {
          controller.unmount();
        }
      } catch (e) {
        console.log('Cleanup error:', e);
      }
    };
  }, []);

  const handleSubmit = async (formData: any) => {
    setIsProcessing(true);
    setError(null);

    console.log('Card payment form submitted:', {
      token: formData.token ? '***' : null,
      payment_method_id: formData.payment_method_id,
      installments: formData.installments,
      payer_email: formData.payer?.email
    });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-card-payment', {
        body: {
          token: formData.token,
          issuer_id: formData.issuer_id,
          payment_method_id: formData.payment_method_id,
          transaction_amount: amount,
          installments: formData.installments,
          payer_email: formData.payer?.email,
          user_id: userId,
          items: items,
          buyer,
          apply_welcome_discount: welcomeEligible,
          description: `Compra de ${items.length} item(s)`
        }
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw new Error(fnError.message || 'Erro ao processar pagamento');
      }

      if (!data.success) {
        throw new Error(data.error || 'Pagamento não foi aprovado');
      }

      console.log('Card payment response:', data);

      if (data.approved) {
        toast({
          title: "🎉 Pagamento aprovado!",
          description: "Seus vouchers foram gerados com sucesso.",
        });
        onSuccess(data.transaction_id);
      } else {
        const statusMessages: Record<string, string> = {
          'pending': 'Seu pagamento está em análise. Você receberá uma confirmação em breve.',
          'in_process': 'Seu pagamento está sendo processado.',
          'rejected': 'Pagamento recusado. Tente outro cartão ou método de pagamento.',
        };

        const message = statusMessages[data.status] || `Status do pagamento: ${data.status}`;

        if (data.status === 'rejected') {
          throw new Error(message);
        } else {
          toast({
            title: "Pagamento em processamento",
            description: message,
          });
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      setError(errorMessage);
      onError(errorMessage);
      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (error: any) => {
    console.error('CardPayment Brick error:', error);

    // Handle specific MercadoPago errors
    if (error?.cause === 'fields_setup_failed_after_3_tries') {
      setError('Não foi possível carregar o formulário de pagamento. O domínio pode não estar configurado no Mercado Pago.');
    } else {
      setError('Erro no formulário de pagamento. Tente novamente.');
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <div className="space-y-2">
          <p className="text-destructive font-medium">Ocorreu um erro</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={() => {
            setError(null);
            onError('user_cancelled');
          }}
          className="text-sm text-primary hover:underline flex items-center gap-2"
        >
          ← Voltar e escolher outro método
        </button>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando formulário de pagamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isProcessing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-foreground font-medium">Processando pagamento...</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <CardPayment
        initialization={{
          amount: amount
        }}
        customization={{
          paymentMethods: {
            minInstallments: 1,
            maxInstallments: 12
          },
          visual: {
            style: {
              theme: 'default'
            }
          }
        }}
        onSubmit={handleSubmit}
        onError={handleError}
      />
    </div>
  );
};

export default CardPaymentForm;
