import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface NovaxsCartMetadata {
  source: 'novaxs';
  productId: string | number;
  productPath?: string;
  priceToken?: string; // Token de garantia de preço (válido por 30min) retornado por getProductsByDate
  establishmentId?: string;
  establishmentName?: string;
  date: string; // yyyy-MM-dd
  schedule?: string | null;
}

export interface CartItem {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  imageUrl: string;
  category: string;
  quantity: number;
  selectedSchedule?: string;
  selectedDate?: string;
  requiresSchedule?: boolean;
  manualScheduling?: boolean;
  preferredDate?: string;
  metadata?: NovaxsCartMetadata | Record<string, any>;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItemDate: (id: string, date: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  originalTotalPrice: number;
  totalSavings: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

const LOCAL_STORAGE_KEY = 'cart';

function readCartFromLocalStorage(): CartItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const CartProvider = ({ children }: CartProviderProps) => {
  // Lazy init: visitor sessions hydrate immediately from localStorage so the
  // floating cart icon can show before the first effect runs.
  const [items, setItems] = useState<CartItem[]>(() => readCartFromLocalStorage());
  const [loading, setLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Visitor: load from localStorage. User: merge local + DB on login.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) {
        setItems(readCartFromLocalStorage());
        setHasHydrated(true);
        return;
      }
      await hydrateAndMergeForUser(() => cancelled);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const mapDbRowToItem = (item: any): CartItem => ({
    id: item.offer_id,
    title: item.title,
    subtitle: item.subtitle,
    price: item.price,
    originalPrice: item.original_price,
    discountPercent: item.discount_percent,
    imageUrl: item.image_url,
    category: item.category,
    quantity: item.quantity,
    metadata: item.metadata || undefined,
    selectedDate: item.metadata?.date,
    selectedSchedule: item.metadata?.schedule || undefined,
  });

  const mergeCartLists = (local: CartItem[], db: CartItem[]): CartItem[] => {
    const map = new Map<string, CartItem>();
    for (const it of db) map.set(it.id, { ...it });
    for (const it of local) {
      const existing = map.get(it.id);
      if (existing) {
        map.set(it.id, {
          ...existing,
          quantity: existing.quantity + it.quantity,
          selectedDate: it.selectedDate ?? existing.selectedDate,
          selectedSchedule: it.selectedSchedule ?? existing.selectedSchedule,
          metadata: { ...(existing.metadata || {}), ...(it.metadata || {}) } as any,
        });
      } else {
        map.set(it.id, { ...it });
      }
    }
    return Array.from(map.values());
  };

  const hydrateAndMergeForUser = async (isCancelled: () => boolean) => {
    if (!user) return;
    setLoading(true);
    try {
      const localItems = readCartFromLocalStorage();

      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const dbItems: CartItem[] = (data || []).map(mapDbRowToItem);
      const merged = mergeCartLists(localItems, dbItems);

      const dbById = new Map(dbItems.map((i) => [i.id, i]));
      const toPersist = merged.filter((m) => {
        const prev = dbById.get(m.id);
        return !prev || prev.quantity !== m.quantity;
      });

      let persistOk = true;
      for (const item of toPersist) {
        try {
          await saveItemToDatabase(item);
        } catch {
          persistOk = false;
        }
      }

      if (isCancelled()) return;

      setItems(merged);

      if (persistOk && localItems.length > 0) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        const mergedCount = localItems.filter((l) => dbById.has(l.id)).length;
        const addedCount = localItems.length - mergedCount;
        toast({
          title: 'Carrinho sincronizado',
          description:
            mergedCount > 0
              ? `${addedCount} item(s) adicionado(s) e ${mergedCount} item(s) mesclado(s) à sua conta.`
              : `${addedCount} item(s) do seu carrinho foram salvos na sua conta.`,
        });
      }
    } catch (error) {
      console.error('Error hydrating/merging cart:', error);
    } finally {
      if (!isCancelled()) {
        setLoading(false);
        setHasHydrated(true);
      }
    }
  };

  const saveItemToDatabase = async (item: CartItem) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          offer_id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          price: item.price,
          original_price: item.originalPrice,
          discount_percent: item.discountPercent,
          image_url: item.imageUrl,
          category: item.category,
          quantity: item.quantity,
          metadata: item.metadata as any,
        }, {
          onConflict: 'user_id,offer_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving item to database:', error);
    }
  };

  const removeItemFromDatabase = async (offerId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('offer_id', offerId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing item from database:', error);
    }
  };

  const clearCartFromDatabase = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing cart from database:', error);
    }
  };

  // Persist visitor cart to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (!user && hasHydrated) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }
  }, [items, user, hasHydrated]);


  const addItem = async (newItem: Omit<CartItem, 'quantity'>) => {
    const existingItemIndex = items.findIndex(item => item.id === newItem.id);

    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += 1;
      setItems(updatedItems);

      if (user) {
        await saveItemToDatabase(updatedItems[existingItemIndex]);
      }

      toast({
        title: "Item já no carrinho",
        description: "Quantidade atualizada para este item.",
      });
    } else {
      const newCartItem: CartItem = { ...newItem, quantity: 1 };
      setItems(currentItems => [...currentItems, newCartItem]);

      if (user) {
        await saveItemToDatabase(newCartItem);
      }

      toast({
        title: "Adicionado ao carrinho",
        description: `${newItem.title} foi adicionado ao seu carrinho.`,
      });
    }
  };

  const removeItem = async (id: string) => {
    const removedItem = items.find(item => item.id === id);
    setItems(currentItems => currentItems.filter(item => item.id !== id));

    if (user) {
      await removeItemFromDatabase(id);
    }

    if (removedItem) {
      toast({
        title: "Item removido",
        description: `${removedItem.title} foi removido do carrinho.`,
      });
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id);
      return;
    }

    const updatedItems = items.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    setItems(updatedItems);

    if (user) {
      const updatedItem = updatedItems.find(item => item.id === id);
      if (updatedItem) {
        await saveItemToDatabase(updatedItem);
      }
    }
  };

  const updateItemDate = async (id: string, date: string) => {
    const updatedItems = items.map(item =>
      item.id === id
        ? {
            ...item,
            selectedDate: date,
            metadata: { ...(item.metadata || {}), date } as any,
          }
        : item
    );
    setItems(updatedItems);

    if (user) {
      const updatedItem = updatedItems.find(item => item.id === id);
      if (updatedItem) {
        await saveItemToDatabase(updatedItem);
      }
    }
  };

  const clearCart = async () => {
    setItems([]);

    if (user) {
      await clearCartFromDatabase();
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

    toast({
      title: "Carrinho limpo",
      description: "Todos os itens foram removidos do carrinho.",
    });
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const originalTotalPrice = items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
  const totalSavings = originalTotalPrice - totalPrice;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateItemDate,
        clearCart,
        totalItems,
        totalPrice,
        originalTotalPrice,
        totalSavings,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
