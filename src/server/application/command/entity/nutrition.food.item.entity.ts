export type PersistNutritionFoodItemEntity = NutritionFoodItemEntity & {
    id: string;
};

export class NutritionFoodItemEntity {
    id?: string;
    nutritionPlanId: string;
    name: string;
    calories: number;
    sortOrder: number;
    progressPercentage: number;

    constructor(data: {
        id?: string;
        nutritionPlanId: string;
        name: string;
        calories: number;
        sortOrder: number;
        progressPercentage?: number;
    }) {
        this.id = data.id;
        this.nutritionPlanId = data.nutritionPlanId;
        this.name = data.name;
        this.calories = data.calories;
        this.sortOrder = data.sortOrder;
        this.progressPercentage = data.progressPercentage ?? 0;
    }

    static create(data: {
        nutritionPlanId: string;
        name: string;
        calories: number;
        sortOrder: number;
        progressPercentage?: number;
    }): NutritionFoodItemEntity {
        return new NutritionFoodItemEntity(data);
    }

    static persist(data: {
        id: string;
        nutritionPlanId: string;
        name: string;
        calories: number;
        sortOrder: number;
        progressPercentage?: number;
    }): PersistNutritionFoodItemEntity {
        return new NutritionFoodItemEntity({
            ...data,
            progressPercentage: data.progressPercentage ?? 0,
        }) as PersistNutritionFoodItemEntity;
    }
}
