import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { absoluteUrl, jsonLdWebPage } from "@/lib/seo";
import { useEffect } from "react";

const TermsOfUse = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Termos de Uso | Bah Ofertas"
        description="Condições de uso da plataforma Bah Ofertas: compras de ingressos, reservas de hotéis, cupons e ofertas em Gramado, Canela e Serra Gaúcha."
        canonical="/termos"
        type="website"
        jsonLd={[
          jsonLdWebPage({
            url: absoluteUrl("/termos"),
            name: "Termos de Uso — Bah Ofertas",
            description:
              "Condições gerais de uso da plataforma Bah Ofertas para compra de ingressos, hospedagem e ofertas.",
          }),
        ]}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          asChild
          className="mb-6"
        >
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>

          <p className="text-muted-foreground mb-6">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e usar a plataforma BahOfertas, você concorda em cumprir e ficar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A BahOfertas é uma plataforma digital que conecta usuários a ofertas e descontos exclusivos de estabelecimentos parceiros em Porto Alegre, Gramado, Canela e região da Serra Gaúcha.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Nossos serviços incluem:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Divulgação de ofertas e promoções de parceiros</li>
              <li>Sistema de compra de cupons e vouchers</li>
              <li>Programa de afiliados para divulgadores</li>
              <li>Painel administrativo para estabelecimentos parceiros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Cadastro e Conta de Usuário</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Para utilizar determinados recursos da plataforma, você deve criar uma conta fornecendo informações precisas e completas.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Você é responsável por:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>Manter a confidencialidade de suas credenciais de acesso</li>
              <li>Todas as atividades realizadas em sua conta</li>
              <li>Notificar imediatamente sobre qualquer uso não autorizado</li>
              <li>Fornecer informações verdadeiras e atualizadas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Compra de Ofertas</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ao adquirir ofertas através da plataforma:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Você concorda com os termos específicos de cada oferta</li>
              <li>As ofertas têm prazo de validade e condições de uso específicas</li>
              <li>Os valores pagos são processados através de sistemas de pagamento seguros</li>
              <li>Cupons adquiridos são pessoais e intransferíveis, salvo quando especificado</li>
              <li>Não é possível cancelamento após a confirmação da compra, exceto em casos previstos em lei</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Programa de Afiliados</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Afiliados devem:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Divulgar ofertas de forma ética e transparente</li>
              <li>Não utilizar práticas enganosas ou spam</li>
              <li>Cumprir todas as leis aplicáveis de publicidade</li>
              <li>Receber comissões conforme acordo estabelecido</li>
              <li>Solicitar pagamentos de acordo com as regras do programa</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Estabelecimentos Parceiros</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Parceiros que oferecem produtos/serviços devem:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fornecer informações precisas sobre suas ofertas</li>
              <li>Honrar todos os cupons válidos apresentados por clientes</li>
              <li>Manter a qualidade dos produtos/serviços anunciados</li>
              <li>Cumprir prazos e condições estabelecidas nas ofertas</li>
              <li>Pagar as taxas de serviço conforme acordado</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo da plataforma, incluindo textos, gráficos, logos, imagens e software, é propriedade da BahOfertas ou de seus fornecedores de conteúdo e está protegido por leis de direitos autorais e propriedade intelectual.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Uso Proibido</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              É proibido:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Usar a plataforma para fins ilegais ou fraudulentos</li>
              <li>Tentar acessar áreas restritas sem autorização</li>
              <li>Interferir no funcionamento da plataforma</li>
              <li>Copiar, modificar ou distribuir conteúdo sem permissão</li>
              <li>Usar bots ou automações não autorizadas</li>
              <li>Criar múltiplas contas para burlar limitações</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A BahOfertas atua como intermediária entre usuários e estabelecimentos parceiros. Não nos responsabilizamos por:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Qualidade dos produtos/serviços oferecidos pelos parceiros</li>
              <li>Disponibilidade contínua da plataforma</li>
              <li>Erros ou omissões no conteúdo</li>
              <li>Perdas indiretas ou consequenciais</li>
              <li>Ações de terceiros, incluindo parceiros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Política de Reembolso</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reembolsos seguem a legislação brasileira de defesa do consumidor (CDC). Em caso de problemas com ofertas adquiridas, entre em contato conosco através dos canais de suporte dentro do prazo de 7 dias.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Modificações dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão notificadas aos usuários. O uso continuado da plataforma após modificações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Rescisão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos suspender ou encerrar sua conta a qualquer momento por violação destes termos. Você pode encerrar sua conta a qualquer momento através das configurações da plataforma ou entrando em contato conosco.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Lei Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida nos tribunais da comarca de Porto Alegre, Rio Grande do Sul.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes termos, entre em contato:
            </p>
            <div className="mt-4 space-y-2 text-muted-foreground">
              <p>Email: <a href="mailto:contato@bahofertas.com" className="text-primary hover:underline">contato@bahofertas.com</a></p>
              <p>Telefone: (54) 99997-8084</p>
              <p>Endereço: Porto Alegre, RS - Serra Gaúcha, Brasil</p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TermsOfUse;
