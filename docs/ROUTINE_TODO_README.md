# HeAIthcare — Routine Todo Feature README

> **Audience:** Backend implementer (human or AI agent)  
> **Goal:** Replace long-form RAG essay plans with (1) a **concise summary report** and (2) a **checkable daily todo list** for progress tracking.

---

## 0. Problem Statement

### Current behavior (broken UX)

`POST /routines/generate` calls Gemini twice (nutrition + workout) with prompts that ask for:

- Long citations (`출처: 파일명, 페이지`)
- Multi-section essays (nutrients, food lists, habits, weekly schedules)

Results are stored as plain text in `Routine.nutritionPlan` / `Routine.workoutPlan` and rendered as wall-of-text in the frontend tabs.

`RoutineLog` only stores **one boolean per day** (`completed: true/false`) — no per-item tracking.

### Desired behavior

| Layer | Purpose | UX |
|-------|---------|-----|
| **Summary report** | Why this routine fits the user (KNHANES-grounded, 1 screen) | Read-only, collapsible |
| **Todo list** | Actionable daily/weekly items | Primary interaction — checkboxes |
| **Progress** | Derived from task completions | % today, streak, calendar heatmap |

The **todo list is the product**. The summary is supporting context.

---

## 1. Architecture Overview

```
HealthStatus + HealthRecord
        │
        ▼
POST /routines/generate
        │
        ├─ Gemini (structured JSON) ──► nutritionSummary + workoutSummary + tasks[]
        │
        ▼
Routine + RoutineTask[] (+ optional RoutineTaskCompletion for seed)
        │
        ├─ GET /routines/me ──────────► summary + tasks + todayProgress
        ├─ PATCH .../tasks/:id ───────► toggle / edit single task
        └─ POST /routines/chat/... ───► AI adjusts tasks via JSON patch
```

**Existing models kept:** `User`, `HealthStatus`, `HealthRecord`, `DiseaseRateByExercise`, `Chat`, `Message`, `RoutineLog` (optional legacy).

**New models:** `RoutineTask`, `RoutineTaskCompletion`.

---

## 2. Prisma Schema Changes

Add to `schema.prisma`:

```prisma
enum RoutineTaskCategory {
  NUTRITION
  WORKOUT
}

enum RoutineScheduleType {
  DAILY          // every day the routine is active
  WEEKDAYS       // Mon–Fri
  CUSTOM_DAYS    // use daysOfWeek array
  WEEKLY_COUNT   // e.g. "3 times per week" — user picks days
}

model Routine {
  id             String       @id @default(uuid())
  userId         String
  healthStatusId String
  difficulty     Difficulty
  title          String
  /// Concise summary (~300–600 chars). Replaces long essay.
  nutritionSummary String
  workoutSummary   String
  /// DEPRECATED — keep during migration, stop writing new data
  nutritionPlan  String       @default("")
  workoutPlan    String       @default("")
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  healthStatus   HealthStatus @relation(fields: [healthStatusId], references: [id])
  chats          Chat[]
  logs           RoutineLog[]
  tasks          RoutineTask[]
}

model RoutineTask {
  id           String              @id @default(uuid())
  routineId    String
  category     RoutineTaskCategory
  title        String              // "아침 단백질 20g 섭취"
  hint         String?             // optional one-liner, no citations
  scheduleType RoutineScheduleType
  daysOfWeek   Int[]               // 0=Sun … 6=Sat; empty = DAILY
  weeklyTarget Int?                // for WEEKLY_COUNT (e.g. 3)
  sortOrder    Int
  sourceRef    String?             // compact "국민건강통계 2024 p.247"
  isActive     Boolean             @default(true)
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  routine      Routine             @relation(fields: [routineId], references: [id], onDelete: Cascade)
  completions  RoutineTaskCompletion[]

  @@index([routineId, category, sortOrder])
}

model RoutineTaskCompletion {
  id        String   @id @default(uuid())
  taskId    String
  userId    String
  logDate   DateTime @db.Date
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  task      RoutineTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id])

  @@unique([taskId, logDate])
}
```

