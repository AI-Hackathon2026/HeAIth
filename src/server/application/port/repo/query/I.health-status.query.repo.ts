import { HealthStatusEntity } from "../../../command/entity/health.status.entity";

export interface IHealthStatusQueryRepo {
    findByUserId(userId: string): Promise<HealthStatusEntity | null>;
}
