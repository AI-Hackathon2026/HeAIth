import { useEffect } from "react";
import { api, withAuthRetry } from "../../api/client";
import { hasRoutineData } from "../../utils/routineData";
import type { RoutineNavigate } from "./routineTypes";

interface Props {
  onNavigate: RoutineNavigate;
}

export function RoutineGate({ onNavigate }: Props) {
  useEffect(() => {
    async function route() {
      try {
        const routine = await withAuthRetry(() => api.getRoutineMe());

        if (hasRoutineData(routine)) {
          onNavigate({
            name: "view",
            routineId: routine.id || "me",
            chatId: routine.chats?.[0]?.id,
          });
          return;
        }

        const healthRecord = await withAuthRetry(() => api.getHealthRecordMe());

        if (!healthRecord) {
          onNavigate({ name: "healthStatus" });
          return;
        }

        onNavigate({ name: "healthRecord", fromGate: true });
      } catch {
        onNavigate({ name: "healthStatus" });
      }
    }

    void route();
  }, [onNavigate]);

  return (
    <div className="routine-gate">
      <div className="spinner" />
      <p>루틴 정보를 불러오는 중...</p>
    </div>
  );
}
