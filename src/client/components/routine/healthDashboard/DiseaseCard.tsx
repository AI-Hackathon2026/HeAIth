import { RISK_CONFIG, type RiskLevel } from "../../../constants/risk-colors";

interface DiseaseCardProps {
  name: string;
  rateLabel: string;
  footerValue: string;
  description: string;
  riskLevel: RiskLevel;
  barWidth: number;
}

export function DiseaseCard({
  name,
  rateLabel,
  footerValue,
  description,
  riskLevel,
  barWidth,
}: DiseaseCardProps) {
  const cfg = RISK_CONFIG[riskLevel];

  return (
    <li
      className="health-disease-card"
      style={{ borderColor: cfg.borderAlpha || "rgba(255,255,255,0.06)" }}
    >
      <div className="health-disease-card-head">
        <span className="health-disease-card-name">{name}</span>
        <span
          className="health-disease-card-badge"
          style={{ background: cfg.bgAlpha, color: cfg.color }}
        >
          {rateLabel}
        </span>
      </div>

      <p className="health-disease-card-desc">{description}</p>

      <div className="health-disease-card-bar-wrap">
        <div
          className="health-disease-card-bar"
          style={{
            width: `${Math.max(barWidth, riskLevel === "GOOD" && barWidth > 0 ? 4 : 0)}%`,
            background: cfg.color,
          }}
        />
      </div>

      <div className="health-disease-card-foot">
        <span className="health-disease-card-pct" style={{ color: cfg.color }}>
          {footerValue}
        </span>
        <span
          className="health-disease-card-status"
          style={{ background: cfg.bgAlpha, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>
    </li>
  );
}
