# Routine API & Database Specification

> **Audience:** Backend engineers and backend AI agents implementing the HeAIth routine feature.  
> **Frontend repo:** `frontend/` (React + TypeScript)  
> **Goal:** Replace long markdown “report” blobs with a **structured todo list** (primary UX) plus a **concise summary report** (secondary UX).

---

## 1. Problem Statement

### Current behavior

`POST /routines/generate` produces a `Routine` whose `nutritionPlan` and `workoutPlan` fields are **large markdown strings** (multi-section essays citing KNHANES PDF pages). The frontend renders them as scrollable prose:

```
영양 계획 | 운동 계획 | 기록
─────────────────────────────
### 1. 부족하기 쉬운 영양소
... (thousands of characters) ...
```

### Desired behavior

| Priority | UX | Description |
|----------|-----|-------------|
| **P0** | **Todo list** | 5–12 short, checkable items the user completes daily/weekly |
| **P1** | **Concise report** | 2–4 sections, 3–5 bullets each — scannable summary |
| **P2** | **Detailed report** | Optional long text (legacy field or “자세히 보기”) |
| **P0** | **Progress** | Per-task completion + daily/weekly stats for avatar XP |

The frontend will **prioritize todos** in the main routine view. The concise report appears above or beside the list. Long markdown becomes optional.

---

## 2. Current Frontend Contract (baseline)

These endpoints and types exist today. Backend must remain backward compatible during migration.

### 2.1 Types (frontend `src/types/index.ts`)

```typescript
type RoutineDifficulty = "EASY" | "MODERATE" | "HARD";

interface Routine {
  id: string;
  difficulty: RoutineDifficulty;
  title: string;
  nutritionPlan: string;   // ← long markdown today
  workoutPlan: string;       // ← long markdown today
  isActive: boolean;
  logs?: RoutineLog[];
  chats?: { id: string }[];
}

interface RoutineLog {
  id?: string;
  date: string;      // ISO date or YYYY-MM-DD
  completed: boolean; // whole-day flag only
}

interface GenerateRoutineResult {
  routineId: string;
  chatId: string;
}
```

### 2.2 Existing API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/routines/generate` | Body: `{ difficulty: "EASY" \| "MODERATE" \| "HARD" }` → `{ routineId, chatId }` |
| `GET` | `/routines/me` | Active routine for logged-in user (404 if none) |
| `PATCH` | `/routines/:id/difficulty` | Regenerate/retarget difficulty |
| `PATCH` | `/routines/:id/deactivate` | Deactivate before creating new routine |
| `POST` | `/routines/:id/log` | Body: `{ completed: boolean }` — **day-level** completion |
| `GET` | `/routines/:id/logs` | Array of day logs |
| `POST` | `/routines/chat/:chatId/message` | AI mentor chat |

### 2.3 Difficulty → frequency (frontend constants)

| Difficulty | Label | Expected cadence |
|------------|-------|------------------|
| `EASY` | 입문 | **2× / week** |
| `MODERATE` | 표준 | **5× / week** |
| `HARD` | 고강도 | **Daily** |

### 2.4 Upstream data used at generation time

Backend already has (or should have) access to:

- `GET /healthstatus` — gender, age, height, weight, alcohol/smoke/exercise freq
- `GET /health-records/me` — BMI, overallScore, exposureRates
- KNHANES RAG / PDF grounding (currently inlined into markdown)

Generation **must** derive todos and summary from the same sources, not duplicate unrelated content.

---

## 3. Target Data Model (Database)

### 3.1 Entity relationship

```
users
  └── routines (1 active per user)
        ├── routine_tasks (many)
        │     └── routine_task_logs (many, per date)
        ├── routine_logs (legacy day-level, keep)
        └── routine_chats (existing)
```

