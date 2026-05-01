import { useEffect, useState } from "react";

export function useAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("auth_token"));
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem("auth_token", newToken);
    setToken(newToken);
    window.dispatchEvent(new Event("storage"));
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    window.dispatchEvent(new Event("storage"));
  };

  return { token, isAuthenticated: !!token, login, logout };
}
