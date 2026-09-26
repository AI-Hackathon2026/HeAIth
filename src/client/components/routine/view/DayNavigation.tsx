interface Props {
  currentIndex: number;
  totalDays: number;
  onChange: (index: number) => void;
}

export function DayNavigation({ currentIndex, totalDays, onChange }: Props) {
  if (totalDays <= 0) return null;

  return (
    <>
      <div className="routine-v2-day-nav">
        <button
          type="button"
          className="routine-v2-day-nav-btn"
          disabled={currentIndex === 0}
          onClick={() => onChange(currentIndex - 1)}
        >
          ‹ 이전
        </button>
        <span className="routine-v2-day-nav-label">
          {currentIndex + 1}일차 / {totalDays}일차
        </span>
        <button
          type="button"
          className="routine-v2-day-nav-btn"
          disabled={currentIndex >= totalDays - 1}
          onClick={() => onChange(currentIndex + 1)}
        >
          다음 ›
        </button>
      </div>
      {totalDays > 1 && (
        <div className="routine-v2-day-dots" role="tablist" aria-label="일차 선택">
          {Array.from({ length: totalDays }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`${i + 1}일차`}
              className={`routine-v2-day-dot${i === currentIndex ? " is-active" : ""}`}
              onClick={() => onChange(i)}
            />
          ))}
        </div>
      )}
    </>
  );
}
