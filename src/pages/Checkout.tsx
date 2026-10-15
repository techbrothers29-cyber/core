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
  Gift,
  Calendar,
  Lock,
  ShieldCheck,
  Ticket
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

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const originalTotal = items.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
  const fmtItemDate = (item: any) =>
    item.selectedDate && item.selectedSchedule
      ? `${item.selectedDate.split('-').reverse().join('/')} — ${item.selectedSchedule}`
      : item.selectedDate
        ? item.selectedDate.split('-').reverse().join('/')
        : item.selectedSchedule
          ? `Horário: ${item.selectedSchedule}`
          : null;

  const TopBar = ({ backLabel = 'Voltar' }: { backLabel?: string }) => (
    <header className="sticky top-0 z-40 bg-card border-b border-[#ebebeb]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label={backLabel}
            className="w-10 h-10 shrink-0 rounded-full border border-[#dddddd] flex items-center justify-center hover:bg-[#f7f7f7]"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => navigate('/')} aria-label="Bah Ofertas — página inicial">
            <img src="/logo-desktop.png" alt="Bah Ofertas" className="h-9 md:h-10 w-auto" />
          </button>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#137a3f]">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          Pagamento seguro
        </span>
      </div>
    </header>
  );

  const QtyControl = ({ item }: { item: any }) => (
    <div className="flex items-center gap-1">
      <div className="inline-flex items-center rounded-full border border-[#dddddd]">
        <button
          type="button"
          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] touch-manipulation"
          aria-label="Diminuir quantidade"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-7 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">{item.quantity}</span>
        <button
          type="button"
          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] touch-manipulation"
          aria-label="Aumentar quantidade"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => removeItem(item.id)}
        className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 touch-manipulation"
        aria-label="Remover item"
      >
        <Trash2 className="w-[18px] h-[18px]" />
      </button>
    </div>
  );

  const ItemRow = ({ item, compact = false }: { item: any; compact?: boolean }) => {
    const when = fmtItemDate(item);
    const hasDiscount = item.originalPrice > item.price;
    return (
      <li className="flex gap-3 md:gap-4 py-4 first:pt-0 last:pb-0">
        <img
          src={item.imageUrl}
          alt=""
          className={`${compact ? 'w-16 h-16' : 'w-20 h-20 md:w-24 md:h-24'} shrink-0 rounded-xl object-cover bg-muted`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="m-0 text-[15px] font-bold leading-snug line-clamp-2">{item.title}</h3>
              {item.subtitle && !item.selectedDate && (
                <p className="m-0 mt-0.5 text-[13px] text-muted-foreground line-clamp-1">{item.subtitle}</p>
              )}
              {when && (
                <p className="m-0 mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  {when}
                </p>
              )}
              {item.manualScheduling && (
                <p className="m-0 mt-1 text-xs text-muted-foreground">Agendamento após a compra</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="m-0 text-[15px] font-bold tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
              {hasDiscount && (
                <p className="m-0 text-xs text-muted-foreground line-through tabular-nums">
                  {formatCurrency(item.originalPrice * item.quantity)}
                </p>
              )}
              {hasDiscount && item.discountPercent > 0 && (
                <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  -{item.discountPercent}%
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {QtyControl({ item })}
            {!compact && (
              <button
                type="button"
                onClick={() => handlePartnerClick(item)}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#dddddd] px-3.5 text-[13px] font-semibold hover:border-[#1f1f1f]"
              >
                <Info className="w-4 h-4" aria-hidden="true" />
                Detalhes
              </button>
            )}
          </div>
        </div>
      </li>
    );
  };

  // Block checkout for visitors and non-client roles (admin/affiliate/partner)
  // when the cart has items. Visitors must sign in as client; staff cannot shop.
  const isStaffRole = effectiveRole === 'admin' || effectiveRole === 'affiliate' || effectiveRole === 'partner';
  const needsClientLogin = items.length > 0 && (!user || isStaffRole);

  if (needsClientLogin && !authLoading && !roleLoading) {
    const isStaff = !!user && isStaffRole;
    return (
      <div className="min-h-screen bg-[#fafafa] font-jakarta text-foreground">
        {TopBar({ backLabel: "Voltar às ofertas" })}
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start">
          <section className="rounded-2xl border border-[#ebebeb] bg-card p-5 md:p-6">
            <h1 className="m-0 text-xl md:text-2xl font-bold">Seus itens <span className="text-muted-foreground font-semibold">({itemCount})</span></h1>
            <ul className="m-0 mt-4 p-0 list-none divide-y divide-[#ebebeb]">
              {items.map((item) => <React.Fragment key={item.id}>{ItemRow({ item, compact: true })}</React.Fragment>)}
            </ul>
            <div className="mt-4 border-t border-[#ebebeb] pt-4 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold tabular-nums">{formatCurrency(totalPrice)}</span>
            </div>
            {totalSavings > 0 && (
              <p className="m-0 mt-1 text-right text-[13px] font-semibold text-[#137a3f]">Você economiza {formatCurrency(totalSavings)}</p>
            )}
          </section>

          <aside className="rounded-2xl border border-[#ebebeb] bg-card p-6 text-center lg:sticky lg:top-24">
            <span className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </span>
            <h2 className="m-0 mt-4 text-lg font-bold">{isStaff ? 'Conta não permitida' : 'Entre para finalizar'}</h2>
            <p className="m-0 mt-2 text-sm text-muted-foreground">
              {isStaff
                ? 'Contas de administrador, parceiro ou afiliado não podem finalizar compras. Entre com uma conta de cliente.'
                : 'Você precisa estar logado como cliente para pagar. Seus itens continuam salvos no carrinho.'}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" onClick={() => navigate('/auth')} className="h-12 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground">
                Entrar como cliente
              </button>
              <button type="button" onClick={() => navigate('/auth?mode=signup')} className="h-12 rounded-xl border border-[#dddddd] text-[15px] font-semibold hover:border-[#1f1f1f]">
                Criar conta de cliente
              </button>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafafa] font-jakarta text-foreground">
        {TopBar({ backLabel: "Voltar às ofertas" })}
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <span className="mx-auto w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingCart className="w-7 h-7" aria-hidden="true" />
          </span>
          <h1 className="m-0 mt-5 text-xl font-bold">Seu carrinho está vazio</h1>
          <p className="m-0 mt-2 text-sm text-muted-foreground">Escolha ofertas, ingressos ou hospedagens e elas aparecem aqui.</p>
          <button type="button" onClick={() => navigate('/')} className="mt-6 h-12 w-full rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground">
            Ver ofertas
          </button>
        </main>
      </div>
    );
  }

  const payLabel = loading ? null : paymentMethod === 'pix' ? 'Gerar PIX' : 'Pagar com cartão';
  const startPayment = paymentMethod === 'pix' ? handleProcessPixOrder : handleStartCardPayment;

  return (
    <div className="min-h-screen bg-[#fafafa] font-jakarta text-foreground pb-28 lg:pb-10">
      {TopBar({ backLabel: "Continuar comprando" })}

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">
        <h1 className="m-0 text-xl md:text-2xl font-bold">Finalizar compra</h1>
        <p className="m-0 mt-1 text-sm text-muted-foreground">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'} no carrinho
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:items-start">
          {/* Itens */}
          <section className="rounded-2xl border border-[#ebebeb] bg-card p-4 md:p-6" aria-labelledby="co-itens">
            <h2 id="co-itens" className="m-0 mb-4 text-[17px] font-bold">Seu carrinho</h2>
            <ul className="m-0 p-0 list-none divide-y divide-[#ebebeb]">
              {items.map((item) => <React.Fragment key={item.id}>{ItemRow({ item })}</React.Fragment>)}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2 hover:text-primary"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Adicionar mais ofertas
            </button>
          </section>

          {/* Resumo + pagamento */}
          <aside className="rounded-2xl border border-[#ebebeb] bg-card p-4 md:p-6 lg:sticky lg:top-24" aria-labelledby="co-resumo">
            <h2 id="co-resumo" className="m-0 text-[17px] font-bold">Resumo do pedido</h2>
            <dl className="m-0 mt-4 space-y-2 text-sm">
              {totalSavings > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Valor original</dt>
                    <dd className="m-0 line-through tabular-nums">{formatCurrency(originalTotal)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold text-[#137a3f]">
                    <dt>Sua economia</dt>
                    <dd className="m-0 tabular-nums">- {formatCurrency(totalSavings)}</dd>
                  </div>
                </>
              )}
              {welcomeEligible && items.length > 0 && (
                <div className="flex justify-between font-semibold text-primary">
                  <dt className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4" aria-hidden="true" />
                    Boas-vindas (5%)
                  </dt>
                  <dd className="m-0 tabular-nums">- {formatCurrency(welcomeDiscount)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 border-t border-[#ebebeb] pt-4 flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Total</span>
              <span className="text-2xl font-bold tabular-nums">{formatCurrency(finalPrice)}</span>
            </div>

            {!showPayment ? (
              <div className="mt-5">
                <h3 className="m-0 mb-3 text-[15px] font-bold">Forma de pagamento</h3>
                <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} disabled={loading} />
                <button
                  type="button"
                  onClick={startPayment}
                  disabled={loading}
                  className="mt-4 hidden lg:inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Processando…</>
                  ) : paymentMethod === 'pix' ? (
                    <><QrCode className="w-4 h-4" />{payLabel}</>
                  ) : (
                    <><CreditCard className="w-4 h-4" />{payLabel}</>
                  )}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4 animate-fade-in">
                {paymentConfirmed ? (
                  <div className="rounded-2xl bg-[#e8f6ee] p-6 text-center animate-scale-in">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 bg-[#1f9d55]/20 rounded-full animate-ping" />
                      <div className="relative w-full h-full bg-[#1f9d55] rounded-full flex items-center justify-center">
                        <Check className="w-8 h-8 text-white" strokeWidth={3} />
                      </div>
                    </div>
                    <h3 className="m-0 text-xl font-bold text-[#137a3f]">Pagamento confirmado!</h3>
                    <p className="m-0 mt-1 text-sm text-[#137a3f]/80">Seus vouchers foram gerados.</p>
                    <p className="m-0 mt-4 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
                      <span className="w-4 h-4 border-2 border-[#1f9d55] border-t-transparent rounded-full animate-spin" />
                      Abrindo seus vouchers…
                    </p>
                  </div>
                ) : paymentMethod === 'credit_card' ? (
                  <div>
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
                    <button
                      type="button"
                      onClick={() => setShowPayment(false)}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold hover:bg-[#f7f7f7]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Escolher outra forma de pagamento
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-[#ebebeb] p-4 sm:p-5 text-center" ref={qrCodeRef}>
                      <h3 className="m-0 text-[17px] font-bold">Pague com PIX</h3>
                      {pixData?.qr_code ? (
                        <div className="mt-4 animate-scale-in">
                          <div className="inline-block rounded-2xl border-2 border-dashed border-[#dddddd] bg-white p-3">
                            <img
                              src={pixData.qr_code.startsWith('data:') ? pixData.qr_code : `data:image/png;base64,${pixData.qr_code}`}
                              alt="QR Code PIX"
                              className="w-48 h-48 sm:w-56 sm:h-56 mx-auto"
                            />
                          </div>
                          <p className="m-0 mt-3 text-sm text-muted-foreground">Abra o app do seu banco e escaneie o QR Code</p>
                        </div>
                      ) : (
                        <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
                          <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
                          Gerando QR Code PIX…
                        </div>
                      )}
                    </div>

                    {pixData?.pix_code && (
                      <div className="rounded-2xl border border-[#ebebeb] p-4 animate-fade-in">
                        <p className="m-0 text-[13px] font-semibold">PIX copia e cola</p>
                        <code className="mt-2 block max-h-20 overflow-y-auto rounded-xl bg-[#f7f7f7] p-3 font-mono text-xs text-muted-foreground break-all select-all">
                          {pixData.pix_code}
                        </code>
                        <button
                          type="button"
                          onClick={copyPixCode}
                          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1f1f1f] text-[15px] font-semibold text-white"
                        >
                          <Copy className="w-4 h-4" />
                          Copiar código PIX
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-2xl bg-primary/5 px-4 py-3">
                      <span className="text-sm font-medium">Valor a pagar</span>
                      <span className="text-xl font-bold text-primary tabular-nums">{formatCurrency(pixData?.total_amount ?? finalPrice)}</span>
                    </div>
                    {welcomeEligible && welcomeDiscount > 0 && (
                      <p className="m-0 -mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                        <Gift className="w-3 h-3" />
                        Desconto de boas-vindas aplicado
                      </p>
                    )}

                    <div className="flex items-start gap-3 rounded-2xl bg-[#fff6e0] p-4">
                      <Clock className="w-5 h-5 shrink-0 text-[#8a5a00]" aria-hidden="true" />
                      <p className="m-0 text-[13px] text-[#8a5a00]">
                        <b className="block text-sm">PIX válido por 30 minutos</b>
                        Assim que o pagamento cair, seus vouchers são liberados automaticamente.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={checkPaymentStatus}
                      disabled={checkingPayment}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {checkingPayment ? (
                        <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Verificando…</>
                      ) : (
                        <><Check className="w-5 h-5" />Já fiz o pagamento</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPayment(false);
                        setPixData(null);
                      }}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold hover:bg-[#f7f7f7]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Escolher outra forma de pagamento
                    </button>
                  </>
                )}
              </div>
            )}

            <ul className="m-0 mt-5 p-0 list-none flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[#ebebeb] pt-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-[#137a3f]" aria-hidden="true" />Compra 100% segura</li>
              <li className="flex items-center gap-1"><Ticket className="w-3.5 h-3.5" aria-hidden="true" />Vouchers na sua conta</li>
            </ul>
          </aside>
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
      </main>

      {/* Celular: total e botão de pagar sempre à mão */}
      {!showPayment && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#ebebeb] bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <div className="leading-tight">
            <span className="block text-xs text-muted-foreground">Total</span>
            <span className="text-lg font-bold tabular-nums">{formatCurrency(finalPrice)}</span>
          </div>
          <button
            type="button"
            onClick={startPayment}
            disabled={loading}
            className="h-12 flex-1 max-w-[230px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Processando…</>
            ) : paymentMethod === 'pix' ? (
              <><QrCode className="w-4 h-4" />{payLabel}</>
            ) : (
              <><CreditCard className="w-4 h-4" />{payLabel}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Checkout;
