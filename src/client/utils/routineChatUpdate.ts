import type { Routine } from "../types";
import type { UpdatedRoutine } from "../types/routine-chat.types";
import { normalizeRoutine } from "./routineNormalize";
import { mergeRoutinePreservingPlanOrder } from "./routinePlanOrder";

export function applyUpdatedRoutine(
  current: Routine,
  updated: UpdatedRoutine,
): Routine {
  const normalized = normalizeRoutine({
    ...current,
    id: updated.id || current.id,
    summary: updated.summary || current.summary,
    report: updated.summary || current.summary,
    days: updated.days,
  });

  if (!normalized) return current;
  return mergeRoutinePreservingPlanOrder(current, normalized);
}
