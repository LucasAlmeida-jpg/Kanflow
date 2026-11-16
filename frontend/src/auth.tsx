import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, authApi, getToken, setToken, type Session, type User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());

  useEffect(() => {
    if (!getToken()) return;
    authApi.me()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function enter(session: Session) {
    setToken(session.token);
    setUser(session.user);
  }

  const value: AuthState = {
    user,
    loading,
    login: async (email, password) => enter(await authApi.login(email, password)),
    register: async (name, email, password) => enter(await authApi.register(name, email, password)),
    logout: async () => {
      await authApi.logout().catch(() => undefined);
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
