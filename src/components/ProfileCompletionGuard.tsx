import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useAuth } from "@/hooks/useAuth";

interface ProfileCompletionGuardProps {
  children: ReactNode;
}

const ProfileCompletionGuard = ({ children }: ProfileCompletionGuardProps) => {
  const { user } = useAuth();
  const { needsCompletion, checking } = useProfileCompletion();
  const location = useLocation();

  // Don't guard these routes
  const exemptRoutes = ["/completar-cadastro", "/auth", "/login", "/admin", "/parceiro", "/afiliado"];
  const isExempt = exemptRoutes.some((route) => location.pathname.startsWith(route));

  if (isExempt || !user || checking) {
    return <>{children}</>;
  }

  if (needsCompletion) {
    return <Navigate to="/completar-cadastro" replace />;
  }

  return <>{children}</>;
};

export default ProfileCompletionGuard;
