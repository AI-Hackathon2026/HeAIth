import { z } from "zod";

export const knhanesQuerySchema = z.object({
  fileName: z.string().min(1),
  metric: z.string().min(1),
  filters: z.object({
    sex: z.string().optional(),
    age: z.string().optional(),
    income: z.string().optional(),
  }).optional(),
  userValue: z.number().optional(),
});

export type KnhanesQueryDto = z.infer<typeof knhanesQuerySchema>;
