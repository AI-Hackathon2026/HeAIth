import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, clearRole, clearUsername } from "../api/client";
import { HeAIthLogo } from "./HeAIthLogo";
import { isUsingApiProxy } from "../api/baseUrl";
import { isStandalonePwa } from "../utils/pwa";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");
  const [cookieBlocked, setCookieBlocked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function check() {
      try {
        await api.listChats();
        setStatus("authenticated");
      } catch {
        clearUsername();
        clearRole();
        setCookieBlocked(isStandalonePwa() && !isUsingApiProxy());
        setStatus("unauthenticated");
      }
    }
    void check();
  }, []);

  if (status === "loading") {
    return (
      <div className="loading-screen">
        <HeAIthLogo size="lg" />
        <div className="spinner" />
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        state={{ from: location, cookieBlocked }}
        replace
      />
    );
  }

  return children;
}
