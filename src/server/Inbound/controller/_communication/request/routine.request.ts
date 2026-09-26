import { Difficulty } from "@/server/shared/types/enums";
import z from "zod";

export const generateRoutineSchema = z.object({
    difficulty: z.nativeEnum(Difficulty),
});

export const routineChatMessageSchema = z.object({
    text: z.string().min(1),
});

export const routineLogSchema = z.object({
    completed: z.boolean(),
});

export const taskLogSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    completed: z.boolean(),
});

export type GenerateRoutineDto = z.infer<typeof generateRoutineSchema>;
export type RoutineChatMessageDto = z.infer<typeof routineChatMessageSchema>;
export type RoutineLogDto = z.infer<typeof routineLogSchema>;
export const updatePlanProgressSchema = z
    .object({
        progressionBar: z.number().int().min(0).max(100).optional(),
        isCompleted: z.boolean().optional(),
    })
    .refine((data) => data.progressionBar !== undefined || data.isCompleted !== undefined, {
        message: "progressionBar or isCompleted is required",
    });

export type UpdatePlanProgressDto = z.infer<typeof updatePlanProgressSchema>;
