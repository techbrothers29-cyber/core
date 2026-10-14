import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// React explicitly imported to avoid runtime hook resolution errors
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SessionSecurity } from '@/lib/security';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let hasShownLogoutToast = false;

    // Set up auth state listener with enhanced security tracking
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle logout toast - show only once per logout event
      if (event === 'SIGNED_OUT' && !hasShownLogoutToast) {
        hasShownLogoutToast = true;
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado com sucesso.",
        });
        // Reset flag after a delay to allow for future logouts
        setTimeout(() => {
          hasShownLogoutToast = false;
        }, 2000);
      }

      // Enhanced session tracking for security monitoring
      if (event === 'SIGNED_IN' && session) {
        setTimeout(() => {
          SessionSecurity.trackSession();
        }, 0);

        // Affiliate attribution backfill: OAuth signups (Google/Facebook/Apple)
        // do not carry `referrer_code` in metadata, so the handle_new_user
        // trigger cannot set users.referrer_affiliate_code. We backfill it
        // here when localStorage has a pending ref code AND the account was
        // just created (avoids attributing pre-existing users who later
        // click an affiliate link).
        setTimeout(async () => {
          try {
            const refCode = localStorage.getItem('referrer_affiliate_code');
            if (!refCode || !session.user) return;
            const createdAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0;
            const isFreshAccount = createdAt && (Date.now() - createdAt) < 10 * 60 * 1000;
            if (!isFreshAccount) return;
            const { data: existing } = await supabase
              .from('users')
              .select('referrer_affiliate_code')
              .eq('id', session.user.id)
              .maybeSingle();
            if (existing && !existing.referrer_affiliate_code) {
              await supabase
                .from('users')
                .update({ referrer_affiliate_code: refCode })
                .eq('id', session.user.id)
                .is('referrer_affiliate_code', null);
            }
            localStorage.removeItem('referrer_affiliate_code');
          } catch (err) {
            console.warn('Affiliate attribution backfill failed:', err);
          }
        }, 0);
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