Add to `User`:

```prisma
routineTaskCompletions RoutineTaskCompletion[]
```

### Migration strategy

```bash
npx prisma migrate dev --name routine_todo_tasks
```

1. Add nullable `nutritionSummary`, `workoutSummary`.
2. Backfill: truncate first 500 chars of existing `nutritionPlan`/`workoutPlan` into summaries (or leave empty).
3. Do **not** auto-generate tasks from legacy text — users regenerate routine.
4. After frontend ships, drop `nutritionPlan`/`workoutPlan` in a follow-up migration.

---

## 3. Task Generation Rules (Business Logic)

Gemini must output **5–8 nutrition tasks** + **5–8 workout tasks** depending on `Difficulty`:

| Difficulty | Workout frequency | Target task count (total) |
|------------|-------------------|---------------------------|
| EASY       | 2× / week         | 8–10                      |
| MODERATE   | 5× / week         | 10–12                     |
| HARD       | daily             | 12–14                     |

### Task title constraints

- Max **40 Korean characters**
- Start with verb: "먹기", "하기", "줄이기", "마시기"
- **No** inline citations in title — put in `sourceRef` only
- **No** multi-paragraph text

### Good vs bad examples

| Bad (current) | Good (todo) |
|---------------|-------------|
| "2024 국민건강통계에 따르면 19세 이상 남성의 48.8%가…" | "가공육·튀김 줄이기" |
| "DOCUMENT CONTEXT에는 일일 권장 식품 목록이…" | "아침 단백질 20g 섭취 (계란 2개)" |
| "유산소 신체활동은 중등도 강도로…" | "15분 빠르게 걷기" |

### Summary constraints

- `nutritionSummary`: 3–5 bullet lines, max **400 chars**
- `workoutSummary`: 3–5 bullet lines, max **400 chars**
- One-line KNHANES insight per summary (with optional `sourceRef` at end)

---

## 4. Gemini Structured Output

### 4.1 New method (recommended)

Add to `Gemini` class:

```typescript
async generateRoutineStructured(
  prompt: string,
  snippets: Snippet[],
): Promise<RoutineGenerationPayload>
```

Use `responseSchema` / JSON mode (same pattern as chat adjust). **Single call** for both nutrition + workout (cheaper, consistent task count).

### 4.2 JSON schema (strict)

```typescript
interface RoutineGenerationPayload {
  nutritionSummary: string;
  workoutSummary: string;
  tasks: Array<{
    category: "NUTRITION" | "WORKOUT";
    title: string;
    hint?: string;
    scheduleType: "DAILY" | "WEEKDAYS" | "CUSTOM_DAYS" | "WEEKLY_COUNT";
    daysOfWeek?: number[];   // required if CUSTOM_DAYS
    weeklyTarget?: number;   // required if WEEKLY_COUNT
    sourceRef?: string;
  }>;
}
```

### 4.3 Generation prompt template

```
사용자: {gender} {age}세, BMI {bmi}, 운동 {exerciseFreq}회/주
주요 건강 위험: {exposureRates JSON}
난이도: {difficulty} ({frequency label})

DOCUMENT CONTEXT의 국민건강통계를 근거로 JSON만 출력하세요.

규칙:
- nutritionSummary / workoutSummary: 각 3~5줄, 400자 이내, 해요체
- tasks: nutrition 5~8개 + workout 5~8개
- title: 40자 이내, 실행 가능한 한 줄 (출처·장문 금지)
- hint: 선택, 60자 이내
- sourceRef: "파일명 p.N" 형식, title에 넣지 말 것
- HARD면 workout DAILY, EASY면 workout WEEKLY_COUNT weeklyTarget=2

JSON 형식:
{ "nutritionSummary": "...", "workoutSummary": "...", "tasks": [...] }
```

