# GymApp — Local Startup Guide

This guide explains how to run the full GymApp stack on a local Windows machine:

- **PostgreSQL 18** (installed natively) — the database
- **Backend** — Spring Boot REST API (Java 17)
- **Frontend** — Next.js app (Node.js)

> This is the **native** setup that matches the current machine. A Docker Compose
> alternative exists (`docker-compose.yml`) but Docker Desktop's image store on this
> machine is currently corrupted, so the native path below is the supported one.

---

## 1. Prerequisites

These are already installed on this machine. Versions confirmed working:

| Tool | Version | Notes |
| --- | --- | --- |
| Java (JDK) | 17 | `java -version` |
| Node.js | 22.x | `node --version` |
| npm | 10.x | `npm --version` |
| PostgreSQL | 18 | Installed at `C:\Program Files\PostgreSQL\18` |

The project lives at: `c:\dev\projects\gym-web-app`

### Key ports

| Service | Port | Why |
| --- | --- | --- |
| PostgreSQL | 5432 | Default |
| Backend API | **8090** | Port 8080 is taken by another app (`httpd.exe`), so we use 8090 |
| Frontend | 3000 | Default Next.js port |

> All shell commands below assume **Git Bash**. PowerShell equivalents are noted where they differ.

---

## 2. Start PostgreSQL

PostgreSQL runs as a Windows service named `postgresql-x64-18`.

### Check if it is running (Git Bash)

```bash
export PATH="$PATH:/c/Program Files/PostgreSQL/18/bin"
pg_isready -h localhost -p 5432
```

- `accepting connections` → it's up, skip to step 3.
- `no response` → start it (below).

### Start the service

It requires administrator rights, so run this in an **elevated** PowerShell
(right-click PowerShell → *Run as administrator*):

```powershell
net start postgresql-x64-18
```

Or, from a normal terminal, trigger a UAC prompt:

```powershell
powershell -Command "Start-Process -Verb RunAs -FilePath 'net' -ArgumentList 'start','postgresql-x64-18'"
```

To make sure it always starts with Windows:

```powershell
# (elevated) set the service to start automatically
Set-Service -Name postgresql-x64-18 -StartupType Automatic
```

---

## 3. One-time database setup

The app uses a dedicated database and login role:

| Item | Value |
| --- | --- |
| Database | `gymapp` |
| Role / user | `gymapp` |
| Password | `gymapp` |
| Host / Port | `localhost` / `5432` |

> **This was already done on this machine.** You only need to repeat it if the
> database is dropped or you move to a new machine.

Run the following, entering the **`postgres` superuser password you chose during the
PostgreSQL installer** when prompted:

```bash
export PATH="$PATH:/c/Program Files/PostgreSQL/18/bin"

# Create the login role (password: gymapp)
psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE ROLE gymapp LOGIN PASSWORD 'gymapp';"

# Create the database owned by that role
psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE gymapp OWNER gymapp;"
```

You do **not** need to create any tables — the backend runs Flyway migrations on
startup, which create the schema and seed the 60-day Lean Bulk template
automatically.

---

## 4. Start the Backend (Spring Boot)

All backend configuration has sensible **local defaults baked into**
[`application.yml`](backend/src/main/resources/application.yml), so for local
development you do **not** need to set any environment variables. The defaults are:

- Port `8090`
- Database `jdbc:postgresql://localhost:5432/gymapp`, user/password `gymapp`/`gymapp`
- A dev JWT secret and `CORS` origin `http://localhost:3000`

