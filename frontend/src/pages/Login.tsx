import { useState, type SubmitEvent } from "react";
import { useAuth } from "../auth";
import { Button, Card, Input } from "../components/ui";

export function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className="auth">
      <Card as="form" variant="muted" padding="lg" className="auth-card" onSubmit={submit}>
        <h1 className="brand">Kanflow</h1>
        <p className="muted">{isLogin ? "Entre na sua conta" : "Crie sua conta"}</p>

        {!isLogin && (
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        )}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={isLogin ? undefined : 8}
          hint={isLogin ? undefined : "Mínimo de 8 caracteres."}
          autoComplete={isLogin ? "current-password" : "new-password"}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" block loading={busy}>
          {isLogin ? "Entrar" : "Criar conta"}
        </Button>
        <Button variant="ghost" onClick={() => setMode(isLogin ? "register" : "login")}>
          {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </Button>
      </Card>
    </main>
  );
}
