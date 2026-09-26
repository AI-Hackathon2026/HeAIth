import type { RoutinePhase } from "./routineTypes";

export function routinePhaseKey(phase: RoutinePhase): string {
  switch (phase.name) {
    case "gate":
      return "gate";
    case "healthStatus":
      return phase.mode === "update" ? "healthStatus-update" : "healthStatus";
    case "healthRecord":
      return phase.fromGate
        ? `healthRecord-gate-${phase.refreshKey ?? 0}`
        : `healthRecord-${phase.returnRoutineId ?? "back"}-${phase.refreshKey ?? 0}`;
    case "difficulty":
      return phase.mode === "change"
        ? `difficulty-change-${phase.routineId ?? "me"}`
        : "difficulty";
    case "view":
      return `view-${phase.routineId}-${phase.refreshKey ?? 0}`;
    case "chat":
      return `chat-${phase.routineId}-${phase.chatId}`;
    default:
      return "unknown";
  }
}