### 4.4 Chat adjustment JSON (update existing)

Replace `routineChanges.nutritionPlan/workoutPlan` with:

```typescript
interface RoutineChatPatch {
  userMessage: string;
  routineChanges: {
    nutritionSummary?: string | null;
    workoutSummary?: string | null;
    tasksToAdd?: RoutineTaskInput[];
    tasksToUpdate?: Array<{ id: string; title?: string; hint?: string; isActive?: boolean }>;
    tasksToRemove?: string[];  // task ids
  };
}
```

---

## 5. API Specification

Base path: `/routines`  
Auth: `middlewares.auth.checkAuth` (cookie `accessToken`)

### 5.1 Existing endpoints — behavior changes

#### `POST /routines/generate`

**Body:** `{ "difficulty": "EASY" | "MODERATE" | "HARD" }`

**New behavior:**

1. Deactivate prior active routine (unchanged).
2. Single Gemini structured call → parse JSON.
3. Transaction:
   - Create `Routine` with summaries.
   - Bulk create `RoutineTask[]` with `sortOrder`.
   - Create linked `Chat` + first AI message (short: summaries + task count, not full essay).

**Response 201:**

```json
{
  "routineId": "uuid",
  "chatId": "uuid",
  "taskCount": 12
}
```

---

#### `GET /routines/me`

**Response 200:**

```json
{
  "id": "uuid",
  "difficulty": "HARD",
  "title": "HARD 루틴 — 2026. 7. 4.",
  "isActive": true,
  "nutritionSummary": "• 단백질·칼슘 보강\n• 가공식품·나트륨 줄이기\n• …",
  "workoutSummary": "• 매일 15분 유산소\n• 주 3회 근력\n• …",
  "chats": [{ "id": "uuid" }],
  "tasks": [
    {
      "id": "uuid",
      "category": "NUTRITION",
      "title": "아침 단백질 20g 섭취",
      "hint": "계란 2개 또는 두유 1팩",
      "scheduleType": "DAILY",
      "daysOfWeek": [],
      "sortOrder": 0,
      "sourceRef": "2024 국민건강통계 p.247",
      "dueToday": true,
      "completedToday": false
    }
  ],
  "progress": {
    "date": "2026-07-04",
    "dueCount": 6,
    "completedCount": 2,
    "percent": 33
  }
}
```

**`dueToday` logic (server-side):**

| scheduleType | dueToday when |
|--------------|---------------|
| DAILY | always |
| WEEKDAYS | Mon–Fri |
| CUSTOM_DAYS | today's dow in `daysOfWeek` |
| WEEKLY_COUNT | always show; track weeklyTarget separately |

---

#### `POST /routines/chat/:chatId/message`

**Body:** `{ "text": string }`

**Response 200:**

```json
{
  "aiResponse": "운동 강도를 낮춰드렸어요.",
  "routineUpdated": true,
  "tasksChanged": 2
}
```

Applies task patches from Gemini JSON.

---

#### `POST /routines/:id/log` — **deprecate or redefine**

**Option A (recommended):** Remove from UI; progress = task completions.

**Option B:** Keep as "mark all due tasks complete today" convenience endpoint.

---

#### `GET /routines/:id/logs` — extend

Return task-level history for calendar:

```json
{
  "days": [
    {
      "date": "2026-07-04",
      "dueCount": 6,
      "completedCount": 4,
      "percent": 67
    }
  ]
}
```

---

### 5.2 New endpoints

#### `GET /routines/:id/tasks`

Query: `?date=2026-07-04` (default today)

Returns tasks with `dueToday` + `completed` for that date.

---

#### `PATCH /routines/:id/tasks/:taskId`

Toggle or set completion for a date.

**Body:**

```json
{
  "completed": true,
  "date": "2026-07-04"
}
```

**Response 204**

Upserts `RoutineTaskCompletion`.

---

