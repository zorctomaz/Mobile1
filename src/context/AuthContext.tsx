import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { User } from "../types";
import * as store from "../data/store";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await store.seedDemoDataOnce();
      const current = await store.getCurrentUser();
      setUser(current);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await store.loginUser(email, password);
    setUser(u);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const u = await store.registerUser(name, email, password);
      setUser(u);
    },
    []
  );

  const logout = useCallback(async () => {
    await store.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const current = await store.getCurrentUser();
    setUser(current);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