### 3.2 Table: `routines` (extend existing)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `difficulty` | ENUM | `EASY`, `MODERATE`, `HARD` |
| `title` | VARCHAR | e.g. `"MODERATE 루틴 — 2026. 7. 4."` |
| `is_active` | BOOLEAN | Only one `true` per user |
| `nutrition_plan` | TEXT | **Legacy** long markdown (optional after migration) |
| `workout_plan` | TEXT | **Legacy** long markdown (optional after migration) |
| `nutrition_summary` | JSONB | **New** concise structured summary |
| `workout_summary` | JSONB | **New** concise structured summary |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Index:** `(user_id, is_active)` where `is_active = true`.

### 3.3 Table: `routine_tasks` (new)

Atomic checkable items — **the primary product surface**.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `routine_id` | UUID FK → routines | CASCADE delete |
| `category` | ENUM | `NUTRITION` \| `WORKOUT` |
| `title` | VARCHAR(120) | Short imperative label shown in UI |
| `description` | VARCHAR(300) | Optional one-line hint |
| `frequency_type` | ENUM | `DAILY` \| `WEEKLY` |
| `target_count_per_week` | SMALLINT | EASY=2, MODERATE=5, HARD=7 for weekly tasks; use 7 for DAILY |
| `sort_order` | SMALLINT | Display order within category |
| `source_ref` | VARCHAR(200) | Optional citation, e.g. `"2024 국민건강통계.pdf p.247"` |
| `is_active` | BOOLEAN | Soft-disable when AI revises plan |
| `created_at` | TIMESTAMPTZ | |

**Constraints:**

- `title` must be ≤ 120 chars (forces concise todos).
- 4–8 tasks per category recommended (8–16 total max).
- At least 1 `NUTRITION` and 1 `WORKOUT` task per routine.

**Example rows (HARD, 24M, high alcohol, BMI 25):**

| category | title | frequency_type |
|----------|-------|----------------|
| NUTRITION | 아침 식사 챙기기 | DAILY |
| NUTRITION | 나트륨·기름진 국물 줄이기 | DAILY |
| NUTRITION | 하루 2L 수분 섭취 | DAILY |
| NUTRITION | 칼슘·철·비타민A 식품 1끼 이상 | DAILY |
| NUTRITION | 위험음주 기준 이하 유지 (남 7잔 미만) | DAILY |
| WORKOUT | 고강도 유산소 15분 | DAILY |
| WORKOUT | 근력 운동 2세트 × 8–12회 | DAILY |
| WORKOUT | 스트레칭 5분 | DAILY |

### 3.4 Table: `routine_task_logs` (new)

Per-task completion history (replaces day-only granularity for progress).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `task_id` | UUID FK → routine_tasks | |
| `user_id` | UUID FK | Denormalized for queries |
| `log_date` | DATE | User-local or UTC date (document choice) |
| `completed` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

**Unique:** `(task_id, log_date)` — one row per task per day.

### 3.5 Table: `routine_logs` (keep)

Retain for backward compatibility and “오늘 루틴 완료” bulk action.

**Recommended rule:** When all required tasks for today are completed → auto-set day log `completed = true`. Or keep manual POST and derive consistency in app layer.

---

## 4. JSON Schemas

### 4.1 `RoutineSummarySection` (stored in `nutrition_summary` / `workout_summary`)

```json
{
  "headline": "24세 남성 · BMI 25 · HARD 난이도",
  "sections": [
    {
      "title": "부족하기 쉬운 영양소",
      "bullets": [
        "칼슘·철·비타민A·리보플라빈 보충",
        "19–30세 남성 평균 섭취량 대비 부족"
      ]
    },
    {
      "title": "꼭 줄일 습관",
      "bullets": [
        "나트륨·가공식품",
        "아침 거르기",
        "위험음주 (7잔 이상/회)"
      ]
    }
  ],
  "sources": [
    { "label": "2024 국민건강통계", "page": "247" }
  ]
}
```

**Rules for AI generator:**

