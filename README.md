# MedSuite — Hospital IPD Management System

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/Database-SQLite%20%2F%20PostgreSQL-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

MedSuite is a production-ready, full-stack **In-Patient Department (IPD) management platform** built for hospitals and clinical facilities. It unifies the entire IPD workflow into one modern web interface — from patient admission and bed assignment, through real-time vital-sign monitoring and voice-recorded clinical notes, to nursing task coordination and severity-graded alerts.

Designed with a strict **role-based access control (RBAC)** model, MedSuite ensures that doctors, nurses, and administrators each see and interact with exactly the data they need — nothing more, nothing less.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the repository](#1-clone-the-repository)
  - [2. Backend setup](#2-backend-setup)
  - [3. Frontend setup](#3-frontend-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [API Overview](#api-overview)
- [Code Quality & Tooling](#code-quality--tooling)
  - [Python Tools](#python-tools)
  - [Node.js / Frontend Tools](#nodejs--frontend-tools)
  - [Pre-commit Hooks](#pre-commit-hooks)
  - [How It All Works Together](#how-it-all-works-together)
  - [All Commands Reference](#all-commands-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

| Concern | Solution |
|---|---|
| Patient lifecycle | Admit, monitor, and discharge patients with full structured records |
| Bed management | Real-time bed availability map across wards with one-click assignment |
| Vitals monitoring | Automated vital-sign ingestion with threshold-based auto-alerts |
| Audio notes | Voice-to-text clinical notes via Google Cloud Speech-to-Text |
| Task tracking | Assign, progress, and close nursing/doctor tasks per patient |
| Alerts | Severity-graded alerts (info / warning / critical) triggered by vitals or staff |
| Auth & RBAC | Stateless JWT authentication with Doctor / Nurse / Admin role enforcement |
| Audit trail | Timestamped records for every vital reading, note, task, and alert |

### Why MedSuite?

Traditional hospital ward management relies on paper charts, whiteboards, and verbal handoffs — all of which are error-prone and untraceable. MedSuite digitises these workflows:

- **No missed readings** — vitals are logged automatically and abnormal values immediately trigger alerts.
- **No lost notes** — audio recordings are transcribed and attached to the patient record permanently.
- **No forgotten tasks** — tasks are assigned to specific staff with clear status tracking.
- **No unauthorised access** — every API endpoint is protected by JWT + role checks.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Browser (Client)                           │
│                                                                      │
│   React 19 · React Router v7 · TanStack Query v5 · Recharts         │
│               Axios (auth interceptor) · Lucide Icons                │
│                         localhost:5173                               │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  HTTPS / REST (JSON)
                             │  Authorization: Bearer <JWT>
┌────────────────────────────▼─────────────────────────────────────────┐
│                      FastAPI  (ASGI / Uvicorn)                       │
│                          localhost:8000                              │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌────────┐ ┌───────┐ ┌───────┐ │
│  │  /auth   │ │/patients │ │/beds │ │/vitals │ │/tasks │ │/alerts│ │
│  └──────────┘ └──────────┘ └──────┘ └────────┘ └───────┘ └───────┘ │
│                          ┌─────────┐                                 │
│                          │ /audio  │◄── Google Cloud Speech-to-Text  │
│                          └─────────┘                                 │
│                                                                      │
│       RBAC middleware (JWT decode · role check · dependency inject)  │
└────────────────────────────┬─────────────────────────────────────────┘
                             │  SQLAlchemy ORM · Connection Pool
┌────────────────────────────▼─────────────────────────────────────────┐
│                         Database Layer                               │
│                                                                      │
│         SQLite (development)  ──or──  PostgreSQL (production)        │
│         Tables: users · patients · beds · vital_readings             │
│                 audio_notes · tasks · alerts                         │
└──────────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
Browser                FastAPI              Database
   │                      │                     │
   │─── POST /auth/login ─►│                     │
   │                      │── query user ───────►│
   │                      │◄─ user row ──────────│
   │                      │── verify bcrypt ─┐   │
   │                      │◄─────────────────┘   │
   │◄── 200 {token} ──────│                     │
   │                      │                     │
   │─── GET /patients ────►│                     │
   │    Bearer <token>    │── validate JWT ──┐   │
   │                      │◄─────────────────┘   │
   │                      │── SELECT patients ──►│
   │◄── 200 [{...}] ──────│◄─ rows ─────────────│
```

---

## Tech Stack

### Backend

| Package | Version | Purpose |
|---|---|---|
| **FastAPI** | 0.110.0 | High-performance REST API with automatic OpenAPI docs |
| **Uvicorn** | 0.29.0 | ASGI server powering the app in both dev and production |
| **SQLAlchemy** | 2.0.29 | ORM with full relationship mapping and session management |
| **Alembic** | 1.13.1 | Schema migration tool — version-controls database structure |
| **Pydantic v2** | 2.6.4 | Request validation, response serialisation, type enforcement |
| **python-jose** | 3.3.0 | JWT creation, signing (HS256), and verification |
| **passlib[bcrypt]** | 1.7.4 | Secure bcrypt password hashing |
| **python-multipart** | 0.0.9 | Parses `multipart/form-data` for file uploads |
| **google-cloud-speech** | 2.26.0 | Converts bedside audio recordings to text |
| **aiofiles** | 23.2.1 | Non-blocking async file I/O for audio storage |
| **python-dotenv** | 1.0.1 | Loads `.env` config at startup |
| **websockets** | 12.0 | WebSocket transport layer (future real-time push) |
| **httpx** | 0.27.0 | Async HTTP client for internal service calls and testing |

### Frontend

| Package | Version | Purpose |
|---|---|---|
| **React** | 19.2 | Declarative UI with concurrent features and transitions |
| **Vite** | 7.3 | Lightning-fast bundler with native ESM HMR |
| **React Router DOM** | 7.13 | File-convention routing with nested layouts |
| **TanStack Query** | 5.90 | Intelligent server-state management — caching, background refetch, deduplication |
| **Axios** | 1.13 | HTTP client with request interceptors for automatic auth header injection |
| **Recharts** | 3.7 | Composable SVG chart library used for vital-sign time-series graphs |
| **Lucide React** | 0.576 | Consistent, tree-shakeable SVG icon set |
| **ESLint** | 9.39 | Static analysis with React-specific plugin rules |

---

## Repository Structure

```
MedSuite/
├── README.md                   ← You are here
├── backend/
│   ├── README.md               ← Backend-specific documentation
│   ├── main.py                 ← FastAPI app entry point
│   ├── requirements.txt
│   └── app/
│       ├── auth.py             ← JWT helpers & role guards
│       ├── database.py         ← SQLAlchemy engine & session
│       ├── models.py           ← ORM models
│       ├── schemas.py          ← Pydantic schemas
│       └── routers/
│           ├── auth.py
│           ├── patients.py
│           ├── beds.py
│           ├── vitals.py
│           ├── audio.py
│           ├── tasks.py
│           └── alerts.py
└── frontend/
    ├── README.md               ← Frontend-specific documentation
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx             ← Root router & providers
        ├── api.js              ← Axios instance
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   └── Navbar.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Patients.jsx
            ├── PatientDetail.jsx
            ├── Beds.jsx
            └── Tasks.jsx
```

---

## Getting Started

### Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Python | 3.10+ | 3.11 or 3.12 recommended |
| Node.js | 18+ | LTS release recommended |
| npm | 9+ | Comes bundled with Node.js |
| Git | any | For cloning the repo |
| Google Cloud credentials | — | Optional — only required for live audio transcription |

### 1. Clone the repository

```bash
git clone https://github.com/your-org/medsuite.git
cd medsuite
```

### 2. Backend setup

```bash
cd backend

# ── Create and activate a virtual environment ──────────────────────────────
python -m venv venv

# Windows (PowerShell)
venv\Scripts\activate
# Windows (CMD)
venv\Scripts\activate.bat
# macOS / Linux
source venv/bin/activate

# ── Install all Python dependencies ───────────────────────────────────────
pip install -r requirements.txt

# ── Create your local environment config ──────────────────────────────────
# Copy the example and edit values (see Environment Variables below)
copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux

# ── Start the development server ──────────────────────────────────────────
uvicorn main:app --reload --port 8000
```

On first run, SQLAlchemy automatically creates all database tables.

| URL | Purpose |
|---|---|
| `http://localhost:8000/` | Health check → `{"status": "ok"}` |
| `http://localhost:8000/docs` | Swagger UI — interactive API explorer |
| `http://localhost:8000/redoc` | ReDoc — clean reference documentation |

### 3. Frontend setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start the Vite dev server
npm run dev
```

The React app is available at `http://localhost:5173`.

> **Tip:** Both servers must run at the same time. Open two terminal windows or tabs — one for each.

### 4. First-time setup - bootstrap users

Public registration is disabled by default (`ALLOW_PUBLIC_REGISTER=false`).
Create initial users with the bootstrap script from repo root:

```bash
python scripts/bootstrap_users.py
```

Default bootstrap logins:

```text
Username: rushil.dhube       Password: test@456
Username: tushar.dayma       Password: test@123
Username: prathamesh.chavan  Password: test@789
```

Then log in via UI or obtain a token directly:

```bash
curl -X POST http://localhost:8000/auth/login \
  -F "username=rushil.dhube" \
  -F "password=test@456"
# Returns: {"access_token": "eyJ...", "token_type": "bearer"}
```

---

## Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
# ── Database ──────────────────────────────────────────────
DATABASE_URL=sqlite:///./medsuite.db
# For PostgreSQL: postgresql://user:password@localhost:5432/medsuite

# ── JWT ───────────────────────────────────────────────────
SECRET_KEY=change_me_to_a_long_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
ALLOW_PUBLIC_REGISTER=false

# ── Google Cloud Speech-to-Text (optional) ────────────────
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# ── SMTP (optional, for email features) ────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=MedSuite Hospital
```

> If `GOOGLE_APPLICATION_CREDENTIALS` is not set, audio upload will still work but the transcript will contain a placeholder message.

Create a `.env` file inside `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

---

## Running the Application

Run both servers concurrently (two terminals):

```bash
# Terminal 1 — Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Key Features

### Patient Management
- Admit patients with full clinical intake: name, age, gender, diagnosis, allergies, mental status, infection risk, and severity flags.
- Searchable paginated patient list — find any patient by name or ID in milliseconds.
- Full patient detail page with a tabbed layout covering vitals, audio notes, tasks, and alerts.
- Soft discharge via status flags; hard delete available to admin/doctor roles.

### Bed Management
- Complete bed inventory with ward classification and status tracking: `available`, `occupied`, `maintenance`.
- One-click bed assignment links a patient to a specific bed and updates the bed status atomically.
- Release action clears the patient link and marks the bed available.
- Visual bed board grouped by ward for at-a-glance occupancy overview.

### Vital-Sign Monitoring
- Ingest vital readings with: heart rate (bpm), SpO2 (%), systolic/diastolic blood pressure (mmHg), temperature (°C), and ECG voltage.
- Mock vitals endpoint generates realistic randomised values for demos and testing.
- Automatic alert generation fires immediately when readings breach clinical thresholds:
  - Heart rate outside 60–100 bpm
  - SpO2 below 95 %
  - Temperature above 38.0 °C
- Full vital history stored per patient, queryable with a `limit` parameter.
- Time-series line charts in the frontend visualise trends over all recorded readings.

### Audio Notes & Transcription
- Upload audio files (WebM/Opus) recorded from the browser via the MediaRecorder API.
- Files are saved to `uploads/audio/` on the server with a unique UUID filename.
- Google Cloud Speech-to-Text synchronously transcribes each recording and stores the text alongside the file reference.
- Graceful degradation — if Google STT is unavailable the upload still completes with a placeholder transcript.
- Full list of audio notes per patient with timestamps and transcripts displayed in the UI.

### Task Management
- Create clinical tasks tied to a specific patient and assignee.
- Three-stage workflow: `pending` → `in_progress` → `done`.
- Cross-patient task board on the Tasks page for ward-wide operational views.
- Filter tasks by status, patient, or assignee.

### Alerts
- Alerts are created automatically by the vitals engine or manually by clinical staff.
- Three severity levels: `info`, `warning`, `critical` — colour-coded in the UI.
- Alerts are linked to the specific patient record.
- Acknowledge/dismiss actions tracked per alert.

### Authentication & Security
- Stateless JWT authentication — no server-side session storage.
- Passwords hashed with bcrypt (work factor 12).
- Configurable token expiry (default 8 hours).
- Public registration is disabled by default; admin onboarding path is `POST /auth/register/admin`.
- `require_role()` dependency factory enforces RBAC on mutation endpoints.
- Alerts WebSocket (`/alerts/ws`) requires a valid JWT token query parameter.
- CORS restricted to known frontend origins.

---

## User Roles

| Role | Patients | Beds | Vitals | Audio Notes | Tasks | Alerts | Users |
|---|---|---|---|---|---|---|---|
| `admin` | Full CRUD | Full CRUD | Full | Full | Full | Full | Full CRUD |
| `doctor` | Full CRUD | Read + Assign | Read + Ingest | Read + Upload | Read + Create/Update/Delete | Read + Create | Read own |
| `nurse` | Read only | Read + Assign | Read + Ingest | Read + Upload | Read + Create/Update/Delete | Read | Read own |

> Role is set at registration and can be updated by an `admin`. Each API endpoint declares its required roles explicitly using FastAPI's `Depends()` with the `require_role()` factory.

---

## API Overview

| Router | Base path | Description |
|---|---|---|
| Auth | `/auth` | Login, current user, admin registration |
| Patients | `/patients` | CRUD for patient records |
| Beds | `/beds` | Bed inventory and assignment |
| Vitals | `/vitals` | Vital-sign ingest and history |
| Audio | `/audio` | Upload and list audio notes |
| Tasks | `/tasks` | Task CRUD and status updates |
| Alerts | `/alerts` | Alert feed, acknowledgement, authenticated WebSocket stream |

Full interactive documentation is auto-generated by FastAPI at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc).

---

## Troubleshooting

### Backend won't start — `ModuleNotFoundError`
Make sure your virtual environment is activated before running `uvicorn`:
```bash
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### Frontend shows `Network Error` or `CORS` in console
- Ensure the backend is running on port 8000.
- Check that `VITE_API_BASE_URL` in `frontend/.env` matches the backend URL.
- Verify `allow_origins` in `backend/main.py` includes your frontend origin.

### Audio transcription returns `[Transcription failed: ...]`
- Set `GOOGLE_APPLICATION_CREDENTIALS` in `backend/.env` to the path of your Google Cloud JSON key.
- Make sure the **Speech-to-Text API** is enabled in your Google Cloud project.
- Verify the service account has the `Cloud Speech Client` IAM role.

### Database tables not created
- Tables are created automatically on startup via `Base.metadata.create_all()`. If they're missing, check that `DATABASE_URL` is correct and the database server is reachable.
- For PostgreSQL: ensure the target database exists before starting the server (`CREATE DATABASE medsuite;`).

### Login returns `401 Unauthorized`
- Passwords are case-sensitive.
- Login uses **username** (not email).
- Ensure the user exists and `is_active = true`.
- Token expiry is 8 hours by default — log in again if the session has expired.

### Registration returns `403 Public registration is disabled`
- This is expected when `ALLOW_PUBLIC_REGISTER=false`.
- Use `POST /auth/register/admin` with an admin bearer token.

### Alerts WebSocket disconnects immediately
- Ensure the frontend is passing `?token=<jwt>`.
- Verify `VITE_WS_BASE_URL` points to the backend host.
- Confirm the JWT was issued by the same backend `SECRET_KEY`.

---

## Security Test Scripts

Phase 0 security checks are automated with pytest.

Run from repo root:

```bash
python scripts/run_phase0_tests.py
```

PowerShell alternative:

```powershell
.\scripts\run_phase0_tests.ps1
```

Covered checks include:
- Public registration lock behavior.
- Admin registration auth requirement.
- Username login and `/auth/me` flow.
- RBAC behavior on key mutation endpoints.
- Alerts WebSocket token authentication.

---

## Deployment

### Docker (recommended for production)

A minimal `docker-compose.yml` skeleton:

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: medsuite
      POSTGRES_USER: med
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

  backend:
    build: ./backend
    env_file: ./backend/.env
    environment:
      DATABASE_URL: postgresql://med:secret@db:5432/medsuite
    ports:
      - "8000:8000"
    depends_on:
      - db
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

  frontend:
    build: ./frontend
    ports:
      - "80:80"

volumes:
  pgdata:
```

### Environment checklist before going live

- [ ] `SECRET_KEY` set to a long random string (e.g. `openssl rand -hex 32`)
- [ ] `DATABASE_URL` points to a production PostgreSQL server
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` configured if using audio transcription
- [ ] `allow_origins` in `main.py` restricted to your production domain
- [ ] HTTPS enabled (Nginx / Caddy / load balancer in front of Uvicorn)
- [ ] `uploads/audio/` directory on persistent storage (not ephemeral container FS)

---

## Code Quality & Tooling

MedSuite enforces consistent code style, import order, and linting for **both** the Python backend and the JavaScript frontend using automated tools that run before every commit. No style debate needed — the tools decide.

```
 Developer types: git commit
         │
         ▼
 ┌───────────────────────────────────────────────────────────────┐
 │  pre-commit  (Python layer — runs from repo root)             │
 │                                                               │
 │  1. File hygiene  (whitespace, line endings, YAML/JSON check) │
 │  2. Black         (Python formatter)                          │
 │  3. isort         (Python import sorter)                      │
 │  4. flake8        (Python linter)                             │
 │  5. Prettier      (JS/CSS/JSON/MD formatter via pre-commit)   │
 └──────────────────────┬────────────────────────────────────────┘
                        │  all pass?
         ┌──────────────┴──────────────┐
        YES                           NO
         │                             │
         ▼                             ▼
  Commit created              Commit blocked — fix errors shown in terminal
```

From the **frontend** side, Husky + lint-staged run in parallel on staged JS files:

```
 git commit (inside frontend/)
         │
         ▼
 ┌─────────────────────────────────────┐
 │  Husky pre-commit hook              │
 │  → lint-staged (staged files only)  │
 │    ├── ESLint --fix  (*.js, *.jsx)  │
 │    └── Prettier --write (all types) │
 └─────────────────────────────────────┘
```

---

### Python Tools

All Python tools are installed inside `backend/myenv` (the project virtual environment).

#### Black — Code Formatter

Black is an **opinionated, zero-config formatter**. It rewrites Python source files to a single consistent style. You never argue about whitespace again — Black decides.

- Line length: **88 characters** (Black's default)
- Targets Python 3.10, 3.11, and 3.12
- Skips: `.git`, `venv`, `__pycache__`, `build`, `dist`, `alembic/versions`

Config lives in [`backend/pyproject.toml`](backend/pyproject.toml):

```toml
[tool.black]
line-length = 88
target-version = ["py310", "py311", "py312"]
```

How Black works:

```
 Before Black          After Black
 ─────────────────     ──────────────────────────────────
 def foo( x,y ):       def foo(x, y):
   return x+y              return x + y

 import os,sys         import os
                       import sys
```

#### isort — Import Sorter

isort automatically sorts and groups `import` statements into sections:
1. Standard library (`os`, `sys`, `datetime`, …)
2. Third-party (`fastapi`, `sqlalchemy`, `pydantic`, …)
3. First-party / local (`app.models`, `app.auth`, …)

It uses `profile = "black"` so its output is always **Black-compatible** (no conflicts).

Config in [`backend/pyproject.toml`](backend/pyproject.toml):

```toml
[tool.isort]
profile = "black"
line_length = 88
known_first_party = ["app"]
known_third_party = ["fastapi", "sqlalchemy", "pydantic", "jose", "passlib", "google"]
```

How isort works:

```python
# Before isort
from app.models import User
import os
from fastapi import FastAPI
import sys
from app.auth import get_current_user

# After isort
import os
import sys

from fastapi import FastAPI

from app.auth import get_current_user
from app.models import User
```

#### flake8 — Linter

flake8 **reads** your code and reports style violations and potential bugs. Unlike Black and isort it does not auto-fix — it tells you what to fix.

Config in [`backend/.flake8`](backend/.flake8):

```ini
[flake8]
max-line-length = 88
extend-ignore = E203, W503, E501   # Black-compatible ignores
per-file-ignores =
    __init__.py: F401               # allow re-exports in __init__ files
```

Two extra plugins are also installed:

| Plugin | What it catches |
|---|---|
| `flake8-bugbear` | Common bugs and design problems (e.g. mutable default arguments, using `assert` in production code) |
| `flake8-comprehensions` | Suggests better list/set/dict comprehension and `map()`/`filter()` usage |

Common flake8 codes you'll see:

| Code | Meaning |
|---|---|
| `E501` | Line too long (disabled — handled by Black) |
| `F401` | Imported but unused |
| `F841` | Local variable assigned but never used |
| `B006` | Mutable default argument (bugbear) |
| `C400` | Unnecessary list comprehension — use `list()` (comprehensions plugin) |

---

### Node.js / Frontend Tools

All Node tools are installed in `frontend/node_modules` and declared in [`frontend/package.json`](frontend/package.json).

#### Prettier — Code Formatter

Prettier is the JavaScript equivalent of Black — it reformats code to a single consistent style automatically.

Config in [`frontend/.prettierrc`](frontend/.prettierrc):

```json
{
  "singleQuote": false,
  "semi": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "endOfLine": "lf"
}
```

What each option means:

| Option | Value | Effect |
|---|---|---|
| `singleQuote` | `false` | Uses double quotes `"` (matches JSX convention) |
| `semi` | `true` | Always adds semicolons |
| `printWidth` | `100` | Wraps lines longer than 100 chars |
| `tabWidth` | `2` | 2-space indentation |
| `trailingComma` | `"es5"` | Trailing commas in objects and arrays (valid ES5+) |
| `bracketSpacing` | `true` | `{ foo: bar }` not `{foo: bar}` |
| `endOfLine` | `"lf"` | Unix line endings (consistent across Windows/Mac/Linux) |

#### ESLint — Linter

ESLint finds and reports code quality issues in JavaScript and JSX. The project uses the **flat config** format (`eslint.config.js`) introduced in ESLint 9.

Plugins loaded:

| Plugin | Purpose |
|---|---|
| `@eslint/js` | Core JS rules (no-undef, no-unused-vars, …) |
| `eslint-plugin-react-hooks` | Enforces Rules of Hooks + exhaustive `useEffect` deps |
| `eslint-plugin-react-refresh` | Warns if a file exports non-component values (breaks Vite HMR) |
| `eslint-plugin-prettier` | Runs Prettier as an ESLint rule — Prettier violations show as ESLint errors |
| `eslint-config-prettier` | Disables all ESLint formatting rules that would conflict with Prettier |

The `prettierRecommended` config is placed **last** in the config array so it wins over any conflicting rules.

#### Husky — Git Hooks for Node.js

Husky registers a `pre-commit` git hook that fires **before every commit made from the `frontend/` directory** (or anywhere in the repo when installed from root).

Hook file — [`frontend/.husky/pre-commit`](frontend/.husky/pre-commit):

```sh
npx lint-staged
```

Husky is auto-installed via the `"prepare": "husky"` script in `package.json`, which npm runs automatically after `npm install`.

#### lint-staged — Run Tools on Staged Files Only

lint-staged is critical for performance — it runs linters and formatters **only on files you've staged for the commit**, not the whole codebase. This keeps the hook fast even in large projects.

Config in [`frontend/.lintstagedrc`](frontend/.lintstagedrc):

```json
{
  "*.{js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{css,json,md,yaml,yml}": [
    "prettier --write"
  ]
}
```

Flow for a staged `.jsx` file:

```
git add src/pages/Patients.jsx
git commit
      │
      ▼
 Husky → lint-staged picks up Patients.jsx
      │
      ├─ eslint --fix Patients.jsx    (auto-fixes what it can, errors block commit)
      └─ prettier --write Patients.jsx (rewrites to consistent style)
      │
      ▼
 Patients.jsx re-staged with fixes → commit proceeds
```

---

### Pre-commit Hooks

The root [`.pre-commit-config.yaml`](.pre-commit-config.yaml) manages hooks for **the entire monorepo** using the `pre-commit` Python tool. Each hook targets specific file paths so Python hooks only run on `backend/` files and Prettier only runs on `frontend/` files.

#### Hook execution order on `git commit`

| Order | Hook | Tool | Files targeted | What it does |
|:---:|---|---|---|---|
| 1 | `trailing-whitespace` | pre-commit-hooks | All | Strips trailing spaces from every line |
| 2 | `end-of-file-fixer` | pre-commit-hooks | All | Ensures files end with exactly one newline |
| 3 | `check-yaml` | pre-commit-hooks | `*.yaml`, `*.yml` | Validates YAML syntax |
| 4 | `check-json` | pre-commit-hooks | `*.json` | Validates JSON syntax |
| 5 | `check-toml` | pre-commit-hooks | `*.toml` | Validates TOML syntax |
| 6 | `check-merge-conflict` | pre-commit-hooks | All | Blocks `<<<<<<` conflict markers |
| 7 | `check-added-large-files` | pre-commit-hooks | All | Blocks files > 500 KB |
| 8 | `debug-statements` | pre-commit-hooks | `*.py` | Catches `breakpoint()` / `pdb.set_trace()` |
| 9 | `mixed-line-ending` | pre-commit-hooks | All | Normalises to LF |
| 10 | `black` | Black 24.3.0 | `backend/**/*.py` | Formats Python code |
| 11 | `isort` | isort 5.13.2 | `backend/**/*.py` | Sorts Python imports |
| 12 | `flake8` | flake8 7.0.0 + plugins | `backend/**/*.py` | Lints Python code |
| 13 | `prettier` | Prettier (mirror) | `frontend/**` JS/CSS/JSON/MD | Formats frontend files |

If **any hook fails**, the commit is **blocked** and the error is printed. Auto-fixing hooks (Black, isort, Prettier) rewrite the files — you then `git add` the fixed files and commit again.

#### Typical blocked-commit output

```
$ git commit -m "add patient form"
Trim Trailing Whitespace.................................................Passed
Fix End of File..........................................................Passed
Check Yaml...............................................................Passed
black....................................................................Failed
- hook id: black
- files were modified by this hook

reformatted backend/app/routers/patients.py

All done! ✨ 🍰 ✨
1 file reformatted.
```

Black rewrote the file. Run `git add backend/app/routers/patients.py` then commit again — it will pass.

---

### How It All Works Together

```
┌──────────────────────────────────────────────────────────────────────────┐
│  MedSuite Monorepo                                                       │
│                                                                          │
│  .pre-commit-config.yaml  ◄─── controls ALL hooks at git level           │
│                                                                          │
│  backend/                                                                │
│   ├── pyproject.toml      ◄─── Black + isort configuration               │
│   ├── .flake8             ◄─── flake8 rules and ignores                  │
│   └── myenv/             ◄─── Black, isort, flake8, pre-commit binaries  │
│                                                                          │
│  frontend/                                                               │
│   ├── .prettierrc         ◄─── Prettier formatting rules                 │
│   ├── .lintstagedrc       ◄─── which tools run on which staged files     │
│   ├── eslint.config.js    ◄─── ESLint rules + Prettier integration       │
│   ├── .husky/pre-commit   ◄─── runs "npx lint-staged" before JS commits  │
│   └── package.json        ◄─── scripts: lint, format, lint:fix, prepare  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Tool responsibility split:**

| Concern | Python | JavaScript |
|---|---|---|
| Formatting | Black | Prettier |
| Import/module order | isort | ESLint import rules |
| Bug & style linting | flake8 + plugins | ESLint + React plugins |
| Git hook manager | pre-commit | Husky |
| Staged-file runner | pre-commit (built-in) | lint-staged |

---

### All Commands Reference

#### First-time setup (run once after cloning)

```bash
# ── Backend ──────────────────────────────────────────────────────
cd backend

# Activate the virtual environment
# Windows (PowerShell)
.\myenv\Scripts\Activate.ps1
# macOS / Linux
source myenv/bin/activate

# Install all Python quality tools
pip install black isort flake8 pre-commit flake8-bugbear flake8-comprehensions

# ── Repo root ─────────────────────────────────────────────────────
cd ..

# Install git hooks (reads .pre-commit-config.yaml)
pre-commit install

# ── Frontend ──────────────────────────────────────────────────────
cd frontend

# Install Node dependencies including Prettier, Husky, lint-staged
npm install
# Husky hooks are auto-installed via the "prepare" script
```

#### Python commands (run from `backend/` with venv active)

```bash
# Format all Python files with Black
black .

# Format a single file
black app/routers/patients.py

# Check formatting without changing files (useful in CI)
black --check .

# Show a diff of what Black would change (without applying)
black --diff .

# Sort imports across all Python files
isort .

# Sort imports in a single file
isort app/routers/patients.py

# Check import order without changing files
isort --check-only .

# Show diff of what isort would change
isort --diff .

# Lint all Python files (exit code 0 = no issues)
flake8

# Lint a specific directory
flake8 app/

# Lint a single file
flake8 app/routers/patients.py

# Show statistics (which rules fire most)
flake8 --statistics

# Lint with a specific max line length override
flake8 --max-line-length 100
```

#### pre-commit commands (run from repo root)

```bash
# Install hooks into .git/hooks/ (run once after cloning)
pre-commit install

# Run ALL hooks against ALL files in the repo (useful after first setup)
pre-commit run --all-files

# Run a specific hook against all files
pre-commit run black --all-files
pre-commit run isort --all-files
pre-commit run flake8 --all-files
pre-commit run prettier --all-files

# Run all hooks against specific files
pre-commit run --files backend/app/routers/patients.py

# Update all hook versions to their latest tags
pre-commit autoupdate

# Show installed hook versions and status
pre-commit --version

# Uninstall hooks (removes from .git/hooks/)
pre-commit uninstall

# Bypass hooks for a single commit (use sparingly)
git commit --no-verify -m "emergency fix"
```

#### Node.js / Frontend commands (run from `frontend/`)

```bash
# ── ESLint ────────────────────────────────────────────────────────
# Lint all JS/JSX files
npm run lint

# Auto-fix all fixable ESLint issues
npm run lint:fix

# Lint a specific file (calls eslint directly)
npx eslint src/pages/Patients.jsx

# Lint and see rule names alongside messages
npx eslint --rule-name .

# ── Prettier ──────────────────────────────────────────────────────
# Format ALL files in the project
npm run format

# Check formatting without changing files (CI-safe, exits non-zero if any file differs)
npm run format:check

# Format a single file
npx prettier --write src/pages/Patients.jsx

# Check a single file
npx prettier --check src/pages/Patients.jsx

# Show what Prettier would change
npx prettier --write --list-different .

# ── lint-staged (manual run) ──────────────────────────────────────
# Run lint-staged against currently staged files
npx lint-staged

# ── Husky ─────────────────────────────────────────────────────────
# Re-initialise Husky hooks (if .husky/ gets corrupted)
npx husky init

# Make hook file executable (Linux/macOS only)
chmod +x .husky/pre-commit
```

#### Skipping hooks when needed

```bash
# Skip ALL pre-commit hooks for one commit (emergency only)
git commit --no-verify -m "hotfix: critical prod issue"

# Skip only pre-commit (keep Husky) — not generally possible; --no-verify skips both

# Skip a single pre-commit hook by name
SKIP=flake8 git commit -m "WIP: work in progress"

# Skip multiple hooks
SKIP=black,isort git commit -m "WIP"
```

#### CI / automation

```bash
# Run everything as CI would (no file modifications, exit 1 on any failure)
pre-commit run --all-files          # Python checks
npm run format:check                # Prettier check (frontend)
npm run lint                        # ESLint check (frontend)
```

---

## Contributing

1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **First-time setup** — install all code quality tools:
   ```bash
   # From repo root
   pre-commit install

   # Backend tools
   cd backend && .\myenv\Scripts\Activate.ps1
   pip install black isort flake8 pre-commit flake8-bugbear flake8-comprehensions

   # Frontend tools
   cd ../frontend && npm install
   ```

3. Write your code. Before committing, optionally run tools manually to see issues early:
   ```bash
   # Python
   black . && isort . && flake8

   # JavaScript
   npm run lint:fix && npm run format
   ```

4. Commit — the pre-commit pipeline runs automatically:
   ```bash
   git add .
   git commit -m "feat: describe your change"
   # Hooks fire here — fix any reported issues, then commit again
   ```

5. Keep commits atomic and write meaningful commit messages.
6. Open a pull request with:
   - A clear description of *what* changed and *why*
   - Screenshots or API response examples for UI / endpoint changes
   - Reference to any related issue

---

## License

This project is licensed under the [MIT License](LICENSE).
