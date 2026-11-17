import { Link } from "react-router";
import { KanflowLogo } from "../ui";
import styles from "./landing.module.css";

const STACK = ["React 19 + TypeScript", "Node.js + Express", "Socket.IO", "Prisma", "dnd-kit"];

export function KanflowSiteFooter() {
  return (
    <footer className={styles["site-footer"]}>
      <div className={styles["site-footer-inner"]}>
        <div className={styles["site-footer-columns"]}>
          <nav aria-label="Produto">
            <h2 className={styles["site-footer-heading"]}>Produto</h2>
            <ul>
              <li>
                <a href="#recursos">Recursos</a>
              </li>
              <li>
                <a href="#como-funciona">Como funciona</a>
              </li>
            </ul>
          </nav>
          <nav aria-label="Conta">
            <h2 className={styles["site-footer-heading"]}>Conta</h2>
            <ul>
              <li>
                <Link to="/entrar">Entrar</Link>
              </li>
              <li>
                <Link to="/cadastro">Criar conta</Link>
              </li>
            </ul>
          </nav>
          <div>
            <h2 className={styles["site-footer-heading"]}>Feito com</h2>
            <ul>
              {STACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles["site-footer-bottom"]}>
          <KanflowLogo size={22} className={styles["footer-logo"]} />
          <span>© 2026 Kanflow</span>
        </div>
      </div>
    </footer>
  );
}
