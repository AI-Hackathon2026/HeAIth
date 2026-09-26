import type {
  ChatHistory,
  ChatSummary,
  CreateChatResponse,
  EmbeddingInfo,
  GenerateRoutineResult,
  HealthRecord,
  HealthRecordFormatted,
  HealthRecordFormattedRanking,
  HealthRecordFormattedScore,
  HealthRanking,
  HealthStatus,
  HealthStatusInput,
  KnhanesFilesResponse,
  KnhanesGroundResponse,
  KnhanesQueryRequest,
  KnhanesQueryResponse,
  PdfFile,
  PlanProgressUpdate,
  RagDocument,
  RoutineChatMessage,
  RoutineDifficulty,
  Routine,
  RoutineLog,
  RoutineProjection,
  HeroStyleKey,
} from "../types";
import type {
  EnsureRoutineChatResult,
  RoutineChatResponse,
  UpdatedRoutine,
} from "../types/routine-chat.types";
import type { DiseaseKey } from "../constants/routine";
import {
  extractCharacterProgress,
  normalizeCharacterProgress,
  normalizeCharacterProgressOrDefault,
} from "../utils/characterNormalize";
import { parseRoutineMeResponse } from "../utils/routineNormalize";

import { apiUrl } from "./baseUrl";

const USERNAME_KEY = "competition_username";
const ROLE_KEY = "competition_role";

function getCsrfValue(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrfValue=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function parseCurrentModel(response: string): string {
  const usingMatch = response.match(/using\s+(.+)$/i);
  if (usingMatch) return usingMatch[1].trim();
  const inList = response.trim();
  return inList;
}

export function matchModelToList(
  current: string,
  models: string[],
): string {
  const parsed = parseCurrentModel(current);
  const exact = models.find((m) => m === parsed);
  if (exact) return exact;
  const partial = models.find(
    (m) => parsed.includes(m) || m.includes(parsed),
  );
  return partial ?? parsed;
}

export function saveUsername(username: string) {
  sessionStorage.setItem(USERNAME_KEY, username);
}

export function loadUsername(): string | null {
  return sessionStorage.getItem(USERNAME_KEY);
}

export function clearUsername() {
  sessionStorage.removeItem(USERNAME_KEY);
}

export function saveRole(role: string) {
  sessionStorage.setItem(ROLE_KEY, role);
}

export function loadRole(): string | null {
  return sessionStorage.getItem(ROLE_KEY);
}

export function clearRole() {
  sessionStorage.removeItem(ROLE_KEY);
}

export { BASE_URL, apiUrl } from "./baseUrl";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { message?: string }).message ??
      `요청 실패 (${response.status})`,
    );
  }

  return data as T;
}

function normalizeHealthRanking(raw: unknown): HealthRanking | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const data = raw as Record<string, unknown>;
  const gender =
    data.gender === "MALE" || data.gender === "FEMALE" ? data.gender : undefined;
  if (!gender) return undefined;

  const percentile = Number(data.percentile);
  const rank = Number(data.rank);
  const cohortSize = Number(data.cohortSize);
  if (
    Number.isNaN(percentile) ||
    Number.isNaN(rank) ||
    Number.isNaN(cohortSize)
  ) {
    return undefined;
  }

  const source: HealthRanking["source"] =
    data.source === "peers" || data.source === "estimated"
      ? data.source
      : "estimated";

  return {
    percentile,
    rank,
    cohortSize,
    ageGroup: String(data.ageGroup ?? ""),
    gender,
    source,
  };
}

function normalizeHealthRecordFormattedRanking(
  raw: unknown,
): HealthRecordFormattedRanking | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const data = raw as Record<string, unknown>;
  if (!data.topDisplay && !data.percentileDisplay && !data.rankDisplay) {
    return undefined;
  }

  return {
    title: String(data.title ?? "건강 순위"),
    cohortLabel: String(data.cohortLabel ?? ""),
    percentileDisplay: String(data.percentileDisplay ?? ""),
    topDisplay: String(data.topDisplay ?? ""),
    rankDisplay: String(data.rankDisplay ?? ""),
    sourceNote: String(data.sourceNote ?? ""),
    percentileLabel:
      data.percentileLabel != null ? String(data.percentileLabel) : undefined,
  };
}

