import type { RoutineChatMessage } from "./index";

export type { RoutineChatMessage };

export interface RoutineDayPayload {
  dayOfWeek?: string;
  dailyRoutineId?: string;
  nutritionPlans?: unknown[];
  exercisePlans?: unknown[];
  averageCalories?: number;
  nutritionSummary?: Record<string, unknown>;
  isCompleted?: boolean;
  [key: string]: unknown;
}

export interface UpdatedRoutine {
  id: string;
  summary: string;
  days: RoutineDayPayload[];
}

export interface RoutineChatResponse {
  aiResponse: string;
  routineUpdated: boolean;
  routine?: UpdatedRoutine;
}

export interface EnsureRoutineChatResult {
  chatId: string;
  routineId: string;
}
