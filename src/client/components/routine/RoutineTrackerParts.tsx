import type { ReactNode } from "react";

interface TrackerSummaryProps {
  completed: number;
  total: number;
  label?: string;
}

export function TrackerSummary({
  completed,
  total,
  label = "전체 진행",
}: TrackerSummaryProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="routine-tracker-summary-card">
      <div className="routine-tracker-summary-ring" aria-hidden>
        <svg viewBox="0 0 36 36">
          <circle
            className="routine-tracker-summary-ring-bg"
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
          />
          <circle
            className="routine-tracker-summary-ring-fill"
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            pathLength={100}
            strokeDasharray={`${percent} 100`}
          />
        </svg>
        <span className="routine-tracker-summary-ring-text">{percent}%</span>
      </div>
      <div className="routine-tracker-summary-copy">
        <p className="routine-tracker-summary-label">{label}</p>
        <p className="routine-tracker-summary-count">
          <strong>{completed}</strong>
          <span> / {total} 완료</span>
        </p>
        <div className="routine-tracker-summary-bar" role="progressbar" aria-valuenow={percent}>
          <div
            className="routine-tracker-summary-bar-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface TrackerAccordionProps {
  title: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  badgeDone?: boolean;
  defaultOpen?: boolean;
  level?: "day" | "meal";
  children: ReactNode;
}

export function TrackerAccordion({
  title,
  meta,
  badge,
  badgeDone = false,
  defaultOpen = false,
  level = "day",
  children,
}: TrackerAccordionProps) {
  return (
    <details
      className={`routine-tracker-accordion routine-tracker-accordion--${level}`}
      open={defaultOpen}
    >
      <summary className="routine-tracker-accordion-summary">
        <span className="routine-tracker-accordion-chevron" aria-hidden />
        <span className="routine-tracker-accordion-main">
          <span className="routine-tracker-accordion-title">{title}</span>
          {meta && (
            <span className="routine-tracker-accordion-meta">{meta}</span>
          )}
        </span>
        {badge != null && (
          <span
            className={`routine-tracker-accordion-badge${badgeDone ? " is-done" : ""}`}
          >
            {badge}
          </span>
        )}
      </summary>
      <div className="routine-tracker-accordion-body">{children}</div>
    </details>
  );
}

interface CompactCheckRowProps {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  isCompleted: boolean;
  isUpdating: boolean;
  canToggle: boolean;
  onToggle?: () => void;
  showProgress?: boolean;
  progressValue?: number;
}

export function CompactCheckRow({
  id,
  title,
  subtitle,
  badge,
  isCompleted,
  isUpdating,
  canToggle,
  onToggle,
  showProgress = false,
  progressValue = 0,
}: CompactCheckRowProps) {
  const inProgress =
    showProgress && !isCompleted && progressValue > 0 && progressValue < 100;

  return (
    <li
      id={id}
      className={`routine-tracker-compact-row${isCompleted ? " is-complete" : ""}${canToggle ? " is-interactive" : ""}${isUpdating ? " is-updating" : ""}`}
    >
      {canToggle ? (
        <button
          type="button"
          className={`routine-tracker-compact-check${isCompleted ? " is-done" : ""}`}
          aria-pressed={isCompleted}
          disabled={isUpdating}
          onClick={onToggle}
        >
          {isUpdating ? "…" : isCompleted ? "✓" : ""}
        </button>
      ) : (
        <span
          className={`routine-tracker-compact-check${isCompleted ? " is-done" : ""}`}
          aria-hidden
        >
          {isCompleted ? "✓" : ""}
        </span>
      )}
      <div className="routine-tracker-compact-content">
        <p className="routine-tracker-compact-title">{title}</p>
        {subtitle && (
          <p className="routine-tracker-compact-subtitle">{subtitle}</p>
        )}
        {badge && <span className="routine-tracker-compact-badge">{badge}</span>}
        {inProgress && (
          <div className="routine-tracker-compact-progress">
            <div
              className="routine-tracker-compact-progress-fill"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        )}
      </div>
    </li>
  );
}

export function completionBadge(completed: number, total: number) {
  return `${completed}/${total}`;
}

export function isFullyComplete(completed: number, total: number) {
  return total > 0 && completed === total;
}

interface TrackerDayPaginationProps {
  page: number;
  totalPages: number;
  startDay: number;
  endDay: number;
  onPageChange: (page: number) => void;
}

export function TrackerDayPagination({
  page,
  totalPages,
  startDay,
  endDay,
  onPageChange,
}: TrackerDayPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="routine-tracker-pagination">
      <button
        type="button"
        className="routine-tracker-pagination-btn"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
      >
        ← 이전
      </button>
      <span className="routine-tracker-pagination-label">
        {startDay}–{endDay}일차 · {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        className="routine-tracker-pagination-btn"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        다음 →
      </button>
    </div>
  );
}

export function paginateDays<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * perPage;
  return {
    page: safePage,
    totalPages,
    slice: items.slice(start, start + perPage),
    startIndex: start,
  };
}
