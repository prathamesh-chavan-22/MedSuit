# MedSuite — Backend

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red)
![License](https://img.shields.io/badge/License-MIT-green)

Python / FastAPI REST API for the MedSuite Hospital IPD Management System. Provides a fully documented, JWT-secured API for patient records, bed management, real-time vital-sign monitoring, voice-to-text clinical notes, nursing task tracking, and severity-graded alerts. All endpoints are auto-documented via OpenAPI (Swagger) at `/docs`.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
  - [Prerequisites](#prerequisites)
  - [Virtual Environment](#virtual-environment)
  - [Install Dependencies](#install-dependencies)
  - [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [Database](#database)
  - [Default (SQLite)](#default-sqlite)
  - [Switch to PostgreSQL](#switch-to-postgresql)
  - [Migrations with Alembic](#migrations-with-alembic)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Patients](#patients)
  - [Beds](#beds)
  - [Vitals](#vitals)
  - [Audio Notes](#audio-notes)
  - [Tasks](#tasks)
  - [Alerts](#alerts)
- [Authentication & RBAC](#authentication--rbac)
- [Audio Transcription](#audio-transcription)
- [Data Models](#data-models)
- [Configuration Reference](#configuration-reference)
- [Development Notes](#development-notes)

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| **FastAPI** | 0.110.0 | REST API framework (OpenAPI auto-docs) |
| **Uvicorn** | 0.29.0 | ASGI server |
| **SQLAlchemy** | 2.0.29 | ORM and database abstraction |
| **Alembic** | 1.13.1 | Schema migrations |
| **Pydantic** | 2.6.4 | Request/response validation |
| **python-jose** | 3.3.0 | JWT creation and verification |
| **passlib[bcrypt]** | 1.7.4 | Password hashing |
| **python-multipart** | 0.0.9 | Multipart file uploads |
| **google-cloud-speech** | 2.26.0 | Speech-to-Text transcription |
| **aiofiles** | 23.2.1 | Async file I/O |
| **python-dotenv** | 1.0.1 | `.env` file loading |
| **websockets** | 12.0 | WebSocket support |
| **httpx** | 0.27.0 | Async HTTP client (testing/utilities) |

---

## Project Structure

```
backend/
├── main.py                 # App factory, CORS, router registration
├── requirements.txt
├── .env                    # Secret config (not committed)
├── medsuite.db             # SQLite database file (auto-created, dev only)
├── uploads/
│   └── audio/              # Uploaded audio files (auto-created)
└── app/
    ├── __init__.py
    ├── auth.py             # JWT helpers, password hashing, role guards
    ├── database.py         # SQLAlchemy engine, session factory, Base
    ├── models.py           # ORM models (User, Patient, Bed, …)
    ├── schemas.py          # Pydantic input/output schemas
    └── routers/
        ├── __init__.py
        ├── auth.py         # POST /auth/login, POST /auth/register
        ├── patients.py     # CRUD /patients
        ├── beds.py         # CRUD /beds + assignment endpoints
        ├── vitals.py       # POST /vitals/mock/{id}, GET /vitals/{id}
        ├── audio.py        # POST /audio/{id}, GET /audio/{id}
        ├── tasks.py        # CRUD /tasks
        └── alerts.py       # GET /alerts, PATCH /alerts/{id}
```

---

## Setup & Installation

### Prerequisites

| Requirement | Minimum | Notes |
|---|---|---|
| Python | 3.10 | 3.11 or 3.12 strongly recommended |
| pip | bundled | Use `python -m pip` to avoid PATH issues |
| Google Cloud project | — | Optional — only needed for live audio transcription |

### Virtual Environment

Always work inside a virtual environment to avoid dependency conflicts.

```bash
cd backend

# Create the environment
python -m venv venv

# Activate — Windows (PowerShell)
venv\Scripts\Activate.ps1

# Activate — Windows (CMD)
venv\Scripts\activate.bat

# Activate — macOS / Linux
source venv/bin/activate

# Confirm the right Python is active
python --version
which python   # should point to .../venv/...
```

# Activate — Windows
venv\Scripts\activate

# Activate — macOS / Linux
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

Key packages installed and why they matter:

| Package | Why it's here |
|---|---|
| `fastapi` | Declarative route handlers with automatic data-validation via Pydantic |
| `uvicorn[standard]` | Production-grade ASGI runner; `[standard]` adds uvloop + httptools for speed |
| `sqlalchemy` | ORM mapping Python classes to SQL tables with full relationship support |
| `alembic` | Tracks schema changes as migration scripts — safe for production upgrades |
| `pydantic[email]` | Validates and serialises all request/response bodies; `[email]` adds email syntax checks |
| `python-jose[cryptography]` | Signs, encodes, decodes, and verifies JWT tokens |
| `passlib[bcrypt]` | Cost-factor bcrypt hashing — industry standard for password storage |
| `python-multipart` | Required by FastAPI to parse `multipart/form-data` form field and file uploads |
| `google-cloud-speech` | Official Google Cloud client for synchronous Speech-to-Text recognition |
| `aiofiles` | Async file reading/writing so audio upload doesn't block the event loop |
| `python-dotenv` | Reads `.env` files into `os.environ` at startup |
| `websockets` | Async WebSocket protocol support (available for future real-time push) |
| `httpx` | Modern async HTTP client used in integration testing and inter-service calls |

### Environment Variables

Create a file named `.env` in the `backend/` directory. The server reads it automatically on startup:

```env
# ───────────────────────────────────────────────────────────────────────────
# DATABASE
# ───────────────────────────────────────────────────────────────────────────
# SQLite (development):
DATABASE_URL=sqlite:///./medsuite.db

# PostgreSQL (production):
# DATABASE_URL=postgresql://username:password@host:5432/medsuite

# ───────────────────────────────────────────────────────────────────────────
# JWT SECURITY
# Generate a strong key: python -c "import secrets; print(secrets.token_hex(32))"
# ───────────────────────────────────────────────────────────────────────────
SECRET_KEY=replace_with_a_64_char_random_hex_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# ───────────────────────────────────────────────────────────────────────────
# GOOGLE CLOUD (optional — remove if not using audio transcription)
# ───────────────────────────────────────────────────────────────────────────
GOOGLE_APPLICATION_CREDENTIALS=C:/path/to/service-account.json
```

> **Security note:** Never commit `.env` to version control. Add it to `.gitignore`.

---

## Running the Server

```bash
# Development — hot reload on every file save
uvicorn main:app --reload --port 8000

# Production — multi-worker, bind all interfaces
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Production with SSL
uvicorn main:app --host 0.0.0.0 --port 8443 --workers 4 \
  --ssl-keyfile ./certs/key.pem \
  --ssl-certfile ./certs/cert.pem
```

| URL | Description |
|---|---|
| `http://localhost:8000/` | Health check — returns `{"status": "ok", "service": "MedSuite IPD API"}` |
| `http://localhost:8000/docs` | Swagger UI — fully interactive, try-it-out API explorer |
| `http://localhost:8000/redoc` | ReDoc — clean, readable reference documentation |
| `http://localhost:8000/openapi.json` | Raw OpenAPI 3.1 schema (useful for code generation) |

---

## Database

### Default (SQLite)

SQLite is used out of the box with zero configuration. All tables are created automatically on startup via `Base.metadata.create_all(bind=engine)`. The database file (`medsuite.db`) appears in the `backend/` directory after the first run.

SQLite is suitable for **development and small single-instance deployments**. It uses file-level locking, which limits write concurrency. For anything beyond a single-user demo, switch to PostgreSQL.

### Switch to PostgreSQL

1. Install the PostgreSQL adapter:
   ```bash
   pip install psycopg2-binary
   ```
2. Create the database:
   ```sql
   CREATE DATABASE medsuite;
   ```
3. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/medsuite
   ```
4. Restart the server — the `connect_args` check in `database.py` automatically omits the SQLite-specific `check_same_thread` flag.

### Migrations with Alembic

Alembic version-controls your schema so model changes can be applied incrementally without data loss.

```bash
# One-time initialisation (generates alembic/ directory and alembic.ini)
alembic init alembic

# After any change to app/models.py, generate a migration script:
alembic revision --autogenerate -m "add infection_risk column to patients"

# Inspect the generated script in alembic/versions/ before applying

# Apply all pending migrations
alembic upgrade head

# See current migration state
alembic current

# Roll back the most recent migration
alembic downgrade -1

# Roll back to a specific revision
alembic downgrade <revision_id>
```

> **Important:** `autogenerate` compares your SQLAlchemy models against the database schema. It does NOT catch every change (e.g. server-side defaults, some index changes). Always review generated scripts before applying to production.

---

## API Reference

All protected routes require the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Missing or invalid tokens return `401 Unauthorized`. Correct token but wrong role returns `403 Forbidden`.

### Common HTTP Status Codes

| Code | Meaning |
|---|---|
| `200 OK` | Request succeeded, response body contains data |
| `201 Created` | Resource created successfully |
| `400 Bad Request` | Validation error — response body contains field-level details |
| `401 Unauthorized` | Missing or expired JWT token |
| `403 Forbidden` | Valid token but insufficient role permissions |
| `404 Not Found` | Resource with the given ID does not exist |
| `422 Unprocessable Entity` | Pydantic schema validation failure — check request body shape |

---

### Auth

#### `POST /auth/register` — Create a new user

**Body (JSON):**
```json
{
  "full_name": "Dr. Sarah Khan",
  "email": "sarah.khan@hospital.com",
  "password": "SecurePass123!",
  "role": "doctor"
}
```

**Response `201`:**
```json
{
  "id": 1,
  "full_name": "Dr. Sarah Khan",
  "email": "sarah.khan@hospital.com",
  "role": "doctor",
  "is_active": true,
  "created_at": "2026-03-05T09:00:00Z"
}
```

Valid `role` values: `doctor`, `nurse`, `admin`.

#### `POST /auth/login` — Obtain a JWT token

**Body (`application/x-www-form-urlencoded` or form-data):**
```
username=sarah.khan@hospital.com
password=SecurePass123!
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### `GET /auth/me` — Get current user profile

**Response `200`:**
```json
{
  "id": 1,
  "full_name": "Dr. Sarah Khan",
  "email": "sarah.khan@hospital.com",
  "role": "doctor",
  "is_active": true
}
```

---

### Patients

#### `GET /patients` — List all patients

Optional query params: `skip` (default 0), `limit` (default 100).

**Response `200`:** array of patient objects.

#### `POST /patients` — Admit a new patient

**Body (JSON):**
```json
{
  "full_name": "Mohammed Al-Rashid",
  "age": 54,
  "gender": "male",
  "diagnosis": "Type 2 Diabetes with hypertensive crisis",
  "allergies": "Penicillin, Sulfa drugs",
  "mental_status": "alert",
  "infection_risk": true,
  "is_serious": true
}
```

**Response `201`:** Full patient object with generated `id` and `created_at`.

#### `GET /patients/{id}` — Get patient detail

Returns the patient object plus related `bed`, `vital_readings`, `tasks`, `alerts`, and `audio_notes`.

#### `PATCH /patients/{id}` — Update a patient record

Partial update — only send the fields you want to change.

#### `DELETE /patients/{id}` — Remove a patient

Restricted to `doctor` and `admin` roles. Returns `204 No Content`.

---

### Beds

#### `GET /beds` — List all beds

Returns every bed with its current `status` and the linked patient (if occupied).

#### `POST /beds` — Create a bed

**Body (JSON):**
```json
{
  "bed_number": "A-04",
  "ward": "General",
  "status": "available",
  "notes": "Near nursing station"
}
```

Valid `status` values: `available`, `occupied`, `maintenance`.

#### `POST /beds/{id}/assign/{patient_id}` — Assign patient

Sets `bed.patient_id = patient_id` and updates `bed.status = "occupied"`. Returns the updated bed.

#### `POST /beds/{id}/release` — Release bed

Clears `bed.patient_id` and sets `bed.status = "available"`. Returns the updated bed.

---

### Vitals

#### `POST /vitals/mock/{patient_id}` — Ingest mock vitals

Generates a statistically realistic vital reading within normal-to-abnormal ranges and saves it. Automatically creates `warning` alerts for any breached threshold.

**Thresholds that trigger automatic alerts:**

| Vital | Alert condition |
|---|---|
| Heart rate | `< 60 bpm` (bradycardia) or `> 100 bpm` (tachycardia) |
| SpO2 | `< 95 %` (hypoxaemia) |
| Temperature | `> 38.0 °C` (fever) |

**Response `201`:**
```json
{
  "id": 42,
  "patient_id": 7,
  "heart_rate": 112.3,
  "spo2": 93.8,
  "blood_pressure_sys": 138.0,
  "blood_pressure_dia": 88.0,
  "temperature": 38.6,
  "ecg_value": 0.412,
  "recorded_at": "2026-03-05T10:22:00Z"
}
```

#### `GET /vitals/{patient_id}?limit=20` — Get vital history

Returns the most recent `limit` readings in descending order. Default limit is 20.

---

### Audio Notes

#### `POST /audio/{patient_id}` — Upload and transcribe

**Content-Type:** `multipart/form-data`

**Form field:** `file` — the audio file. Recommended format: WebM/Opus (browser default from `MediaRecorder`).

**What happens server-side:**
1. File is written to `uploads/audio/<uuid>.<ext>` with async I/O.
2. Google Cloud Speech-to-Text `recognize()` is called with `en-US` locale and automatic punctuation.
3. Transcript is stored in the database alongside the file path.
4. `AudioNote` record is returned.

**Response `201`:**
```json
{
  "id": 5,
  "patient_id": 7,
  "recorded_by": 1,
  "audio_file_path": "uploads/audio/3f2a1b4c-...-audio.webm",
  "transcript": "Patient reports chest tightness since this morning. No radiating pain.",
  "created_at": "2026-03-05T10:30:00Z"
}
```

#### `GET /audio/{patient_id}` — List audio notes

Returns all audio notes for the patient, newest first.

---

### Tasks

#### `POST /tasks` — Create a task

**Body (JSON):**
```json
{
  "patient_id": 7,
  "assigned_to": 3,
  "title": "Administer insulin at 18:00",
  "description": "10 units Novorapid SC, document in chart",
  "status": "pending"
}
```

Valid `status` values: `pending`, `in_progress`, `done`.

#### `PATCH /tasks/{id}` — Update a task

Partial update — typically used to advance `status`:
```json
{ "status": "in_progress" }
```

#### `GET /tasks` — List tasks

Optional query params: `patient_id`, `assigned_to`, `status`.

---

### Alerts

#### `GET /alerts` — List alerts

Optional query params: `patient_id`, `severity` (`info` / `warning` / `critical`), `acknowledged` (bool).

**Response `200`:**
```json
[
  {
    "id": 11,
    "patient_id": 7,
    "severity": "warning",
    "message": "Abnormal heart rate: 112.3 bpm",
    "acknowledged": false,
    "created_at": "2026-03-05T10:22:01Z"
  }
]
```

#### `PATCH /alerts/{id}` — Acknowledge an alert

```json
{ "acknowledged": true }
```

---

## Authentication & RBAC

### How JWT works in MedSuite

```
Client                              Server
  │                                   │
  │── POST /auth/login (form-data) ──►│
  │                                   │─ lookup user by email
  │                                   │─ bcrypt.verify(plain, hashed)
  │                                   │─ jwt.encode({sub: email, exp: now+8h})
  │◄── {access_token, token_type} ────│
  │                                   │
  │── GET /patients                  │
  │    Authorization: Bearer eyJ... ─►│
  │                                   │─ jwt.decode(token)
  │                                   │─ lookup user from email in sub
  │                                   │─ check user.is_active
  │                                   │─ (optionally) require_role check
  │◄── 200 [{patients...}] ─────────│
```

### Token payload structure

```json
{
  "sub": "sarah.khan@hospital.com",
  "exp": 1741356000
}
```

### Role-based access control

Role guards are applied per-endpoint using the `require_role()` dependency factory:

```python
from app.auth import require_role
from app.models import UserRole

@router.delete("/{id}")
def delete_patient(
    id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role(UserRole.admin, UserRole.doctor)),
):
    ...
```

`require_role()` accepts one or more roles. If the authenticated user's role is not in the list, FastAPI returns `403 Forbidden` before the function body executes.

### Role permission matrix

| Resource | Endpoint | `admin` | `doctor` | `nurse` |
|---|---|:---:|:---:|:---:|
| Users | Register, read | ✓ | ✓ | ✓ |
| Patients | Create, read | ✓ | ✓ | read only |
| Patients | Update, delete | ✓ | ✓ | ✗ |
| Beds | Create, update | ✓ | ✓ | read only |
| Vitals | Ingest, read | ✓ | ✓ | ✓ |
| Audio notes | Upload, read | ✓ | ✓ | ✓ |
| Tasks | Full CRUD | ✓ | ✓ | ✓ |
| Alerts | Read, acknowledge | ✓ | ✓ | ✓ |

---

## Audio Transcription

The audio router integrates with the **Google Cloud Speech-to-Text v1 API** using the synchronous `recognize()` method.

### Configuration steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Enable the **Cloud Speech-to-Text API**.
3. Navigate to **IAM & Admin → Service Accounts**, create a service account, and grant it the **Cloud Speech Client** role.
4. Download the JSON private key file.
5. Set the path in `backend/.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=C:/keys/medsuite-speech-key.json
   ```

### Audio format requirements

| Setting | Value |
|---|---|
| Encoding | `WEBM_OPUS` |
| Sample rate | 48 000 Hz |
| Language | `en-US` |
| Punctuation | Automatic |

These match the defaults produced by the browser's `MediaRecorder` API. If you change the recording setup, update `transcribe_with_google()` in `app/routers/audio.py` accordingly.

### Graceful degradation

If the Google credentials are absent or the API call fails for any reason, the `transcribe_with_google()` function returns a placeholder string:

```
[Transcription failed: <error details>]
```

The audio file is still saved and the `AudioNote` record is created — only the transcript is missing. This means the rest of the app continues operating normally without STT credentials.

---

## Data Models

### Entity Relationship Overview

```
User
  ├── tasks (assigned_to_user)       ──┬─► Task
  └── audio_notes (recorded_by_user) ─┘  │
                                        │
Patient                                 │
  ├── bed               (1:1)          │
  ├── vital_readings    (1:N)          │
  ├── audio_notes       (1:N)          │
  ├── tasks ──────────(1:N)──────────┘
  └── alerts            (1:N)
```

### Field Reference

#### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | Auto-increment |
| `full_name` | String | Required |
| `email` | String | Unique, indexed |
| `hashed_password` | String | bcrypt hash |
| `role` | Enum | `doctor` \| `nurse` \| `admin` |
| `is_active` | Boolean | Default `true`; set `false` to deactivate without deleting |
| `created_at` | DateTime(tz) | Server-side UTC timestamp |

#### `patients`

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | Auto-increment |
| `full_name` | String | Required |
| `age` | Integer | |
| `gender` | String | Free text |
| `diagnosis` | Text | Full clinical diagnosis |
| `allergies` | Text | Comma-separated or JSON string |
| `mental_status` | String | e.g. `alert`, `confused`, `agitated` |
| `infection_risk` | Boolean | Default `false` |
| `is_serious` | Boolean | Default `false` |
| `created_at` | DateTime(tz) | UTC |

#### `beds`

| Column | Type | Notes |
|---|---|---|
| `id` | Integer PK | |
| `bed_number` | String | Unique (e.g. `A-04`) |
| `ward` | String | e.g. `General`, `ICU`, `Surgical` |
| `status` | Enum | `available` \| `occupied` \| `maintenance` |
| `patient_id` | FK → patients | Nullable |
| `notes` | Text | Free-text notes for the bed |

#### `vital_readings`

| Column | Type | Normal range |
|---|---|---|
| `heart_rate` | Float | 60–100 bpm |
| `spo2` | Float | 95–100 % |
| `blood_pressure_sys` | Float | 90–140 mmHg |
| `blood_pressure_dia` | Float | 60–90 mmHg |
| `temperature` | Float | 36.1–37.2 °C |
| `ecg_value` | Float | Simplified voltage signal |
| `recorded_at` | DateTime(tz) | UTC |

#### `audio_notes`

| Column | Type | Notes |
|---|---|---|
| `audio_file_path` | String | Relative path under `uploads/audio/` |
| `transcript` | Text | Google STT result or placeholder |

#### `tasks`

| Column | Type | Notes |
|---|---|---|
| `status` | Enum | `pending` \| `in_progress` \| `done` |
| `assigned_to` | FK → users | Nullable |

#### `alerts`

| Column | Type | Notes |
|---|---|---|
| `severity` | Enum | `info` \| `warning` \| `critical` |
| `message` | Text | Human-readable description |
| `acknowledged` | Boolean | Default `false` |

---

## Configuration Reference

| Variable | Default | Required in production | Description |
|---|---|:---:|---|
| `DATABASE_URL` | `sqlite:///./medsuite.db` | Yes | SQLAlchemy connection string |
| `SECRET_KEY` | `changeme_secret` | **YES** | JWT signing key — must be long and random |
| `ALGORITHM` | `HS256` | No | JWT algorithm (`HS256` or `RS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | No | Token lifetime (480 = 8 hours) |
| `GOOGLE_APPLICATION_CREDENTIALS` | *(not set)* | No | Absolute path to Google Cloud JSON key |

Generate a secure `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Testing

The project uses **pytest** and **httpx** for API integration tests.

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run a specific test file
pytest tests/test_auth.py -v
```

Example integration test pattern:

```python
from httpx import AsyncClient
import pytest

@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register
        r = await client.post("/auth/register", json={
            "full_name": "Test User",
            "email": "test@example.com",
            "password": "testpass",
            "role": "nurse"
        })
        assert r.status_code == 201

        # Login
        r = await client.post("/auth/login",
            data={"username": "test@example.com", "password": "testpass"}
        )
        assert r.status_code == 200
        assert "access_token" in r.json()
```

Use an in-memory SQLite database for tests by overriding the `get_db` dependency in `conftest.py`.

---

## Development Notes

- **CORS** is pre-configured for `localhost:5173` and `localhost:3000`. For production, replace `allow_origins` in `main.py` with your exact domain(s) — never use `["*"]` in production.
- **All timestamps** are stored in UTC using SQLAlchemy's `DateTime(timezone=True)` with `server_default=func.now()`.
- **SQLite WAL mode** is not set explicitly. For concurrency testing with SQLite, enable it:
  ```python
  from sqlalchemy import event
  @event.listens_for(engine, "connect")
  def set_wal(conn, _):
      conn.execute("PRAGMA journal_mode=WAL")
  ```
- **`uploads/audio/`** is created automatically by `os.makedirs(..., exist_ok=True)`. In containerised deployments, mount this directory to persistent storage.
- **Never use `--reload` in production** — it enables file watching and single-worker mode. Use `--workers` instead.
- **Schema changes** should always go through Alembic migrations — do not rely on `create_all()` to modify existing tables.
