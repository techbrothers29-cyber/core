import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, Settings, Target, BarChart3, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CookiesConfig = () => {
  const navigate = useNavigate();
  const [cookieSettings, setCookieSettings] = useState({
    necessary: true, // Always true, can't be disabled
    functional: true,
    analytics: true,
    advertising: false,
  });

  const handleSavePreferences = () => {
    localStorage.setItem("cookie-preferences", JSON.stringify(cookieSettings));
    localStorage.setItem("privacy-policy-accepted", "true");

    // Close window if opened in popup, otherwise navigate back
    if (window.opener) {
      window.close();
    } else {
      navigate("/");
    }
  };

  const handleAcceptAll = () => {
    const allEnabled = {
      necessary: true,
      functional: true,
      analytics: true,
      advertising: true,
    };
    setCookieSettings(allEnabled);
    localStorage.setItem("cookie-preferences", JSON.stringify(allEnabled));
    localStorage.setItem("privacy-policy-accepted", "true");

    if (window.opener) {
      window.close();
    } else {
      navigate("/");
    }
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytics: false,
      advertising: false,
    };
    setCookieSettings(onlyNecessary);
    localStorage.setItem("cookie-preferences", JSON.stringify(onlyNecessary));
    localStorage.setItem("privacy-policy-accepted", "true");

    if (window.opener) {
      window.close();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                Configurações de Cookies
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Personalize sua experiência
              </CardTitle>
              <CardDescription>
                Utilizamos cookies para melhorar sua experiência de navegação, personalizar conteúdo
                e anúncios, além de analisar nosso tráfego. Você pode escolher quais tipos de cookies
                deseja aceitar.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Cookie Categories */}
          <div className="space-y-4">
            {/* Necessary Cookies */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-base">Cookies Necessários</CardTitle>
                  </div>
                  <Switch
                    checked={cookieSettings.necessary}
                    disabled
                    aria-label="Cookies necessários (sempre ativo)"
                  />
                </div>
                <CardDescription>
                  Estes cookies são essenciais para o funcionamento do site e não podem ser desativados.
                  Eles são geralmente definidos em resposta a ações suas, como fazer login ou preencher formulários.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Functional Cookies */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-base">Cookies Funcionais</CardTitle>
                  </div>
                  <Switch
                    checked={cookieSettings.functional}
                    onCheckedChange={(checked) =>
                      setCookieSettings(prev => ({ ...prev, functional: checked }))
                    }
                    aria-label="Cookies funcionais"
                  />
                </div>
                <CardDescription>
                  Estes cookies permitem que o site forneça funcionalidades e personalização aprimoradas.
                  Eles podem ser definidos por nós ou por provedores externos cujos serviços adicionamos às nossas páginas.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Analytics Cookies */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <CardTitle className="text-base">Cookies de Análise</CardTitle>
                  </div>
                  <Switch
                    checked={cookieSettings.analytics}
                    onCheckedChange={(checked) =>
                      setCookieSettings(prev => ({ ...prev, analytics: checked }))
                    }
                    aria-label="Cookies de análise"
                  />
                </div>
                <CardDescription>
                  Estes cookies nos ajudam a entender como os visitantes interagem com o site,
                  coletando e relatando informações anonimamente para melhorarmos nossos serviços.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Advertising Cookies */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    <CardTitle className="text-base">Cookies de Publicidade</CardTitle>
                  </div>
                  <Switch
                    checked={cookieSettings.advertising}
                    onCheckedChange={(checked) =>
                      setCookieSettings(prev => ({ ...prev, advertising: checked }))
                    }
                    aria-label="Cookies de publicidade"
                  />
                </div>
                <CardDescription>
                  Estes cookies podem ser definidos através do nosso site por nossos parceiros de publicidade
                  para criar um perfil dos seus interesses e mostrar anúncios relevantes em outros sites.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleRejectAll}
              variant="outline"
              className="px-8 py-2"
            >
              Rejeitar Todos
            </Button>
            <Button
              onClick={handleSavePreferences}
              variant="secondary"
              className="px-8 py-2"
            >
              Salvar Preferências
            </Button>
            <Button
              onClick={handleAcceptAll}
              className="px-8 py-2 bg-primary hover:bg-primary/90"
            >
              Aceitar Todos
            </Button>
          </div>

          {/* Legal Links */}
          <div className="text-center pt-6">
            <p className="text-sm text-muted-foreground">
              Para mais informações, consulte nossa{" "}
              <a href="#" className="text-primary hover:text-primary/80 underline">
                Política de Privacidade
              </a>{" "}
              e nossos{" "}
              <a href="#" className="text-primary hover:text-primary/80 underline">
                Termos de Uso
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CookiesConfig;