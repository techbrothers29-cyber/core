import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getEffectiveUserAccess } from '@/lib/user-role';
import { isLovableVisualEditIframe } from '@/lib/visual-edit-mode';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  // Bypass somente para o iframe de Edições Visuais do Lovable.
  // RLS continua protegendo os dados — isto libera apenas o render do layout.
  const visualEditBypass = isLovableVisualEditIframe();
  const [isValidAdmin, setIsValidAdmin] = useState<boolean | null>(visualEditBypass ? true : null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (visualEditBypass) return;
    let isInitialLoad = true;

    const verifyAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setIsValidAdmin(false);
          if (isInitialLoad) {
            navigate('/admin/auth');
          }
          return;
        }

        let verifiedUser = session.user;
        const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
        if (userError || !userData?.user) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session?.access_token) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
            setIsValidAdmin(false);
            if (isInitialLoad) navigate('/admin/auth');
            return;
          }

          const { data: refreshedUser, error: refreshedUserError } = await supabase.auth.getUser(
            refreshData.session.access_token,
          );
          if (refreshedUserError || !refreshedUser.user) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
            setIsValidAdmin(false);
            if (isInitialLoad) navigate('/admin/auth');
            return;
          }

          verifiedUser = refreshedUser.user;
        } else {
          verifiedUser = userData.user;
        }

        const { role } = await getEffectiveUserAccess(verifiedUser.id, verifiedUser.email);

        if (role !== 'admin') {
          setIsValidAdmin(false);
          if (isInitialLoad) {
            toast({
              title: "Acesso Negado",
              description: "Você não tem permissão para acessar o painel administrativo.",
              variant: "destructive",
            });
            await supabase.auth.signOut();
            navigate('/admin/auth');
          }
          return;
        }

        setIsValidAdmin(true);

      } catch (error) {
        console.error('Erro na verificação de admin:', error);
        setIsValidAdmin(false);
        if (isInitialLoad) {
          toast({
            title: "Erro de Segurança",
            description: "Erro crítico na verificação de permissões.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          navigate('/admin/auth');
        }
      } finally {
        isInitialLoad = false;
      }
    };

    verifyAdmin();

    // Re-verificar quando há mudanças de autenticação - debounced
    let timeoutId: ReturnType<typeof setTimeout>;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsValidAdmin(false);
        navigate('/admin/auth');
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          verifyAdmin();
        }, 300); // 300ms debounce
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, toast, visualEditBypass]);

  if (isValidAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <div className="text-lg text-foreground">Verificando credenciais administrativas...</div>
        </div>
      </div>
    );
  }

  if (isValidAdmin === false) {
    return null; // Componente será desmontado e usuário redirecionado
  }

  return <>{children}</>;
};