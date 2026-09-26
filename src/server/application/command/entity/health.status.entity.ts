import { Gender } from "@/server/shared/types/enums";
import { UpdateHealthStatusDto } from "../../../Inbound/controller/_communication/request/healthcare.request";

export class HealthStatusEntity {
    id?: string;
    userId: string;
    gender: Gender;
    age: number;
    height: number;
    weight: number;
    alcoholFreq: number;
    smokeFreq: number;
    exerciseFreq: number;

    constructor({
        id,
        userId,
        gender,
        age,
        height,
        weight,
        alcoholFreq,
        smokeFreq,
        exerciseFreq,
    }: {
        id?: string;
        userId: string;
        gender: Gender;
        age: number;
        height: number;
        weight: number;
        alcoholFreq: number;
        smokeFreq: number;
        exerciseFreq: number;
    }) {
        this.id = id;
        this.userId = userId;
        this.gender = gender;
        this.age = age;
        this.height = height;
        this.weight = weight;
        this.alcoholFreq = alcoholFreq;
        this.smokeFreq = smokeFreq;
        this.exerciseFreq = exerciseFreq;
    }

    static create(
        userId: string,
        dto: {
            gender: Gender;
            age: number;
            height: number;
            weight: number;
            alcoholFreq: number;
            smokeFreq: number;
            exerciseFreq: number;
        },
    ): HealthStatusEntity {
        return new HealthStatusEntity({ userId, ...dto });
    }

    update(dto: UpdateHealthStatusDto): HealthStatusEntity {
        return new HealthStatusEntity({ ...this, ...dto });
    }
}
