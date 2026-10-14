import { useState, useEffect } from "react";
import { Button } from "./ui/button";

const PrivacyBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted privacy policy
    const hasAccepted = localStorage.getItem("privacy-policy-accepted");
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("privacy-policy-accepted", "true");
    setIsVisible(false);
  };

  const handlePrivacyPolicy = () => {
    // Just hide the banner when privacy policy is clicked
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-500">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4">
        <p className="text-sm sm:text-base text-foreground text-center sm:text-left max-w-2xl">
          Utilizamos cookies para melhorar o desempenho e segurança do site, além de personalizar conteúdo e anúncios. Se desejar, você pode{" "}
          <button
            onClick={() => window.open('/cookies-config', '_blank')}
            className="text-primary hover:text-primary/80 underline font-medium"
          >
            configurar suas preferências
          </button>{" "}
          ou conferir nossa Política de Privacidade.
        </p>
        <div className="flex gap-3 flex-shrink-0">
          <Button
            onClick={handleAccept}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Aceitar todos os cookies
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyBanner;