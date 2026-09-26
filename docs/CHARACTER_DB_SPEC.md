# Backend Spec: Character / Hero Avatar Persistence

> **Audience:** Backend engineers or backend AI agents  
> **Frontend repo:** `frontend/` (React) — **no Prisma in frontend**  
> **Goal:** Persist the user's selected hero character style (`IRON` / `DARK` / `SPIDER`) in PostgreSQL and expose it through existing character APIs.

---

## 1. Summary of work

| Area | Change |
|------|--------|
| **Database** | Add `HeroStyle` enum + `heroStyle` column on `UserCharacterProgress` |
| **API** | Extend character responses with `heroStyle`; add/implement `PATCH /users/me/character` |
| **Nested responses** | Include `heroStyle` wherever `characterProgress` is returned |

The frontend already calls:

- `GET /users/me/character`
- `PATCH /users/me/character` with `{ "heroStyle": "IRON" \| "DARK" \| "SPIDER" }`

Until backend ships this, character style saves will fail.

---

## 2. Current baseline (existing schema)

You already have:

```prisma
enum CharacterStage {
  SPROUT
  GROWTH
  SKILLED
  CHAMPION
  MASTER
}

model UserCharacterProgress {
  id               String         @id @default(uuid())
  userId           String         @unique
  level            Int            @default(1)
  xp               Int            @default(0)
  stage            CharacterStage @default(SPROUT)
  totalCompletions Int            @default(0)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 3. Database changes (required)

### 3.1 Prisma schema diff

Add enum:

```prisma
enum HeroStyle {
  IRON
  DARK
  SPIDER
}
```

Extend model:

```prisma
model UserCharacterProgress {
  id               String         @id @default(uuid())
  userId           String         @unique
  level            Int            @default(1)
  xp               Int            @default(0)
  stage            CharacterStage @default(SPROUT)
  heroStyle        HeroStyle      @default(IRON)   // ← NEW
  totalCompletions Int            @default(0)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 3.2 SQL migration (PostgreSQL)

Run on production DB:

```sql
CREATE TYPE "HeroStyle" AS ENUM ('IRON', 'DARK', 'SPIDER');

ALTER TABLE "UserCharacterProgress"
  ADD COLUMN "heroStyle" "HeroStyle" NOT NULL DEFAULT 'IRON';
```

### 3.3 Deploy steps

```bash
# 1. Update prisma/schema.prisma in BACKEND repo
# 2. Create migration
npx prisma migrate dev --name add_hero_style

# 3. Production
npx prisma migrate deploy
npx prisma generate

# 4. Redeploy API server
```

### 3.4 Data rules

| Field | Rule |
|-------|------|
| `heroStyle` | Required. Default `IRON` for new + existing rows (via migration default) |
| `level` | Integer `1–10` (frontend max level is **10**) |
| `xp` | Non-negative integer; frontend uses **100 XP per level** |
| `stage` | Keep existing `CharacterStage` logic; map from level if needed |
| `totalCompletions` | Count of completed routine tasks (existing behavior) |

**Stage mapping suggestion (if you derive stage from level):**

| Level | Stage |
|-------|-------|
| 1–2 | SPROUT |
| 3–4 | GROWTH |
| 5–6 | SKILLED |
| 7–8 | CHAMPION |
| 9–10 | MASTER |

---

## 4. API specification

### 4.1 Shared type: `CharacterProgressResponse`

All endpoints returning character data MUST use this shape (camelCase JSON):

```typescript
interface CharacterStageResponse {
  key: string;    // e.g. "SPROUT" — optional but recommended
  name: string;   // e.g. "새싹"
  emoji: string;  // e.g. "🌱"
}

interface CharacterProgressResponse {
  level: number;              // 1–10
  xp: number;                 // total XP
  xpInLevel: number;          // XP earned within current level (0–99)
  xpToNext: number;           // XP remaining until next level
  totalCompletions: number;
  heroStyle: "IRON" | "DARK" | "SPIDER";
  stage: CharacterStageResponse | string;  // object preferred; enum string accepted
}
```

**XP calculation (must match frontend):**

```typescript
const XP_PER_LEVEL = 100;
const xpInLevel = xp % XP_PER_LEVEL;
const xpToNext = level >= 10 ? 0 : XP_PER_LEVEL - xpInLevel;
```

If `xpInLevel` / `xpToNext` are omitted, frontend computes them from `xp`, but **including them is recommended**.

**Default when row missing:**

```json
{
  "level": 1,
  "xp": 0,
  "xpInLevel": 0,
  "xpToNext": 100,
  "totalCompletions": 0,
  "heroStyle": "IRON",
  "stage": { "key": "SPROUT", "name": "새싹", "emoji": "🌱" }
}
```

---

### 4.2 `GET /users/me/character`

**Auth:** Required (session cookie)

**Response `200`:**

```json
{
  "level": 4,
  "xp": 320,
  "xpInLevel": 20,
  "xpToNext": 80,
  "totalCompletions": 13,
  "heroStyle": "DARK",
  "stage": {
    "key": "GROWTH",
    "name": "성장",
    "emoji": "🌿"
  }
}
```

**Response `404`:** Allowed if no progress row exists — frontend falls back to routine endpoint. Prefer **upsert-on-read** and return defaults instead of 404.

**Implementation:**

```typescript
async function getCharacterForUser(userId: string) {
  const row = await prisma.userCharacterProgress.findUnique({ where: { userId } });
  if (!row) {
    return buildDefaultCharacterProgress(); // heroStyle: IRON
  }
  return serializeCharacterProgress(row);
}
```

---

### 4.3 `PATCH /users/me/character`

**Auth:** Required

**Request body:**

```json
{
  "heroStyle": "SPIDER"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `heroStyle` | `"IRON" \| "DARK" \| "SPIDER"` | Yes (for now) | Case-sensitive uppercase |

**Response `200`:** Full `CharacterProgressResponse` after update.

**Errors:**

| Status | When |
|--------|------|
| `400` | Invalid/missing `heroStyle` |
| `401` | Not authenticated |
| `404` | User not found (optional) |

**Implementation (upsert):**

```typescript
async function updateHeroStyle(userId: string, heroStyle: HeroStyle) {
  const row = await prisma.userCharacterProgress.upsert({
    where: { userId },
    update: { heroStyle },
    create: {
      userId,
      heroStyle,
      level: 1,
      xp: 0,
      stage: "SPROUT",
      totalCompletions: 0,
    },
  });
  return serializeCharacterProgress(row);
}
```

**Validation:**

```typescript
const VALID_HERO_STYLES = ["IRON", "DARK", "SPIDER"] as const;
if (!VALID_HERO_STYLES.includes(body.heroStyle)) {
  return res.status(400).json({ message: "heroStyle must be IRON, DARK, or SPIDER" });
}
```

---

### 4.4 Endpoints that MUST embed `characterProgress`

Include `characterProgress` (with `heroStyle`) in responses from:

| Method | Path | Notes |
|--------|------|-------|
| GET | `/routines/me` | Nested `characterProgress` on routine payload |
| PATCH | `/routines/exercise-plans/:planId/progress` | Returns `PlanProgressUpdate` |
| PATCH | `/routines/nutrition-plans/:planId/progress` | Returns `PlanProgressUpdate` |
| PATCH | `/routines/nutrition-food-items/:foodItemId/progress` | Returns `PlanProgressUpdate` |

**`PlanProgressUpdate` shape:**

```json
{
  "id": "plan-uuid",
  "isCompleted": true,
  "progressionBar": 75,
  "leveledUp": false,
  "previousLevel": 3,
  "characterProgress": {
    "level": 3,
    "xp": 250,
    "xpInLevel": 50,
    "xpToNext": 50,
    "totalCompletions": 10,
    "heroStyle": "IRON",
    "stage": { "key": "GROWTH", "name": "성장", "emoji": "🌿" }
  }
}
```

When XP is granted on task completion:

1. Update `UserCharacterProgress.xp`, `level`, `stage`, `totalCompletions`
2. **Do not reset** `heroStyle` unless user explicitly PATCHes it
3. Return updated `characterProgress` including `heroStyle`

---

## 5. Hero style semantics

| DB value | UI label | Description |
|----------|----------|-------------|
| `IRON` | Iron Style | Orange/gold armored hero (default) |
| `DARK` | Dark Style | Gray/silver caped hero |
| `SPIDER` | Spider Style | Red/blue web-themed hero |

Frontend maps by enum string (also accepts `hero_style` snake_case as fallback when reading).

---

## 6. Level labels (frontend display only)

Backend stores `level` as integer. Frontend maps:

| Level | Label |
|-------|-------|
| 1 | 고도비만 |
| 2 | 비만 |
| 3 | 과체중 심각 |
| 4 | 과체중 |
| 5 | 약간 과체중 |
| 6 | 정상 체중 |
| 7 | 균형 체형 |
| 8 | 건강 체형 |
| 9 | 근육 체형 |
| 10 | 헬창 |

No need to store labels in DB.

---

## 7. Acceptance checklist

Backend is done when:

- [ ] Migration applied; `UserCharacterProgress.heroStyle` exists with default `IRON`
- [ ] `GET /users/me/character` returns `heroStyle`
- [ ] `PATCH /users/me/character` upserts and returns full character object
- [ ] Invalid `heroStyle` → `400`
- [ ] `GET /routines/me` includes `characterProgress.heroStyle`
- [ ] Progress PATCH endpoints return `characterProgress.heroStyle`
- [ ] Completing a task updates XP/level but **preserves** `heroStyle`
- [ ] Auth required on all character endpoints
- [ ] CORS + credentials work for frontend origin

---

## 8. Manual test commands

```bash
# Login first (save session cookie), then:

curl -b cookies.txt -c cookies.txt https://<API>/users/me/character

curl -b cookies.txt -X PATCH https://<API>/users/me/character \
  -H "Content-Type: application/json" \
  -d '{"heroStyle":"DARK"}'

curl -b cookies.txt https://<API>/routines/me
```

Expected: all responses include `"heroStyle":"DARK"` after PATCH.

---

## 9. Out of scope (do NOT implement unless asked)

- Storing SVG / avatar image data in DB
- Per-level body preview selection (level comes from XP, not user choice)
- Separate `UserAvatar` table — use `UserCharacterProgress.heroStyle` only

---

## 10. Frontend reference (read-only)

Frontend files for contract alignment:

- `src/types/index.ts` — `CharacterProgress`, `HeroStyleKey`
- `src/api/client.ts` — `getCharacterMe()`, `updateCharacterMe()`
- `src/utils/characterNormalize.ts` — response parsing
- `src/constants/avatar.constants.ts` — max level 10, 100 XP/level

No Prisma or migrations live in the frontend repo.
