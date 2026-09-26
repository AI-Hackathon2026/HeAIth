export type InsightSeverity = "safe" | "caution" | "warning" | "critical";

export interface HealthInsight {
  status: string;
  severity: InsightSeverity;
  detail: string;
}

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 23) return "normal";
  if (bmi < 25) return "overweight";
  return "obese";
}

export function getBmiInsight(
  bmi: number,
  heightCm: number,
  weightKg: number,
): HealthInsight {
  const heightM = heightCm / 100;
  const category = getBmiCategory(bmi);

  if (category === "normal") {
    return {
      status: "정상",
      severity: "safe",
      detail: `BMI ${bmi.toFixed(1)} — 건강 체중 범위(18.5~23)에 있습니다.`,
    };
  }

  if (category === "underweight") {
    const targetWeight = 18.5 * heightM * heightM;
    const gainKg = Math.max(0, targetWeight - weightKg);
    return {
      status: "저체중",
      severity: "warning",
      detail: `약 ${gainKg.toFixed(1)}kg 증가하면 정상 하한(BMI 18.5)에 도달합니다.`,
    };
  }

  const targetWeight = 23 * heightM * heightM;
  const loseKg = Math.max(0, weightKg - targetWeight);
  const isObese = category === "obese";

  return {
    status: isObese ? "비만" : "과체중",
    severity: isObese ? "critical" : "warning",
    detail: `약 ${loseKg.toFixed(1)}kg 감량하면 정상 상한(BMI 23)에 도달합니다.`,
  };
}

export function getSmokingInsight(smokeFreq: number): HealthInsight {
  if (smokeFreq <= 0) {
    return {
      status: "비흡연",
      severity: "safe",
      detail: "흡연하지 않습니다.",
    };
  }

  if (smokeFreq <= 2) {
    return {
      status: "흡연",
      severity: "warning",
      detail: `주 ${smokeFreq}일 흡연 — 금연이 필요합니다.`,
    };
  }

  return {
    status: "흡연",
    severity: "critical",
    detail: `주 ${smokeFreq}일 흡연 — 심각한 건강 위험입니다. 즉시 금연을 권장합니다.`,
  };
}

export function getAlcoholInsight(alcoholFreq: number): HealthInsight {
  if (alcoholFreq <= 0) {
    return {
      status: "비음주",
      severity: "safe",
      detail: "음주하지 않습니다.",
    };
  }

  if (alcoholFreq <= 2) {
    return {
      status: "음주",
      severity: "caution",
      detail: `주 ${alcoholFreq}일 음주 — 적정 음주량을 지켜 주세요.`,
    };
  }

  if (alcoholFreq <= 4) {
    return {
      status: "음주",
      severity: "warning",
      detail: `주 ${alcoholFreq}일 음주 — 건강에 주의가 필요합니다.`,
    };
  }

  return {
    status: "과음",
    severity: "critical",
    detail: `주 ${alcoholFreq}일 음주 — 심각한 수준입니다. 음주를 줄여 주세요.`,
  };
}

export function insightSeverityLabel(severity: InsightSeverity): string {
  switch (severity) {
    case "safe":
      return "양호";
    case "caution":
      return "주의";
    case "warning":
      return "경고";
    case "critical":
      return "심각";
  }
}

export function insightSeverityColor(severity: InsightSeverity): string {
  switch (severity) {
    case "safe":
      return "#22c55e";
    case "caution":
      return "#eab308";
    case "warning":
      return "#f97316";
    case "critical":
      return "#ef4444";
  }
}
