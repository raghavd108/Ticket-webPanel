import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";

import type { AuthContextType, AuthUser } from "../types/auth";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL is missing from the .env file.");
}

const api = axios.create({
  baseURL: `${API_URL.replace(/\/+$/, "")}/api`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// AUTH API
// =====================================================

const authService = {
  login: async (userName: string, password: string) => {
    await api.post("/auth/login", {
      userName: userName.trim(),
      password,
    });
  },

  getMe: async (): Promise<AuthUser> => {
    const response = await api.get("/auth/me");

    const body = response.data;
    const user = body?.user ?? body?.data?.user ?? body?.data ?? body;

    if (!user?.id || !user?.role) {
      throw new Error("Invalid user data received from server.");
    }

    return user as AuthUser;
  },

  logout: async () => {
    await api.post("/auth/logout");
  },
};

// =====================================================
// AXIOS INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";

    const excludedRoutes = ["/auth/login", "/auth/me", "/auth/logout"];

    const shouldIgnore = excludedRoutes.some((route) => url.includes(route));

    if (error.response?.status === 401 && !shouldIgnore) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    return Promise.reject(error);
  },
);

// =====================================================
// AUTH CONTEXT
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // CHECK LOGIN ON APP START

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const currentUser = await authService.getMe();

        if (active) {
          setUser(currentUser);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  // HANDLE UNAUTHORIZED REQUESTS

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  // LOGIN

  const login = async (userName: string, password: string): Promise<void> => {
    await authService.login(userName, password);

    const currentUser = await authService.getMe();

    setUser(currentUser);
  };

  // LOGOUT

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("LOGOUT FAILED:", error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =====================================================
// CUSTOM HOOK
// =====================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

export { api };
