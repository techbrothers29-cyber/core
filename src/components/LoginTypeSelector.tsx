import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Shield,
  Store,
  Users,
  ShoppingCart,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LoginOption {
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  badge?: string;
  color: string;
}

const LoginTypeSelector = () => {
  const navigate = useNavigate();

  const loginOptions: LoginOption[] = [
    {
      title: "Usuário / Cliente",
      description: "Acesse ofertas e gerencie seus vouchers",
      icon: <User className="w-8 h-8" />,
      route: "/auth",
      badge: "Público",
      color: "bg-blue-500"
    },
    {
      title: "Afiliado",
      description: "Ganhe comissões promovendo ofertas",
      icon: <Users className="w-8 h-8" />,
      route: "/afiliado/auth",
      badge: "Programa",
      color: "bg-green-500"
    },
    {
      title: "Parceiro",
      description: "Gerencie seu estabelecimento e ofertas",
      icon: <Store className="w-8 h-8" />,
      route: "/parceiro/login",
      badge: "Empresa",
      color: "bg-purple-500"
    },
    {
      title: "Administrador",
      description: "Controle total da plataforma",
      icon: <Shield className="w-8 h-8" />,
      route: "/admin/login",
      badge: "Sistema",
      color: "bg-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="relative">
              <img
                src="/lovable-uploads/4df8089b-e46d-449e-b42e-4ec8daedc049.png"
                alt="Bah Ofertas"
                className="h-16 w-auto drop-shadow-2xl"
              />
              <div className="absolute inset-0 bg-destructive/20 blur-xl scale-110 -z-10" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Escolha seu tipo de acesso</h1>
          <p className="text-muted-foreground text-lg">Selecione a categoria que corresponde ao seu perfil</p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loginOptions.map((option, index) => (
            <Card
              key={index}
              className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
              onClick={() => navigate(option.route)}
            >
              <div className={`absolute inset-0 ${option.color} opacity-5 group-hover:opacity-10 transition-opacity`} />

              <CardHeader className="text-center relative">
                {option.badge && (
                  <Badge
                    className={`absolute top-2 right-2 ${option.color} text-white text-xs`}
                  >
                    {option.badge}
                  </Badge>
                )}

                <div className={`w-16 h-16 rounded-full ${option.color} flex items-center justify-center mx-auto mb-4 text-white group-hover:scale-110 transition-transform`}>
                  {option.icon}
                </div>

                <CardTitle className="text-lg font-bold text-center mb-2">
                  {option.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="text-center pb-6">
                <p className="text-muted-foreground text-sm mb-4 min-h-[2.5rem] flex items-center justify-center">
                  {option.description}
                </p>

                <Button
                  className={`w-full ${option.color} hover:${option.color}/90 text-white group-hover:gap-3 transition-all`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(option.route);
                  }}
                >
                  Acessar
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Cada tipo de usuário tem acesso exclusivo à sua área específica
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            ✓ Segurança garantida • ✓ Acesso controlado por perfil • ✓ Suporte personalizado
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginTypeSelector;