import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./auth";
import { KanflowButton, KanflowIcon, KanflowLogo } from "./components/ui";
import { BoardView } from "./pages/BoardView";
import { Boards } from "./pages/Boards";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";

function Shell() {
  const { user, loading, logout } = useAuth();

  if (loading) return <main className="page muted">Carregando...</main>;
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

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <KanflowLogo size={24} />
        </Link>
        <span className="muted">{user.name}</span>
        <KanflowButton variant="ghost" size="sm" onClick={logout}>
          <KanflowIcon name="exit" />
          Sair
        </KanflowButton>
      </header>
      <Routes>
        <Route path="/" element={<Boards />} />
        <Route path="/boards/:id" element={<BoardView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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
