import { Link } from "react-router";
import type { User } from "../../api";
import { KanflowAvatar, KanflowButton, KanflowIcon, KanflowLogo } from "../ui";

type KanflowAppSidebarProps = {
  user: User;
  onNewBoard: () => void;
  onLogout: () => void;
};

export function KanflowAppSidebar({ user, onNewBoard, onLogout }: KanflowAppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-top">
        <Link to="/" className="app-sidebar-home" aria-label="Kanflow, início">
          <KanflowLogo />
        </Link>
        <KanflowButton variant="secondary" className="app-sidebar-new" aria-label="Novo quadro" title="Novo quadro" onClick={onNewBoard}>
          <KanflowIcon name="plus-circle" />
        </KanflowButton>
      </div>

      <nav aria-label="Navegação">
        <ul className="app-nav">
          <li>
            <Link to="/" className="app-nav-item is-active" aria-current="page">
              <KanflowIcon name="home" />
              Início
            </Link>
          </li>
          <li>
            <a href="#seus-quadros" className="app-nav-item">
              <KanflowIcon name="layers" />
              Seus quadros
            </a>
          </li>
        </ul>
      </nav>

      <div className="app-sidebar-tip">
        <p>Dica: dentro de um quadro, Ctrl+Z desfaz e Ctrl+Shift+Z refaz a última ação.</p>
      </div>

      <div className="app-sidebar-user">
        <KanflowAvatar name={user.name} highlight />
        <span className="app-sidebar-user-text">
          <span className="app-sidebar-user-name">{user.name}</span>
          <span className="app-sidebar-user-email">{user.email}</span>
        </span>
        <KanflowButton variant="ghost" size="sm" aria-label="Sair" title="Sair" onClick={onLogout}>
          <KanflowIcon name="exit" />
        </KanflowButton>
      </div>
    </aside>
  );
}
