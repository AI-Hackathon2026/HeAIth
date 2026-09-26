import { DayOfWeekType, Difficulty, Role } from "@/server/shared/types/enums";
import { IAI } from "../../port/I.ai.model";
import { IUnitOfWork } from "../../port/repo/I.unit.of.work";
import { IRoutineCommandRepo } from "../../port/repo/command/I.routine.command.repo";
import { IRoutineQueryRepo } from "../../port/repo/query/I.routine.query.repo";
import { IHealthStatusQueryRepo } from "../../port/repo/query/I.health-status.query.repo";
import { IHealthRecordQueryRepo } from "../../port/repo/query/I.health-record.query.repo";
import { IChatCommandRepo } from "../../port/repo/command/I.chat.command.repo";
import { IChatQueryRepo } from "../../port/repo/query/I.chat.query.repo";
import { IMessageCommandRepo } from "../../port/repo/command/I.message.command.repo";
import { BusinessException, BusinessExceptionType } from "../../../shared/exceptions/business.exception";
import { HealthRecordEntity } from "../entity/health-record.entity";
import { HealthStatusEntity } from "../entity/health.status.entity";
import { RoutineEntity } from "../entity/routine.entity";
import { ChatEntity } from "../entity/chat.entity";
import { MessageEntity } from "../entity/message.entity";
import {
    parseRoutineGenerationJson,
    parseRoutineAdjustmentJson,
    mergeThreeMeals,
    zipRoutineDays,
    buildFallbackReportReadme,
    buildRoutineRagSearchTerms,
    RoutineDayChange,
} from "../../../shared/utils/routine-generation.util";
import { RoutinePayload, DailyRoutineScheduleView, RoutineScheduleView } from "../../query/view/routine.view";
import { NutritionPlanEntity } from "../entity/nutrition.plan.entity";
import { ExercisePlanEntity } from "../entity/exercise.plan.entity";
import { IDailyRoutineCommandRepo } from "../../port/repo/command/I.daily.routine.command.repo";
import { INutritionPlanCommandRepo } from "../../port/repo/command/I.nutrition.plan.command.repo";
import { INutritionSummaryCommandRepo } from "../../port/repo/command/I.nutrition.summary.command.repo";
import { IExercisePlanCommandRepo } from "../../port/repo/command/I.exercise.command.repo";
import { INutritionPlanQueryRepo } from "../../port/repo/query/I.nutrition.plan.query.repo";
import { INutritionFoodItemCommandRepo } from "../../port/repo/command/I.nutrition.food.item.command.repo";
import { INutritionFoodItemQueryRepo } from "../../port/repo/query/I.nutrition.food.item.query.repo";
import { IExercisePlanQueryRepo } from "../../port/repo/query/I.exercise.plan.query.repo";
import { IFileQueryRepo } from "../../port/repo/query/I.file.query.repo";
import { DailyRoutineEntity } from "../entity/daily.routine.entity";
import { PlanProgressUpdateView } from "../../query/view/routine.view";
import { resolveProgressPercentage, toPlanProgress } from "../../../shared/utils/plan-progress.util";
import { computeNutritionSummaryFromMeals } from "../../../shared/utils/nutrition-summary.util";
import { computeAggregateProgressPercentages } from "../../../shared/utils/nutrition-food.util";
import { CharacterCommandService } from "./character.command.service";
import { PlanType } from "@/server/shared/types/enums";

