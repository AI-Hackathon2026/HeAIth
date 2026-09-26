import type { RoutineDifficulty } from "../../types";

export type RoutinePhase =
  | { name: "gate" }
  | {
      name: "healthStatus";
      mode?: "create" | "update";
      fromGate?: boolean;
      returnRoutineId?: string;
      returnChatId?: string;
      refreshKey?: number;
    }
  | {
      name: "healthRecord";
      fromGate?: boolean;
      returnRoutineId?: string;
      returnChatId?: string;
      refreshKey?: number;
    }
  | {
      name: "difficulty";
      mode?: "create" | "change";
      routineId?: string;
      chatId?: string;
      previousDifficulty?: RoutineDifficulty;
    }
  | { name: "view"; routineId: string; chatId?: string; refreshKey?: number }
  | { name: "chat"; routineId: string; chatId: string };

export type RoutineNavigate = (phase: RoutinePhase) => void;
