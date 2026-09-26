import { ProgressRing } from "./ProgressRing";

interface Props {
  nutritionDone: number;
  nutritionTotal: number;
  workoutDone: number;
  workoutTotal: number;
}

export function ProgressSummaryCard({
  nutritionDone,
  nutritionTotal,
  workoutDone,
  workoutTotal,
}: Props) {
  const totalDone = nutritionDone + workoutDone;
  const totalItems = nutritionTotal + workoutTotal;
  const pct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;
  const hasProgress = totalDone > 0;

  return (
    <div className="routine-v2-progress-card">
      <ProgressRing percent={pct} />
      <div className="routine-v2-progress-stats">
        <div className="routine-v2-progress-stat">
          <span className="routine-v2-progress-stat-label">영양 계획</span>
          <span
            className={`routine-v2-progress-stat-value${hasProgress ? " is-active" : ""}`}
          >
            {nutritionDone}/{nutritionTotal}
          </span>
        </div>
        <div className="routine-v2-progress-stat">
          <span className="routine-v2-progress-stat-label">운동 계획</span>
          <span
            className={`routine-v2-progress-stat-value${hasProgress ? " is-active" : ""}`}
          >
            {workoutDone}/{workoutTotal}
          </span>
        </div>
      </div>
    </div>
  );
}
