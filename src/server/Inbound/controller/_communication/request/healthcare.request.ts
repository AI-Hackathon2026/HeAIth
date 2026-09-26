import z from "zod";
import { Gender } from "@/server/shared/types/enums";

export const createHealthstatusSchema = z.object({
    gender: z.nativeEnum(Gender),
    age: z.number().int().min(1).max(100),
    height: z.number().int().min(1),
    weight: z.number().int().min(1),
    alcoholFreq: z.number().int().min(0).max(7),
    smokeFreq: z.number().int().min(0).max(7),
    exerciseFreq: z.number().int().min(0).max(7),
});

export const updateHealthstatusSchema = createHealthstatusSchema.extend({
    id: z.string()
});

export type CreateHealthstatusDto = z.infer<typeof createHealthstatusSchema>;
export type UpdateHealthStatusDto = z.infer<typeof updateHealthstatusSchema>;
