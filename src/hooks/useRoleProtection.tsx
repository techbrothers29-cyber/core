import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SecurityAudit, validateUUID } from '@/lib/security';

export type UserRole = 'user' | 'admin' | 'affiliate' | 'partner' | 'client';

interface RoleProtectionOptions {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export const useRoleProtection = ({ allowedRoles, redirectTo = '/' }: RoleProtectionOptions) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          toast({
            title: "Erro de Sessão",
            description: "Erro ao verificar sessão. Faça login novamente.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }

        if (!session) {
          toast({
            title: "Acesso Negado",
            description: "Você não tem permissão",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }

        // Enhanced security: Validate user ID format
        if (!validateUUID(session.user.id)) {
          console.error('Invalid user ID format');
          toast({
            title: "Erro de Segurança",
            description: "ID de usuário inválido. Faça login novamente.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }

        // Always verify role from database (never trust client-editable JWT metadata)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role_type')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userError) {
          console.error('Error fetching user role:', userError);
          toast({
            title: "Erro de Autorização",
            description: "Erro ao verificar permissões do usuário.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }

        const userRole = userData?.role_type || 'user';

        const isRoleAuthorized = allowedRoles.includes(userRole as UserRole);

        // Enhanced security logging for unauthorized access attempts
        if (!isRoleAuthorized) {
          await SecurityAudit.logSensitiveDataAccess(
            'role_protection',
            session.user.id,
            'unauthorized_role_access_attempt',
            `User with role ${userRole} attempted to access ${allowedRoles.join(', ')} protected resource`,
            {
              userRole,
              allowedRoles,
              currentPath: window.location.pathname,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            }
          );

          toast({
            title: "Acesso Negado",
            description: "Você não tem permissão para acessar esta área.",
            variant: "destructive",
          });
          navigate(redirectTo);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking authorization:', error);
        toast({
          title: "Erro de autorização",
          description: "Ocorreu um erro ao verificar suas permissões.",
          variant: "destructive",
        });
        navigate(redirectTo);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [allowedRoles, navigate, redirectTo, toast]);

  return { isAuthorized, isLoading };
};

export const RoleProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}> = ({ children, allowedRoles, redirectTo }) => {
  const { isAuthorized, isLoading } = useRoleProtection({ allowedRoles, redirectTo });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-lg text-foreground">Verificando permissões...</div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};