function normalizeHealthRecordFormatted(
  raw: unknown,
): HealthRecordFormatted | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const data = raw as Record<string, unknown>;
  const overallScoreRaw = data.overallScore;
  if (!overallScoreRaw || typeof overallScoreRaw !== "object") return undefined;

  const score = overallScoreRaw as Record<string, unknown>;
  const overallScore: HealthRecordFormattedScore = {
    value: Number(score.value ?? 0),
    display: String(score.display ?? score.value ?? "0"),
    label: String(score.label ?? "종합 건강 점수"),
    progressPercent: Number(score.progressPercent ?? score.value ?? 0),
  };

  const healthRanking = normalizeHealthRecordFormattedRanking(data.healthRanking);
  const exposureRisks = data.exposureRisks as
    | HealthRecordFormatted["exposureRisks"]
    | undefined;

  return {
    overallScore,
    healthRanking,
    exposureRisks,
  };
}

function normalizeHealthRecord(raw: unknown): HealthRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const formatted = normalizeHealthRecordFormatted(record.formatted);
  const healthRanking = normalizeHealthRanking(record.healthRanking);

  const riskItems = formatted?.exposureRisks?.items ?? [];
  const exposureRates: HealthRecord["exposureRates"] = {};

  if (riskItems.length > 0) {
    for (const item of riskItems) {
      exposureRates[item.disease as keyof HealthRecord["exposureRates"]] =
        item.rate;
    }
  } else if (record.exposureRates && typeof record.exposureRates === "object") {
    Object.assign(
      exposureRates,
      record.exposureRates as HealthRecord["exposureRates"],
    );
  }

  const overallScore = Number(
    formatted?.overallScore.value ??
      record.overallScore ??
      0,
  );

  if (
    overallScore === 0 &&
    Object.keys(exposureRates).length === 0 &&
    !formatted &&
    !healthRanking
  ) {
    return null;
  }

  return {
    bmi: Number(record.bmi ?? 0),
    overallScore,
    exposureRates,
    healthRanking,
    formatted,
  };
}

function normalizeHealthStatus(raw: unknown): HealthStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const id = data.id != null ? String(data.id) : "";
  if (!id) return null;

  const gender =
    data.gender === "MALE" || data.gender === "FEMALE" ? data.gender : null;
  if (!gender) return null;

  const age = Number(data.age);
  const height = Number(data.height);
  const weight = Number(data.weight);
  const alcoholFreq = Number(data.alcoholFreq ?? data.alcohol_freq);
  const smokeFreq = Number(data.smokeFreq ?? data.smoke_freq);
  const exerciseFreq = Number(data.exerciseFreq ?? data.exercise_freq);

  if (
    Number.isNaN(age) ||
    Number.isNaN(height) ||
    Number.isNaN(weight) ||
    Number.isNaN(alcoholFreq) ||
    Number.isNaN(smokeFreq) ||
    Number.isNaN(exerciseFreq)
  ) {
    return null;
  }

  return {
    id,
    gender,
    age,
    height,
    weight,
    alcoholFreq,
    smokeFreq,
    exerciseFreq,
  };
}

function normalizePlanProgressUpdate(raw: unknown): PlanProgressUpdate {
  const data = (raw ?? {}) as Record<string, unknown>;
  const progress =
    extractCharacterProgress(data) ??
    normalizeCharacterProgress(data.characterProgress);

  return {
    id: String(data.id ?? ""),
    isCompleted: Boolean(data.isCompleted),
    progressionBar: Number(data.progressionBar ?? data.progressPercentage ?? 0) || 0,
    characterProgress: progress ?? normalizeCharacterProgressOrDefault(null),
    leveledUp: Boolean(data.leveledUp ?? data.leveled_up),
    previousLevel: Number(data.previousLevel ?? data.previous_level ?? 0) || 0,
  };
}

