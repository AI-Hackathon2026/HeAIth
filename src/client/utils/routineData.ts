import type { Routine } from "../types";

/** True when GET /routines/me returned a parseable routine (any 200 response with data). */
export function hasRoutineData(
  routine: Routine | null | undefined,
): routine is Routine {
  return routine != null;
}