You only override these (via environment variables) for Docker or production — see
the [Configuration reference](#10-configuration-reference-environment-variables).

### Option A — Run the packaged JAR (recommended, lighter/more stable)

```bash
cd /c/dev/projects/gym-web-app/backend

# Build once (skips tests for speed)
./mvnw -q -DskipTests package

# Run (no env vars needed — defaults come from application.yml)
java -Xmx512m -jar target/gymapp-backend-0.0.1-SNAPSHOT.jar
```

### Option B — Run via Maven (convenient for development)

```bash
cd /c/dev/projects/gym-web-app/backend
./mvnw spring-boot:run
```

### Confirm it's up

Wait for the log line `Started GymappBackendApplication`. Then:

```bash
# Should print 401 (unauthorized) — proves the API is responding
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8090/api/v1/programs
```

- API base URL: `http://localhost:8090/api/v1`
- Swagger UI (interactive API docs): `http://localhost:8090/swagger-ui/index.html`

---

## 5. Start the Frontend (Next.js)

> Important: the frontend talks to the backend using `NEXT_PUBLIC_API_URL`, which is
> baked in at **build time**. It must point at the backend (port 8090).

### Option A — Production build (recommended, lighter/more stable)

```bash
cd /c/dev/projects/gym-web-app/frontend

# Install dependencies (first time only)
npm install

# Build with the API URL baked in
export NEXT_PUBLIC_API_URL='http://localhost:8090'
npm run build

# Start
npm run start
```

### Option B — Dev server (hot reload, heavier on memory)

```bash
cd /c/dev/projects/gym-web-app/frontend
export NEXT_PUBLIC_API_URL='http://localhost:8090'
npm run dev
```

### Open the app

Visit **http://localhost:3000** → register a new account, then explore.

---

## 6. Quick end-to-end smoke test (optional)

With backend + database running:

```bash
# Register a user and capture the token
curl -s -X POST http://localhost:8090/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@test.com","password":"password123","displayName":"Me"}'
```

A successful response returns `{"token":"...","user":{...}}` with HTTP 201.

---

## 7. Stopping everything

- **Backend / Frontend**: press `Ctrl+C` in their terminals.
- **PostgreSQL** (only if you want to): `net stop postgresql-x64-18` (elevated).

---

## 8. Recommended startup order

```
1. PostgreSQL service  (step 2)
2. Backend             (step 4)  → wait for "Started GymappBackendApplication"
3. Frontend            (step 5)  → open http://localhost:3000
```

---

## 9. Troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| API requests hang ~30s then fail | PostgreSQL is down. Restart the `postgresql-x64-18` service (step 2). |
| Backend exits: `Connection to localhost:5432 refused` | PostgreSQL not running, or wrong `DB_URL`/credentials. |
| Backend exits: `Port 8090 already in use` | Another process holds 8090: `netstat -ano | grep ":8090 "`, then stop that PID, or pick a new port (update `SERVER_PORT` **and** rebuild the frontend with the matching `NEXT_PUBLIC_API_URL`). |
| Frontend loads but login/API calls fail | Frontend was built with the wrong `NEXT_PUBLIC_API_URL`. Rebuild (step 5) with `http://localhost:8090`. |
| `next start does not work with output: standalone` warning | Harmless for local use; pages still serve. Caused by the Docker `output: standalone` setting in `next.config.ts`. |
| Login fails as `postgres` user | That's the DB superuser password from the installer, not the app's `gymapp`/`gymapp` credentials. |

---

## 10. Configuration reference (environment variables)

The backend variables below are **optional** for local runs — each has a default in
[`application.yml`](backend/src/main/resources/application.yml) (shown in the
"Local default" column). Set them only to override (e.g. in Docker/production).

| Variable | Service | Local default | Override needed? |
| --- | --- | --- | --- |
| `SERVER_PORT` | backend | `8090` | Only to change the port |
| `DB_URL` | backend | `jdbc:postgresql://localhost:5432/gymapp` | Only for a different DB host |
| `DB_USERNAME` | backend | `gymapp` | Only for a different DB user |
| `DB_PASSWORD` | backend | `gymapp` | Recommended in production |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:3000` | For a different frontend origin |
| `JWT_SECRET` | backend | dev placeholder (≥ 32 chars) | **Required in production** |
| `JWT_EXPIRATION_MS` | backend | `86400000` (24h) | Optional |
| `NEXT_PUBLIC_API_URL` | frontend (build time) | `http://localhost:8090` | If backend runs elsewhere |

> Note: the frontend's `NEXT_PUBLIC_API_URL` is baked in at **build time**, so it
> must be set before `npm run build` (the frontend has no `application.yml`-style
> runtime config). It already defaults to `http://localhost:8090` in
> [`frontend/src/lib/api.ts`](frontend/src/lib/api.ts).
