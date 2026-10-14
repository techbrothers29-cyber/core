import React, { useEffect, useRef, useState } from 'react';
import { CalendarSearch as TbCalendarSearch } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSelectedDate } from '@/components/GlobalDatePicker';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Floating date button (FAB) — appears only on establishment pages
 * (/estabelecimento/*), sitting just above the FloatingCartButton.
 * Mirrors the cart FAB visual language and retract-on-scroll behavior.
 */
const FloatingDateButton = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const isMobile = useIsMobile();

  // Track cart presence so we can lift the date button above the cart FAB
  let hasCartItems = false;
  try {
    hasCartItems = useCart().totalItems > 0;
  } catch {
    hasCartItems = false;
  }

  const [isScrolling, setIsScrolling] = useState(false);
  const [open, setOpen] = useState(false);
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

  // Only render on establishment pages
  if (!location.pathname.startsWith('/estabelecimento/')) return null;

  if (
    user?.user_metadata?.role_type === 'admin' ||
    user?.user_metadata?.role_type === 'affiliate'
  ) {
    return null;
  }

  // Stack clearly above cart FAB when present (with breathing room), otherwise occupy cart's slot.
  // Cart FAB sits at bottom-24 (mobile) / bottom-5 (desktop).
  const bottomClass = hasCartItems
    ? 'bottom-[10rem] md:bottom-[3.4rem]'
    : 'bottom-24 md:bottom-2';

  const dateLabel = format(selectedDate, "dd 'de' MMM", { locale: ptBR });

  const buttonClasses = cn(
    'fixed z-40',
    bottomClass,
    'flex items-center gap-1.5 pl-1.5 pr-4 py-1.5 rounded-full',
    'bg-primary text-primary-foreground shadow-lg',
    'hover:bg-primary/90 active:scale-95',
    'animate-in fade-in slide-in-from-bottom-4',
    'transition-all duration-150 ease-out',
    isScrolling
      ? '-translate-x-[120%] left-3 opacity-0 pointer-events-none'
      : 'translate-x-0 left-3 opacity-100'
  );

  const buttonInner = (
    <>
      <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-primary-foreground/15">
        <TbCalendarSearch className="w-3.5 h-3.5" />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-100">Escolher data</span>
        <span className="text-[11px] font-bold">{dateLabel}</span>
      </span>
    </>
  );

  const ariaLabel = `Selecionar data — atual ${format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}`;

  // Only render on mobile — desktop uses the sidebar/buy panel directly
  if (!isMobile) return null;

  return (
    <button
      aria-label={ariaLabel}
      className={buttonClasses}
      onClick={() => {
        window.dispatchEvent(new CustomEvent('bah:open-date-drawer'));
      }}
    >
      {buttonInner}
    </button>
  );
};

export default FloatingDateButton;