#### `GET /routines/:id/progress`

Query: `?from=2026-07-01&to=2026-07-31`

Returns daily `{ date, dueCount, completedCount, percent }[]` for heatmap.

---

## 6. Service & File Changes

Follow existing hexagonal layout under `src/`:

```
src/
├── application/
│   ├── command/
│   │   ├── entity/
│   │   │   ├── routine.entity.ts          (add summary fields)
│   │   │   ├── routine-task.entity.ts       NEW
│   │   │   └── routine-task-completion.entity.ts  NEW
│   │   └── services/
│   │       └── routine.command.service.ts   (structured generate + task patch)
│   ├── query/
│   │   ├── mapper/
│   │   │   └── routine.mapper.ts            (tasks + progress)
│   │   ├── view/
│   │   │   └── routine.view.ts              (extend)
│   │   └── services/
│   │       └── routine.query.service.ts
│   └── port/repo/
│       ├── command/I.routine-task.command.repo.ts   NEW
│       └── query/I.routine-task.query.repo.ts       NEW
├── outbound/
│   ├── repo/command/routine-task.command.repo.ts    NEW
│   ├── repo/query/routine-task.query.repo.ts        NEW
│   └── chatbot/gemini.ts                            (generateRoutineStructured)
└── Inbound/controller/routine/
    ├── routine.handler.ts
    ├── routine.route.ts
    └── _communication/request/routine.request.ts
```

### Key service methods

```typescript
// RoutineCommandService
generateRoutine(userId, difficulty): Promise<{ routineId; chatId; taskCount }>
adjustRoutineViaChat(...): Promise<{ aiResponse; routineUpdated; tasksChanged }>
toggleTaskCompletion(userId, routineId, taskId, date, completed): Promise<void>

// RoutineQueryService
getActiveRoutine(userId): Promise<RoutineDetailView>
getTasksForDate(routineId, userId, date): Promise<RoutineTaskView[]>
getProgressRange(routineId, userId, from, to): Promise<DailyProgressView[]>
```

### Progress calculation

```typescript
function computeDailyProgress(tasks: RoutineTask[], completions: Map<taskId, boolean>, date: Date) {
  const due = tasks.filter(t => t.isActive && isDueOn(t, date));
  const done = due.filter(t => completions.get(t.id));
  return {
    dueCount: due.length,
    completedCount: done.length,
    percent: due.length ? Math.round((done.length / due.length) * 100) : 0,
  };
}
```

---

## 7. Frontend Contract (for reference)

Frontend repo: `../frontend`

| Screen | Data source |
|--------|-------------|
| Routine view — **Todo tab** (new default) | `GET /routines/me` → `tasks[]` |
| Routine view — Summary tab | `nutritionSummary`, `workoutSummary` |
| Calendar / streak | `GET /routines/:id/progress` |
| Checkbox tap | `PATCH /routines/:id/tasks/:taskId` |

Update `frontend/src/types/index.ts`:

```typescript
interface RoutineTask {
  id: string;
  category: "NUTRITION" | "WORKOUT";
  title: string;
  hint?: string;
  scheduleType: string;
  daysOfWeek: number[];
  sortOrder: number;
  sourceRef?: string;
  dueToday: boolean;
  completedToday: boolean;
}

interface Routine {
  // ...
  nutritionSummary: string;
  workoutSummary: string;
  tasks: RoutineTask[];
  progress: { date: string; dueCount: number; completedCount: number; percent: number };
}
```

Remove rendering of `nutritionPlan` / `workoutPlan` wall-of-text.

---

## 8. Dependency Injection

In `dependency.injector.ts`:

```typescript
const routineTaskCommandRepo = new RoutineTaskCommandRepo(prisma);
const routineTaskQueryRepo = new RoutineTaskQueryRepo(prisma);

const routineCommandService = new RoutineCommandService(
  // ...existing deps
  routineTaskCommandRepo,
);
const routineQueryService = new RoutineQueryService(
  routineQueryRepo,
  routineTaskQueryRepo,
);
```

