import { useState } from "react";
import type { ExerciseRoutineItem } from "../../types";
import { DayNavigation } from "./view/DayNavigation";
import { TaskRow } from "./view/TaskRow";

interface Props {
  items: ExerciseRoutineItem[];
  updatingPlanId?: string | null;
  onToggle?: (planId: string, isCompleted: boolean) => void;
}

function groupByDay(items: ExerciseRoutineItem[]) {
  const groups = new Map<number, ExerciseRoutineItem[]>();

  for (const item of items) {
    const dayNumber = item.dayNumber ?? 1;
    const bucket = groups.get(dayNumber) ?? [];
    bucket.push(item);
    groups.set(dayNumber, bucket);
  }

  if (groups.size === 0 && items.length > 0) {
    groups.set(1, items);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, dayItems]) => ({
      dayNumber,
      items: dayItems,
    }));
}

export function ExerciseRoutineTracker({
  items,
  updatingPlanId = null,
  onToggle,
}: Props) {
  const [dayIndex, setDayIndex] = useState(0);

  if (items.length === 0) {
    return <p className="routine-v2-empty">등록된 운동 루틴이 없습니다.</p>;
  }

  const dayGroups = groupByDay(items);
  const showDayGroups = dayGroups.length > 1 || dayGroups.length === 1;
  const safeIndex = Math.min(Math.max(0, dayIndex), dayGroups.length - 1);
  const currentDay = dayGroups[safeIndex];

  if (!showDayGroups) {
    return (
      <div className="routine-v2-day-card routine-v2-day-card--flat">
        {items.map((item, index) => (
          <TaskRow
            key={item.planId || `${item.task}-${index}`}
            id={item.planId || `${item.task}-${index}`}
            name={item.task}
            completed={item.isCompleted}
            frequency={item.frequency || undefined}
            disabled={updatingPlanId === item.planId || !item.planId}
            onToggle={() => onToggle?.(item.planId, item.isCompleted)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="routine-v2-day-view">
      <DayNavigation
        currentIndex={safeIndex}
        totalDays={dayGroups.length}
        onChange={setDayIndex}
      />

      <div className="routine-v2-day-card">
        {currentDay.items.map((item, index) => (
          <TaskRow
            key={item.planId || `${item.task}-${index}`}
            id={item.planId || `${item.task}-${index}`}
            name={item.task}
            completed={item.isCompleted}
            frequency={item.frequency || undefined}
            disabled={updatingPlanId === item.planId || !item.planId}
            onToggle={() => onToggle?.(item.planId, item.isCompleted)}
          />
        ))}
      </div>
    </div>
  );
}
