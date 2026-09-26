import { z } from 'zod';
import { emailSchema, passwordSchema, usernameSchema } from './common.schema';
import { Role } from "@/server/shared/types/enums";

// 유저 회원가입
export const createUserSchema = z.object({
    role: z.enum(Role),
    email: emailSchema,
    password: passwordSchema,
    username: usernameSchema,
});


export const signInSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});


export type CreateUserDto = z.infer<typeof createUserSchema>;
export type SignInDto = z.infer<typeof signInSchema>;


