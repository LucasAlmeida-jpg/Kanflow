import { Link } from "react-router";
import type { User } from "../../api";
import { KanflowAvatar, KanflowButton, KanflowIcon, KanflowLogo } from "../ui";
import styles from "./home.module.css";
import { cx } from "../../lib/cx";

type KanflowAppSidebarProps = {
  user: User;
  onNewBoard: () => void;
  onLogout: () => void;
};

export function KanflowAppSidebar({ user, onNewBoard, onLogout }: KanflowAppSidebarProps) {
  return (
    <aside className={styles["app-sidebar"]}>
      <div className={styles["app-sidebar-top"]}>
        <Link to="/" className={styles["app-sidebar-home"]} aria-label="Kanflow, início">
          <KanflowLogo />
        </Link>
        <KanflowButton variant="secondary" className={styles["app-sidebar-new"]} aria-label="Novo quadro" title="Novo quadro" onClick={onNewBoard}>
          <KanflowIcon name="plus-circle" />
        </KanflowButton>
      </div>

      <nav aria-label="Navegação">
        <ul className={styles["app-nav"]}>
          <li>
            <Link to="/" className={cx(styles["app-nav-item"], styles["is-active"])} aria-current="page">
              <KanflowIcon name="home" />
              Início
            </Link>
          </li>
          <li>
            <a href="#seus-quadros" className={styles["app-nav-item"]}>
              <KanflowIcon name="layers" />
              Seus quadros
            </a>
          </li>
        </ul>
      </nav>

      <div className={styles["app-sidebar-tip"]}>
        <p>Dica: dentro de um quadro, Ctrl+Z desfaz e Ctrl+Shift+Z refaz a última ação.</p>
      </div>

      <div className={styles["app-sidebar-user"]}>
        <KanflowAvatar name={user.name} highlight />
        <span className={styles["app-sidebar-user-text"]}>
          <span className={styles["app-sidebar-user-name"]}>{user.name}</span>
          <span className={styles["app-sidebar-user-email"]}>{user.email}</span>
        </span>
        <KanflowButton variant="ghost" size="sm" aria-label="Sair" title="Sair" onClick={onLogout}>
          <KanflowIcon name="exit" />
        </KanflowButton>
      </div>
    </aside>
  );
}
