import { supabase } from '@/integrations/supabase/client';

export type EffectiveUserRole = 'user' | 'admin' | 'affiliate' | 'partner' | 'client';

interface EffectiveUserAccess {
  role: EffectiveUserRole;
  isActive: boolean;
}

const normalizeRole = (role?: string | null): EffectiveUserRole => {
  switch (role) {
    case 'admin':
    case 'affiliate':
    case 'partner':
    case 'client':
      return role;
    default:
      return 'user';
  }
};

export const getEffectiveUserAccess = async (
  userId: string,
  email?: string | null,
): Promise<EffectiveUserAccess> => {
  const [{ data: adminRole }, { data: userData, error: userError }] = await Promise.all([
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle(),
    supabase
      .from('users')
      .select('role_type, is_active')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  if (adminRole?.role === 'admin') {
    return {
      role: 'admin',
      isActive: userData?.is_active ?? true,
    };
  }

  if (userData && !userError) {
    return {
      role: normalizeRole(userData.role_type),
      isActive: userData.is_active ?? true,
    };
  }

  if (email) {
    const [companyResult, affiliateResult] = await Promise.all([
      supabase
        .from('companies')
        .select('is_active')
        .eq('email', email)
        .maybeSingle(),
      supabase
        .from('affiliates')
        .select('is_active')
        .eq('email', email)
        .maybeSingle(),
    ]);

    if (companyResult.data && !companyResult.error) {
      return {
        role: 'partner',
        isActive: companyResult.data.is_active ?? true,
      };
    }

    if (affiliateResult.data && !affiliateResult.error) {
      return {
        role: 'affiliate',
        isActive: affiliateResult.data.is_active ?? true,
      };
    }
  }

  return {
    role: 'user',
    isActive: true,
  };
};
