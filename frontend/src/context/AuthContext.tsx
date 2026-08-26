"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { login as apiLogin } from "@/services/authService";

interface User {
  id: number;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, expectedRole?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Parse token helper
  const parseToken = (tokenStr: string): User | null => {
    try {
      const payloadBase64 = tokenStr.split(".")[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      return {
        id: decodedPayload.userId,
        role: decodedPayload.role,
        name: "", // Will be populated from localStorage or login response
        email: "",
      };
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("eduai_token") : null;
        const storedUser = typeof window !== "undefined" ? localStorage.getItem("eduai_user") : null;

        if (storedToken) {
          const parsed = parseToken(storedToken);
          if (parsed) {
            setToken(storedToken);
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
              } catch (e) {
                console.error("Error parsing stored user JSON:", e);
                setUser(parsed);
              }
            } else {
              setUser(parsed);
            }
          } else {
            localStorage.removeItem("eduai_token");
            localStorage.removeItem("eduai_user");
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Failed to initialize authentication:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const redirectBasedOnRole = (role: string) => {
    if (role === "SUPER_ADMIN") {
      router.push("/super-admin");
    } else if (role === "ADMIN") {
      router.push("/admin");
    } else if (role === "TEACHER") {
      router.push("/teacher");
    } else if (role === "STUDENT") {
      router.push("/student");
    } else {
      router.push("/login");
    }
  };

  // Guard routing logic
  useEffect(() => {
    if (loading) return;

    const publicPaths = ["/login", "/", "/choose", "/register"];
    const isPublicPath = publicPaths.includes(pathname);

    if (!token && !isPublicPath) {
      router.push("/login");
    } else if (token) {
      if (isPublicPath) {
        redirectBasedOnRole(user?.role || "STUDENT");
      } else {
        // Global client-side role directory guard validation
        const role = user?.role || "STUDENT";
        if (pathname.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
          redirectBasedOnRole(role);
        } else if (pathname.startsWith("/admin") && role !== "ADMIN") {
          redirectBasedOnRole(role);
        } else if (pathname.startsWith("/teacher") && role !== "TEACHER") {
          redirectBasedOnRole(role);
        } else if (pathname.startsWith("/student") && role !== "STUDENT") {
          redirectBasedOnRole(role);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pathname, loading, user, router]);

  const login = async (email: string, password: string, expectedRole?: string) => {
    try {
      setLoading(true);
      const res = await apiLogin({ email, password });
      const { user: userData, token: userToken } = res.data;

      if (expectedRole && userData.role !== expectedRole.toUpperCase()) {
        throw new Error(`Access Denied: This login portal is restricted to ${expectedRole.toUpperCase()} accounts.`);
      }

      localStorage.setItem("eduai_token", userToken);
      localStorage.setItem("eduai_user", JSON.stringify(userData));

      setToken(userToken);
      setUser(userData);
      redirectBasedOnRole(userData.role);
    } catch (error) {
      localStorage.removeItem("eduai_token");
      localStorage.removeItem("eduai_user");
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("eduai_token");
    localStorage.removeItem("eduai_user");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