export class RoutineCommandService {
    constructor(
        private uow: IUnitOfWork,
        private ai: IAI,
        private routineCommandRepo: IRoutineCommandRepo,
        private routineQueryRepo: IRoutineQueryRepo,
        private healthStatusQueryRepo: IHealthStatusQueryRepo,
        private healthRecordQueryRepo: IHealthRecordQueryRepo,
        private dailyRoutineCommandRepo: IDailyRoutineCommandRepo,
        private nutritionPlanCommandRepo: INutritionPlanCommandRepo,
        private nutritionSummaryCommandRepo: INutritionSummaryCommandRepo,
        private exercisePlanCommandRepo: IExercisePlanCommandRepo,
        private nutritionPlanQueryRepo: INutritionPlanQueryRepo,
        private nutritionFoodItemCommandRepo: INutritionFoodItemCommandRepo,
        private nutritionFoodItemQueryRepo: INutritionFoodItemQueryRepo,
        private exercisePlanQueryRepo: IExercisePlanQueryRepo,
        private fileQueryRepo: IFileQueryRepo,
        private characterCommandService: CharacterCommandService,
        private chatCommandRepo: IChatCommandRepo,
        private chatQueryRepo: IChatQueryRepo,
        private messageCommandRepo: IMessageCommandRepo,

    ) { }

