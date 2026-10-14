import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider = ({ children }: AdminAuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = async (email: string, password: string) => {
    try {
      // Check if account is locked (simplified check)
      const { data: lockCheck } = await supabase
        .from('failed_login_attempts')
        .select('attempts, locked_until')
        .eq('identifier', email)
        .eq('attempt_type', 'email')
        .gte('last_attempt', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .maybeSingle();

      if (lockCheck && lockCheck.attempts >= 5) {
        const lockedUntil = lockCheck.locked_until ? new Date(lockCheck.locked_until) : null;
        if (!lockedUntil || lockedUntil > new Date()) {
          return { error: { message: 'Conta temporariamente bloqueada por segurança. Tente novamente em 30 minutos.' } };
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record failed attempt
        await supabase
          .from('failed_login_attempts')
          .upsert({
            identifier: email,
            attempt_type: 'email',
            attempts: (lockCheck?.attempts || 0) + 1,
            last_attempt: new Date().toISOString(),
            locked_until: (lockCheck?.attempts || 0) + 1 >= 5 ?
              new Date(Date.now() + 30 * 60 * 1000).toISOString() : null
          }, { onConflict: 'identifier,attempt_type' });

        return { error: { message: 'Email ou senha incorretos.' } };
      }

      // Verify admin role via database (not spoofable metadata)
      if (data?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roleData) {
          await supabase.auth.signOut();

          // Record failed attempt
          await supabase
            .from('failed_login_attempts')
            .upsert({
              identifier: email,
              attempt_type: 'email',
              attempts: (lockCheck?.attempts || 0) + 1,
              last_attempt: new Date().toISOString(),
              locked_until: (lockCheck?.attempts || 0) + 1 >= 5 ?
                new Date(Date.now() + 30 * 60 * 1000).toISOString() : null
            }, { onConflict: 'identifier,attempt_type' });

          return { error: { message: 'Email ou senha incorretos.' } };
        }
      }

      // Clear failed attempts on success
      await supabase
        .from('failed_login_attempts')
        .delete()
        .eq('identifier', email)
        .eq('attempt_type', 'email');

      // Log successful admin login for security monitoring
      await supabase
        .from('audit_logs')
        .insert({
          user_id: data.user.id,
          entity_type: 'admin_auth',
          action: 'login',
          description: 'Admin user logged in successfully',
          metadata: {
            timestamp: new Date().toISOString(),
            ip_address: 'browser'
          }
        });

      return { error: null };
    } catch (error) {
      return { error: { message: 'Email ou senha incorretos.' } };
    }
  };

  const signOut = async () => {
    try {
      // Force clear the session locally first
      setUser(null);
      setSession(null);

      // Clear all possible Supabase session data
      await supabase.auth.signOut({
        scope: 'global' // Use global scope to clear from all devices
      });

      // Also try local scope as fallback
      await supabase.auth.signOut({
        scope: 'local'
      });

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if server logout fails
      setUser(null);
      setSession(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
