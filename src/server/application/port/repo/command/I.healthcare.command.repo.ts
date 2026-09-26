import { HealthStatusEntity } from "../../../command/entity/health.status.entity";

export interface IHealthcareCommandRepo {
    create(entity: HealthStatusEntity): Promise<HealthStatusEntity>;
    update(entity: HealthStatusEntity): Promise<HealthStatusEntity>;
    findByUserId(userId: string): Promise<HealthStatusEntity | null>;
}
