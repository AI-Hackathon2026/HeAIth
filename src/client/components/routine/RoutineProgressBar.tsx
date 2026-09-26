interface Props {
  value: number;
  completed?: boolean;
  label?: string;
}

export function RoutineProgressBar({ value, completed, label }: Props) {
  const percent = Math.min(100, Math.max(0, value));

  return (
    <div className="routine-progress">
      {label && (
        <div className="routine-progress-header">
          <span className="routine-progress-label">{label}</span>
          <span className="routine-progress-value">{percent}%</span>
        </div>
      )}
      <div
        className={`routine-progress-track${completed ? " routine-progress-track--complete" : ""}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "진행률"}
      >
        <div
          className="routine-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
