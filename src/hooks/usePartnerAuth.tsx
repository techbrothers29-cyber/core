import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const PARTNER_COMPANY_SELECT = `
  id,
  name,
  trade_name,
  cnpj,
  email,
  phone,
  website,
  description,
  logo_url,
  banner_url,
  address,
  business_hours,
  category_id,
  commission_rate,
  partner_retention_rate,
  is_active,
  is_verified,
  approval_status,
  created_at,
  updated_at,
  pix_key,
  pix_key_type
`;

interface PartnerData {
  id: string;
  name: string;
  trade_name?: string;
  cnpj: string;
  email: string;
  phone?: string;
  pix_key?: string | null;
  pix_key_type?: string | null;
  website?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  address?: any;
  business_hours?: any;
  category_id?: string;
  commission_rate?: number;
  partner_retention_rate?: number;
  is_active: boolean;
  is_verified: boolean;
  approval_status?: string;
  created_at?: string;
  updated_at?: string;
}

interface PartnerAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  partnerData: PartnerData | null;
  signUp: (email: string, password: string, fullName: string, companyName: string, cnpj: string, phone: string, categoryId: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updatePartnerData: (data: Partial<PartnerData>) => Promise<{ error: any }>;
  fetchPartnerData: () => Promise<void>;
}

const PartnerAuthContext = createContext<PartnerAuthContextType>({
  user: null,
  session: null,
  loading: true,
  partnerData: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  updatePartnerData: async () => ({ error: null }),
  fetchPartnerData: async () => {},
});

