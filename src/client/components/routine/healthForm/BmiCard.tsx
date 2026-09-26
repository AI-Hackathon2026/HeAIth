import {
  BMI_AVERAGE_BY_GROUP,
  calcBmi,
  estimateBmiPercentile,
  formatAgeGroupLabel,
  getAgeGroup,
  getBmiStatus,
} from "../../../constants/knhanes-bmi";
import type { Gender } from "../../../types";

interface BmiCardProps {
  weight: number;
  height: number;
  gender: Gender;
  age: number;
}

export function BmiCard({ weight, height, gender, age }: BmiCardProps) {
  const bmi = calcBmi(weight, height);
  const ageGroup = getAgeGroup(age);
  const groupAvg = BMI_AVERAGE_BY_GROUP[gender][ageGroup] ?? 25;
  const { label, color } = getBmiStatus(bmi);
  const percentile = estimateBmiPercentile(bmi, groupAvg);

  return (
    <div className="health-form-bmi-card">
      <div className="health-form-bmi-value">{bmi.toFixed(1)}</div>
      <div className="health-form-bmi-body">
        <p className="health-form-bmi-caption">내 BMI</p>
        <p className="health-form-bmi-status" style={{ color }}>
          {label}
        </p>
        <p className="health-form-bmi-compare">
          {formatAgeGroupLabel(ageGroup, gender)} 평균 BMI {groupAvg} 대비
        </p>
      </div>
      <div className="health-form-bmi-percentile">
        <p className="health-form-bmi-caption">동연령 상위</p>
        <p className="health-form-bmi-pct">{percentile}%</p>
      </div>
    </div>
  );
}
