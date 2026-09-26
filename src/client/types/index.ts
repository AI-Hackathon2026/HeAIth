export interface ChatSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  from: "USER" | "AI";
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineChatMessage {
  id: string;
  role: "USER" | "AI";
  text: string;
  createdAt?: string;
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
}

export interface CreateChatResponse {
  id?: string;
  userId?: string;
  title: string;
}

export interface KnhanesFilters {
  sex?: string;
  age?: string;
  income?: string;
}

export interface KnhanesQueryRequest {
  fileName: string;
  metric: string;
  filters?: KnhanesFilters;
  userValue?: number;
}

export interface KnhanesSourceInfo {
  file: string;
  sheet: string;
  rowIndex?: number;
  colIndex?: number;
  raw: unknown;
}

export interface KnhanesQueryResponse {
  metricName: string;
  nationalAverage: number | null;
  source: KnhanesSourceInfo;
  userDeviation?: number;
  userDeviationPercent?: number;
}

export interface KnhanesFilesResponse {
  files: string[];
}

export interface KnhanesFinding {
  available: boolean;
  value?: number | null;
  raw?: unknown;
  message?: string;
}

export interface KnhanesRoutine {
  title: string;
  week: string[];
  reason: string;
}

export interface KnhanesGroundResponse {
  demographics: KnhanesFilters;
  findings: {
    mealSkip?: KnhanesFinding;
    protein?: KnhanesFinding;
    calories?: KnhanesFinding;
  };
  routine: KnhanesRoutine | null;
}

export type AppTab = "chat" | "knhanes" | "routine" | "admin";

export type RoutineDifficulty = "EASY" | "MODERATE" | "HARD";

export interface HealthStatusInput {
  gender: Gender;
  age: number;
  height: number;
  weight: number;
  alcoholFreq: number;
  smokeFreq: number;
  exerciseFreq: number;
}

export interface HealthStatus extends HealthStatusInput {
  id: string;
}

export interface ExposureRates {
  OBESITY?: number;
  HYPERTENSION?: number;
  DIABETES?: number;
  SMOKING?: number;
  ALCOHOL?: number;
  STRESS?: number;
}

export type HealthRankingSource = "peers" | "estimated";

export interface HealthRanking {
  percentile: number;
  rank: number;
  cohortSize: number;
  ageGroup: string;
  gender: Gender;
  source: HealthRankingSource;
}

export interface HealthRecordFormattedScore {
  value: number;
  display: string;
  label: string;
  progressPercent: number;
}

export interface HealthRecordFormattedRanking {
  title: string;
  cohortLabel: string;
  percentileDisplay: string;
  topDisplay: string;
  rankDisplay: string;
  sourceNote: string;
  percentileLabel?: string;
}

export interface HealthRecordFormatted {
  overallScore: HealthRecordFormattedScore;
  healthRanking?: HealthRecordFormattedRanking;
  exposureRisks?: {
    items?: { disease: string; rate: number }[];
  };
}

export interface HealthRecord {
  bmi: number;
  overallScore: number;
  exposureRates: ExposureRates;
  healthRanking?: HealthRanking;
  formatted?: HealthRecordFormatted;
}

export interface RoutineProjection {
  current: number;
  EASY: number;
  MODERATE: number;
  HARD: number;
}

export interface CharacterStageInfo {
  key?: string;
  name: string;
  emoji: string;
}

export type HeroStyleKey = "IRON" | "DARK" | "SPIDER";

export interface CharacterProgress {
  level: number;
  xp: number;
  xpInLevel: number;
  xpToNext: number;
  totalCompletions: number;
  stage: CharacterStageInfo;
  heroStyle: HeroStyleKey;
}

export interface PlanProgressUpdate {
  id: string;
  isCompleted: boolean;
  progressionBar: number;
  characterProgress: CharacterProgress;
  leveledUp: boolean;
  previousLevel: number;
}

export interface RoutineLog {
  id?: string;
  date: string;
  completed: boolean;
}

export interface RoutineChatSummary {
  id: string;
}

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export interface ExerciseRoutineItem {
  planId: string;
  task: string;
  frequency: string;
  isCompleted: boolean;
  progressionBar: number;
  dayOfWeek?: string;
  dayNumber?: number;
}

export interface NutritionMeal {
  planId: string;
  mealPlanId?: string;
  mealType: MealType;
  foods: string[];
  calories: number;
  isCompleted: boolean;
  progressionBar: number;
}

export interface NutritionSummaryEntry {
  key: string;
  percent: number;
}

export interface NutritionRoutineDay {
  planId?: string;
  dayOfWeek?: string;
  dayNumber?: number;
  meals: NutritionMeal[];
  averageCalories?: number;
  nutritionSummary?: NutritionSummaryEntry[];
  nutritionQualityScore?: number;
}

export interface RoutineInfoItem {
  name: string;
  tooltip: string;
}

export interface RoutineInfo {
  reason: string;
  nutrition: RoutineInfoItem[];
  workout: RoutineInfoItem[];
  sources: string[];
}

export interface Routine {
  id: string;
  difficulty: RoutineDifficulty;
  /** One-sentence routine description (preferred headline). */
  summary: string;
  /** Markdown README: reasoning, risk reduction, references. */
  reportReadme: string;
  /** Structured routine explanation from backend; null for legacy routines. */
  routineInfo: RoutineInfo | null;
  title: string;
  nutritionPlan: string;
  workoutPlan: string;
  isActive: boolean;
  exerciseRoutine?: ExerciseRoutineItem[];
  nutritionRoutine?: NutritionRoutineDay[];
  trackerCompleted?: boolean;
  logs?: RoutineLog[];
  chats?: RoutineChatSummary[];
  characterProgress?: CharacterProgress;
}

export interface GenerateRoutineResult {
  routineId: string;
  chatId: string;
}

export interface RoutineChatResponse {
  aiResponse: string;
  routineUpdated: boolean;
  routine?: import("./routine-chat.types").UpdatedRoutine;
}

export type Gender = "MALE" | "FEMALE";

/** Raw shape returned by GET /files/rag/documents */
export interface RagDocument {
  name: string;        // e.g. "fileSearchStores/globalpdfstore-.../documents/bitcoinpdf-..."
  displayName: string; // e.g. "bitcoin.pdf"
}

export interface EmbeddingInfo {
  fileId: string;       // matches PdfFile id, or ragDocumentName when matched by filename
  filename?: string;
  chunkCount?: number;
  embeddedAt?: string;
  ragDocumentName?: string; // full path used for DELETE
  [key: string]: unknown;
}

export interface PdfFile {
  id?: string;
  fileId?: string;
  _id?: string;
  filename?: string;
  originalName?: string;
  storedName?: string;
  name?: string;
  size?: number;
  fileSize?: number;
  createdAt?: string;
  uploadedAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export function resolvePdfFileId(file: PdfFile): string {
  return (file.id ?? file.fileId ?? file._id ?? "") as string;
}

export function resolvePdfFileName(file: PdfFile): string {
  return (
    file.filename ??
    file.originalName ??
    file.storedName ??
    file.name ??
    resolvePdfFileId(file)
  ) as string;
}