- Max **4 sections** per summary.
- Max **5 bullets** per section.
- Each bullet ≤ **80 Korean characters**.
- No markdown headers (`###`) in bullets — plain text only.
- `sources` optional but encouraged for trust.

### 4.2 `RoutineTask` (API response shape)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "category": "NUTRITION",
  "title": "아침 식사 챙기기",
  "description": "공복 시간을 줄여 대사 리듬 회복",
  "frequencyType": "DAILY",
  "targetCountPerWeek": 7,
  "sortOrder": 1,
  "sourceRef": "2024 국민건강통계.pdf p.9",
  "completedToday": false,
  "completedThisWeek": 3,
  "targetThisWeek": 7
}
```

### 4.3 Extended `Routine` response (`GET /routines/me`)

```json
{
  "id": "…",
  "difficulty": "HARD",
  "title": "고강도 루틴 — 2026. 7. 4.",
  "isActive": true,
  "nutritionPlan": "…legacy markdown or empty string…",
  "workoutPlan": "…legacy markdown or empty string…",
  "nutritionSummary": { "headline": "…", "sections": [], "sources": [] },
  "workoutSummary": { "headline": "…", "sections": [], "sources": [] },
  "tasks": [ /* RoutineTask[] */ ],
  "progress": {
    "todayCompleted": 2,
    "todayTotal": 8,
    "todayPercent": 25,
    "weekCompleted": 12,
    "weekTarget": 56,
    "streakDays": 3
  },
  "chats": [{ "id": "…" }],
  "logs": [{ "date": "2026-07-04", "completed": false }]
}
```

**Backward compatibility:** If `tasks` is absent or empty, frontend falls back to rendering `nutritionPlan` / `workoutPlan` markdown.

---

## 5. API Specification (new & changed)

### 5.1 `POST /routines/generate` (change)

**Request:** unchanged

```json
{ "difficulty": "MODERATE" }
```

**Response:** extend to optionally return full routine (reduces round-trip):

```json
{
  "routineId": "uuid",
  "chatId": "uuid",
  "routine": { /* full Routine object per §4.3 */ }
}
```

**Server-side generation pipeline (required order):**

1. Load user `HealthStatus` + `HealthRecord`.
2. Run RAG / KNHANES grounding (existing logic).
3. **LLM pass A — tasks:** emit 8–16 `routine_tasks` rows (structured JSON, validated).
4. **LLM pass B — summaries:** emit `nutrition_summary` + `workout_summary` JSON (validated).
5. **LLM pass C — optional detail:** populate `nutrition_plan` / `workout_plan` markdown if still needed.
6. Persist all rows in one transaction.
7. Return IDs (+ optional embedded `routine`).

**Validation (reject/regenerate if fail):**

- Any `title` > 120 chars → fail.
- Zero tasks in either category → fail.
- Summary section > 4 or bullet > 80 chars → truncate or fail.

### 5.2 `GET /routines/me` (change)

Return extended `Routine` per §4.3 including `tasks`, `nutritionSummary`, `workoutSummary`, `progress`.

### 5.3 `GET /routines/:id/tasks` (new)

Returns tasks with today/week completion flags for the authenticated user.

**Query params (optional):**

- `date=YYYY-MM-DD` — completion state as of that date (default: today).

### 5.4 `PATCH /routines/:id/tasks/:taskId/log` (new)

Toggle or set completion for a single task on a date.

**Request:**

```json
{
  "date": "2026-07-04",
  "completed": true
}
```

**Response:**

```json
{
  "task": { /* RoutineTask with updated flags */ },
  "progress": { /* RoutineProgress snapshot */ }
}
```

**Side effects:**

- Upsert `routine_task_logs`.
- Recompute `progress`.
- If `todayCompleted === todayTotal`, upsert `routine_logs` with `completed: true` for that date.

### 5.5 `POST /routines/:id/log` (keep, semantics update)

Existing day-level endpoint. Options:

- **A (recommended):** Mark all tasks complete/incomplete for that date.
- **B:** Keep independent; frontend uses task logs only.

Document chosen behavior in backend README.

### 5.6 `GET /routines/:id/progress` (new, optional)

If not embedded in `/routines/me`:

```json
{
  "todayCompleted": 2,
  "todayTotal": 8,
  "todayPercent": 25,
  "weekCompleted": 12,
  "weekTarget": 56,
  "streakDays": 3,
  "completionHistory": [
    { "date": "2026-07-01", "completedTasks": 6, "totalTasks": 8 }
  ]
}
```

### 5.7 `PATCH /routines/:id/difficulty` (change)

When difficulty changes:

1. Deactivate old tasks (`is_active = false`) or delete and recreate.
2. Regenerate tasks + summaries for new difficulty.
3. Preserve or reset task logs (product decision: **reset recommended**).

### 5.8 AI mentor chat (unchanged path, behavior note)

`POST /routines/chat/:chatId/message` may return `routineUpdated: true`. If plan changes:

- Version tasks (soft-delete old, insert new) **or** patch individual tasks.
- Frontend will refetch `GET /routines/me`.

---

## 6. Progress & Gamification (frontend expectations)

Frontend computes avatar XP client-side from **completed day count** today:

```typescript
// src/utils/routineProgress.ts
XP_PER_COMPLETION = 25   // per day all tasks done (or day log)
XP_PER_LEVEL = 100
```

**Backend should align:**

- `progress.todayPercent = round(todayCompleted / todayTotal * 100)`
- Day counts as “complete” when `todayCompleted === todayTotal` OR legacy `routine_logs.completed = true`.

**Future (optional):** XP per task (backend field `xpValue` on task) — not required for v1.

---

## 7. LLM Prompt Contract (for backend AI agent)

When generating a routine, the model **must output JSON** matching this template (not markdown prose):

```json
{
  "title": "표준 루틴 — {date}",
  "nutritionSummary": { "headline": "…", "sections": [], "sources": [] },
  "workoutSummary": { "headline": "…", "sections": [], "sources": [] },
  "nutritionTasks": [
    { "title": "…", "description": "…", "frequencyType": "WEEKLY", "sourceRef": "…" }
  ],
  "workoutTasks": [ /* same */ ],
  "nutritionPlanDetail": "optional long markdown",
  "workoutPlanDetail": "optional long markdown"
}
```

**Task title guidelines (Korean):**

- Start with verb: `"줄이기"`, `"먹기"`, `"하기"`, `"피하기"`.
- One behavior per task (no compound essays).
- Personalized: reference user BMI, alcohol, age band when relevant.

**Anti-patterns (do NOT generate):**

- Multi-paragraph task titles.
- PDF page dumps in `title`.
- Duplicate tasks across nutrition/workout.

---

## 8. Migration Plan

### Phase 1 — Additive (no breaking changes)

1. Add DB columns + `routine_tasks` + `routine_task_logs`.
2. Update generator to populate new fields **and** keep filling `nutrition_plan` / `workout_plan`.
3. Extend `GET /routines/me` with new fields.
4. Add task log endpoints.

### Phase 2 — Frontend switch

Frontend checks `routine.tasks?.length > 0` → render todo UI + concise summary.

### Phase 3 — Deprecate long markdown

- Stop LLM pass C or collapse to “detail” link only.
- `nutrition_plan` / `workout_plan` nullable.

---

## 9. Example: Full `GET /routines/me` Response

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "difficulty": "HARD",
  "title": "고강도 루틴 — 2026. 7. 4.",
  "isActive": true,
  "nutritionPlan": "",
  "workoutPlan": "",
  "nutritionSummary": {
    "headline": "24세 남성 · BMI 25",
    "sections": [
      {
        "title": "부족하기 쉬운 영양소",
        "bullets": ["칼슘", "철", "비타민 A", "리보플라빈"]
      },
      {
        "title": "줄여야 할 습관",
        "bullets": ["나트륨·가공식품", "아침 거르기", "위험음주"]
      }
    ],
    "sources": [{ "label": "2024 국민건강통계", "page": "247" }]
  },
  "workoutSummary": {
    "headline": "실내 · 만성질환 예방 · HARD",
    "sections": [
      {
        "title": "권장 운동",
        "bullets": ["유산소 75분/주 (고강도)", "근력 3–4회/주", "8–12회 × 2–3세트"]
      }
    ],
    "sources": [{ "label": "2024 국민건강통계", "page": "실천기준" }]
  },
  "tasks": [
    {
      "id": "task-001",
      "category": "NUTRITION",
      "title": "아침 식사 챙기기",
      "description": "식사 거름 비율 개선",
      "frequencyType": "DAILY",
      "targetCountPerWeek": 7,
      "sortOrder": 1,
      "sourceRef": "2024 국민건강통계.pdf p.9",
      "completedToday": false,
      "completedThisWeek": 4,
      "targetThisWeek": 7
    },
    {
      "id": "task-002",
      "category": "WORKOUT",
      "title": "고강도 유산소 15분",
      "description": "실내 가능 (뛰기, burpee 등)",
      "frequencyType": "DAILY",
      "targetCountPerWeek": 7,
      "sortOrder": 1,
      "sourceRef": null,
      "completedToday": true,
      "completedThisWeek": 5,
      "targetThisWeek": 7
    }
  ],
  "progress": {
    "todayCompleted": 1,
    "todayTotal": 8,
    "todayPercent": 13,
    "weekCompleted": 9,
    "weekTarget": 56,
    "streakDays": 2
  },
  "chats": [{ "id": "chat-uuid" }],
  "logs": []
}
```

---

## 10. Frontend Integration Checklist (for backend verification)

When implementation is complete, verify:

- [ ] `GET /routines/me` returns `tasks` array with ≥ 4 items total.
- [ ] Each task `title` renders on one line in UI (≤ 120 chars).
- [ ] `nutritionSummary` / `workoutSummary` render without markdown parsing.
- [ ] `PATCH …/tasks/:taskId/log` updates `completedToday` on subsequent GET.
- [ ] `progress.todayTotal` equals count of tasks due today (DAILY + applicable WEEKLY).
- [ ] `POST /routines/generate` still returns `routineId` + `chatId` for existing flow.
- [ ] Legacy routines (only `nutritionPlan` string) still load without error.

---

## 11. Open Product Decisions (defaults suggested)

| Question | Suggested default |
|----------|-------------------|
| Weekly tasks on non-scheduled days? | Show but disabled, or hide until due day |
| Timezone for `log_date` | `Asia/Seoul` calendar date |
| Reset logs on difficulty change? | Yes — new plan, fresh streak |
| Keep long markdown? | Generate but hide behind “자세히 보기” accordion |

---

## 12. Related Frontend Files (post-backend)

After backend ships v2 shape, frontend will update:

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `RoutineTask`, `RoutineSummary`, `RoutineProgress` |
| `src/api/client.ts` | Normalizers + `patchTaskLog()` |
| `src/components/routine/RoutineViewScreen.tsx` | Todo list UI, summary cards |
| `src/utils/routineProgress.ts` | Optionally derive XP from task completion |

---

## 13. Summary for Backend AI Agent

**Do this:**

1. Create `routine_tasks` and `routine_task_logs` tables.
2. Add JSONB summary columns to `routines`.
3. Change the generation pipeline to output **structured JSON** (tasks + summaries), not markdown essays.
4. Expose task completion APIs and embed `progress` in routine responses.
5. Keep legacy string fields during migration.

**Do not do this:**

- Return only longer markdown reports.
- Put PDF citations inside task titles.
- Use day-level `completed` boolean as the only progress mechanism going forward.

---

*Document version: 1.0 — 2026-07-04 — authored for HeAIth frontend ↔ backend alignment.*