const normalizePartnerData = (data: any): PartnerData => {
  const isApproved = data.approval_status === 'approved' || data.is_verified === true;

  return {
    id: data.id,
    name: data.name,
    trade_name: data.trade_name,
    cnpj: data.cnpj,
    email: data.email,
    phone: data.phone,
    pix_key: data.pix_key,
    pix_key_type: data.pix_key_type,
    website: data.website,
    description: data.description,
    logo_url: data.logo_url,
    banner_url: data.banner_url,
    address: data.address,
    business_hours: data.business_hours,
    category_id: data.category_id,
    commission_rate: data.commission_rate,
    partner_retention_rate: data.partner_retention_rate,
    is_active: data.is_active,
    is_verified: isApproved,
    approval_status: isApproved ? 'approved' : data.approval_status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

export const usePartnerAuth = () => {
  const context = useContext(PartnerAuthContext);
  if (!context) {
    throw new Error('usePartnerAuth must be used within a PartnerAuthProvider');
  }
  return context;
};

interface PartnerAuthProviderProps {
  children: ReactNode;
}

export const PartnerAuthProvider = ({ children }: PartnerAuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companyName: string,
    cnpj: string,
    phone: string,
    categoryId: string
  ) => {
    try {
      // Validate password strength (same as other logins)
      if (password.length < 8) {
        return { error: { message: 'A senha deve ter pelo menos 8 caracteres' } };
      }

      // Normalize CNPJ - remove all non-digits
      const normalizedCnpj = cnpj.replace(/\D/g, '');

      // Check if CNPJ already exists before attempting signup
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('cnpj, email, name')
        .eq('cnpj', normalizedCnpj)
        .maybeSingle();

      if (existingCompany) {
        return {
          error: {
            message: `CNPJ ${cnpj} já está cadastrado para a empresa "${existingCompany.name}". Verifique os dados ou entre em contato com o suporte.`
          }
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/parceiro/painel`,
          data: {
            full_name: fullName,
            role_type: 'partner',
            company_name: companyName,
            cnpj: normalizedCnpj,
            phone: phone,
            category_id: categoryId
          }
        }
      });

      if (error) {
        console.error('Signup error details:', error);
        const msg = (error as any)?.message || '';
        if (msg.includes('duplicate key') || msg.includes('companies_cnpj_key')) {
          return { error: { message: 'CNPJ já cadastrado no sistema. Verifique os dados ou entre em contato com o suporte.' } };
        }
        if (msg.includes('User already registered')) {
          return { error: { message: 'Email já cadastrado. Use a aba de login.' } };
        }
        // Fallback genérico sem inferir causa errada
        return { error: { message: 'Não foi possível concluir o cadastro agora. Tente novamente em instantes.' } };
      }

      console.log('Usuário criado com sucesso! O trigger salvará os dados na tabela companies automaticamente.');
      return { error: null };
    } catch (error) {
      console.error('Erro interno no signup:', error);
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
        return { error: { message: 'Email ou senha incorretos.' } };
      }

      // Verify partner role via database (not spoofable metadata)
      if (data?.user) {
        const { data: companyRecord } = await supabase
          .from('companies')
          .select('id')
          .ilike('email', email.trim())
          .maybeSingle();

        if (!companyRecord) {
          await supabase.auth.signOut();
          return { error: { message: 'Email ou senha incorretos.' } };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: { message: 'Email ou senha incorretos.' } };
    }
  };

  const signOut = async () => {
    // Limpa o estado local imediatamente para uma transição instantânea
    setUser(null);
    setSession(null);
    setPartnerData(null);

    // Faz o signOut do Supabase em background (não bloqueia a UI)
    supabase.auth.signOut({ scope: 'local' }).catch((error) => {
      console.error('Logout error:', error);
    });
  };

  const updatePartnerData = async (data: Partial<PartnerData>) => {
    try {
      if (!user?.email) {
        return { error: { message: 'Usuário não autenticado' } };
      }

      if (!partnerData) {
        // Se estamos apenas atualizando a logo_url, podemos criar um registro básico
        if (Object.keys(data).length === 1 && data.logo_url) {
          // Criar um registro básico apenas com logo_url
          const newCompanyData = {
            name: user.user_metadata?.company_name || 'Nome da empresa',
            cnpj: user.user_metadata?.cnpj || '00.000.000/0000-00',
            email: user.email,
            trade_name: null,
            phone: user.user_metadata?.phone || null,
            website: null,
            description: null,
            logo_url: data.logo_url,
            banner_url: null,
            address: null,
            business_hours: null,
            category_id: null,
            commission_rate: 5.00,
            is_active: true,
            is_verified: false
          };

          const { data: insertedData, error: insertError } = await supabase
            .from('companies')
            .insert(newCompanyData)
            .select(PARTNER_COMPANY_SELECT)
            .single();

          if (insertError) {
            console.error('Error creating partner data:', insertError);
            return { error: { message: `Erro ao criar registro do parceiro: ${insertError.message}` } };
          }

          // Update local state with new data
          setPartnerData(normalizePartnerData(insertedData));

          return { error: null };
        }

        // Criar novo registro completo se não existir
        // Verificar se os campos obrigatórios estão presentes
        if (!data.name || !data.cnpj) {
          return { error: { message: 'Nome da empresa e CNPJ são obrigatórios' } };
        }

        const newCompanyData = {
          name: data.name,
          cnpj: data.cnpj,
          email: user.email,
          trade_name: data.trade_name || null,
          phone: data.phone || null,
          website: data.website || null,
          description: data.description || null,
          logo_url: data.logo_url || null,
          banner_url: data.banner_url || null,
          address: data.address || null,
          business_hours: data.business_hours || null,
          category_id: data.category_id || null,
          commission_rate: data.commission_rate || 5.00,
          is_active: true,
          is_verified: false
        };

        // Inserir registro da empresa (o trigger já garante que exista linha em public.users)
        const { data: insertedData, error: insertError } = await supabase
          .from('companies')
          .insert(newCompanyData)
          .select(PARTNER_COMPANY_SELECT)
          .single();

        if (insertError) {
          console.error('Error creating partner data:', insertError);
          return { error: { message: `Erro ao criar registro do parceiro: ${insertError.message}` } };
        }

        // Update local state with new data
        setPartnerData(normalizePartnerData(insertedData));

        return { error: null };
      }

      // Update existing record
      const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', partnerData.id);

      if (error) {
        console.error('Error updating partner data:', error);
        return { error: { message: 'Erro ao atualizar dados' } };
      }

      // Update local state
      setPartnerData(prev => prev ? normalizePartnerData({ ...prev, ...data }) : null);
      return { error: null };
    } catch (error) {
      console.error('Error updating partner data:', error);
      return { error: { message: 'Erro interno do servidor' } };
    }
  };

  const fetchPartnerData = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select(PARTNER_COMPANY_SELECT)
        .ilike('email', user.email.trim())
        .maybeSingle();

      if (error) {
        console.error('Error fetching partner data:', error);
        return;
      }

      if (data) {
        setPartnerData(normalizePartnerData(data));
      } else {
        // No company found for this partner - this is ok for new partners
        console.log('No company found for partner:', user.email);
        setPartnerData(null);
      }
    } catch (error) {
      console.error('Error fetching partner data:', error);
    }
  };

  const fetchPartnerDataByEmail = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(PARTNER_COMPANY_SELECT)
        .ilike('email', userEmail.trim())
        .maybeSingle();

      if (error) {
        console.error('Error fetching partner data:', error);
        return;
      }

      if (data) {
        setPartnerData(normalizePartnerData(data));
      } else {
        // No company found for this partner - this is ok for new partners
        console.log('No company found for partner:', userEmail);
        setPartnerData(null);
      }
    } catch (error) {
      console.error('Error fetching partner data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Always refresh partner company data inside this provider; role validation happens in RoleGuard.
      if (session?.user?.email) {
        setTimeout(() => {
          fetchPartnerDataByEmail(session.user.email!);
        }, 0);
      } else {
        setPartnerData(null);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user?.email) {
        fetchPartnerDataByEmail(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <PartnerAuthContext.Provider value={{
      user,
      session,
      loading,
      partnerData,
      signUp,
      signIn,
      signOut,
      updatePartnerData,
      fetchPartnerData
    }}>
      {children}
    </PartnerAuthContext.Provider>
  );
};