---

## 9. Exceptions

Add if missing:

```typescript
ROUTINE_TASK_NOT_FOUND = "ROUTINE_TASK_NOT_FOUND",
ROUTINE_TASK_NOT_DUE = "ROUTINE_TASK_NOT_DUE",  // optional
```

---

## 10. Build Order

```
Day 1:  Prisma migration (RoutineTask, RoutineTaskCompletion, summary fields)
Day 2:  Entities + repos + Gemini structured generator
Day 3:  Refactor generateRoutine → tasks + summaries
Day 4:  GET /routines/me with tasks + progress; PATCH task completion
Day 5:  Chat adjust JSON for task patches
Day 6:  GET /progress; deprecate day-level RoutineLog in UI
Day 7:  Frontend todo UI + summary tabs (separate repo)
```

---

## 11. Example: Full Generation Payload

```json
{
  "nutritionSummary": "• BMI 25 — 에너지·지방 섭취 관리\n• 칼슘·철분·비타민A 보강\n• 아침 거르지 않기\n• 고위험 음주 줄이기",
  "workoutSummary": "• 매일 15분 중등도 유산소\n• 주 3회 근력 (8~12회)\n• 만성질환 예방: 걷기·스쿼트",
  "tasks": [
    {
      "category": "NUTRITION",
      "title": "아침 단백질 20g 섭취",
      "hint": "계란 2개 또는 두유 1팩",
      "scheduleType": "DAILY",
      "sourceRef": "2024 국민건강통계 p.247"
    },
    {
      "category": "NUTRITION",
      "title": "가공육·튀김 0회",
      "scheduleType": "DAILY"
    },
    {
      "category": "NUTRITION",
      "title": "나트륨 줄이기 — 국물 1/2",
      "scheduleType": "DAILY"
    },
    {
      "category": "WORKOUT",
      "title": "15분 빠르게 걷기",
      "hint": "실내 제자리 걷기 OK",
      "scheduleType": "DAILY",
      "sourceRef": "2024 국민건강통계 p.9"
    },
    {
      "category": "WORKOUT",
      "title": "스쿼트 3세트 × 12회",
      "scheduleType": "CUSTOM_DAYS",
      "daysOfWeek": [1, 3, 5]
    }
  ]
}
```

---

## 12. Testing Checklist

- [ ] `POST /routines/generate` creates N tasks with valid `sortOrder`
- [ ] Summaries ≤ 400 chars; task titles ≤ 40 chars
- [ ] `GET /routines/me` returns correct `dueToday` for each schedule type
- [ ] `PATCH .../tasks/:id` toggles completion idempotently
- [ ] Progress `percent` matches manual count
- [ ] Chat "운동 쉽게 바꿔줘" updates tasks, not essay text
- [ ] Deactivating routine hides tasks from `/me`
- [ ] Legacy routines without tasks still return (empty tasks[], summaries from old plan truncate)

---

## 13. Related Files (current baseline)

| Area | Path |
|------|------|
| Schema | `prisma/schema.prisma` |
| Generate service | `src/application/command/services/routine.command.service.ts` |
| Routes | `src/Inbound/controller/routine/routine.route.ts` |
| Gemini RAG | `src/outbound/chatbot/gemini.ts` |
| Frontend routine UI | `../frontend/src/components/routine/RoutineViewScreen.tsx` |
| Original routine spec | `BACKEND_ROUTINE_README.md` (superseded by this doc for todo UX) |

---

## 14. Non-Goals (this iteration)

- Push notifications / reminders
- Recurring task templates across multiple routines
- Admin editing of KNHANES task library
- Replacing `RoutineLog` table (keep for backward compatibility)

---

*Last updated: 2026-07-04 — reflects codebase at `Routine.nutritionPlan` / `workoutPlan` essay model.*
