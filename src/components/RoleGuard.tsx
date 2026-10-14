import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useRoleProtection';
import { getEffectiveUserAccess } from '@/lib/user-role';
import { isLovableVisualEditIframe } from '@/lib/visual-edit-mode';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackRoute?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallbackRoute = '/auth'
}) => {
  // Bypass somente para o iframe de Edições Visuais do Lovable.
  const visualEditBypass = isLovableVisualEditIframe();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(visualEditBypass ? true : null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (visualEditBypass) return;
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let latestCheckId = 0;

    const checkRole = async (session: any, options?: { silentRedirect?: boolean }) => {
      const currentCheckId = ++latestCheckId;
      const isStale = () => !isMounted || currentCheckId !== latestCheckId;

      if (!session) {
        if (!options?.silentRedirect && !isStale()) {
          setIsAuthorized(false);
          navigate(fallbackRoute);
        }
        return;
      }

      try {
        const { role: userRole, isActive } = await getEffectiveUserAccess(session.user.id, session.user.email);

        if (isStale()) return;

        if (!isActive) {
          setIsAuthorized(false);
          await supabase.auth.signOut();
          if (!isStale()) navigate('/auth');
          return;
        }

        if (allowedRoles.includes(userRole as UserRole)) {
          setIsAuthorized(true);
          return;
        }

        setIsAuthorized(false);
        toast({
          title: "Acesso Negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });

        switch (userRole) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'affiliate':
            navigate('/afiliado/painel');
            break;
          case 'partner':
            navigate('/parceiro/painel');
            break;
          case 'user':
          case 'client':
          default:
            navigate('/dashboard');
        }
      } catch (error) {
        console.error('Erro na verificação de permissão:', error);
        if (!isStale()) {
          setIsAuthorized(false);
          navigate('/auth');
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      checkRole(session, { silentRedirect: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        checkRole(session);
      }, 100);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [allowedRoles, navigate, toast, fallbackRoute, visualEditBypass]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-lg text-foreground">Verificando permissões...</div>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null;
  }

  return <>{children}</>;
};