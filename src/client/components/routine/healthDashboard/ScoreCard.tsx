import { useEffect, useState } from "react";
import { getAgeGroup } from "../../../constants/knhanes-bmi";
import type { HealthRecord } from "../../../types";
import { formatCohortLabel } from "../../../utils/age-group-label";

interface ScoreCardProps {
  record: HealthRecord;
  goodDiseases: string[];
  gender?: "MALE" | "FEMALE";
  age?: number;
}

export function ScoreCard({
  record,
  goodDiseases,
  gender,
  age,
}: ScoreCardProps) {
  const score = record.overallScore;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedScore(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const ranking = record.formatted?.healthRanking;
  const topPercent =
    ranking?.percentileDisplay?.replace(/[^\d]/g, "") ||
    String(Math.max(0, 100 - score));

  const cohortLabel =
    ranking?.cohortLabel ||
    (gender && age !== undefined
      ? formatCohortLabel(getAgeGroup(age), gender)
      : null);

  const r = 40;
  const circumference = 2 * Math.PI * r;
  const filled = (animatedScore / 100) * circumference;

  return (
    <div className="health-score-card">
      <div className="health-score-ring-wrap" aria-hidden>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="7"
          />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="var(--color-teal)"
            strokeWidth="7"
            strokeDasharray={`${filled} ${circumference}`}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
            className="health-score-ring-progress"
          />
        </svg>
        <div className="health-score-ring-center">
          <span className="health-score-num">{score}</span>
          <span className="health-score-denom">/ 100</span>
        </div>
      </div>

      <div className="health-score-info">
        <p className="health-score-title">종합 건강 점수</p>
        <p className="health-score-sub">
          동연령·동성별 기준{" "}
          <strong>상위 {topPercent}%</strong>
        </p>

        <div className="health-score-pills">
          {cohortLabel && (
            <span className="health-score-pill health-score-pill--teal">
              {cohortLabel}
            </span>
          )}
          {goodDiseases.map((name) => (
            <span key={name} className="health-score-pill health-score-pill--gray">
              {name} 안심 구간
            </span>
          ))}
        </div>

        <div className="health-score-overall-bar">
          <div
            className="health-score-overall-fill"
            style={{ width: `${animatedScore}%` }}
          />
        </div>
        <p className="health-score-bar-note">
          낮을수록 위험 · 높을수록 건강
        </p>
      </div>
    </div>
  );
}