function attachCharacterProgress<T extends Routine>(
  raw: unknown,
  routine: T | null,
): T | null {
  if (!routine) return null;
  const characterProgress =
    routine.characterProgress ?? extractCharacterProgress(raw) ?? undefined;
  if (!characterProgress) return routine;
  return { ...routine, characterProgress };
}

function normalizeProjection(raw: unknown): RoutineProjection {
  const data = raw as Record<string, unknown>;
  if (typeof data.current === "number") {
    return data as unknown as RoutineProjection;
  }

  const formatted = data.formatted as Record<string, unknown> | undefined;
  const currentBlock = formatted?.current as { rate?: number } | undefined;
  const projections =
    (formatted?.projections as { difficulty: string; rate: number }[]) ?? [];

  const result: RoutineProjection = {
    current: Number(currentBlock?.rate ?? 0),
    EASY: 0,
    MODERATE: 0,
    HARD: 0,
  };

  for (const item of projections) {
    if (item.difficulty === "EASY") result.EASY = item.rate;
    if (item.difficulty === "MODERATE") result.MODERATE = item.rate;
    if (item.difficulty === "HARD") result.HARD = item.rate;
  }

  return result;
}

function normalizeGenerateOrReplaceResult(raw: unknown): GenerateRoutineResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("루틴 응답을 해석할 수 없습니다.");
  }

  const data = raw as Record<string, unknown>;
  const routineId = data.routineId ?? data.id ?? data.routine_id;
  const chatsRaw = data.chats;
  const chatFromList =
    Array.isArray(chatsRaw) &&
    chatsRaw[0] &&
    typeof chatsRaw[0] === "object"
      ? String((chatsRaw[0] as Record<string, unknown>).id ?? "")
      : "";
  const chatIdRaw = data.chatId ?? data.chat_id ?? chatFromList;
  const chatId =
    chatIdRaw != null && String(chatIdRaw).length > 0
      ? String(chatIdRaw)
      : undefined;

  if (routineId != null && chatId != null && String(chatId).length > 0) {
    return {
      routineId: String(routineId),
      chatId: String(chatId),
    };
  }

  if (routineId != null) {
    const nestedRoutine = data.routine;
    if (nestedRoutine && typeof nestedRoutine === "object") {
      const parsed = parseRoutineMeResponse(nestedRoutine);
      if (parsed) {
        return {
          routineId: String(routineId),
          chatId: parsed.chats?.[0]?.id ?? String(chatId ?? ""),
        };
      }
    }

    const parsed = parseRoutineMeResponse(raw);
    if (parsed) {
      return {
        routineId: String(routineId),
        chatId: parsed.chats?.[0]?.id ?? String(chatId ?? ""),
      };
    }

    return {
      routineId: String(routineId),
      chatId: String(chatId ?? ""),
    };
  }

  const nestedRoutine = data.routine;
  if (nestedRoutine && typeof nestedRoutine === "object") {
    const parsed = parseRoutineMeResponse(nestedRoutine);
    if (parsed) {
      return {
        routineId: parsed.id || "me",
        chatId: parsed.chats?.[0]?.id ?? "",
      };
    }
  }

  const parsed = parseRoutineMeResponse(raw);
  if (parsed) {
    return {
      routineId: parsed.id || "me",
      chatId: parsed.chats?.[0]?.id ?? "",
    };
  }

  throw new Error("루틴 응답을 해석할 수 없습니다.");
}

function normalizeUpdatedRoutine(raw: unknown): UpdatedRoutine | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const data = raw as Record<string, unknown>;
  const days = Array.isArray(data.days) ? data.days : [];
  const id = String(data.id ?? data.routineId ?? "");
  const summary = String(data.summary ?? data.report ?? "").trim();

  if (!id && days.length === 0 && !summary) return undefined;

  return {
    id,
    summary,
    days,
  };
}

