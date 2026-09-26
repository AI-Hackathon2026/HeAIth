interface Props {
  id: string;
  name: string;
  completed: boolean;
  frequency?: string;
  badge?: string;
  disabled?: boolean;
  onToggle: () => void;
}

export function TaskRow({
  name,
  completed,
  frequency,
  badge,
  disabled,
  onToggle,
}: Props) {
  return (
    <button
      type="button"
      className={`routine-v2-task-row${completed ? " is-complete" : ""}`}
      disabled={disabled}
      onClick={onToggle}
    >
      <span
        className={`routine-v2-task-check${completed ? " is-done" : ""}`}
        aria-hidden
      >
        {completed && "✓"}
      </span>
      <span className="routine-v2-task-name">{name}</span>
      {(frequency || badge) && (
        <span className="routine-v2-task-meta">{frequency ?? badge}</span>
      )}
    </button>
  );
}
