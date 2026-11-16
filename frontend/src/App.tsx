import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./auth";
import { Button } from "./components/ui";
import { BoardView } from "./pages/BoardView";
import { Boards } from "./pages/Boards";
import { Login } from "./pages/Login";

function Shell() {
  const { user, loading, logout } = useAuth();

  if (loading) return <main className="page muted">Carregando...</main>;
  if (!user) return <Login />;

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          Kanflow
        </Link>
        <span className="muted">{user.name}</span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sair
        </Button>
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
