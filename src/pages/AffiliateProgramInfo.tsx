import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, DollarSign, Users, TrendingUp, Gift, Share2, Wallet, Building2, Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import CategoryNav from "@/components/CategoryNav";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { absoluteUrl, jsonLdBreadcrumb, jsonLdWebPage } from "@/lib/seo";
import { useEffect } from "react";


const AffiliateProgramInfo = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  const benefits = [
    {
      icon: DollarSign,
      title: "5% de comissão por venda",
      description: "Ganhe 5% sobre cada venda concluída via seu link exclusivo — ofertas locais, ingressos de parques e hospedagem."
    },
    {
      icon: Users,
      title: "Sub-afiliados com 1% de bônus",
      description: "Indique novos afiliados e receba +1% sobre as vendas realizadas por eles. Renda recorrente sem esforço adicional."
    },
    {
      icon: TrendingUp,
      title: "Painel em tempo real",
      description: "Acompanhe cliques, conversões, comissões pendentes e pagas, além do desempenho da sua rede de sub-afiliados."
    },
    {
      icon: Wallet,
      title: "Saques via Pix toda quarta",
      description: "Solicite o saque das comissões liberadas — pagamento processado via Pix todas as quartas-feiras (horário de Brasília)."
    }
  ];

  const products = [
    {
      icon: Gift,
      title: "Ofertas Locais",
      description: "Restaurantes, entretenimento, serviços e experiências em Porto Alegre, Serra Gaúcha e Litoral."
    },
    {
      icon: Building2,
      title: "Ingressos de Parques",
      description: "Snowland, Acquamotion, Alpen Park, Garden Park, Aldeia do Papai Noel e outros parques da região."
    },
    {
      icon: Hotel,
      title: "Hospedagem",
      description: "Milhares de hotéis e pousadas no Brasil e no mundo, com reservas em tempo real."
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Cadastre-se grátis",
      description: "Preencha nome, e-mail, telefone e CPF em minutos. Sem custo e sem burocracia."
    },
    {
      step: "2",
      title: "Aprovação da equipe",
      description: "Analisamos seu cadastro em até 24–48h úteis. Você recebe a confirmação por e-mail."
    },
    {
      step: "3",
      title: "Compartilhe seu link",
      description: "Receba um link exclusivo com seu código. Divulgue nas redes, WhatsApp, grupos ou site próprio."
    },
    {
      step: "4",
      title: "Receba via Pix",
      description: "A cada venda confirmada, a comissão entra no painel. Solicite o saque nas quartas-feiras."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Programa de Afiliados | Bah Ofertas"
        description="Ganhe 5% de comissão indicando ofertas, ingressos e hotéis em Gramado, Canela e Serra Gaúcha. Mais 1% sobre vendas de sub-afiliados e saque via Pix."
        canonical="/programa-afiliados"
        keywords="programa de afiliados, ganhar dinheiro indicando, afiliados turismo serra gaúcha, comissão ingressos gramado"
        type="website"
        jsonLd={[
          jsonLdWebPage({
            url: absoluteUrl("/programa-afiliados"),
            name: "Programa de Afiliados Bah Ofertas",
            description:
              "Programa de afiliados do Bah Ofertas: 5% de comissão por venda e 1% sobre sub-afiliados, com saque via Pix.",
          }),
          jsonLdBreadcrumb([
            { name: "Início", url: absoluteUrl("/") },
            { name: "Programa de Afiliados", url: absoluteUrl("/programa-afiliados") },
          ]),
        ]}
      />
      <Header />



      <main className="container mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Programa de Afiliados Bah Ofertas
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Ganhe 5% em cada venda de ofertas, ingressos e hospedagem — e mais 1% sobre as vendas dos sub-afiliados que você indicar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg">
              <Link to="/afiliado/auth">
                Quero ser Afiliado <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg">
              <Link to="/afiliado/auth">
                Já sou Afiliado
              </Link>
            </Button>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Por que ser afiliado Bah Ofertas?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Products */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">
            O que você pode divulgar
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Um catálogo completo, com produtos de alta conversão para todos os públicos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((p, i) => (
              <Card key={i} className="border-primary/20">
                <CardHeader>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <p.icon className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl">{p.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{p.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16 bg-card/50 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center mb-12">Como funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-primary/50 to-accent/50" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Commission Model */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Como você é remunerado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Share2 className="w-6 h-6 text-primary" />
                  <CardTitle>Venda direta</CardTitle>
                </div>
                <CardDescription className="pt-2">
                  <span className="text-3xl font-bold text-primary">5%</span> de comissão sobre o valor de cada venda concluída pelo seu link exclusivo.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-accent/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-accent" />
                  <CardTitle>Sub-afiliados</CardTitle>
                </div>
                <CardDescription className="pt-2">
                  <span className="text-3xl font-bold text-accent">+1%</span> sobre as vendas dos afiliados indicados por você. Renda recorrente sem limite.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6 max-w-2xl mx-auto">
            Comissões liberadas após confirmação do pagamento e período de segurança. Saques via Pix processados às quartas-feiras (horário de Brasília).
          </p>
        </section>

        {/* Requirements */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Requisitos para participar</h2>
          <Card className="max-w-2xl mx-auto border-primary/20">
            <CardContent className="pt-6">
              <ul className="space-y-4">
                {[
                  "Ter 18 anos ou mais e CPF válido",
                  "Possuir chave Pix ativa em seu CPF para recebimento das comissões",
                  "Ter perfil em redes sociais, grupo de WhatsApp, blog ou canal próprio para divulgação",
                  "Concordar com os termos de uso e política de conduta do programa",
                  "Divulgar as ofertas de forma ética, sem spam e sem promessas enganosas"
                ].map((requirement, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{requirement}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Cadastre-se agora, receba seu link exclusivo e comece a lucrar divulgando ofertas, parques e hospedagem da Bah Ofertas.
          </p>
          <Button asChild size="lg" className="text-lg">
            <Link to="/afiliado/auth">
              Cadastrar como Afiliado <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </section>
      </main>

      <Footer />
      <CategoryNav />
    </div>
  );
};

export default AffiliateProgramInfo;
