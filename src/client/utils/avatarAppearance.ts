import type { Gender } from "../types";

export type AvatarBodyType =
  | "obese"
  | "overweight"
  | "average"
  | "fit"
  | "athletic";

const BODY_TYPES: AvatarBodyType[] = [
  "obese",
  "overweight",
  "average",
  "fit",
  "athletic",
];

export function getAvatarBodyType(
  bmi: number,
  obesityRate: number,
  level: number,
): AvatarBodyType {
  let base = 2;
  if (bmi >= 30 || obesityRate >= 50) base = 0;
  else if (bmi >= 27 || obesityRate >= 30) base = 1;
  else if (bmi >= 23 || obesityRate >= 15) base = 2;
  else if (bmi >= 18.5) base = 3;
  else base = 4;

  const idx = Math.min(4, base + Math.floor(level / 2));
  return BODY_TYPES[idx];
}

export function getAvatarTorsoScale(bodyType: AvatarBodyType): number {
  switch (bodyType) {
    case "obese":
      return 1.45;
    case "overweight":
      return 1.22;
    case "average":
      return 1;
    case "fit":
      return 0.88;
    case "athletic":
      return 0.78;
  }
}

export function getAvatarGlowColor(bodyType: AvatarBodyType): string {
  switch (bodyType) {
    case "obese":
      return "#e8883a";
    case "overweight":
      return "#c9a227";
    case "average":
      return "#00e5c0";
    case "fit":
      return "#4d9fff";
    case "athletic":
      return "#7b5cff";
  }
}

export interface AvatarProfile {
  gender: Gender;
  bmi: number;
  obesityRate: number;
}

export function getDefaultAvatarProfile(): AvatarProfile {
  return { gender: "MALE", bmi: 23, obesityRate: 0 };
}
