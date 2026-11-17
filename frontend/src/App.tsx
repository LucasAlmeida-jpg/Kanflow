import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./auth";
import { KanflowButton, KanflowIcon, KanflowLogo } from "./components/ui";
import { BoardView } from "./pages/BoardView";
import { Home } from "./pages/Home";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import page from "./pages/pages.module.css";
import { cx } from "./lib/cx";

function Shell() {
  const { user, loading, logout } = useAuth();

  if (loading) return <main className={cx(page["page"], "muted")}>Carregando...</main>;
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/entrar" element={<Login mode="login" />} />
        <Route path="/cadastro" element={<Login mode="register" />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    );
  }

  const boardPage = (
    <>
      <header className={page["topbar"]}>
        <Link to="/" className={page["brand"]}>
          <KanflowLogo size={24} />
        </Link>
        <span className={"muted"}>{user.name}</span>
        <KanflowButton variant="ghost" size="sm" onClick={logout}>
          <KanflowIcon name="exit" />
          Sair
        </KanflowButton>
      </header>
      <BoardView />
    </>
  );

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/boards/:id" element={boardPage} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