    async generateRoutine(userId: string, difficulty: Difficulty): Promise<RoutinePayload> {
        try {
            const healthStatus = await this.healthStatusQueryRepo.findByUserId(userId);
            const healthRecord = await this.healthRecordQueryRepo.findByUserId(userId);

            if (!healthStatus || !healthRecord) {
                throw new BusinessException({ type: BusinessExceptionType.HEALTH_STATUS_NOT_FOUND });
            }

            const searchTerms = buildRoutineRagSearchTerms(healthRecord.exposureRates);
            const snippets = await this.fileQueryRepo.findRelevantSnippets(searchTerms, 10);

            const prompt = this.buildRoutinePrompt(healthStatus, healthRecord, difficulty);
            const rawJson = await this.ai.gemini.generateRoutineStructured(prompt, snippets);
            const data = parseRoutineGenerationJson(rawJson);

            if (!data.reportReadme.trim()) {
                data.reportReadme = buildFallbackReportReadme(
                    healthRecord.exposureRates,
                    difficulty,
                    data.routine,
                );
            }

            return await this._persistGeneratedRoutine(userId, difficulty, data);
        } catch (error) {
            if (error instanceof BusinessException) throw error;
            console.error(error);
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_GENERATION_FAILED });
        }
    }

    async deleteAllRoutines(userId: string): Promise<void> {
        await this.routineCommandRepo.deleteByUserId(userId);
    }

    async updateRoutine(userId: string, difficulty: Difficulty): Promise<RoutinePayload> {
        await this.deleteAllRoutines(userId);
        return this.generateRoutine(userId, difficulty);
    }

    private async _persistGeneratedRoutine(
        userId: string,
        difficulty: Difficulty,
        data: RoutinePayload,
    ): Promise<RoutinePayload> {
        const routine = RoutineEntity.create({
            userId,
            difficulty,
            summary: data.summary,
            reportReadme: data.reportReadme,
            report: data.summary,
            isActive: true,
        });
        const createdRoutine = await this.routineCommandRepo.create(routine);

        const zippedDays = zipRoutineDays(data);
        const createdDailyRoutines = await this.dailyRoutineCommandRepo.createMany(
            zippedDays.map(({ dayOfWeek }) =>
                DailyRoutineEntity.create({
                    routineId: createdRoutine.id,
                    dayOfWeek,
                }),
            ),
        );

        const nutritionPlans: NutritionPlanEntity[] = [];
        const exercisePlans: ExercisePlanEntity[] = [];

        zippedDays.forEach(({ dayPlan }, index) => {
            const dailyRoutineId = createdDailyRoutines[index].id;

            for (const nutritionDay of dayPlan.nutritionRoutine) {
                for (const meal of nutritionDay.meals) {
                    nutritionPlans.push(
                        NutritionPlanEntity.create({
                            dailyRoutineId,
                            mealType: meal.mealType,
                            foods: meal.foods,
                            foodItems: meal.foodItems,
                            calories: meal.calories,
                        }),
                    );
                }
            }

            for (const exercise of dayPlan.exerciseRoutine) {
                exercisePlans.push(
                    ExercisePlanEntity.create({
                        dailyRoutineId,
                        exercise,
                    }),
                );
            }
        });

        await Promise.all([
            this.nutritionPlanCommandRepo.createMany(nutritionPlans),
            this.exercisePlanCommandRepo.createMany(exercisePlans),
            ...zippedDays.map(({ dayPlan }, index) => {
                const nutritionDay = dayPlan.nutritionRoutine[0];
                if (!nutritionDay?.nutritionSummary) {
                    return Promise.resolve();
                }
                return this.nutritionSummaryCommandRepo.attachToDailyRoutine(
                    createdDailyRoutines[index].id,
                    nutritionDay.nutritionSummary,
                );
            }),
        ]);

        return data;
    }

    async updateNutritionFoodItemProgress(
        userId: string,
        foodItemId: string,
        input: { progressionBar?: number; isCompleted?: boolean },
    ): Promise<PlanProgressUpdateView> {
        const owned = await this.nutritionFoodItemQueryRepo.findOwnedById(foodItemId);
        if (!owned || owned.userId !== userId) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_TASK_NOT_FOUND });
        }

        const progressPercentage = resolveProgressPercentage(input);
        await this.nutritionFoodItemCommandRepo.updateProgress(foodItemId, progressPercentage);

        const siblings = await this.nutritionFoodItemCommandRepo.listByNutritionPlanId(
            owned.nutritionPlanId,
        );
        const mealProgress = computeAggregateProgressPercentages(siblings);
        await this.nutritionPlanCommandRepo.updateProgress(owned.nutritionPlanId, mealProgress);

        const reward = await this.characterCommandService.onPlanProgressUpdated(
            userId,
            owned.routineId,
            foodItemId,
            PlanType.NUTRITION,
            progressPercentage,
        );

        return {
            id: foodItemId,
            ...toPlanProgress(progressPercentage),
            ...reward,
        };
    }

    async updateNutritionPlanProgress(
        userId: string,
        planId: string,
        input: { progressionBar?: number; isCompleted?: boolean },
    ): Promise<PlanProgressUpdateView> {
        const owned = await this.nutritionPlanQueryRepo.findOwnedById(planId);
        if (!owned || owned.userId !== userId) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_TASK_NOT_FOUND });
        }

        const progressPercentage = resolveProgressPercentage(input);
        await this.nutritionPlanCommandRepo.updateProgress(planId, progressPercentage);

        const reward = await this.characterCommandService.onPlanProgressUpdated(
            userId,
            owned.routineId,
            planId,
            PlanType.NUTRITION,
            progressPercentage,
        );

        return {
            id: planId,
            ...toPlanProgress(progressPercentage),
            ...reward,
        };
    }

    async updateExercisePlanProgress(
        userId: string,
        planId: string,
        input: { progressionBar?: number; isCompleted?: boolean },
    ): Promise<PlanProgressUpdateView> {
        const owned = await this.exercisePlanQueryRepo.findOwnedById(planId);
        if (!owned || owned.userId !== userId) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_TASK_NOT_FOUND });
        }

        const progressPercentage = resolveProgressPercentage(input);
        await this.exercisePlanCommandRepo.updateProgress(planId, progressPercentage);

        const reward = await this.characterCommandService.onPlanProgressUpdated(
            userId,
            owned.routineId,
            planId,
            PlanType.EXERCISE,
            progressPercentage,
        );

        return {
            id: planId,
            ...toPlanProgress(progressPercentage),
            ...reward,
        };
    }

    async ensureRoutineChat(userId: string): Promise<{ chatId: string; routineId: string }> {
        const meta = await this.routineQueryRepo.findActiveMetaByUserId(userId);
        if (!meta) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_NOT_FOUND });
        }

        const existing = await this.chatQueryRepo.findByUserIdAndRoutineId(userId, meta.id);
        if (existing) {
            return { chatId: existing.id, routineId: meta.id };
        }

        const created = await this.chatCommandRepo.create(
            new ChatEntity({
                userId,
                title: "AI 루틴 상담",
                routineId: meta.id,
            }),
        );

        if (!created.id) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_NOT_FOUND });
        }

        return { chatId: created.id, routineId: meta.id };
    }

    async adjustRoutineViaChat(
        userId: string,
        chatId: string,
        userMessage: string,
    ): Promise<{
        aiResponse: string;
        routineUpdated: boolean;
        routine?: { id: string; summary: string; days: DailyRoutineScheduleView[] };
    }> {
        const chat = await this.chatQueryRepo.findById(chatId);
        if (!chat || chat.userId !== userId || !chat.routineId) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_NOT_FOUND });
        }

        const meta = await this.routineQueryRepo.findActiveMetaByUserId(userId);
        if (!meta || meta.id !== chat.routineId) {
            throw new BusinessException({ type: BusinessExceptionType.ROUTINE_NOT_FOUND });
        }

        const searchTerms = userMessage.split(/\s+/).filter((w) => w.length >= 2).slice(0, 8);
        const snippets = await this.fileQueryRepo.findRelevantSnippets(searchTerms, 6);

        const prompt = this._buildRoutineAdjustmentPrompt(meta.schedule, userMessage);
        const rawJson = await this.ai.gemini.adjustRoutineStructured(prompt, snippets);

        let aiResponse: string;
        let routineUpdated = false;

        try {
            const adjustment = parseRoutineAdjustmentJson(rawJson);

            if (adjustment.summary) {
                await this.routineCommandRepo.update(chat.routineId, {
                    summary: adjustment.summary,
                    report: adjustment.summary,
                });
                routineUpdated = true;
            }

            if (adjustment.dayChanges.length > 0) {
                await this._applyRoutineDayChanges(meta.schedule.days, adjustment.dayChanges);
                routineUpdated = true;
            }

            aiResponse = adjustment.userMessage;
        } catch {
            aiResponse = rawJson.trim() || "요청을 이해하지 못했어요. 다시 말씀해 주세요.";
        }

        await this.uow.do(
            async () => {
                await this.messageCommandRepo.create(
                    new MessageEntity({ role: Role.USER, chatId, text: userMessage }),
                );
                await this.messageCommandRepo.create(
                    new MessageEntity({ role: Role.AI, chatId, text: aiResponse }),
                );
            },
            {
                transactionOptions: { useTransaction: true, isolationLevel: "ReadCommitted" },
                useOptimisticLock: false,
            },
        );

        if (!routineUpdated) {
            return { aiResponse, routineUpdated: false };
        }

        const updated = await this.routineQueryRepo.findActiveMetaByUserId(userId);
        if (!updated) {
            return { aiResponse, routineUpdated: true };
        }

        return {
            aiResponse,
            routineUpdated: true,
            routine: {
                id: updated.id,
                summary: updated.schedule.summary,
                days: updated.schedule.days,
            },
        };
    }

    private async _applyRoutineDayChanges(
        currentDays: DailyRoutineScheduleView[],
        dayChanges: RoutineDayChange[],
    ): Promise<void> {
        const dailyIdByDay = new Map(
            currentDays.map((day) => [day.dayOfWeek, day.dailyRoutineId]),
        );

        for (const change of dayChanges) {
            const dailyRoutineId = dailyIdByDay.get(change.dayOfWeek);
            if (!dailyRoutineId) continue;

            const currentDay = currentDays.find((day) => day.dayOfWeek === change.dayOfWeek);

            if (change.nutritionRoutine?.length) {
                const incomingMeals = change.nutritionRoutine.flatMap((nutritionDay) => nutritionDay.meals);
                const mergedMeals = mergeThreeMeals(
                    currentDay?.nutritionPlans ?? [],
                    incomingMeals,
                );

                await this.nutritionPlanCommandRepo.deleteByDailyRoutineIds([dailyRoutineId]);

                const nutritionPlans = mergedMeals.map((meal) =>
                    NutritionPlanEntity.create({
                        dailyRoutineId,
                        mealType: meal.mealType,
                        foods: meal.foods,
                        foodItems: meal.foodItems,
                        calories: meal.calories,
                    }),
                );

                await this.nutritionPlanCommandRepo.createMany(nutritionPlans);

                const summary = computeNutritionSummaryFromMeals(
                    mergedMeals.map((meal) => ({
                        foods: meal.foodItems.map((item) => item.name),
                        calories: meal.calories,
                    })),
                );
                await this.nutritionSummaryCommandRepo.attachToDailyRoutine(
                    dailyRoutineId,
                    summary,
                );
            }

            if (change.exerciseRoutine?.length) {
                await this.exercisePlanCommandRepo.deleteByDailyRoutineIds([dailyRoutineId]);

                const exercisePlans = change.exerciseRoutine.map((exercise) =>
                    ExercisePlanEntity.create({
                        dailyRoutineId,
                        exercise,
                    }),
                );

                await this.exercisePlanCommandRepo.createMany(exercisePlans);
            }
        }
    }

    private _buildRoutineAdjustmentPrompt(
        schedule: RoutineScheduleView,
        userMessage: string,
    ): string {
        const routineContext = schedule.days.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            nutritionPlans: day.nutritionPlans.map((plan) => ({
                mealType: plan.mealType,
                calories: plan.calories,
                foods: plan.foodItems.map((item) => ({
                    name: item.name,
                    calories: item.calories,
                })),
            })),
            exercisePlans: day.exercisePlans.map((plan) => ({
                task: plan.task,
                frequency: plan.frequency,
            })),
        }));

        return `
현재 루틴 요약: ${schedule.summary}
난이도: ${schedule.difficulty}

현재 주간 루틴 (JSON):
${JSON.stringify(routineContext, null, 2)}

사용자 요청: "${userMessage}"

아래 JSON 형식으로만 응답하세요 (마크다운 없이 순수 JSON):
{
  "userMessage": "사용자에게 보낼 자연스러운 한국어 답변 (해요체). 변경 사항을 설명하세요.",
  "summary": "루틴 한 줄 요약을 바꿀 때만 새 문장, 아니면 null",
  "dayChanges": [
    {
      "dayOfWeek": "MONDAY",
      "nutritionRoutine": [
        {
          "meals": [
            {
              "mealType": "BREAKFAST",
              "foods": [{ "name": "음식명", "calories": 300 }],
              "calories": 300
            },
            {
              "mealType": "LUNCH",
              "foods": [{ "name": "음식명", "calories": 500 }],
              "calories": 500
            },
            {
              "mealType": "DINNER",
              "foods": [{ "name": "음식명", "calories": 550 }],
              "calories": 550
            }
          ],
          "averageCalories": 1500
        }
      ],
      "exerciseRoutine": [{ "task": "20분 걷기", "frequency": "1회" }]
    }
  ]
}

규칙:
- 일반 질문(설명, 팁)만이면 dayChanges는 []이고 summary는 null.
- 식단·운동 조정 요청일 때만 dayChanges에 해당 요일을 넣으세요.
- nutritionRoutine을 포함할 때 meals는 반드시 BREAKFAST, LUNCH, DINNER 3끼 모두 포함하세요.
- 변경하지 않는 끼니는 현재 루틴 JSON의 해당 요일 식단을 그대로 복사하세요.
- exerciseRoutine만 바꿀 때는 nutritionRoutine을 생략해도 됩니다.
- mealType: BREAKFAST, LUNCH, DINNER.
- foods는 { name, calories } 객체 배열, meal calories = foods 합.
- 현실적인 음식별 칼로리를 사용하세요.
- 요일마다 다른 메뉴: 식단을 바꿀 때 현재 주간 루틴의 다른 요일과 동일한 식사 조합을 만들지 마세요. 변경하는 요일은 다른 날과 구분되는 메뉴로 구성하세요.
        `.trim();
    }


    private buildRoutinePrompt(
        hs: HealthStatusEntity,
        hr: HealthRecordEntity,
        difficulty: Difficulty,
    ): string {
        const daysMap: Record<Difficulty, string> = {
            EASY: "주 2회",
            MODERATE: "주 5회",
            HARD: "매일",
        };

        const exampleDays: Record<Difficulty, DayOfWeekType[]> = {
            EASY: ["MONDAY", "THURSDAY"],
            MODERATE: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
            HARD: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
        };

        const days = exampleDays[difficulty];
        const dayListJson = JSON.stringify(days);

        return `
사용자 프로필:
- ${hs.gender} ${hs.age}세, BMI ${hr.bmi}
- 운동 ${hs.exerciseFreq}회/주, 음주 ${hs.alcoholFreq}회/주, 흡연 ${hs.smokeFreq}회/주
- 건강 위험 노출: ${JSON.stringify(hr.exposureRates)} (percentage out of 100)
- 루틴 난이도: ${difficulty} (${daysMap[difficulty]})

다음 작업을 수행하세요:
1. report: 이 루틴이 무엇인지 줄거리 한 문장 (120자 이내, 해요체). 나이·성별·BMI·난이도·출처·"(출처:...)" 절대 넣지 마세요.
2. reportReadme: README 마크다운 (3500자 이내). routine에 실제로 포함된 음식·운동만 설명하세요. DOCUMENT CONTEXT를 근거로 작성하되, 출처·페이지는 ## 참고 문헌에만 적으세요.
3. DOCUMENT CONTEXT의 국민건강통계를 참고해 요일별 routine을 생성하세요.
   - 각 요일(월~일)마다 아침·점심·저녁 메뉴 구성을 서로 다르게 설계하세요.
   - 같은 주 안에서 요일 간 동일한 식사(같은 음식 조합)를 반복하지 마세요.
   - 밥·국 등 기본 반찬은 가끔 겹쳐도 되지만, 메인 단백질·반찬·나물 조합은 요일별로 바꾸세요.
4. nutritionSummary는 JSON에 포함하지 마세요. 서버가 식단(meals)을 분석해 자동 계산합니다.
   - 모든 영양소 퍼센트는 하루 영양 구성비이며, 합계가 정확히 100%가 됩니다.
   - 단백질·탄수화물·지방: 칼로리 매크로 비율 (합 55%)
   - 비타민·칼슘: 영양소 비중 (합 25%)
   - 식이섬유·당·나트륨·콜레스테롤: 관리·균형 비중 (합 20%)
   - 각 항목을 0~100% 권장량 충족률처럼 따로 적지 마세요. Gemini가 퍼센트를 생성하면 안 됩니다.
5. 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON).

reportReadme 필수 구조:
## 왜 이 루틴인가요
(완전한 문장 1~2개: 사용자 위험 요인 기반 설계 이유)

## 음식별 영양소·만성질환 예방
routine에 포함된 각 음식마다 완전한 한 문장(해요체). 화살표(→)나 나열식 키워드만 쓰지 마세요. 줄마다 출처를 붙이지 마세요.
- **{음식명}**: {영양소 설명과 만성질환 예방 효과를 자연스러운 한 문장으로}

## 운동 설계
routine에 포함된 각 운동마다 완전한 한 문장(해요체). 화살표(→) 금지. 줄마다 출처를 붙이지 마세요.
- **{운동명}**: {어떤 유형의 운동인지, 신체·만성질환에 어떤 도움이 되는지 한 문장으로}

## 참고 문헌
DOCUMENT CONTEXT에서 참고한 문서·페이지만 나열 (예: - 2024 국민건강통계.pdf, 130·45페이지)

{
  "report": "매일 유산소·근력 운동과 절주·저염 식단으로 흡연·음주 습관을 줄이고 체중을 관리하는 루틴이에요.",
  "reportReadme": "## 왜 이 루틴인가요\\n흡연·음주·운동 부족을 보완하도록 맞춤 설계했어요.\\n\\n## 음식별 영양소·만성질환 예방\\n- **현미밥**: 현미밥은 식이섬유와 비타민B가 풍부해 혈당 상승을 완만하게 하고 체중 관리에 도움을 주어 당뇨와 비만 예방에 좋아요.\\n- **계란**: 계란은 고품질 단백질과 비타민D를 제공해 근육 유지와 대사 건강을 돕고 만성질환 위험을 낮춰요.\\n\\n## 운동 설계\\n- **30분 걷기**: 유산소 운동으로 설계했으며, 규칙적인 걷기는 심혈관 기능을 개선하고 고혈압·당뇨·비만 위험을 낮추는 데 도움이 돼요.\\n\\n## 참고 문헌\\n- 2024 국민건강통계.pdf, 130·45·67페이지",
  "routine": [
    {
      "exerciseRoutine": [
        { "task": "30분 걷기", "frequency": "1회" }
      ],
      "nutritionRoutine": [
        {
          "meals": [
            {
              "mealType": "BREAKFAST",
              "foods": [
                { "name": "현미밥", "calories": 280 },
                { "name": "계란", "calories": 170 }
              ],
              "calories": 450
            },
            {
              "mealType": "LUNCH",
              "foods": [
                { "name": "닭가슴살", "calories": 320 },
                { "name": "샐러드", "calories": 230 }
              ],
              "calories": 550
            },
            {
              "mealType": "DINNER",
              "foods": [
                { "name": "두부", "calories": 120 },
                { "name": "시금치나물", "calories": 45 },
                { "name": "고등어", "calories": 385 }
              ],
              "calories": 550
            }
          ],
          "averageCalories": 1500
        }
      ]
    }
  ],
  "days": ${dayListJson},
  "difficulty": "${difficulty}"
}

규칙:
- report와 reportReadme는 반드시 포함하세요. 둘 다 비어 있으면 안 됩니다.
- report는 루틴 줄거리 한 문장만. 프로필 요약·출처 금지.
- reportReadme 음식·운동 항목은 반드시 완전한 한 문장으로 작성하세요. → 화살표, 키워드 나열만, (출처: ...) 줄별 인용 금지.
- reportReadme ## 참고 문헌에만 DOCUMENT CONTEXT의 파일명·페이지를 적으세요. 없는 페이지 번호를 지어내지 마세요.
- routine 배열 길이는 days와 같아야 합니다 (${days.length}개). days의 ${days.length}개 요일 각각에 routine 항목 1개.
- days 배열에는 같은 요일을 중복하지 마세요.
- exerciseRoutine, nutritionRoutine은 반드시 배열([])입니다.
- nutritionRoutine 항목은 meals, averageCalories만 포함합니다. nutritionSummary 필드는 JSON에 넣지 마세요 (서버 자동 계산, 전체 합 100%).
- mealType은 BREAKFAST, LUNCH, DINNER 중 하나입니다.
- foods는 문자열 배열이 아니라 { "name": "음식명", "calories": 숫자 } 객체 배열입니다.
- 각 음식 calories는 1인분 기준 현실적인 kcal이어야 합니다 (예: 고등어 > 두부 > 나물, 밥 > 채소).
- 같은 식사 안에서 모든 음식 calories를 동일하게 나누지 마세요.
- meal calories는 해당 식사 foods calories의 합과 정확히 같아야 합니다.
- averageCalories는 하루 meals calories 합계와 같아야 합니다.
- 요일마다 다른 식단: routine 배열의 각 항목(각 요일)은 서로 다른 meals 메뉴여야 합니다. 주간 전체에서 같은 아침/점심/저녁 조합을 복사·붙여넣기하지 마세요.
- ${difficulty} 난이도는 days를 정확히 ${days.length}개(${daysMap[difficulty]})로 구성합니다.
        `.trim();
    }
}
