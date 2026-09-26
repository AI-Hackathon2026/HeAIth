# HeAIth — AI Health Platform

HeAIth turns a short health questionnaire into a personalised weekly diet and exercise routine, grounded in Korea's national health statistics (질병관리청 **2024 국민건강통계**, KNHANES). Users chat with an AI coach that can explain and adjust their routine. They earn XP and level up a hero avatar as they complete tasks.

This repository is a single **Next.js** application: the React frontend and the API run from the same project, and all data is stored in a JSON text file instead of a database. It deploys to Vercel as-is.

## Features

- **Health check-in**: gender, age, height, weight, and weekly drinking/smoking/exercise habits give a BMI, disease-exposure rates (obesity, hypertension, diabetes, stress, smoking, alcohol) and an overall score ranked against peers of the same age and gender.
- **AI routine generation**: Gemini builds a weekly meal plan (breakfast/lunch/dinner with per-food calories) and an exercise plan at three difficulties (EASY 2×/week, MODERATE 5×/week, HARD daily). It cites pages of the bundled 국민건강통계 PDF.
- **Projections**: expected change in disease prevalence for each difficulty, from KNHANES exercise-frequency tables.
- **Routine chat**: ask the coach to swap meals or exercises; the routine updates in place.
- **Health Q&A chat**: questions are answered from the most relevant PDF pages (keyword RAG over the extracted text).
- **Gamification**: task completion grants XP, levels and character stages. Pick an IRON, DARK or SPIDER hero style.
- **Admin portal**: manage PDF documents, read them in a page-flip viewer, and inspect the optional Gemini File Search store.
- **KNHANES explorer**: query national averages directly from the bundled Excel tables.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Client | React Router SPA, react-pdf, react-markdown |
| API | One catch-all route handler (`/api/*`) running the original layered backend |
| AI | Google Gemini (`@google/genai`) |
| Storage | JSON text file (`data/db.json`); PDFs and Excel tables in the project folder |
| Auth | JWT access and refresh tokens in HTTP-only cookies; scrypt password hashing |

## Project structure

```
HeAIth/
├─ public/
│  ├─ documents/            # PDFs the app reads and cites (2024 국민건강통계.pdf)
│  └─ video/, *.png, icon.svg
├─ data/
│  ├─ documents/            # Pre-extracted page text of each PDF (generated)
│  ├─ knhanes/              # 2024 국민건강통계 Excel tables
│  └─ db.json               # The database: created at runtime, git-ignored
├─ scripts/
│  ├─ index-documents.ts    # PDF → page text extraction
│  └─ build-docs-pdf.mjs    # Builds docs/HeAIth-Documentation.pdf
├─ docs/                    # Specs and the generated PDF documentation
└─ src/
   ├─ app/                  # Next.js entry points
   │  ├─ [[...slug]]/       # Serves the client app for every page URL
   │  └─ api/[...path]/     # Serves every API endpoint
   ├─ client/               # Frontend (pages, components, hooks, api client)
   └─ server/               # Backend
      ├─ Inbound/           # HTTP router, routes, auth middleware, request schemas
      ├─ application/       # Services, entities, views, mappers, ports
      ├─ outbound/          # JSON store, repositories, Gemini, KNHANES, document library
      ├─ shared/            # Utilities, exceptions, domain enums, static data
      └─ container.ts       # Dependency wiring
```

The backend keeps its ports-and-adapters layout. Services in `application/` depend only on repository interfaces. The implementations in `outbound/repo/` read and write the JSON store.

## Getting started

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Sign in at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. That account is created automatically on first start. Regular users sign up at `/login`.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `TOKEN_SECRET` | In production | Signs login tokens. Use a long random string. |
| `GEMINI_API_KEY` | For AI features | Chat and routine generation. Without it, those endpoints return 503. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Recommended | Admin account created on first start. |
| `ADMIN_USERNAME` | No | Display name for that admin (default `admin`). |
| `ADMIN_SIGNUP_KEY` | No | Allows `POST /api/users/signup/admin` with header `x-admin-signup-key`. |
| `ACCESS_TOKEN_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN` | No | `15m` or `1h`, and `7d`. |
| `DATA_DIR` | No | Where `db.json` and uploads are written. Default `./data`, or `/tmp/heaith` on Vercel. |
| `EMAIL_USER`, `EMAIL_PASSWORD` | No | Gmail SMTP for notification emails. Emails are only logged when unset. |

## Data storage

There is no database. `src/server/outbound/store/json.store.ts` keeps every record (users, health profiles, routines, plans, chats, messages, XP events, settings) in one pretty-printed JSON file. Writes are applied in memory and flushed atomically (write to a temp file, then rename), so the file is never half-written. The file is re-read when another process changes it.

To reset all data, stop the app and delete `data/db.json`.

### PDF documents

- PDFs in `public/documents/` are served as static files, which the admin viewer opens directly.
- Their page text is stored in `data/documents/*.json` and searched to ground chat answers and routine reports. After adding or replacing a PDF there, run `npm run index:documents` and commit the result.
- PDFs uploaded through the admin portal are stored in `DATA_DIR/uploads/` and indexed the same way. If `GEMINI_API_KEY` is set, they are also pushed to a Gemini File Search store.

## Deploying to Vercel

1. Import the GitHub repository in Vercel. The framework is detected as Next.js, and no build settings need changing.
2. Add the environment variables above; at minimum `TOKEN_SECRET`, `GEMINI_API_KEY`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. Deploy.

> **Vercel storage is temporary.** Serverless functions can only write to `/tmp`, which is per-instance and cleared when an instance is recycled. On Vercel, accounts, routines and chats written to the JSON file persist only for the life of an instance, and different instances do not share data. That is fine for demos and judging. For durable production data, run the app on a server with a persistent disk (`npm run build && npm start`, with `DATA_DIR` pointing at that disk). The bundled PDF, extracted text and Excel tables are part of the deployment and always available.

Other Vercel limits: request bodies are capped at 4.5 MB, so large PDFs should be added to `public/documents/` in the repository rather than uploaded through the admin portal. API calls can run for up to 60 seconds, which is enough for routine generation.

## API overview

All endpoints are under `/api`. Unless marked otherwise, they need a signed-in user (the `accessToken` cookie).

| Area | Endpoints |
|---|---|
| Auth (public) | `POST /auth/signin`, `POST /auth/signup`, `PATCH /auth/refresh`, `DELETE /auth/signout`, `POST /auth/check-email` |
| Users | `POST /users/signup/user` (public), `POST /users/signup/admin` (admin or signup key), `GET /users` (admin), `DELETE /users/:userId` (admin), `GET`/`PATCH /users/me/character` |
| Health | `POST`/`GET /healthstatus`, `PATCH /healthstatus/:id`, `GET /health-records/me`, `GET /health-records/me/projection?disease=` |
| Routines | `GET`/`PUT`/`DELETE /routines/me`, `POST /routines/generate`, `PATCH /routines/{exercise-plans,nutrition-plans,nutrition-food-items}/:id/progress`, `POST /routines/me/chat`, `POST /routines/chat/:chatId/message` |
| Chat | `GET`/`POST /chat`, `GET`/`PATCH`/`DELETE /chat/:chatId`, `GET /chat/:chatId/messages`, `PATCH`/`DELETE /chat/:chatId/messages/:messageId` |
| Chatbot | `POST /chatbot`, `POST /chatbot/embedding`, `GET /chatbot/available_models`, `GET`/`PATCH /chatbot/model` |
| KNHANES | `GET /knhanes/files`, `POST /knhanes/query`, `POST /knhanes/ground` |
| Files (admin) | `GET /files`, `POST /files/upload`, `GET /files/search`, `GET /files/find`, `GET`/`DELETE /files/:id`, `GET /files/download/:id`, `GET /files/raw/:id`, `GET`/`DELETE /files/rag/store`, `GET`/`DELETE /files/rag/documents` |

The full request and response reference is in `docs/HeAIth-Documentation.pdf`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run type:check` | TypeScript check |
| `npm run index:documents` | Extract page text from `public/documents/*.pdf` |
| `npm run docs:pdf` | Regenerate `docs/HeAIth-Documentation.pdf` |

## Data sources

- 질병관리청, *2024 국민건강통계* (Korea National Health and Nutrition Examination Survey), as a PDF report and Excel tables.
