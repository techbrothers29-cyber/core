import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useProfileCompletion = () => {
  const { user, loading: authLoading } = useAuth();
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      setChecking(false);
      setNeedsCompletion(false);
      return;
    }

    // Check if profile_completed flag is set in metadata
    if (user.user_metadata?.profile_completed === true) {
      setNeedsCompletion(false);
      setChecking(false);
      return;
    }

    // Only check for OAuth users (no password-based signup would lack CPF)
    const isOAuthUser = user.app_metadata?.provider !== "email" &&
                        user.app_metadata?.providers?.some((p: string) => p !== "email");

    if (!isOAuthUser) {
      setNeedsCompletion(false);
      setChecking(false);
      return;
    }

    // Check if user has a complete profile in the users table
    const checkProfile = async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("cpf, phone, full_name")
          .eq("id", user.id)
          .single();

        if (!data || !data.cpf || !data.phone || !data.full_name || data.full_name === "Usuário") {
          setNeedsCompletion(true);
        } else {
          // Profile is complete, set flag in metadata to avoid future checks
          await supabase.auth.updateUser({ data: { profile_completed: true } });
          setNeedsCompletion(false);
        }
      } catch {
        // User record might not exist yet
        setNeedsCompletion(true);
      } finally {
        setChecking(false);
      }
    };

    checkProfile();
  }, [user, authLoading]);

  return { needsCompletion, checking };
};
