export const RISK_CONFIG = {
  CRITICAL: {
    color: "#ff5050",
    bgAlpha: "rgba(255, 80, 80, 0.12)",
    borderAlpha: "rgba(255, 80, 80, 0.20)",
    label: "심각",
  },
  WARNING: {
    color: "#f0a030",
    bgAlpha: "rgba(240, 160, 48, 0.12)",
    borderAlpha: "rgba(240, 160, 48, 0.20)",
    label: "경고",
  },
  CAUTION: {
    color: "#f0a030",
    bgAlpha: "rgba(240, 160, 48, 0.12)",
    borderAlpha: "rgba(240, 160, 48, 0.20)",
    label: "주의",
  },
  GOOD: {
    color: "#00c9a7",
    bgAlpha: "rgba(0, 201, 167, 0.10)",
    borderAlpha: "rgba(0, 201, 167, 0.00)",
    label: "양호",
  },
} as const;

export type RiskLevel = keyof typeof RISK_CONFIG;
