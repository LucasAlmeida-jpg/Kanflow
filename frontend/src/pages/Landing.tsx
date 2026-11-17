import { KanflowActionCard, KanflowHeroArt, KanflowSiteFooter, KanflowSiteHeader } from "../components/landing";
import { KanflowIcon, KanflowLinkButton, type IconName } from "../components/ui";
import styles from "../components/landing/landing.module.css";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "move", title: "Arraste e solte", text: "Mova cards dentro da coluna ou entre colunas, com prévia do lugar onde ele vai cair." },
  { icon: "sync", title: "Tempo real", text: "Todo mundo no quadro vê cada card criado, movido ou editado no mesmo instante." },
  { icon: "lock", title: "Ninguém sobrescreve ninguém", text: "Se duas pessoas mexem no mesmo card, o Kanflow mostra a versão mais nova e avisa." },
  { icon: "undo", title: "Desfazer e refazer", text: "Ctrl+Z e Ctrl+Shift+Z para criar, editar, mover e apagar cards sem medo." },
  { icon: "history", title: "Histórico de atividade", text: "Veja quem criou, moveu ou renomeou o quê, e quando." },
  { icon: "keyboard", title: "Funciona pelo teclado", text: "Pegue, mova e solte cards só com o teclado, com avisos para leitor de tela." },
];

const STEPS = [
  { title: "Crie um quadro", text: "Dê um nome ao projeto. Você vira o dono do quadro." },
  { title: "Monte as colunas", text: "A fazer, Fazendo, Feito, ou o fluxo que fizer sentido para o time." },
  { title: "Arraste e acompanhe", text: "Crie cards, mova pelo fluxo e veja as mudanças dos outros chegando ao vivo." },
];

export function Landing() {
  return (
    <div className={styles["site"]}>
      <KanflowSiteHeader />

      <main>
        <section className={styles["hero"]} aria-labelledby="hero-title">
          <p className={styles["hero-eyebrow"]}>
            <KanflowIcon name="sync" />
            Colaboração em tempo real
          </p>
          <h1 id="hero-title" className={styles["hero-title"]}>
            O quadro que o time edita junto, ao vivo
          </h1>
          <p className={styles["hero-text"]}>
            Crie colunas, arraste cards e veja as mudanças de todo mundo na hora. Se alguém mexer no mesmo card que você, o
            Kanflow avisa em vez de sobrescrever.
          </p>
          <div className={styles["hero-actions"]}>
            <KanflowLinkButton to="/cadastro" variant="primary" size="lg">
              Criar conta grátis
            </KanflowLinkButton>
            <KanflowLinkButton to="/entrar" variant="ghost" size="lg">
              Já tenho conta
            </KanflowLinkButton>
          </div>
          <KanflowHeroArt />
        </section>

        <section className={styles["landing-section"]} aria-label="Por onde começar">
          <div className={styles["action-grid"]}>
            <KanflowActionCard to="/cadastro" title="Crie seu primeiro quadro" description="Cadastre-se de graça e monte o fluxo do seu time em minutos." />
            <KanflowActionCard to="/entrar" title="Entre na sua conta" description="Volte para os seus quadros de onde parou." />
            <KanflowActionCard to="#como-funciona" title="Veja como funciona" description="Três passos do quadro vazio ao time trabalhando junto." />
          </div>
        </section>

        <section id="recursos" className={styles["landing-section"]} aria-labelledby="recursos-title">
          <h2 id="recursos-title" className={styles["section-title"]}>
            Feito para o time trabalhar junto
          </h2>
          <ul className={styles["feature-grid"]}>
            {FEATURES.map((f) => (
              <li key={f.title} className={styles["feature"]}>
                <span className={styles["feature-icon"]}>
                  <KanflowIcon name={f.icon} />
                </span>
                <h3 className={styles["feature-title"]}>{f.title}</h3>
                <p className={styles["feature-text"]}>{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className={styles["landing-section"]} aria-labelledby="como-title">
          <h2 id="como-title" className={styles["section-title"]}>
            Como funciona
          </h2>
          <ol className={styles["steps"]}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles["step"]}>
                <span className={styles["step-number"]} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={styles["feature-title"]}>{s.title}</h3>
                <p className={styles["feature-text"]}>{s.text}</p>
              </li>
            ))}
          </ol>
          <div className={styles["steps-cta"]}>
            <KanflowLinkButton to="/cadastro" variant="primary" size="lg">
              Começar agora
            </KanflowLinkButton>
          </div>
        </section>
      </main>

      <KanflowSiteFooter />
    </div>
  );
}
