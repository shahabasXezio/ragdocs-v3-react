import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { authService, type User } from "./api";
import { useQueryClient } from "@tanstack/react-query";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(
    Boolean(localStorage.getItem("access_token")),
  );
  const logout = () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) void authService.logout(refreshToken).catch(() => undefined);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    queryClient.clear();
  };
  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;
    authService
      .me()
      .then(setUser)
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401)
          logout();
      })
      .finally(() => setIsLoading(false));
  }, []);
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("ragdocs:unauthorized", handler);
    return () => window.removeEventListener("ragdocs:unauthorized", handler);
  }, []);
  const value = useMemo(
    () => ({
      user,
      isLoading,
      login: async (email: string, password: string) => {
        const result = await authService.login(email, password);
        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("refresh_token", result.refresh_token);
        setUser(result.user);
      },
      logout,
    }),
    [isLoading, user, queryClient],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
