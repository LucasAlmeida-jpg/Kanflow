import { Link } from "react-router";
import { KanflowLinkButton, KanflowLogo } from "../ui";
import styles from "./landing.module.css";

export function KanflowSiteHeader() {
  return (
    <header className={styles["site-header"]}>
      <nav className={styles["site-nav"]} aria-label="Principal">
        <Link to="/" className={styles["site-home"]} aria-label="Kanflow, página inicial">
          <KanflowLogo />
        </Link>
        <ul className={styles["site-links"]}>
          <li>
            <a href="#recursos">Recursos</a>
          </li>
          <li>
            <a href="#como-funciona">Como funciona</a>
          </li>
        </ul>
        <div className={styles["site-actions"]}>
          <KanflowLinkButton to="/entrar" variant="ghost" className={styles["site-login"]}>
            Entrar
          </KanflowLinkButton>
          <KanflowLinkButton to="/cadastro" variant="primary">
            Criar conta
          </KanflowLinkButton>
        </div>
      </nav>
    </header>
  );
}
