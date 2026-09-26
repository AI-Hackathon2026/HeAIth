import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  clearRole,
  clearUsername,
  loadRole,
  loadUsername,
  saveRole,
  withAuthRetry,
} from "../api/client";
import { AdminTab } from "./AdminTab";
import { HealthStatusForm } from "./routine/HealthStatusForm";
import { RoutineTab } from "./routine/RoutineTab";
import { MainLayout } from "./MainLayout";
import { ScreenTransition } from "./ScreenTransition";
import { isAdminRole } from "../utils/authRole";

type HealthGateState = "loading" | "required" | "ready";

function appShellScreenKey(
  isAdmin: boolean,
  healthGate: HealthGateState,
): string {
  if (!isAdmin && healthGate === "loading") return "health-loading";
  if (!isAdmin && healthGate === "required") return "health-form";
  return isAdmin ? "app-admin" : "app-main";
}

export function AppShell() {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [booting, setBooting] = useState(true);
  const [healthGate, setHealthGate] = useState<HealthGateState>("loading");

  function applyRole(admin: boolean) {
    setIsAdmin(admin);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await api.listChats();
        setUsername(loadUsername() ?? "사용자");

        if (isAdminRole(loadRole())) {
          saveRole("admin");
          applyRole(true);
          setHealthGate("ready");
        } else {
          try {
            await api.listFiles();
            saveRole("admin");
            applyRole(true);
            setHealthGate("ready");
          } catch {
            clearRole();
            applyRole(false);
            const record = await withAuthRetry(() => api.getHealthRecordMe());
            setHealthGate(record ? "ready" : "required");
          }
        }
      } catch {
        setUsername(null);
        clearUsername();
        clearRole();
        navigate("/login", { replace: true });
      } finally {
        setBooting(false);
      }
    }
    void bootstrap();
  }, [navigate]);

  async function handleSignOut() {
    try {
      await api.signOut();
    } finally {
      clearUsername();
      clearRole();
      setUsername(null);
      setIsAdmin(false);
      setHealthGate("loading");
      navigate("/", { replace: true });
    }
  }

  if (booting || !username) {
    return null;
  }

  const displayName = username;

  function renderShellContent() {
    if (!isAdmin && healthGate === "loading") {
      return (
        <div className="health-status-gate">
          <div className="routine-gate">
            <div className="spinner" />
            <p>건강 정보 확인 중...</p>
          </div>
        </div>
      );
    }

    if (!isAdmin && healthGate === "required") {
      return (
        <div className="health-status-gate">
          <HealthStatusForm onComplete={() => setHealthGate("ready")} />
        </div>
      );
    }

    return (
      <MainLayout
        username={displayName}
        isAdmin={isAdmin}
        onSignOut={() => void handleSignOut()}
      >
        {isAdmin ? <AdminTab /> : <RoutineTab />}
      </MainLayout>
    );
  }

  return (
    <ScreenTransition
      screenKey={appShellScreenKey(isAdmin, healthGate)}
      className="app-shell-transition"
    >
      {renderShellContent()}
    </ScreenTransition>
  );
}
