interface StepIndicatorProps {
  current: number;
  total: number;
  labels: string[];
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12l5 5L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepDot({ index, current }: { index: number; current: number }) {
  const done = index < current;
  const active = index === current;

  return (
    <div
      className={`health-form-step-dot${done || active ? " health-form-step-dot--filled" : ""}`}
      aria-current={active ? "step" : undefined}
    >
      {done ? <CheckIcon /> : index}
    </div>
  );
}

export function StepIndicator({ current, total, labels }: StepIndicatorProps) {
  return (
    <div className="health-form-steps" aria-label="진행 단계">
      <div className="health-form-steps-track">
        {Array.from({ length: total }).map((_, i) => (
          <div key={labels[i] ?? i} className="health-form-steps-segment">
            <StepDot index={i + 1} current={current} />
            {i < total - 1 && (
              <div
                className={`health-form-steps-line${i + 1 < current ? " health-form-steps-line--done" : ""}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="health-form-steps-labels">
        {labels.map((label, i) => (
          <span
            key={label}
            className={
              i + 1 === current
                ? "health-form-steps-label health-form-steps-label--active"
                : i + 1 < current
                  ? "health-form-steps-label health-form-steps-label--done"
                  : "health-form-steps-label"
            }
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
