import { useCallback, useState } from "react";
import { api, withAuthRetry } from "../../api/client";
import type { Routine } from "../../types";
import { hasRoutineData } from "../../utils/routineData";
import { ScreenTransition } from "../ScreenTransition";
import { RoutineGate } from "./RoutineGate";
import { HealthStatusForm } from "./HealthStatusForm";
import { HealthRecordScreen } from "./HealthRecordScreen";
import { DifficultyPickerScreen } from "./DifficultyPickerScreen";
import { RoutineViewScreen } from "./RoutineViewScreen";
import { routinePhaseKey } from "./routinePhaseKey";
import type { RoutinePhase } from "./routineTypes";

function healthRecordPhase(
  phase: Extract<RoutinePhase, { name: "healthRecord" }>,
  refreshKey: number,
): Extract<RoutinePhase, { name: "healthRecord" }> {
  return {
    name: "healthRecord",
    fromGate: phase.fromGate,
    returnRoutineId: phase.returnRoutineId,
    returnChatId: phase.returnChatId,
    refreshKey,
  };
}

export function RoutineTab() {
  const [phase, setPhase] = useState<RoutinePhase>({ name: "gate" });
  const [viewRefreshKey, setViewRefreshKey] = useState(0);
  const [healthRecordRefreshKey, setHealthRecordRefreshKey] = useState(0);

  const navigate = useCallback((next: RoutinePhase) => {
    setPhase(next);
  }, []);

  const openChangeDifficulty = useCallback(
    (routine: Routine) => {
      navigate({
        name: "difficulty",
        mode: "change",
        routineId: routine.id || "me",
        chatId: routine.chats?.[0]?.id,
        previousDifficulty: routine.difficulty,
      });
    },
    [navigate],
  );

  const handleRoutineStartClick = useCallback(async () => {
    const routine = await withAuthRetry(() => api.getRoutineMe());
    if (hasRoutineData(routine)) {
      openChangeDifficulty(routine);
      return;
    }
    navigate({ name: "difficulty", mode: "create" });
  }, [navigate, openChangeDifficulty]);

  function renderPhase() {
    switch (phase.name) {
      case "gate":
        return <RoutineGate onNavigate={navigate} />;
      case "healthStatus":
        return (
          <HealthStatusForm
            mode={phase.mode ?? "create"}
            onComplete={() => {
              if (phase.mode === "update") {
                const nextRefreshKey =
                  (phase.refreshKey ?? healthRecordRefreshKey) + 1;
                setHealthRecordRefreshKey(nextRefreshKey);
                navigate(
                  healthRecordPhase(
                    {
                      name: "healthRecord",
                      fromGate: phase.fromGate,
                      returnRoutineId: phase.returnRoutineId,
                      returnChatId: phase.returnChatId,
                    },
                    nextRefreshKey,
                  ),
                );
                return;
              }

              navigate({ name: "healthRecord", fromGate: true, refreshKey: 0 });
            }}
            onCancel={
              phase.mode === "update"
                ? () =>
                    navigate(
                      healthRecordPhase(
                        {
                          name: "healthRecord",
                          fromGate: phase.fromGate,
                          returnRoutineId: phase.returnRoutineId,
                          returnChatId: phase.returnChatId,
                        },
                        phase.refreshKey ?? healthRecordRefreshKey,
                      ),
                    )
                : undefined
            }
          />
        );
      case "healthRecord":
        return (
          <HealthRecordScreen
            fromGate={phase.fromGate}
            refreshKey={phase.refreshKey ?? healthRecordRefreshKey}
            onRoutineStartClick={handleRoutineStartClick}
            onUpdateHealthStatus={() =>
              navigate({
                name: "healthStatus",
                mode: "update",
                fromGate: phase.fromGate,
                returnRoutineId: phase.returnRoutineId,
                returnChatId: phase.returnChatId,
                refreshKey: phase.refreshKey ?? healthRecordRefreshKey,
              })
            }
            onBack={
              phase.fromGate
                ? undefined
                : () =>
                    navigate({
                      name: "view",
                      routineId: phase.returnRoutineId!,
                      chatId: phase.returnChatId,
                      refreshKey: viewRefreshKey,
                    })
            }
          />
        );
      case "difficulty":
        return (
          <DifficultyPickerScreen
            mode={phase.mode ?? "create"}
            routineId={phase.routineId}
            previousDifficulty={phase.previousDifficulty}
            onGenerated={(routineId, chatId) => {
              const next = viewRefreshKey + 1;
              setViewRefreshKey(next);
              navigate({ name: "view", routineId, chatId, refreshKey: next });
            }}
            onRoutineAlreadyExists={openChangeDifficulty}
            onCancel={
              phase.mode === "change"
                ? () =>
                    navigate({
                      name: "view",
                      routineId: phase.routineId!,
                      chatId: phase.chatId,
                      refreshKey: viewRefreshKey,
                    })
                : undefined
            }
          />
        );
      case "view":
        return (
          <RoutineViewScreen
            key={`${phase.routineId}-${phase.refreshKey ?? 0}`}
            routineId={phase.routineId}
            chatId={phase.chatId}
            refreshKey={phase.refreshKey ?? 0}
            onChangeDifficulty={(previousDifficulty) =>
              navigate({
                name: "difficulty",
                mode: "change",
                routineId: phase.routineId,
                chatId: phase.chatId,
                previousDifficulty,
              })
            }
            onRoutineDeleted={() =>
              navigate({
                name: "healthRecord",
                fromGate: true,
                refreshKey: healthRecordRefreshKey,
              })
            }
            onViewHealthRecord={() =>
              navigate({
                name: "healthRecord",
                fromGate: false,
                returnRoutineId: phase.routineId,
                returnChatId: phase.chatId,
                refreshKey: healthRecordRefreshKey,
              })
            }
          />
        );
      default:
        return null;
    }
  }

  return (
    <ScreenTransition
      screenKey={routinePhaseKey(phase)}
      className="routine-tab-transition"
    >
      {renderPhase()}
    </ScreenTransition>
  );
}