function normalizeRoutineChatResponse(raw: unknown): RoutineChatResponse {
  const data = (raw ?? {}) as Record<string, unknown>;
  const routineUpdated = Boolean(data.routineUpdated ?? data.routine_updated);
  const routine = routineUpdated
    ? normalizeUpdatedRoutine(data.routine)
    : undefined;

  return {
    aiResponse: String(
      data.aiResponse ?? data.ai_response ?? data.message ?? "",
    ),
    routineUpdated,
    routine,
  };
}

function normalizeEnsureRoutineChatResult(raw: unknown): EnsureRoutineChatResult {
  const data = (raw ?? {}) as Record<string, unknown>;
  const chatId = String(
    data.chatId ?? data.chat_id ?? data.id ?? "",
  ).trim();
  const routineId = String(
    data.routineId ?? data.routine_id ?? "me",
  ).trim();

  if (!chatId) {
    throw new Error("루틴 채팅방을 만들 수 없습니다.");
  }

  return { chatId, routineId };
}

function normalizeRoutineLog(raw: unknown): RoutineLog {
  const log = raw as Record<string, unknown>;
  const date =
    typeof log.date === "string"
      ? log.date
      : typeof log.logDate === "string"
        ? log.logDate
        : log.logDate instanceof Date
          ? log.logDate.toISOString()
          : String(log.logDate ?? "");
  return {
    id: log.id as string | undefined,
    date,
    completed: Boolean(log.completed),
  };
}

async function requestOptional<T>(path: string): Promise<T | null> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
  });

  if (response.status === 404) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { message?: string }).message ??
      `요청 실패 (${response.status})`,
    );
  }

  return data as T;
}

