import { MealType } from "@/server/shared/types/enums";
import { splitCaloriesAcrossFoods } from "../../../shared/utils/nutrition-food.util";
import { RoutineFoodItemPlan } from "../../query/view/routine.view";

export type PersistNutritionPlanEntity = NutritionPlanEntity & {
    id: string;
};

export class NutritionPlanEntity {
    id?: string;
    dailyRoutineId: string;
    mealType: MealType;
    foods: string[];
    foodItems: RoutineFoodItemPlan[];
    calories: number;
    progressPercentage: number;

    constructor(data: {
        id?: string;
        dailyRoutineId: string;
        mealType: MealType;
        foods: string[];
        foodItems?: RoutineFoodItemPlan[];
        calories: number;
        progressPercentage?: number;
    }) {
        this.id = data.id;
        this.dailyRoutineId = data.dailyRoutineId;
        this.mealType = data.mealType;
        this.foodItems = data.foodItems ?? NutritionPlanEntity.buildFoodItems(data.foods, data.calories);
        this.foods = this.foodItems.map((item) => item.name);
        this.progressPercentage = data.progressPercentage ?? 0;
        this.calories = data.calories;
    }

    static create(data: {
        id?: string;
        dailyRoutineId: string;
        mealType: MealType;
        foods: string[];
        foodItems?: RoutineFoodItemPlan[];
        calories: number;
        progressPercentage?: number;
    }): NutritionPlanEntity {
        return new NutritionPlanEntity(data);
    }

    static persist(data: {
        id: string;
        dailyRoutineId: string;
        mealType: MealType;
        foods: string[];
        foodItems?: RoutineFoodItemPlan[];
        calories: number;
        progressPercentage?: number;
    }): PersistNutritionPlanEntity {
        return new NutritionPlanEntity({
            ...data,
            progressPercentage: data.progressPercentage ?? 0,
        }) as PersistNutritionPlanEntity;
    }

    static buildFoodItems(foods: string[], totalCalories: number): RoutineFoodItemPlan[] {
        const names = foods.length > 0 ? foods : ["메뉴 정보 없음"];
        const calories = splitCaloriesAcrossFoods(totalCalories, names.length);

        return names.map((name, index) => ({
            name,
            calories: calories[index] ?? 0,
        }));
    }
}
