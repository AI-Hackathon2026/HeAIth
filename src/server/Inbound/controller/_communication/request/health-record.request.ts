import { DiseaseType } from "@/server/shared/types/enums";
import z from "zod";

export const projectionQuerySchema = z.object({
    disease: z.nativeEnum(DiseaseType),
});

export type ProjectionQueryDto = z.infer<typeof projectionQuerySchema>;
