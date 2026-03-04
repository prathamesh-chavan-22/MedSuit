# MedSuite — Backend

FastAPI-based REST API for the MedSuite Hospital IPD Management System. Handles authentication, patient records, bed assignments, vital-sign monitoring, voice audio notes, task tracking, and clinical alerts.

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

- Python 3.10 or higher
- `pip`
- *(Optional)* A Google Cloud project with the Speech-to-Text API enabled

### Virtual Environment

```bash
cd backend

# Create
python -m venv venv

# Activate — Windows
venv\Scripts\activate

# Activate — macOS / Linux
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Environment Variables

Create a file named `.env` in the `backend/` directory:

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=sqlite:///./medsuite.db

# ── JWT ───────────────────────────────────────────────────────────────────────
SECRET_KEY=replace_with_a_long_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# ── Google Cloud (optional — audio transcription) ─────────────────────────────
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Defaults are provided so the server starts without a `.env` file in development, but **always set `SECRET_KEY` in production**.

---

## Running the Server

```bash
# Development — auto-reload on file change
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

| Endpoint | URL |
|---|---|
| API root / health check | `http://localhost:8000/` |
| Swagger UI (interactive docs) | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |

---

## Database

### Default (SQLite)

All tables are created automatically on startup via `Base.metadata.create_all()`. The database file `medsuite.db` appears in the `backend/` directory.

### Switch to PostgreSQL

Update `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/medsuite
```

Remove the SQLite-specific `connect_args` are handled automatically by `database.py`.

### Migrations with Alembic

```bash
# Initialise (first time only)
alembic init alembic

# Generate a migration after model changes
alembic revision --autogenerate -m "describe change"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## API Reference

All protected routes require the header:

```
Authorization: Bearer <access_token>
```

### Auth

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/auth/register` | `{full_name, email, password, role}` | Create a new user |
| `POST` | `/auth/login` | `username=email&password=…` (form-data) | Obtain a JWT token |
| `GET` | `/auth/me` | — | Get current user profile |

### Patients

| Method | Path | Description |
|---|---|---|
| `GET` | `/patients` | List all patients (paginated) |
| `POST` | `/patients` | Admit a new patient |
| `GET` | `/patients/{id}` | Get patient detail |
| `PATCH` | `/patients/{id}` | Update patient record |
| `DELETE` | `/patients/{id}` | Discharge / remove patient |

### Beds

| Method | Path | Description |
|---|---|---|
| `GET` | `/beds` | List all beds with status |
| `POST` | `/beds` | Create a new bed |
| `GET` | `/beds/{id}` | Get bed detail |
| `PATCH` | `/beds/{id}` | Update bed (ward, status, notes) |
| `POST` | `/beds/{id}/assign/{patient_id}` | Assign patient to bed |
| `POST` | `/beds/{id}/release` | Release bed (set available) |

### Vitals

| Method | Path | Description |
|---|---|---|
| `POST` | `/vitals/mock/{patient_id}` | Generate & store mock vital reading |
| `GET` | `/vitals/{patient_id}` | Retrieve vital history (latest N) |

**Automatic alerts** are raised when:

| Metric | Threshold |
|---|---|
| Heart rate | < 60 bpm or > 100 bpm |
| SpO2 | < 95 % |
| Temperature | > 38.0 °C |

### Audio Notes

| Method | Path | Description |
|---|---|---|
| `POST` | `/audio/{patient_id}` | Upload audio file; transcribes via Google STT |
| `GET` | `/audio/{patient_id}` | List all audio notes for patient |

Accepted audio format: WebM/Opus (browser `MediaRecorder` default). The file is saved under `uploads/audio/` and the transcript is stored in the database.

### Tasks

| Method | Path | Description |
|---|---|---|
| `GET` | `/tasks` | List tasks (filter by patient or assignee) |
| `POST` | `/tasks` | Create a new task |
| `GET` | `/tasks/{id}` | Get task detail |
| `PATCH` | `/tasks/{id}` | Update status or details |
| `DELETE` | `/tasks/{id}` | Delete a task |

Task statuses: `pending` → `in_progress` → `done`

### Alerts

| Method | Path | Description |
|---|---|---|
| `GET` | `/alerts` | List alerts (filter by patient, severity) |
| `PATCH` | `/alerts/{id}` | Acknowledge / dismiss an alert |

Alert severities: `info`, `warning`, `critical`

---

## Authentication & RBAC

JWT tokens are issued at `/auth/login`. Each token encodes the user's email in the `sub` claim and expires after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 480 min / 8 h).

Role-based guards are applied using the `require_role()` dependency factory in `app/auth.py`:

```python
from app.auth import require_role
from app.models import UserRole

@router.delete("/{id}")
def delete_patient(
    id: int,
    _: models.User = Depends(require_role(UserRole.admin, UserRole.doctor)),
):
    ...
```

| Role | Example restrictions |
|---|---|
| `admin` | Full access; user management |
| `doctor` | Patient CRUD, vitals, audio, alerts |
| `nurse` | Task write, patient read, vitals read |

---

## Audio Transcription

The audio router uses **Google Cloud Speech-to-Text** (synchronous `recognize` API).

**Setup:**

1. Create a Google Cloud project and enable the **Speech-to-Text API**.
2. Create a service account and download the JSON key.
3. Set the path in `.env`:

   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   ```

**Graceful degradation:** If credentials are missing or the API call fails, the transcript is set to a placeholder string like `[Transcription failed: ...]` so the rest of the workflow continues uninterrupted.

---

## Data Models

```
User          id, full_name, email, hashed_password, role, is_active, created_at
Patient       id, full_name, age, gender, diagnosis, allergies, mental_status,
              infection_risk, is_serious, created_at
Bed           id, bed_number, ward, status, patient_id (FK), notes
VitalReading  id, patient_id (FK), heart_rate, spo2, blood_pressure_sys,
              blood_pressure_dia, temperature, ecg_value, recorded_at
AudioNote     id, patient_id (FK), recorded_by (FK→User), audio_file_path,
              transcript, created_at
Task          id, patient_id (FK), assigned_to (FK→User), title, description,
              status, created_at
Alert         id, patient_id (FK), severity, message, acknowledged, created_at
```

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./medsuite.db` | SQLAlchemy connection string |
| `SECRET_KEY` | `changeme_secret` | JWT signing key — **change in production** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Token lifetime in minutes |
| `GOOGLE_APPLICATION_CREDENTIALS` | *(unset)* | Path to Google Cloud key file |

---

## Development Notes

- **CORS** is pre-configured for `localhost:5173` and `localhost:3000`. Update `allow_origins` in `main.py` for production.
- **SQLite WAL mode** is not explicitly set; for high-concurrency dev testing consider enabling it or switching to PostgreSQL.
- All timestamps are stored in **UTC**.
- The `uploads/audio/` directory is created automatically and is not tracked by Git. Add it to `.gitignore` if not already present.
- Run `uvicorn` with `--reload` during development for instant code reloading.
