import { Link } from "react-router";
import { KanflowLinkButton, KanflowLogo } from "../ui";

export function KanflowSiteHeader() {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Principal">
        <Link to="/" className="site-home" aria-label="Kanflow, página inicial">
          <KanflowLogo />
        </Link>
        <ul className="site-links">
          <li>
            <a href="#recursos">Recursos</a>
          </li>
          <li>
            <a href="#como-funciona">Como funciona</a>
          </li>
        </ul>
        <div className="site-actions">
          <KanflowLinkButton to="/entrar" variant="ghost">
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
