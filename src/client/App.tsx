import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { ScreenTransition } from "./components/ScreenTransition";
import { AdminAuthPage } from "./pages/AdminAuthPage";
import { HomePage } from "./pages/HomePage";
import { UserAuthPage } from "./pages/UserAuthPage";

function routeTransitionKey(pathname: string): string {
  if (pathname.startsWith("/app")) return "app";
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/admin/login"
  ) {
    return "public";
  }
  return pathname;
}

export default function App() {
  const location = useLocation();

  return (
    <ScreenTransition
      screenKey={routeTransitionKey(location.pathname)}
      className="app-route-transition"
    >
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<UserAuthPage />} />
          <Route path="/admin/login" element={<AdminAuthPage />} />
        </Route>
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ScreenTransition>
  );
}