export const api = {
  signIn(email: string, password: string) {
    return request<{ message: string; username: string; role?: string }>(
      "/auth/signin",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    ).then((data) => ({
      ...data,
      role:
        data.role ??
        (data as { userRole?: string }).userRole ??
        (data as { authorities?: string[] }).authorities?.[0],
    }));
  },

  signUp(email: string, username: string, password: string) {
    return request<{ message: string; role: string }>("/users/signup/user", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    });
  },

  signOut() {
    clearRole();
    return request<{ message: string }>("/auth/signout", {
      method: "DELETE",
    });
  },

  refresh() {
    const csrf = getCsrfValue();
    return request<{ message: string }>("/auth/refresh", {
      method: "PATCH",
      headers: csrf ? { "x-csrf-value": csrf } : {},
    });
  },

  checkEmail(email: string) {
    return request<{ message: string }>("/auth/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  listChats() {
    return request<ChatSummary[]>("/chat");
  },

  createChat(title: string) {
    return request<CreateChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  },

  getChatHistory(chatId: string) {
    return request<ChatHistory>(`/chat/${chatId}`);
  },

  updateChat(chatId: string, title: string) {
    return request<CreateChatResponse | void>(`/chat/${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  deleteChat(chatId: string) {
    return request<void>(`/chat/${chatId}`, { method: "DELETE" });
  },

  saveMessage(chatId: string, text: string) {
    return request<unknown>(`/chat/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  updateMessage(chatId: string, messageId: string, text: string) {
    return request<unknown>(`/chat/${chatId}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    });
  },

  deleteMessage(chatId: string, messageId: string) {
    return request<void>(`/chat/${chatId}/messages/${messageId}`, {
      method: "DELETE",
    });
  },

  sendToChatbot(chatId: string, text: string, signal?: AbortSignal) {
    return request<string>("/chatbot", {
      method: "POST",
      body: JSON.stringify({ chatId, text }),
      signal,
    });
  },

  getAvailableModels() {
    return request<string[]>("/chatbot/available_models");
  },

  getCurrentModel() {
    return request<string>("/chatbot/model");
  },

  changeModel(model: string) {
    return request<{ message: string }>("/chatbot/model", {
      method: "PATCH",
      body: JSON.stringify({ model }),
    });
  },

  async listFiles(): Promise<PdfFile[]> {
    const raw = await request<unknown>("/files");
    if (Array.isArray(raw)) return raw as PdfFile[];
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const arr = obj.files ?? obj.data ?? obj.items ?? obj.results ?? [];
      if (Array.isArray(arr)) return arr as PdfFile[];
    }
    return [];
  },

  getFile(fileId: string) {
    return request<PdfFile>(`/files/${fileId}`);
  },

  searchFiles(filename: string) {
    return request<PdfFile[]>(`/files/search?filename=${encodeURIComponent(filename)}`);
  },

  uploadFile(file: File) {
    const formData = new FormData();
    formData.append("pdf", file);
    return request<PdfFile>("/files/upload", {
      method: "POST",
      body: formData,
    });
  },

  deleteFile(fileId: string) {
    return request<void>(`/files/${fileId}`, { method: "DELETE" });
  },

  submitHealthStatus(body: HealthStatusInput) {
    return request<HealthRecord>("/healthstatus", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getHealthStatus() {
    return request<unknown>("/healthstatus").then((raw) => {
      if (Array.isArray(raw)) {
        return normalizeHealthStatus(raw[0]);
      }
      return normalizeHealthStatus(raw);
    });
  },

  updateHealthStatus(id: string, body: HealthStatusInput) {
    return request<unknown>(`/healthstatus/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((raw) => normalizeHealthRecord(raw));
  },

  getHealthRecordMe() {
    return requestOptional<unknown>("/health-records/me").then((raw) =>
      normalizeHealthRecord(raw),
    );
  },

  getCharacterMe() {
    return requestOptional<unknown>("/users/me/character").then((raw) => {
      const fromUser = normalizeCharacterProgress(raw);
      if (fromUser) return fromUser;
      return requestOptional<unknown>("/routines/me").then((routineRaw) => {
        const fromRoutine = extractCharacterProgress(routineRaw);
        return fromRoutine ?? normalizeCharacterProgressOrDefault(null);
      });
    });
  },

  updateCharacterMe(body: { heroStyle?: HeroStyleKey }) {
    return request<unknown>("/users/me/character", {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((raw) => normalizeCharacterProgressOrDefault(raw));
  },

  getHealthRecordProjection(disease: DiseaseKey) {
    return request<unknown>(
      `/health-records/me/projection?disease=${encodeURIComponent(disease)}`,
    ).then((raw) => normalizeProjection(raw));
  },

  getRoutineMe() {
    return requestOptional<unknown>("/routines/me").then((raw) =>
      attachCharacterProgress(raw, parseRoutineMeResponse(raw)),
    );
  },

  generateRoutinePlan(body: { difficulty: RoutineDifficulty }) {
    return request<unknown>("/routines/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }).then((raw) => normalizeGenerateOrReplaceResult(raw));
  },

  replaceRoutineMe(body: { difficulty: RoutineDifficulty }) {
    return request<unknown>("/routines/me", {
      method: "PUT",
      body: JSON.stringify(body),
    }).then((raw) => normalizeGenerateOrReplaceResult(raw));
  },

  deleteRoutineMe() {
    return request<void>("/routines/me", {
      method: "DELETE",
    });
  },

  updateExercisePlanProgress(planId: string, isCompleted: boolean) {
    return request<unknown>(`/routines/exercise-plans/${planId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ isCompleted }),
    }).then((raw) => normalizePlanProgressUpdate(raw));
  },

  updateNutritionFoodItemProgress(foodItemId: string, isCompleted: boolean) {
    return request<unknown>(`/routines/nutrition-food-items/${foodItemId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ isCompleted }),
    }).then((raw) => normalizePlanProgressUpdate(raw));
  },

  updateNutritionPlanProgress(planId: string, isCompleted: boolean) {
    return request<unknown>(`/routines/nutrition-plans/${planId}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ isCompleted }),
    }).then((raw) => normalizePlanProgressUpdate(raw));
  },

  async getChronicDiseaseProjections(diseases: DiseaseKey[]) {
    const entries = await Promise.all(
      diseases.map(async (disease) => {
        try {
          const projection = await this.getHealthRecordProjection(disease);
          return [disease, projection] as const;
        } catch {
          return [disease, null] as const;
        }
      }),
    );
    return Object.fromEntries(entries) as Record<
      DiseaseKey,
      RoutineProjection | null
    >;
  },

  deactivateRoutine(routineId: string) {
    return request<void>(`/routines/${routineId}/deactivate`, {
      method: "PATCH",
    });
  },

  sendRoutineChatMessage(chatId: string, text: string) {
    return request<unknown>(`/routines/chat/${chatId}/message`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }).then((raw) => normalizeRoutineChatResponse(raw));
  },

  ensureRoutineChat() {
    return request<unknown>("/routines/me/chat", {
      method: "POST",
    }).then((raw) => normalizeEnsureRoutineChatResult(raw));
  },

  logRoutineCompletion(routineId: string, completed: boolean) {
    return request<void>(`/routines/${routineId}/log`, {
      method: "POST",
      body: JSON.stringify({ completed }),
    });
  },

  getRoutineLogs(routineId: string) {
    return request<unknown[]>(`/routines/${routineId}/logs`).then((raw) =>
      (Array.isArray(raw) ? raw : []).map((item) => normalizeRoutineLog(item)),
    );
  },

  getRoutineChatMessages(chatId: string) {
    return request<unknown[]>(`/chat/${chatId}/messages`).then((raw) =>
      (Array.isArray(raw) ? raw : []).map((item) => {
        const msg = item as Record<string, unknown>;
        const roleRaw = msg.role ?? msg.from;
        const role =
          roleRaw === "USER" || roleRaw === "AI"
            ? roleRaw
            : roleRaw === "user"
              ? "USER"
              : "AI";
        return {
          id: String(msg.id ?? `msg-${Math.random()}`),
          role,
          text: String(msg.text ?? msg.content ?? ""),
          createdAt: msg.createdAt as string | undefined,
        } satisfies RoutineChatMessage;
      }),
    );
  },

  listUsers() {
    return request<unknown[]>("/users");
  },

  // ── RAG / Embedding management ───────────────────────────────
  /** GET /files/rag/documents — list all documents indexed in the vector store. */
  async listEmbeddings(): Promise<EmbeddingInfo[]> {
    const raw = await request<RagDocument[]>("/files/rag/documents");
    return raw.map((doc) => ({
      // The last path segment is a stable ID within the store
      fileId: doc.name,
      filename: doc.displayName,
      ragDocumentName: doc.name,
    }));
  },

  /** POST /chatbot/embeddings/:fileId — chunk, embed, and store the PDF. */
  embedFile(fileId: string) {
    return request<{ message: string }>(`/chatbot/embeddings/${fileId}`, {
      method: "POST",
    });
  },

  /** DELETE /files/rag/documents — remove a document from the vector store by its rag name. */
  deleteEmbedding(ragDocumentName: string) {
    return request<void>("/files/rag/documents", {
      method: "DELETE",
      body: JSON.stringify({ name: ragDocumentName }),
    });
  },

  knhanesListFiles() {
    return request<KnhanesFilesResponse>("/knhanes/files");
  },

  knhanesQuery(body: KnhanesQueryRequest) {
    return request<KnhanesQueryResponse>("/knhanes/query", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  knhanesGround(body: { sex?: string; age?: string; income?: string }) {
    return request<KnhanesGroundResponse>("/knhanes/ground", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

const AUTH_RETRY_MESSAGES = [
  "log in",
  "로그인",
  "Token has expired",
  "Please log in",
];

export async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    const message = error instanceof Error ? error.message : "";
    if (AUTH_RETRY_MESSAGES.some((m) => message.includes(m))) {
      await api.refresh();
      return fn();
    }
    throw error;
  }
}
