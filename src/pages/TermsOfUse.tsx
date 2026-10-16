import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Mail, MessageCircle } from "lucide-react";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { absoluteUrl, jsonLdWebPage } from "@/lib/seo";
import { useEffect, type ReactNode } from "react";

const UPDATED_AT = "16 de outubro de 2026";

type Section = { id: string; title: string; body: ReactNode };

const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="m-0 mt-3 pl-5 list-disc space-y-1.5 marker:text-primary">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

const A = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="font-semibold text-foreground underline underline-offset-2 hover:text-primary">
    {children}
  </Link>
);

const SECTIONS: Section[] = [
  {
    id: "aceitacao",
    title: "Aceitação dos termos",
    body: (
      <p>
        Ao acessar ou usar a Bah Ofertas (site e aplicativo), você declara que leu e concorda com estes Termos de Uso e com a nossa{" "}
        <A to="/privacidade">Política de Privacidade</A>. Se não concordar, não utilize a plataforma. Para comprar ou reservar, você
        precisa ter 18 anos ou mais e capacidade civil para contratar.
      </p>
    ),
  },
  {
    id: "servico",
    title: "O que a Bah Ofertas faz",
    body: (
      <>
        <p>
          A Bah Ofertas é uma plataforma digital que reúne, em um só lugar, experiências em Porto Alegre, Gramado, Canela e na Serra
          Gaúcha. Atuamos como intermediária entre você e os fornecedores que prestam o serviço:
        </p>
        <List
          items={[
            <><strong>Ofertas e vouchers</strong> de restaurantes, cafés e estabelecimentos parceiros;</>,
            <><strong>Ingressos</strong> de parques e atrações, emitidos pelos sistemas de bilheteria de cada atração;</>,
            <><strong>Hospedagem</strong> em hotéis e pousadas, reservada por meio de um parceiro de distribuição hoteleira que confirma a reserva diretamente com o hotel;</>,
            <><strong>Programa de afiliados</strong> e <strong>painel para parceiros</strong>.</>,
          ]}
        />
        <p className="mt-3">
          O serviço em si (refeição, atração ou estadia) é prestado pelo fornecedor, conforme as condições exibidas antes da compra.
        </p>
      </>
    ),
  },
  {
    id: "conta",
    title: "Sua conta",
    body: (
      <List
        items={[
          "Informe dados verdadeiros e mantenha-os atualizados.",
          "Guarde sua senha em sigilo; as ações feitas na sua conta são de sua responsabilidade.",
          <>Avise-nos imediatamente sobre qualquer uso não autorizado pelo e-mail <a href="mailto:contato@bahofertas.com" className="font-semibold text-foreground underline underline-offset-2">contato@bahofertas.com</a>.</>,
          "Você pode encerrar sua conta a qualquer momento pelo perfil ou pelos nossos canais de atendimento.",
        ]}
      />
    ),
  },
  {
    id: "precos-pagamento",
    title: "Preços e pagamento",
    body: (
      <List
        items={[
          "Os preços são exibidos em reais (R$) e confirmados na tela de pagamento antes da finalização.",
          "Ofertas e ingressos podem ser pagos por PIX ou cartão de crédito, processados pelo Mercado Pago.",
          "Em hospedagens com pagamento antecipado, o cartão é processado com segurança pela operadora da reserva e seu banco pode solicitar uma confirmação adicional (3D Secure).",
          "Não armazenamos o número completo nem o código de segurança (CVV) do seu cartão.",
          "Em caso de erro evidente de preço ou de indisponibilidade, avisaremos você e poderemos cancelar a compra com reembolso integral.",
        ]}
      />
    ),
  },
  {
    id: "ofertas",
    title: "Ofertas e vouchers",
    body: (
      <List
        items={[
          "Cada oferta tem validade, dias e horários de uso e regras próprias, informados na página da oferta. Leia antes de comprar.",
          "Após o pagamento, o voucher com QR Code fica disponível em Minhas reservas e pode ser baixado em PDF.",
          "Apresente o voucher ao estabelecimento no momento do uso. Quando indicado, faça o agendamento prévio diretamente com ele.",
          "Vouchers são de uso único e não podem ser trocados por dinheiro. A transferência a outra pessoa só é permitida quando a oferta indicar.",
          "Vouchers não utilizados dentro do prazo de validade expiram, salvo disposição legal em contrário.",
        ]}
      />
    ),
  },
  {
    id: "ingressos",
    title: "Ingressos de atrações",
    body: (
      <List
        items={[
          "O ingresso vale para a data, o horário e a categoria escolhidos na compra.",
          "Cada ingresso tem seu próprio código (QR Code ou localizador), disponível em Minhas reservas.",
          "Regras de acesso — idade, meia-entrada, documentos exigidos, clima e funcionamento — são definidas pela atração e informadas na página do ingresso.",
          "Remarcações dependem das regras e da disponibilidade da atração.",
        ]}
      />
    ),
  },
  {
    id: "hospedagem",
    title: "Hospedagem",
    body: (
      <>
        <p>
          As reservas de hotéis são feitas por meio de um parceiro de distribuição hoteleira, que confirma a disponibilidade e a tarifa com o
          hotel. Antes de concluir, mostramos o resumo completo da tarifa: quarto, regime de refeição, datas, hóspedes, política de
          cancelamento, forma de pagamento e taxas cobradas no local.
        </p>
        <h3 className="m-0 mt-5 text-[15px] font-bold text-foreground">Preço e disponibilidade</h3>
        <List
          items={[
            "Preços e disponibilidade mudam em tempo real. O valor é reconfirmado com o hotel antes do pagamento e, se mudar, você é avisado antes de confirmar.",
            "A reserva só é considerada confirmada quando você recebe a confirmação na plataforma e por e-mail.",
          ]}
        />
        <h3 className="m-0 mt-5 text-[15px] font-bold text-foreground">Formas de pagamento</h3>
        <List
          items={[
            <><strong>Pagar agora:</strong> o valor total é cobrado no cartão ao confirmar a reserva.</>,
            <><strong>Pagar no hotel:</strong> nada é cobrado pela Bah Ofertas. O pagamento é feito diretamente ao hotel, nas condições dele. Quando o hotel exige, o cartão informado serve apenas como garantia da reserva e pode ser usado pelo hotel para cobrar multas de cancelamento ou não comparecimento.</>,
          ]}
        />
        <h3 className="m-0 mt-5 text-[15px] font-bold text-foreground">Taxas no local</h3>
        <p className="mt-2">
          Algumas tarifas não incluem taxas e impostos locais (por exemplo, taxa de turismo ou de serviço). Essas taxas são exibidas antes da
          confirmação como &quot;pagas no hotel&quot; e são cobradas pelo próprio hotel, podendo variar conforme a moeda e o câmbio.
        </p>
        <h3 className="m-0 mt-5 text-[15px] font-bold text-foreground">Cancelamento e não comparecimento</h3>
        <List
          items={[
            "Cada tarifa tem sua política de cancelamento, exibida antes da confirmação. Ela pode ser gratuita até uma data, ter multa ou ser não reembolsável.",
            "Os prazos de cancelamento são informados no horário UTC (horário de Brasília = UTC−3). Fique atento à conversão.",
            "Cancelamentos podem ser solicitados em Minhas reservas. Dentro do prazo gratuito, não há cobrança; fora dele, aplica-se a multa da tarifa.",
            "Se você não comparecer (no-show), o hotel pode cobrar o valor previsto na política da tarifa.",
            "Para alterar datas ou hóspedes, é preciso cancelar (conforme a política) e fazer uma nova reserva.",
          ]}
        />
        <h3 className="m-0 mt-5 text-[15px] font-bold text-foreground">Hóspedes e check-in</h3>
        <List
          items={[
            "Informe os nomes dos hóspedes exatamente como no documento de identidade, sem acentos.",
            "No check-in, o hotel pode exigir documento com foto, cartão de crédito para despesas extras e o pagamento das taxas locais.",
            "Os horários de check-in e check-out, regras para crianças, animais e camas extras são definidos pelo hotel.",
            "Refeições, comodidades e fotos são informadas pelo hotel. O regime de refeição é exibido exatamente como informado pelo fornecedor.",
          ]}
        />
      </>
    ),
  },
  {
    id: "cancelamento-reembolso",
    title: "Arrependimento, cancelamento e reembolso",
    body: (
      <List
        items={[
          "Respeitamos o Código de Defesa do Consumidor, inclusive o direito de arrependimento em até 7 dias da compra feita pela internet (art. 49).",
          "Além disso, valem as condições de cancelamento informadas antes da compra de cada oferta, ingresso ou tarifa de hospedagem, sempre nos limites da lei.",
          <>Para pedir cancelamento ou reembolso, use <A to="/reservas">Minhas reservas</A> ou fale conosco pelos canais abaixo.</>,
          "O reembolso é feito pelo mesmo meio de pagamento. No cartão, o prazo para o estorno aparecer na fatura depende da operadora.",
        ]}
      />
    ),
  },
  {
    id: "afiliados",
    title: "Programa de afiliados",
    body: (
      <>
        <p>
          Afiliados divulgam ofertas da Bah Ofertas e recebem comissão pelas vendas geradas, conforme as regras do{" "}
          <A to="/programa-afiliados">Programa de Afiliados</A>. É proibido usar spam, publicidade enganosa, anúncios com a marca Bah Ofertas
          sem autorização ou qualquer prática que viole a legislação. Comissões de vendas canceladas ou fraudulentas não são devidas.
        </p>
      </>
    ),
  },
  {
    id: "parceiros",
    title: "Estabelecimentos parceiros",
    body: (
      <List
        items={[
          "Fornecer informações corretas e atualizadas sobre ofertas, preços, horários e regras.",
          "Aceitar todos os vouchers e ingressos válidos apresentados pelos clientes.",
          "Prestar o serviço com a qualidade e nas condições anunciadas.",
          "Cumprir as condições comerciais acordadas com a Bah Ofertas.",
        ]}
      />
    ),
  },
  {
    id: "uso-proibido",
    title: "Uso proibido",
    body: (
      <List
        items={[
          "Usar a plataforma para fins ilegais ou fraudulentos, incluindo cartões de terceiros sem autorização.",
          "Revender vouchers ou ingressos sem autorização.",
          "Tentar acessar áreas restritas, interferir no funcionamento ou extrair dados de forma automatizada (robôs, scraping).",
          "Criar várias contas para burlar limites de ofertas ou promoções.",
          "Copiar ou reproduzir conteúdo da plataforma sem permissão.",
        ]}
      />
    ),
  },
  {
    id: "responsabilidade",
    title: "Responsabilidades",
    body: (
      <p>
        A Bah Ofertas responde pela intermediação, pelas informações que exibe e pelo processamento das compras, nos termos do Código de
        Defesa do Consumidor. Cada fornecedor responde pela prestação do seu serviço. Trabalhamos para manter a plataforma disponível e as
        informações corretas, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros. Nesses casos, agiremos para
        resolver o problema o quanto antes.
      </p>
    ),
  },
  {
    id: "propriedade",
    title: "Propriedade intelectual",
    body: (
      <p>
        Marca, logotipo, textos, layout e software da Bah Ofertas são protegidos por lei. Fotos e descrições de parceiros e hotéis pertencem
        aos respectivos titulares e são usadas com autorização. Não é permitido copiar ou usar esse conteúdo sem permissão.
      </p>
    ),
  },
  {
    id: "privacidade",
    title: "Privacidade e dados pessoais",
    body: (
      <p>
        Tratamos seus dados conforme a Lei Geral de Proteção de Dados (LGPD). Para concluir reservas, compartilhamos com o fornecedor apenas
        os dados necessários (por exemplo, o nome dos hóspedes com o hotel). Saiba mais na <A to="/privacidade">Política de Privacidade</A>.
      </p>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações destes termos",
    body: (
      <p>
        Podemos atualizar estes termos para refletir mudanças nos serviços ou na legislação. A data da última atualização fica no topo desta
        página, e mudanças relevantes serão comunicadas. Compras já realizadas seguem as condições vigentes no momento da compra.
      </p>
    ),
  },
  {
    id: "lei-foro",
    title: "Lei aplicável e foro",
    body: (
      <p>
        Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de Porto Alegre/RS, ressalvado o direito do
        consumidor de propor ação no foro do seu domicílio.
      </p>
    ),
  },
];

const TermsOfUse = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const Toc = (
    <ol className="m-0 p-0 list-none space-y-0.5 text-sm">
      {SECTIONS.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={goTo(s.id)}
            className="flex gap-2 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-[#f2f2f2] hover:text-foreground"
          >
            <span className="w-5 shrink-0 tabular-nums text-right">{i + 1}.</span>
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] font-jakarta text-foreground">
      <SEOHead
        title="Termos de Uso | Bah Ofertas"
        description="Condições de uso da Bah Ofertas: ofertas e vouchers, ingressos de atrações, reservas de hotéis, pagamentos, cancelamentos e reembolsos."
        canonical="/termos"
        type="website"
        jsonLd={[
          jsonLdWebPage({
            url: absoluteUrl("/termos"),
            name: "Termos de Uso — Bah Ofertas",
            description: "Condições gerais de uso da plataforma Bah Ofertas para ofertas, ingressos e hospedagem.",
          }),
        ]}
      />

      <header className="sticky top-0 z-40 bg-card border-b border-[#ebebeb]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            aria-label="Voltar"
            className="w-10 h-10 shrink-0 rounded-full border border-[#dddddd] flex items-center justify-center hover:bg-[#f7f7f7]"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <Link to="/" aria-label="Bah Ofertas — página inicial">
            <img src="/logo-desktop.png" alt="Bah Ofertas" className="h-9 md:h-10 w-auto" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="max-w-3xl">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-primary">Documentos legais</p>
          <h1 className="m-0 mt-1 text-2xl md:text-4xl font-bold">Termos de Uso</h1>
          <p className="m-0 mt-2 text-sm text-muted-foreground">Última atualização: {UPDATED_AT}</p>
          <p className="m-0 mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Estas são as regras para usar a Bah Ofertas e comprar ofertas, ingressos e hospedagens pela plataforma. Escrevemos de forma
            direta para que você saiba exatamente o que esperar antes, durante e depois da compra.
          </p>
        </div>

        <div className="mt-6 md:mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10 lg:items-start">
          {/* Índice */}
          <nav aria-label="Índice dos termos" className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <details className="lg:hidden rounded-2xl border border-[#ebebeb] bg-card group">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 h-12 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                Nesta página
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="px-2 pb-3">{Toc}</div>
            </details>
            <div className="hidden lg:block rounded-2xl border border-[#ebebeb] bg-card p-3">
              <p className="m-0 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nesta página</p>
              {Toc}
            </div>
          </nav>

          {/* Conteúdo */}
          <div className="min-w-0 space-y-4">
            {SECTIONS.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                aria-labelledby={`${s.id}-t`}
                className="scroll-mt-20 rounded-2xl border border-[#ebebeb] bg-card p-5 md:p-7 text-[15px] leading-relaxed text-muted-foreground [&_p]:m-0"
              >
                <h2 id={`${s.id}-t`} className="m-0 mb-3 flex items-center gap-3 text-lg md:text-xl font-bold text-foreground">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-[#1f1f1f] text-white text-sm font-bold flex items-center justify-center tabular-nums">
                    {i + 1}
                  </span>
                  {s.title}
                </h2>
                {s.body}
              </section>
            ))}

            <section id="contato" className="scroll-mt-20 rounded-2xl bg-[#1f1f1f] text-white p-5 md:p-7">
              <h2 className="m-0 text-lg md:text-xl font-bold">Ficou com alguma dúvida?</h2>
              <p className="m-0 mt-1 text-sm text-white/75">Fale com a nossa equipe. Porto Alegre, RS — Brasil.</p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:contato@bahofertas.com"
                  className="h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#1f1f1f]"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  contato@bahofertas.com
                </a>
                <a
                  href="https://wa.me/5554999978084"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 text-[15px] font-semibold"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  WhatsApp (54) 99997-8084
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfUse;
