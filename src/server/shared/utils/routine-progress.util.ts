import { RoutineProgressView } from "../../application/query/view/health-record.view";
import { getSeoulDateString, getSeoulWeekDates, getSeoulWeekStart } from "./routine-date.util";

export type RoutineFrequencyType = "DAILY" | "WEEKLY";

export type TaskProgressInput = {
    id: string;
    frequencyType: RoutineFrequencyType;
    targetCountPerWeek: number;
    isActive: boolean;
};

export function targetCountForDifficulty(
    difficulty: "EASY" | "MODERATE" | "HARD",
    frequencyType: RoutineFrequencyType,
): number {
    if (frequencyType === "DAILY") return 7;
    if (difficulty === "EASY") return 2;
    if (difficulty === "MODERATE") return 5;
    return 7;
}

export function isTaskDueToday(
    task: TaskProgressInput,
    completedThisWeek: number,
): boolean {
    if (!task.isActive) return false;
    if (task.frequencyType === "DAILY") return true;
    return completedThisWeek < task.targetCountPerWeek;
}

export function computeRoutineProgress(
    tasks: TaskProgressInput[],
    completionsByTaskAndDate: Map<string, Map<string, boolean>>,
    dayLogs: Array<{ date: string; completed: boolean }>,
    referenceDate: string = getSeoulDateString(),
): RoutineProgressView {
    const weekStart = getSeoulWeekStart(referenceDate);
    const weekDates = getSeoulWeekDates(weekStart);

    let todayTotal = 0;
    let todayCompleted = 0;
    let weekCompleted = 0;
    let weekTarget = 0;

    for (const task of tasks) {
        if (!task.isActive) continue;

        const taskCompletions = completionsByTaskAndDate.get(task.id) ?? new Map();
        const completedThisWeek = weekDates.filter((d) => taskCompletions.get(d)).length;
        const completedToday = taskCompletions.get(referenceDate) ?? false;

        weekTarget += task.targetCountPerWeek;

        if (task.frequencyType === "DAILY") {
            weekCompleted += completedThisWeek;
        } else {
            weekCompleted += Math.min(completedThisWeek, task.targetCountPerWeek);
        }

        if (isTaskDueToday(task, completedThisWeek)) {
            todayTotal += 1;
            if (completedToday) todayCompleted += 1;
        }
    }

    const todayPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    let streakDays = 0;
    const sortedDayLogs = [...dayLogs].sort((a, b) => b.date.localeCompare(a.date));
    const dayCompleteByDate = new Map(sortedDayLogs.map((l) => [l.date.slice(0, 10), l.completed]));

    for (let i = 0; i < 365; i++) {
        const d = parseSeoulDateOffset(referenceDate, -i);
        const allTasksDone = dayCompleteByDate.get(d) === true;
        if (allTasksDone) {
            streakDays += 1;
        } else if (i > 0) {
            break;
        }
    }

    return {
        todayCompleted,
        todayTotal,
        todayPercent,
        weekCompleted,
        weekTarget,
        streakDays,
    };
}

function parseSeoulDateOffset(baseDate: string, offsetDays: number): string {
    const date = new Date(`${baseDate}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().slice(0, 10);
}
