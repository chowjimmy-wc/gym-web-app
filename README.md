# GymApp — 健身計劃管理平台

Full-stack revamp of the original static GymApp into a multi-user web application.

- **Backend**: Java 17, Spring Boot 3, Spring Security (JWT), Spring Data JPA, Flyway, PostgreSQL
- **Frontend**: React 19, Next.js (App Router), TypeScript, Tailwind CSS, Traditional Chinese UI
- **Seed data**: the original `Complete_60Days_Lean_Bulk_Plan.xlsx` is imported into PostgreSQL as a system template that every user can clone

## Features

- User registration / login (JWT, stateless API — ready for a future mobile app)
- 營養與熱量目標 — per-user nutrition targets (defaults copied from the 60-day plan on registration)
- 訓練計劃 — create/update/delete workout programs, per-day exercises with sets/reps, day calendar
- 飲食餐單 — create/update/delete meal plans with per-day meals (早餐/午餐/下午茶/晚餐/補充)
- 進度追蹤與檢討 — mark days complete, workout notes, weekly reviews (體重/腰圍/力量進步/檢討)
- 60 天 Lean Bulk 範本 — one-click cloning of the seeded workout program and meal plan

## Repository layout

| Path | Description |
| --- | --- |
| `backend/` | Spring Boot REST API (`/api/v1`), Flyway migrations and seed data |
| `frontend/` | Next.js app |
| `scripts/xlsx_to_seed.py` | Regenerates `V2__seed_template.sql` from the original Excel file |
| `GymApp/` | The original legacy app (kept for reference, not used at runtime) |
| `docker-compose.yml` | PostgreSQL + backend + frontend |

## Local development

Prerequisites: Java 17+, Node 20+, and PostgreSQL (or Docker for the database only).

```bash
# 1. Database
docker compose up -d db        # or any local PostgreSQL with db/user/password = gymapp

# 2. Backend (http://localhost:8080, Swagger UI at /swagger-ui.html)
cd backend
./mvnw spring-boot:run

# 3. Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev
```

Backend tests run against an in-memory H2 database in PostgreSQL mode:

```bash
cd backend
./mvnw test
```

## Configuration (environment variables)

| Variable | Service | Default | Notes |
| --- | --- | --- | --- |
| `DB_URL` | backend | `jdbc:postgresql://localhost:5432/gymapp` | |
| `DB_USERNAME` / `DB_PASSWORD` | backend | `gymapp` / `gymapp` | |
| `JWT_SECRET` | backend | dev placeholder | **Must** be overridden in production (≥ 32 bytes) |
| `JWT_EXPIRATION_MS` | backend | `86400000` (24h) | |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:3000` | Comma-separated list |
| `NEXT_PUBLIC_API_URL` | frontend (build-time) | `http://localhost:8080` | Must be reachable from the **browser** |

## Deployment with Docker Compose

```bash
# Set production values first (e.g. in a .env file next to docker-compose.yml):
#   DB_PASSWORD=<strong password>
#   JWT_SECRET=<random string, at least 32 characters>
#   CORS_ALLOWED_ORIGINS=https://your-domain.example
#   NEXT_PUBLIC_API_URL=https://api.your-domain.example

docker compose up -d --build
```

This starts:

- `db` — PostgreSQL 16 with a named volume (`gymapp-db-data`)
- `backend` — Spring Boot API on port 8080 (Flyway migrates and seeds automatically)
- `frontend` — Next.js standalone server on port 3000

For Internet-facing deployment, put a reverse proxy (nginx / Caddy / Traefik) in front:

- `https://your-domain.example` → `frontend:3000`
- `https://api.your-domain.example` → `backend:8080` (or route `/api` on the same domain)
- Terminate TLS at the proxy (e.g. Let's Encrypt); set `CORS_ALLOWED_ORIGINS` to the frontend origin and build the frontend with the public `NEXT_PUBLIC_API_URL`.

## API overview

All endpoints are under `/api/v1` and require `Authorization: Bearer <token>` except register/login. Interactive documentation is available at `http://localhost:8080/swagger-ui.html`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Nutrition | `GET/POST /nutrition-targets`, `PUT/DELETE /nutrition-targets/{id}` |
| Programs | `GET/POST /programs`, `GET/PUT/DELETE /programs/{id}`, `POST /programs/from-template/{templateId}`, `PUT/DELETE /programs/{id}/days/{dayNumber}` |
| Meal plans | `GET/POST /meal-plans`, `GET/PUT/DELETE /meal-plans/{id}`, `POST /meal-plans/from-template/{templateId}`, `PUT/DELETE /meal-plans/{id}/days/{dayNumber}` |
| Progress | `GET /programs/{id}/day-logs`, `PUT /programs/{id}/day-logs/{dayNumber}`, `GET /programs/{id}/weekly-reviews`, `PUT/DELETE /programs/{id}/weekly-reviews/{weekNumber}` |
| Templates | `GET /templates` |

The stateless JWT REST API is the integration point for the planned mobile application.

## Regenerating the seed data

If the source Excel file changes:

```bash
pip install openpyxl
python scripts/xlsx_to_seed.py   # rewrites backend/src/main/resources/db/migration/V2__seed_template.sql
```
