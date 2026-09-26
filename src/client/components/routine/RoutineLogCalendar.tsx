import type { RoutineLog } from "../../types";

interface Props {
  logs: RoutineLog[];
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function RoutineLogCalendar({ logs }: Props) {
  const completedDates = new Set(
    logs.filter((log) => log.completed).map((log) => log.date.slice(0, 10)),
  );

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="routine-log-month">
      <div className="routine-log-month-header">
        {year}년 {month + 1}월
      </div>
      <div className="routine-log-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="routine-log-grid">
        {cells.map((day, index) => {
          if (day === null) {
            return <span key={`empty-${index}`} className="routine-log-day empty" />;
          }

          const dateKey = toDateKey(new Date(year, month, day));
          const completed = completedDates.has(dateKey);
          const isToday = dateKey === toDateKey(today);

          return (
            <span
              key={dateKey}
              className={`routine-log-day${completed ? " completed" : ""}${isToday ? " today" : ""}`}
              title={completed ? `${dateKey} 완료` : dateKey}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
