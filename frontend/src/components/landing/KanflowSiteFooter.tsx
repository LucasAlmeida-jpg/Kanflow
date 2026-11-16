import { Link } from "react-router";
import { KanflowLogo } from "../ui";

const STACK = ["React 19 + TypeScript", "Node.js + Express", "Socket.IO", "Prisma", "dnd-kit"];

export function KanflowSiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-columns">
          <nav aria-label="Produto">
            <h2 className="site-footer-heading">Produto</h2>
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
            <h2 className="site-footer-heading">Conta</h2>
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
            <h2 className="site-footer-heading">Feito com</h2>
            <ul>
              {STACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="site-footer-bottom">
          <KanflowLogo size={22} />
          <span>© 2026 Kanflow</span>
        </div>
      </div>
    </footer>
  );
}
