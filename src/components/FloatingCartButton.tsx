import { useEffect, useRef, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { prefetchCheckout } from '@/lib/route-prefetch';

/**
 * Floating cart button (FAB) — appears in the bottom-left corner whenever
 * the cart has at least one item. Visible to both visitors and logged-in
 * clients. Hidden for admin/affiliate roles and on internal pages where it
 * would compete with native flows (checkout, dashboards, auth).
 */
const HIDDEN_ROUTE_PREFIXES = [
  '/checkout',
  '/admin',
  '/parceiro',
  '/afiliado',
  '/auth',
  '/login',
  '/completar-cadastro',
  '/hospedagem/checkout',
  '/hospedagem/confirmacao',
];

const FloatingCartButton = () => {
  // Defensive: if provider is missing (e.g. HMR transient), render nothing instead of crashing the tree
  let totalItems = 0;
  let totalPrice = 0;
  try {
    const cart = useCart();
    totalItems = cart.totalItems;
    totalPrice = cart.totalPrice;
  } catch {
    return null;
  }
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let scrolling = false;
    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        setIsScrolling(true);
      }
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        scrolling = false;
        setIsScrolling(false);
      }, 250);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, []);

  if (totalItems <= 0) return null;

  if (user?.user_metadata?.role_type === 'admin' || user?.user_metadata?.role_type === 'affiliate') {
    return null;
  }

  if (HIDDEN_ROUTE_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) {
    return null;
  }

  // Desktop shows the cart in the header; keep FAB mobile-only.
  if (!isMobile) return null;

  const priceFormatted = totalPrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

  return (
    <button
      onClick={() => navigate('/checkout')}
      onMouseEnter={prefetchCheckout}
      onTouchStart={prefetchCheckout}
      aria-label={`Abrir carrinho com ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
      className={cn(
        'fixed z-40 bottom-24 md:bottom-2',
        'flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'hover:bg-primary/90 active:scale-95',
        'animate-in fade-in slide-in-from-bottom-4',
        'transition-all duration-300 ease-out',
        isScrolling ? '-translate-x-[120%] left-3 opacity-0 pointer-events-none' : 'translate-x-0 left-3 opacity-100'
      )}
    >
      <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-primary-foreground/15">
        <ShoppingCart className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] uppercase tracking-wide opacity-80">Carrinho</span>
        <span className="text-[14px] font-bold">{priceFormatted}</span>
      </span>
    </button>
  );
};

export default FloatingCartButton;
