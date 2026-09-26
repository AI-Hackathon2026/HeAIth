import { HeroStyle } from "@/server/shared/types/enums";
import { z } from "zod";

export const patchCharacterHeroStyleSchema = z.object({
    heroStyle: z.nativeEnum(HeroStyle),
});

export type PatchCharacterHeroStyleDto = z.infer<typeof patchCharacterHeroStyleSchema>;
