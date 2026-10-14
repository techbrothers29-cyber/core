import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateData {
  id: string;
  affiliate_code: string;
  commission_rate: number;
  total_earnings: number;
  pending_earnings: number;
  total_conversions: number;
  total_clicks: number;
  status: 'pending' | 'active' | 'suspended';
  approval_date?: string;
  full_name?: string;
  profile_image_url?: string;
  parent_affiliate_id?: string | null;
  can_refer_subaffiliate?: boolean;
}

interface AffiliateAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  affiliateData: AffiliateData | null;
  signUp: (email: string, password: string, fullName: string, phone: string, referrerCode?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AffiliateAuthContext = createContext<AffiliateAuthContextType>({
  user: null,
  session: null,
  loading: true,
  affiliateData: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAffiliateAuth = () => {
  const context = useContext(AffiliateAuthContext);
  if (!context) {
    throw new Error('useAffiliateAuth must be used within an AffiliateAuthProvider');
  }
  return context;
};

interface AffiliateAuthProviderProps {
  children: ReactNode;
}

export const AffiliateAuthProvider = ({ children }: AffiliateAuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);

  const fetchAffiliateData = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('id, affiliate_code, commission_rate, total_earnings, pending_earnings, total_conversions, total_clicks, status, approval_date, full_name, profile_image_url, email, is_active, created_at, parent_affiliate_id, can_refer_subaffiliate')
        .eq('email', userEmail)
        .maybeSingle();

      if (error) {
        console.error('Error fetching affiliate data:', error);
        setLoading(false); // Finalizar loading mesmo com erro
        return;
      }

      if (data) {
        setAffiliateData(data as AffiliateData);
      }
      setLoading(false); // Finalizar loading após carregar dados
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
      setLoading(false); // Finalizar loading mesmo com erro
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, referrerCode?: string) => {
    try {
      // Validate referrer: only first-level affiliates can refer sub-affiliates
      if (referrerCode) {
        const { data: canRefer, error: rpcErr } = await supabase
          .rpc('can_refer_sub_affiliate' as any, { _code: referrerCode });
        if (rpcErr) {
          console.warn('can_refer_sub_affiliate check failed:', rpcErr);
        } else if (canRefer === false) {
          return { error: { message: 'Este link de indicação é inválido. Sub-afiliados não podem indicar novos sub-afiliados.' } };
        }
      }

      const userData: Record<string, any> = {
        full_name: fullName,
        phone,
        role_type: 'affiliate'
      };

      // Add referrer code if provided (for sub-affiliate registration)
      if (referrerCode) {
        userData.referrer_code = referrerCode;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/afiliado/painel`,
          data: userData
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { error: { message: 'Email já cadastrado. Use a aba de login.' } };
        }
        return { error: { message: error.message } };
      }

      // Supabase retorna 200 com identities vazio (ou ausente) quando o email já existe
      // — proteção contra enumeração. Em iOS/Safari o array pode vir undefined; tratamos
      // ambos os casos como "usuário já cadastrado" quando não há sessão nem novo identity.
      const identities = (data?.user as any)?.identities;
      const noNewIdentity = !identities || (Array.isArray(identities) && identities.length === 0);
      if (data?.user && !data?.session && noNewIdentity) {
        return { error: { message: 'Email já cadastrado. Use a aba de login ou recupere sua senha.' } };
      }

      // Fallback de vínculo sub-afiliado:
      // O trigger handle_new_user() pode filtrar status='approved' enquanto
      // afiliados ativos usam status='active'. Garantimos o vínculo aqui via
      // update direto (RLS affiliates_update_own permite update do próprio registro).
      if (referrerCode && data?.user) {
        try {
          const { data: parent } = await supabase
            .from('affiliates')
            .select('id')
            .eq('affiliate_code', referrerCode)
            .in('status', ['active', 'approved'])
            .eq('is_active', true)
            .maybeSingle();

          if (parent?.id) {
            await supabase
              .from('affiliates')
              .update({ parent_affiliate_id: parent.id })
              .eq('email', email)
              .is('parent_affiliate_id', null);
          }
        } catch (linkErr) {
          console.warn('Sub-affiliate link fallback failed:', linkErr);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: { message: 'Erro interno do servidor' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          return { error: { message: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.' } };
        }
        return { error: { message: 'Email ou senha incorretos.' } };
      }

      // Verify affiliate role via database (not spoofable metadata)
      if (data?.user) {
        const { data: affiliateRecord } = await supabase
          .from('affiliates')
          .select('id, user_id')
          .or(`user_id.eq.${data.user.id},email.eq.${data.user.email}`)
          .maybeSingle();

        if (!affiliateRecord) {
          await supabase.auth.signOut();
          return { error: { message: 'Email ou senha incorretos.' } };
        }

        // Backfill user_id if missing (legacy affiliate record matched by email)
        if (!affiliateRecord.user_id) {
          await supabase
            .from('affiliates')
            .update({ user_id: data.user.id })
            .eq('id', affiliateRecord.id);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: { message: 'Email ou senha incorretos.' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAffiliateData(null);
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.email) {
        // Verificar se é afiliado e buscar dados por email
        fetchAffiliateData(session.user.email!);
      } else {
        setAffiliateData(null);
        setLoading(false);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.email) {
        fetchAffiliateData(session.user.email!);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AffiliateAuthContext.Provider value={{
      user,
      session,
      loading,
      affiliateData,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AffiliateAuthContext.Provider>
  );
};
