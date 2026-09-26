export const LEVEL_LABELS: Record<number, string> = {
  1: "고도비만",
  2: "비만",
  3: "과체중 심각",
  4: "과체중",
  5: "약간 과체중",
  6: "정상 체중",
  7: "균형 체형",
  8: "건강 체형",
  9: "근육 체형",
  10: "헬창",
};

export const LEVEL_COLORS: Record<number, string> = {
  1: "#e05c2a",
  2: "#e8883a",
  3: "#f0a030",
  4: "#f0c040",
  5: "#c9a227",
  6: "#00c9a7",
  7: "#00c9a7",
  8: "#4d9fff",
  9: "#7b5cff",
  10: "#f0c040",
};

export const LEVEL_BADGES: Record<number, string[]> = {
  1: ["루틴 시작"],
  2: ["7일 연속"],
  3: ["첫 식단 완료"],
  4: ["21일 달성"],
  5: ["운동 10회"],
  6: ["한달 완주"],
  7: ["체중 감량"],
  8: ["3개월 달성"],
  9: ["만성질환 개선"],
  10: ["6개월 완주", "최고 건강"],
};

export const AVATAR_MAX_LEVEL = 10;
export const AVATAR_XP_PER_LEVEL = 100;
