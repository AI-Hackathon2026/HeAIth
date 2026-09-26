import { IKnhanesAdapterFilters } from "../port/I.knhanes.adapter";
import KnhanesService from "./knhanes.service";

export class KnhanesGroundingService {
  constructor(private knService: KnhanesService) {}

  /**
   * Build a grounded routine based on user demographics.
   * - checks meal skipping prevalence from '14. 식생활행태.xlsx'
   * - checks nutrient intake ratios from '12. 영양소별 섭취기준 대비비율.xlsx'
   * Returns structured JSON describing available data and a simple weekly routine.
   */
  async buildRoutine(demographics: { sex?: string; age?: string; income?: string }) {
    const filters: IKnhanesAdapterFilters = {
      sex: demographics.sex,
      age: demographics.age,
      income: demographics.income,
    };

    const mealSkip = await this.knService.queryMetric("14. 식생활행태.xlsx", "식사 거르는 비율", filters);
    const rdaProtein = await this.knService.queryMetric("12. 영양소별 섭취기준 대비비율.xlsx", "단백질", filters);
    const rdaCalories = await this.knService.queryMetric("12. 영양소별 섭취기준 대비비율.xlsx", "에너지(열량)", filters);

    const result: any = { demographics: filters, findings: {}, routine: null };

    if (!mealSkip) result.findings.mealSkip = { available: false, message: "'14. 식생활행태.xlsx'에서 해당 교차표를 찾을 수 없음" };
    else result.findings.mealSkip = { available: true, value: mealSkip.value, raw: mealSkip.raw };

    if (!rdaProtein) result.findings.protein = { available: false, message: "단백질 RDA 비율 자료를 찾을 수 없음" };
    else result.findings.protein = { available: true, value: rdaProtein.value, raw: rdaProtein.raw };

    if (!rdaCalories) result.findings.calories = { available: false, message: "에너지 RDA 비율 자료를 찾을 수 없음" };
    else result.findings.calories = { available: true, value: rdaCalories.value, raw: rdaCalories.raw };

    // Simple routine logic: if meal skipping prevalence is high (>30%) suggest breakfast-focused routine
    if (mealSkip && mealSkip.value !== null) {
      if (mealSkip.value > 30) {
        result.routine = {
          title: "아침 챙기기 주간 루틴",
          week: [
            "월: 단백질 중심 아침 (계란+두부/요거트)",
            "화: 곡물+과일+견과류",
            "수: 단백질 쉐이크 + 바나나",
            "목: 계란 샌드위치 + 야채",
            "금: 현미죽 + 김치",
            "토: 외식 시 단백질 우선 선택",
            "일: 간단한 오트밀과 과일",
          ],
          reason: "동일 연령대에서 식사를 거르는 비율이 높아, 규칙적 아침 섭취를 권장합니다."
        };
      } else {
        result.routine = {
          title: "균형 영양 주간 루틴",
          week: [
            "월: 단백질 + 채소 중심 식사",
            "화: 생선 또는 콩류 포함",
            "수: 통곡물 중심",
            "목: 채소 풍부한 샐러드 + 견과",
            "금: 가공식품 최소화",
            "토: 외식 시 야채와 단백질 우선",
            "일: 통곡물과 과일 섭취",
          ],
          reason: "식사 거름 비율이 비교적 낮아 균형 있는 식단을 권장합니다."
        };
      }
    } else {
      result.routine = { title: "데이터 부족으로 루틴 기본안", week: [], reason: "지역/연령별 상세 데이터가 없습니다." };
    }

    return result;
  }
}

export default KnhanesGroundingService;
