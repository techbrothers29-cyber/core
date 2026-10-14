import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { absoluteUrl, jsonLdWebPage } from "@/lib/seo";
import { useEffect } from "react";

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Política de Privacidade | Bah Ofertas"
        description="Saiba como o Bah Ofertas coleta, usa e protege seus dados pessoais nas compras de ingressos, hospedagem e ofertas na Serra Gaúcha."
        canonical="/privacidade"
        type="website"
        jsonLd={[
          jsonLdWebPage({
            url: absoluteUrl("/privacidade"),
            name: "Política de Privacidade — Bah Ofertas",
            description:
              "Como o Bah Ofertas coleta, utiliza e protege os dados pessoais dos usuários da plataforma.",
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
          <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>

          <p className="text-muted-foreground mb-6">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A BahOfertas ("nós", "nosso" ou "plataforma") está comprometida em proteger a privacidade e os dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais de acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.1 Informações Fornecidas por Você</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Número de telefone</li>
              <li>CPF/CNPJ (quando aplicável)</li>
              <li>Endereço de entrega/cobrança</li>
              <li>Informações de pagamento (processadas por terceiros seguros)</li>
              <li>Dados da empresa (para parceiros e afiliados)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Informações Coletadas Automaticamente</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Endereço IP</li>
              <li>Tipo de navegador e dispositivo</li>
              <li>Sistema operacional</li>
              <li>Páginas visitadas e tempo de navegação</li>
              <li>Cookies e tecnologias similares</li>
              <li>Localização geográfica aproximada</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Como Usamos suas Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Utilizamos seus dados pessoais para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Processar suas compras e transações</li>
              <li>Criar e gerenciar sua conta de usuário</li>
              <li>Enviar cupons e vouchers adquiridos</li>
              <li>Processar pagamentos de comissões para afiliados</li>
              <li>Comunicar sobre ofertas, promoções e atualizações (com seu consentimento)</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Prevenir fraudes e garantir a segurança da plataforma</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Fornecer suporte ao cliente</li>
              <li>Realizar análises estatísticas e de mercado</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Base Legal para Processamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Processamos seus dados pessoais com base em:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Execução de contrato:</strong> Para processar suas compras e fornecer serviços</li>
              <li><strong>Consentimento:</strong> Para envio de comunicações de marketing</li>
              <li><strong>Interesse legítimo:</strong> Para melhorar serviços, prevenir fraudes e segurança</li>
              <li><strong>Obrigação legal:</strong> Para cumprir requisitos fiscais e regulatórios</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Compartilhamento de Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Podemos compartilhar suas informações com:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Estabelecimentos parceiros:</strong> Apenas informações necessárias para validar cupons</li>
              <li><strong>Processadores de pagamento:</strong> Para processar transações financeiras</li>
              <li><strong>Provedores de serviços:</strong> Hospedagem, analytics, e-mail marketing</li>
              <li><strong>Autoridades legais:</strong> Quando exigido por lei ou ordem judicial</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong>Não vendemos seus dados pessoais a terceiros.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Cookies e Tecnologias Similares</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Utilizamos cookies para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Manter você conectado à sua conta</li>
              <li>Lembrar suas preferências</li>
              <li>Analisar o uso da plataforma</li>
              <li>Personalizar conteúdo e ofertas</li>
              <li>Realizar campanhas de marketing</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Você pode gerenciar suas preferências de cookies através das configurações do navegador ou através do nosso banner de cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              De acordo com a LGPD, você tem direito a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Confirmação e acesso:</strong> Saber se processamos seus dados e acessá-los</li>
              <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li><strong>Anonimização, bloqueio ou eliminação:</strong> De dados desnecessários ou excessivos</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Eliminação:</strong> Exclusão de dados tratados com consentimento</li>
              <li><strong>Revogação de consentimento:</strong> Retirar consentimento a qualquer momento</li>
              <li><strong>Informação sobre compartilhamento:</strong> Saber com quem compartilhamos seus dados</li>
              <li><strong>Oposição:</strong> Se opor ao tratamento em determinadas situações</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Para exercer seus direitos, entre em contato através do e-mail: <a href="mailto:privacidade@bahofertas.com" className="text-primary hover:underline">privacidade@bahofertas.com</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas técnicas e organizacionais apropriadas para proteger seus dados pessoais contra acesso não autorizado, perda, destruição ou alteração, incluindo:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Criptografia de dados em trânsito (SSL/TLS)</li>
              <li>Criptografia de dados sensíveis em repouso</li>
              <li>Controles de acesso rigorosos</li>
              <li>Monitoramento de segurança contínuo</li>
              <li>Treinamento regular de equipe em proteção de dados</li>
              <li>Auditorias de segurança periódicas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta política, incluindo requisitos legais, contábeis ou de relatórios. Após esse período, os dados serão anonimizados ou excluídos de forma segura.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong>Dados de transações:</strong> 5 anos (requisito fiscal)</li>
              <li><strong>Dados de conta ativa:</strong> Enquanto a conta estiver ativa</li>
              <li><strong>Dados de marketing:</strong> Até revogação do consentimento</li>
              <li><strong>Logs de segurança:</strong> 6 meses a 1 ano</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Transferência Internacional de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Alguns de nossos provedores de serviços podem estar localizados fora do Brasil. Nesses casos, garantimos que existam salvaguardas adequadas para proteger seus dados pessoais de acordo com a LGPD, incluindo cláusulas contratuais padrão e certificações de privacidade.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Menores de Idade</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nossos serviços não são direcionados a menores de 18 anos. Não coletamos intencionalmente dados pessoais de menores sem o consentimento dos pais ou responsáveis legais. Se tomarmos conhecimento de que coletamos dados de um menor sem consentimento adequado, tomaremos medidas para excluir essas informações.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas através de aviso em nossa plataforma ou por e-mail. Recomendamos revisar esta política regularmente para estar informado sobre como protegemos seus dados.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Encarregado de Dados (DPO)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nosso Encarregado de Proteção de Dados está disponível para esclarecer dúvidas sobre o tratamento de dados pessoais:
            </p>
            <div className="mt-4 space-y-2 text-muted-foreground">
              <p>Email: <a href="mailto:dpo@bahofertas.com" className="text-primary hover:underline">dpo@bahofertas.com</a></p>
              <p>Email alternativo: <a href="mailto:privacidade@bahofertas.com" className="text-primary hover:underline">privacidade@bahofertas.com</a></p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Autoridade Nacional</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você também pode entrar em contato com a Autoridade Nacional de Proteção de Dados (ANPD) para esclarecimentos ou reclamações sobre o tratamento de seus dados pessoais.
            </p>
            <div className="mt-4 space-y-2 text-muted-foreground">
              <p>Site: <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.gov.br/anpd</a></p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Contato</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Para questões sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p>Email geral: <a href="mailto:contato@bahofertas.com" className="text-primary hover:underline">contato@bahofertas.com</a></p>
              <p>Email privacidade: <a href="mailto:privacidade@bahofertas.com" className="text-primary hover:underline">privacidade@bahofertas.com</a></p>
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

export default PrivacyPolicy;
