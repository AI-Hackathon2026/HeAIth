import type { HealthRecord } from "../../types";

interface Props {
  record: HealthRecord;
}

export function HealthRankingHero({ record }: Props) {
  const ranking = record.formatted?.healthRanking;
  const score = record.formatted?.overallScore;
  const progressPercent = score?.progressPercent ?? record.overallScore;
  const scoreDisplay = score?.display ?? String(record.overallScore);
  const scoreLabel = score?.label ?? "종합 건강 점수";

  if (!ranking) {
    return (
      <div className="health-ranking-hero health-ranking-hero--score-only">
        <div className="health-ranking-hero-ring" aria-hidden>
          <svg viewBox="0 0 36 36">
            <circle
              className="health-ranking-hero-ring-bg"
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
            />
            <circle
              className="health-ranking-hero-ring-fill"
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              pathLength={100}
              strokeDasharray={`${progressPercent} 100`}
            />
          </svg>
          <div className="health-ranking-hero-ring-center">
            <span className="health-ranking-hero-score">{scoreDisplay}</span>
            <span className="health-ranking-hero-score-max">/ 100</span>
          </div>
        </div>
        <div className="health-ranking-hero-copy">
          <p className="health-ranking-hero-label">{scoreLabel}</p>
        </div>
      </div>
    );
  }

  const percentileSubtitle = [
    ranking.percentileLabel ?? "동연령·동성별보다 건강한 사람",
    ranking.percentileDisplay,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="health-ranking-hero health-ranking-hero--full">
      <div className="health-ranking-hero-glow" aria-hidden />
      <div className="health-ranking-hero-ring" aria-hidden>
        <svg viewBox="0 0 36 36">
          <circle
            className="health-ranking-hero-ring-bg"
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
          />
          <circle
            className="health-ranking-hero-ring-fill"
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            pathLength={100}
            strokeDasharray={`${progressPercent} 100`}
          />
        </svg>
        <div className="health-ranking-hero-ring-center">
          <span className="health-ranking-hero-score">{scoreDisplay}</span>
          <span className="health-ranking-hero-score-max">/ 100</span>
        </div>
        <span className="health-ranking-hero-badge">{ranking.topDisplay}</span>
      </div>

      <div className="health-ranking-hero-copy">
        <p className="health-ranking-hero-title">{ranking.title}</p>
        <p className="health-ranking-hero-subtitle">{percentileSubtitle}</p>
        <p className="health-ranking-hero-context">
          {ranking.cohortLabel}
          {ranking.cohortLabel && ranking.rankDisplay ? " · " : ""}
          {ranking.rankDisplay}
        </p>
        {record.healthRanking?.source === "estimated" && ranking.sourceNote && (
          <p className="health-ranking-hero-note">{ranking.sourceNote}</p>
        )}
      </div>
    </div>
  );
}
