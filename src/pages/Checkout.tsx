import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getEffectiveUserAccess, type EffectiveUserRole } from '@/lib/user-role';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import PartnerDetailModal from '@/components/PartnerDetailModal';
import PaymentMethodSelector from '@/components/checkout/PaymentMethodSelector';
import CardPaymentForm from '@/components/checkout/CardPaymentForm';
import { formatCurrency } from '@/lib/utils';
import { isValidCPF } from '@/lib/cpf-validation';
import { invokeInBrazil } from '@/lib/supabase-region';
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  QrCode,
  MapPin,
  ArrowLeft,
  Check,
  Info,
  Copy,
  Clock,
  CreditCard,
  Gift
} from 'lucide-react';

type PaymentMethod = 'pix' | 'credit_card';
type CheckoutBuyer = { name: string; email: string; cpf: string; phone: string };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const generateVoucherCode = () =>
  Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

const formatPricePtBr = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const formatDatePtBr = (value: Date) => value.toLocaleDateString('pt-BR');

const Checkout = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, updateItemDate, totalPrice, totalSavings, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [pixData, setPixData] = useState<{
    qr_code: string;
    pix_code: string;
    expires_at: string;
    transaction_id: string;
    total_amount?: number;
  } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [validatedBuyer, setValidatedBuyer] = useState<CheckoutBuyer | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<EffectiveUserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [welcomeEligible, setWelcomeEligible] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const hasNovaxsItems = items.some((it: any) => it?.metadata?.source === 'novaxs');

  // Desconto de boas-vindas (5%): elegível apenas quem nunca usou. A validação
  // final e a marcação de uso acontecem no servidor (edge functions).
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setWelcomeEligible(false);
      return;
    }
    supabase
      .from('users')
      .select('welcome_discount_used_at, referrer_affiliate_code')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        const row = data as { welcome_discount_used_at?: string | null; referrer_affiliate_code?: string | null } | null;
        // Indicados por afiliado não recebem o bônus de boas-vindas
        setWelcomeEligible(!error && !!row && !row.welcome_discount_used_at && !row.referrer_affiliate_code);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const welcomeDiscount = welcomeEligible
    ? Math.round(totalPrice * 0.05 * 100) / 100
    : 0;
  const finalPrice = Math.round((totalPrice - welcomeDiscount) * 100) / 100;

  // Verify the authenticated user is a client (not admin/affiliate/partner) before granting checkout access
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setEffectiveRole(null);
      return;
    }
    setRoleLoading(true);
    getEffectiveUserAccess(user.id, user.email)
      .then((access) => {
        if (!cancelled) setEffectiveRole(access.role);
      })
      .catch(() => {
        if (!cancelled) setEffectiveRole('user');
      })
      .finally(() => {
        if (!cancelled) setRoleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Build partner info from the actual cart item (real establishment data)
  const handlePartnerClick = (item: any) => {
    const meta = item?.metadata || {};
    setSelectedPartner({
      itemId: item.id,
      name: meta.establishmentName || item.subtitle || item.title || 'Estabelecimento',
      logo: item.imageUrl,
      category: item.category,
      productTitle: item.title,
      productSubtitle: item.subtitle,
      productImage: item.imageUrl,
      price: item.price,
      originalPrice: item.originalPrice,
      discountPercent: item.discountPercent,
      selectedDate: item.selectedDate,
      selectedSchedule: item.selectedSchedule,
      manualScheduling: item.manualScheduling,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPartner(null);
  };

  // Auto-scroll to QR code when PIX data is available (mobile only)
  useEffect(() => {
    if (pixData?.qr_code && qrCodeRef.current) {
      // Check if it's mobile view
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
        // Wait a bit for animations to complete
        setTimeout(() => {
          qrCodeRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }, 500);
      }
    }
  }, [pixData?.qr_code]);

  // Real-time payment status subscription + polling fallback
  useEffect(() => {
    if (!showPayment || paymentMethod !== 'pix' || !pixData?.transaction_id || paymentConfirmed) {
      return;
    }

    setCheckingPayment(true);
    
    // Initial check
    checkPaymentStatus();

    // Subscribe to real-time updates for instant detection
    const channel = supabase
      .channel(`transaction-${pixData.transaction_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${pixData.transaction_id}`
        },
        (payload) => {
          console.log('Real-time transaction update:', payload);
          if (payload.new && (payload.new as any).status === 'completed') {
            handlePaymentConfirmed();
          }
        }
      )
      .subscribe();

    // Fallback polling every 5 seconds
    const interval = setInterval(checkPaymentStatus, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [showPayment, paymentMethod, pixData?.transaction_id, paymentConfirmed]);

  const handlePaymentConfirmed = async () => {
    if (paymentConfirmed) return;

    setPaymentConfirmed(true);
    setCheckingPayment(false);
    toast({
      title: "🎉 Pagamento confirmado!",
      description: "Seus vouchers foram gerados. Redirecionando...",
    });

    // Google Ads conversion event snippet (Add to cart)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "conversion", {
        send_to: "AW-18172971010/-NIYCIS8wq8cEIKQxtlD",
      });
    }

    // Voucher creation and email delivery are handled server-side after payment approval.

    setTimeout(() => {
      clearCart();
      navigate('/dashboard');
    }, 1500);
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const getValidatedBuyer = async (): Promise<CheckoutBuyer> => {
    if (!user) throw new Error('Usuário não autenticado');

    const { data: profileRow } = await supabase
      .from('users')
      .select('full_name, email, cpf, phone')
      .eq('id', user.id)
      .maybeSingle();

    const buyer: CheckoutBuyer = {
      name: profileRow?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Cliente',
      email: profileRow?.email || user.email || '',
      cpf: String(profileRow?.cpf || (user.user_metadata as any)?.cpf || '').replace(/\D/g, ''),
      phone: String(profileRow?.phone || (user.user_metadata as any)?.phone || '').replace(/\D/g, ''),
    };

    if (!buyer.email || !buyer.name || !isValidCPF(buyer.cpf) || buyer.phone.length < 10 || buyer.phone.length > 11) {
      toast({
        title: 'Complete seu cadastro',
        description: 'Informe nome, CPF válido e telefone antes de finalizar a compra.',
        variant: 'destructive',
      });
      navigate('/completar-cadastro');
      throw new Error('Complete seu cadastro antes de comprar.');
    }

    setValidatedBuyer(buyer);
    return buyer;
  };

  const handleProcessPixOrder = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para finalizar a compra.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione itens ao carrinho antes de finalizar a compra.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const buyer = hasNovaxsItems ? await getValidatedBuyer() : null;
      const { data, error } = await supabase.functions.invoke('create-mercadopago-order', {
        body: {
          amount: totalPrice,
          description: `Compra de ${items.length} item(s)`,
          user_id: user.id,
          buyer,
          apply_welcome_discount: welcomeEligible,
          items: items.map(item => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
            category: item.category,
            metadata: item.metadata,
          }))
        }
      });

      if (error) {
        console.error('Error creating Mercado Pago order:', error);
        if (error.message?.includes('incompletos')) {
          toast({
            title: "Dados incompletos",
            description: "Complete seu perfil (nome, CPF e telefone) antes de continuar.",
            variant: "destructive"
          });
          navigate('/dashboard');
          return;
        }
        throw new Error('Erro ao gerar pagamento');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao gerar pagamento');
      }

      setPixData({
        qr_code: data.qr_code,
        pix_code: data.pix_code,
        expires_at: data.expires_at,
        transaction_id: data.transaction_id,
        total_amount: data.total_amount
      });
      
      setShowPayment(true);

      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código PIX para pagar.",
      });
      
    } catch (error) {
      console.error('Error processing order:', error);
      toast({
        title: "Erro ao processar pedido",
        description: error instanceof Error ? error.message : "Tente novamente em alguns minutos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const emitVouchersAndSendEmails = async (idempotencyPrefix: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    // Separa itens NovaXS dos demais. Itens NovaXS DEVEM passar pela ParksNet
    // (buyToBillFor + billFor + receiptAsByte) para gerar voucher real, PDF e email.
    const novaxsItems = items.filter((it: any) => it?.metadata?.source === 'novaxs');
    const regularItems = items.filter((it: any) => it?.metadata?.source !== 'novaxs');

    if (novaxsItems.length > 0) {
      // Cria/recupera uma transaction "test" só para amarrar o processamento NovaXS.
      const { data: txRow, error: txErr } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'purchase',
          amount: novaxsItems.reduce((s, it) => s + it.price * it.quantity, 0),
          net_amount: novaxsItems.reduce((s, it) => s + it.price * it.quantity, 0),
          payment_method: 'test_approved',
          status: 'completed',
          processed_at: new Date().toISOString(),
          metadata: { items: novaxsItems, idempotency: `${idempotencyPrefix}-${Date.now()}` },
        } as any)
        .select('id')
        .single();
      if (txErr) {
        console.error('Erro ao criar transaction de teste:', txErr);
        throw new Error(txErr.message || 'Falha ao registrar transação');
      }

      const buyer = await getValidatedBuyer();

      const { data: novaxsRes, error: novaxsErr } = await invokeInBrazil<any>(
        'novaxs-process-paid-order',
        {
          transaction_id: txRow.id,
          user_id: user.id,
          items: novaxsItems.map((it) => ({
            id: it.id,
            title: it.title,
            price: it.price,
            quantity: it.quantity,
            metadata: it.metadata,
          })),
          buyer,
        },
        { allowFallback: false },
      );

      if (novaxsErr) {
        console.error('novaxs-process-paid-order error:', novaxsErr);
        throw new Error(novaxsErr.message || 'Falha ao emitir ingresso na NovaXS');
      }
      if (!novaxsRes || (novaxsRes as any).fallback) {
        throw new Error('Falha ao emitir ingresso na NovaXS (sem resposta válida).');
      }
      const failed = ((novaxsRes as any)?.results || []).filter((r: any) => r?.error);
      if (failed.length > 0) {
        const msg = failed[0]?.error || 'Falha NovaXS';
        throw new Error(`NovaXS: ${msg}`);
      }
      const succeeded = ((novaxsRes as any)?.results || []).filter((r: any) => !r?.error);
      if (succeeded.length === 0) {
        throw new Error('NovaXS não retornou voucher emitido. Tente novamente.');
      }
    }

    for (const item of regularItems) {
      const originalPrice = item.originalPrice || item.price;
      const economyAmount = Math.max(originalPrice - item.price, 0);
      const isUuid = UUID_REGEX.test(item.id);
      const metadata = (item.metadata || {}) as any;

      for (let i = 0; i < (item.quantity || 1); i++) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 3);
        const voucherCode = generateVoucherCode();
        const voucherId = isUuid ? item.id : crypto.randomUUID();
        const purchasePrice = item.price;

        const { error: voucherError } = await supabase.from('user_vouchers').insert({
          user_id: user.id,
          offer_id: isUuid ? item.id : null,
          voucher_id: voucherId,
          qr_code: voucherCode,
          purchase_price: purchasePrice,
          original_price: originalPrice,
          economy_amount: economyAmount,
          commission_amount: purchasePrice * 0.1,
          expires_at: expiresAt.toISOString(),
          status: 'active',
        });

        if (voucherError) {
          console.error('Erro ao criar voucher:', voucherError);
          throw new Error(voucherError.message || 'Falha ao gerar voucher');
        }

        if (!isUuid) {
          const { error: ticketError } = await supabase.from('ticket_bookings').insert({
            user_id: user.id,
            establishment_id: metadata.establishmentId || null,
            establishment_name: metadata.establishmentName || item.category || 'Estabelecimento NovaXS',
            localizador: voucherCode,
            voucher_id: voucherId,
            products: [{
              id: item.id,
              title: item.title,
              quantity: 1,
              price: purchasePrice,
              imageUrl: item.imageUrl,
              metadata: item.metadata,
            }],
            buyer_info: {
              name: user.user_metadata?.full_name || user.email || 'Cliente',
              email: user.email || '',
            },
            status: 'confirmed',
            total_price: Math.round(purchasePrice * 100),
            currency: 'BRL',
            use_date: item.selectedDate || metadata.date || null,
          } as any);

          if (ticketError) {
            console.error('Erro ao criar ingresso NovaXS:', ticketError);
            throw new Error(ticketError.message || 'Falha ao gerar ingresso NovaXS');
          }
        }

        if (user.email) {
          const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'compra-oferta',
              recipientEmail: user.email,
              idempotencyKey: `${idempotencyPrefix}-compra-oferta-${voucherCode}`,
              templateData: {
                name: user.user_metadata?.full_name || '',
                offerTitle: item.title,
                orderId: voucherCode,
                purchaseDate: formatDatePtBr(new Date()),
                originalPrice: originalPrice ? formatPricePtBr(originalPrice) : undefined,
                purchasePrice: formatPricePtBr(purchasePrice),
                discount: item.discountPercent ? `${item.discountPercent}%` : undefined,
                voucherCode,
                expiresAt: formatDatePtBr(expiresAt),
                imageUrl: item.imageUrl,
              },
            },
          });

          if (emailError) {
            console.error('Email de confirmação falhou:', emailError);
            throw new Error(emailError.message || 'Falha ao enviar e-mail do voucher');
          }
        }
      }
    }
  };

  // 🧪 TEMPORÁRIO: Emite voucher diretamente (sem Mercado Pago) e envia email ao usuário
  const handleTestApprovedPayment = async () => {
    if (!user) {
      toast({ title: 'Login necessário', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Carrinho vazio', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await emitVouchersAndSendEmails('test');

      toast({
        title: '✅ Voucher emitido!',
        description: 'Confira o email e a aba "Meus Vouchers".',
      });

      setTimeout(() => {
        clearCart();
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Test approved payment error:', err);
      toast({
        title: 'Erro no teste',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCardPayment = () => {
    setLoading(true);
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para finalizar a compra.",
        variant: "destructive"
      });
      navigate('/auth');
      setLoading(false);
      return;
    }
    getValidatedBuyer()
      .then(() => setShowPayment(true))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  const handleCardPaymentSuccess = (transactionId: string) => {
    setPaymentConfirmed(true);
    toast({
      title: "🎉 Pagamento aprovado!",
      description: "Redirecionando para seus vouchers...",
    });
    setTimeout(() => {
      clearCart();
      navigate('/dashboard');
    }, 1500);
  };

  const handleCardPaymentError = (error: string) => {
    console.error('Card payment error:', error);
  };

  const copyPixCode = () => {
    if (pixData?.pix_code) {
      navigator.clipboard.writeText(pixData.pix_code);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no seu app do banco para fazer o pagamento."
      });
    }
  };

  const checkPaymentStatus = async () => {
    if (!pixData?.transaction_id || paymentConfirmed) return;

    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('status')
        .eq('id', pixData.transaction_id)
        .single();

      if (error) throw error;

      if (transaction.status === 'completed') {
        handlePaymentConfirmed();
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Block checkout for visitors and non-client roles (admin/affiliate/partner)
  // when the cart has items. Visitors must sign in as client; staff cannot shop.
  const isStaffRole = effectiveRole === 'admin' || effectiveRole === 'affiliate' || effectiveRole === 'partner';
  const needsClientLogin = items.length > 0 && (!user || isStaffRole);

  if (needsClientLogin && !authLoading && !roleLoading) {
    const isStaff = !!user && isStaffRole;
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar às ofertas
          </Button>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px] max-w-6xl mx-auto">
            {/* Itens do carrinho (visíveis mesmo sem login) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Seus itens ({items.reduce((s, i) => s + i.quantity, 0)})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 pb-4 border-b last:border-b-0 last:pb-0">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2">{item.title}</h3>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
                      )}
                      {item.selectedDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Data: {new Date(item.selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(totalPrice)}</span>
                </div>
                {totalSavings > 0 && (
                  <p className="text-xs text-green-600 text-right">
                    Você economiza {formatCurrency(totalSavings)}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Card de login */}
            <Card className="text-center h-fit lg:sticky lg:top-6">
              <CardContent className="pt-8 pb-8">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">
                  {isStaff ? 'Conta não permitida' : 'Faça login para continuar'}
                </h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  {isStaff
                    ? 'Contas de administrador, parceiro ou afiliado não podem finalizar compras. Entre com uma conta de cliente para continuar.'
                    : 'Você precisa estar logado como cliente para finalizar sua compra. Seus itens permanecem salvos.'}
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate('/auth')}>
                    Entrar como cliente
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/auth?mode=signup')}>
                    Criar conta de cliente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar às ofertas
          </Button>
          
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-8">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Carrinho vazio</h2>
              <p className="text-muted-foreground mb-6">
                Adicione algumas ofertas incríveis ao seu carrinho!
              </p>
              <Button onClick={() => navigate('/')}>
                Ver ofertas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continuar comprando
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Seu Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full sm:w-24 h-24 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{item.title}</h3>
                          {item.subtitle && !item.selectedDate && (
                            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">{item.subtitle}</p>
                          )}
                          {(item.selectedDate || item.selectedSchedule) && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                              <Clock className="w-3 h-3" />
                              <span>
                                {item.selectedDate && item.selectedSchedule
                                  ? `${item.selectedDate.split('-').reverse().join('/')} — ${item.selectedSchedule}`
                                  : item.selectedDate
                                    ? item.selectedDate.split('-').reverse().join('/')
                                    : `Horário: ${item.selectedSchedule}`}
                              </span>
                            </div>
                          )}
                          {item.manualScheduling && (
                            <p className="text-[10px] text-muted-foreground mt-1 italic">Agendamento após a compra</p>
                          )}
                          <Badge 
                            variant="destructive" 
                            className="w-fit mt-2 cursor-pointer hover:bg-destructive/80 transition-colors text-sm px-4 py-1.5"
                            onClick={() => handlePartnerClick(item)}
                          >
                            <Info className="w-4 h-4 mr-1.5" />
                            Detalhes
                          </Badge>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-success">
                              {formatCurrency(item.price)}
                            </span>
                            {item.originalPrice > item.price && (
                              <span className="text-sm text-muted-foreground line-through">
                                {formatCurrency(item.originalPrice)}
                              </span>
                            )}
                          </div>
                          {item.originalPrice > item.price && item.discountPercent > 0 && (
                            <Badge className="bg-primary text-primary-foreground">
                              -{item.discountPercent}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="h-10 w-10 touch-manipulation"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="h-10 w-10 touch-manipulation"
                            aria-label="Aumentar quantidade"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive h-11 w-11 touch-manipulation"
                          aria-label="Remover item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="line-clamp-1">{item.title} x{item.quantity}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                {totalSavings > 0 && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Valor original:</span>
                        <span className="line-through">
                          {formatCurrency(items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-success font-semibold">
                        <span>Economia:</span>
                        <span>- {formatCurrency(totalSavings)}</span>
                      </div>
                    </div>

                    <Separator />
                  </>
                )}

                {welcomeEligible && items.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-1.5 text-primary font-semibold">
                          <Gift className="w-4 h-4" />
                          Boas-vindas (5%)
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            automático
                          </Badge>
                        </span>
                        <span className="text-primary font-semibold">
                          - {formatCurrency(welcomeDiscount)}
                        </span>
                      </div>
                    </div>

                    <Separator />
                  </>
                )}

                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-success">{formatCurrency(finalPrice)}</span>
                </div>

                {!showPayment ? (
                  <div className="space-y-4">
                    {/* Payment Method Selector */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Forma de pagamento</h4>
                      <PaymentMethodSelector
                        selected={paymentMethod}
                        onSelect={setPaymentMethod}
                        disabled={loading}
                      />
                    </div>

                    <Button
                      onClick={paymentMethod === 'pix' ? handleProcessPixOrder : handleStartCardPayment}
                      disabled={loading}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processando...
                        </div>
                      ) : paymentMethod === 'pix' ? (
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4" />
                          Gerar PIX
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Pagar com Cartão
                        </div>
                      )}
                    </Button>

                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {/* Payment Status Indicator */}
                    {paymentConfirmed ? (
                      <div className="bg-success/10 border border-success/30 rounded-xl p-8 text-center animate-scale-in">
                        {/* Animated Success Icon */}
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" />
                          <div className="relative w-full h-full bg-success/30 rounded-full flex items-center justify-center">
                            <div className="w-14 h-14 bg-success rounded-full flex items-center justify-center animate-scale-in">
                              <Check className="w-8 h-8 text-success-foreground" strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="text-2xl font-bold text-success mb-2">Pagamento Confirmado!</h3>
                        <p className="text-muted-foreground mb-6">
                          Seus vouchers foram gerados com sucesso
                        </p>
                        
                        {/* Loading redirect indicator */}
                        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                          <div className="w-4 h-4 border-2 border-success border-t-transparent rounded-full animate-spin" />
                          <span>Redirecionando para seus vouchers...</span>
                        </div>
                      </div>
                    ) : paymentMethod === 'credit_card' ? (
                      /* Credit Card Payment Form */
                      <div className="relative">
                        <CardPaymentForm
                          amount={finalPrice}
                          userId={user?.id || ''}
                          items={items.map(item => ({
                            id: item.id,
                            title: item.title,
                            quantity: item.quantity,
                            price: item.price,
                            category: item.category,
                            metadata: item.metadata,
                          }))}
                          buyer={validatedBuyer}
                          welcomeEligible={welcomeEligible}
                          onSuccess={handleCardPaymentSuccess}
                          onError={handleCardPaymentError}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPayment(false)}
                          className="mt-4 w-full"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Voltar e escolher outro método
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* QR Code Section - Prominent Display */}
                        <div className="bg-card border-2 border-primary/20 rounded-xl p-4 sm:p-6 shadow-lg" ref={qrCodeRef}>
                          <h3 className="font-bold text-lg text-center mb-4 text-foreground">
                            Pague com PIX
                          </h3>
                          {pixData?.qr_code ? (
                            <div className="text-center space-y-4 animate-scale-in">
                              <div className="inline-block p-3 sm:p-4 bg-white rounded-xl shadow-md border">
                                <img 
                                  src={pixData.qr_code.startsWith('data:') ? pixData.qr_code : `data:image/png;base64,${pixData.qr_code}`}
                                  alt="QR Code PIX"
                                  className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto"
                                />
                              </div>
                              <p className="text-sm text-muted-foreground font-medium">
                                Escaneie o QR Code com o app do seu banco
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <div className="space-y-4">
                                <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto">
                                  <div className="absolute inset-0 border-4 border-primary/20 rounded-xl"></div>
                                  <div className="absolute inset-2 flex items-center justify-center">
                                    <QrCode className="w-12 h-12 sm:w-16 sm:h-16 text-primary/60" />
                                  </div>
                                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-xl animate-spin"></div>
                                </div>
                                <p className="text-muted-foreground font-medium">Gerando QR Code PIX...</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* PIX Code Section - Easy Copy */}
                        {pixData?.pix_code && (
                          <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3 animate-fade-in">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <h4 className="font-semibold text-foreground text-sm sm:text-base">
                                Código PIX (Copia e Cola)
                              </h4>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={copyPixCode}
                                className="flex items-center justify-center gap-2 h-10 px-4 font-semibold w-full sm:w-auto"
                              >
                                <Copy className="w-4 h-4" />
                                Copiar Código PIX
                              </Button>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg border max-h-24 overflow-y-auto">
                              <code className="text-xs font-mono text-muted-foreground break-all leading-relaxed block select-all">
                                {pixData.pix_code}
                              </code>
                            </div>
                            <p className="text-xs text-muted-foreground text-center sm:text-left">
                              Cole este código no seu app do banco na opção PIX → Copia e Cola
                            </p>
                          </div>
                        )}

                        {/* Total Amount Highlight */}
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">Valor a pagar:</span>
                            <span className="font-bold text-2xl text-primary">
                              {formatCurrency(pixData?.total_amount ?? finalPrice)}
                            </span>
                          </div>
                          {welcomeEligible && welcomeDiscount > 0 && (
                            <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              Desconto de boas-vindas aplicado
                            </p>
                          )}
                        </div>

                        {/* Expiration Warning */}
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 sm:p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-full flex-shrink-0">
                              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                                PIX válido por 30 minutos
                              </h4>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                Após o pagamento, seus vouchers serão liberados automaticamente.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Payment Check Button */}
                        <Button
                          onClick={checkPaymentStatus}
                          disabled={checkingPayment}
                          className="w-full h-12 text-base font-semibold shadow-md"
                          size="lg"
                        >
                          {checkingPayment ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Verificando...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Check className="w-5 h-5" />
                              Já fiz o pagamento
                            </div>
                          )}
                        </Button>

                        {/* Back Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowPayment(false);
                            setPixData(null);
                          }}
                          className="w-full"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Voltar e escolher outro método
                        </Button>

                        {/* Security Info */}
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-success" />
                            <span>Pagamento seguro</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            <span>Mercado Pago</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground text-center mt-4">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Check className="w-3 h-3 text-success" />
                    Compra 100% segura
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Válido em toda Gramado
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Partner Detail Modal */}
        {selectedPartner && (
          <PartnerDetailModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            partner={selectedPartner}
            onDateChange={(date) => {
              if (selectedPartner?.itemId) {
                updateItemDate(selectedPartner.itemId, date);
                setSelectedPartner((prev: any) => prev ? { ...prev, selectedDate: date } : prev);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Checkout;