# Backend Guide (Vitalis)

Backend service for Vitalis, including session-aware authentication, expanded patient data model, consent governance, and Celery-based asynchronous workflows.

## Core Backend Modules

- `app/models.py`: ORM entities for users, patients, sessions, consent, notes, labs, tasks, alerts
- `app/schemas.py`: request/response contracts and patient edge-case validations
- `app/auth.py`: JWT helpers and server-side session lifecycle helpers
- `app/celery_app.py`: Celery broker/result config, queue routing, beat schedule
- `app/tasks/audio_tasks.py`: audio transcription jobs
- `app/tasks/maintenance_tasks.py`: session and consent maintenance jobs
- `app/routers/*`: domain APIs

## Auth and Session Endpoints

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/sessions`
- `GET /auth/me`

Session records track refresh token hash, user metadata, timestamps, and revocation state.

## Patient Intake Coverage

Patient APIs now support extended fields for edge-case workflows:

- identity and demographics (MRN, blood group, age, gender)
- clinical details (diagnosis, comorbidities, medications, allergies, mental status)
- contact and emergency contact details
- address and insurance fields
- admission/discharge metadata and status fields
- risk flags (`is_serious`, `infection_risk`, `fall_risk`)

Validation rules include discharge ordering checks, emergency contact pairing checks, and MRN uniqueness guards.

## Queue and Parallel Processing

Queues:

- `audio`
- `maintenance`
- `default`

Tasks:

- `app.tasks.audio_tasks.transcribe_audio_note`
- `app.tasks.maintenance_tasks.cleanup_expired_sessions_task`
- `app.tasks.maintenance_tasks.expire_consents_task`

## Run Commands

API:

```powershell
cd backend
.\myenv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Worker:

```powershell
cd backend
.\scripts\start_celery_worker.ps1
```

Beat:

```powershell
cd backend
.\scripts\start_celery_beat.ps1
```

Flower:

```powershell
cd backend
.\scripts\start_flower.ps1
```

## Required Environment

```env
DATABASE_URL=sqlite:///./vitalis.db
SECRET_KEY=replace-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_MINUTES=43200
ALLOW_PUBLIC_REGISTER=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Vitalis Hospital
CONSENT_ACTION_BASE_URL=http://localhost:8000
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

## Tests

```powershell
cd backend
.\myenv\Scripts\python.exe -m pytest -q
```

## Alembic and Automigrations

Initialize (already done in this repo):

```powershell
cd backend
.\myenv\Scripts\python.exe -m alembic init alembic
```

Create a new migration from model changes:

```powershell
cd backend
.\myenv\Scripts\python.exe -m alembic revision --autogenerate -m "describe_change"
```

Apply latest migrations:

```powershell
cd backend
.\myenv\Scripts\python.exe -m alembic upgrade head
```

Check current migration version:

```powershell
cd backend
.\myenv\Scripts\python.exe -m alembic current
```

Convenience scripts:

```powershell
cd backend
.\scripts\alembic_autogenerate.ps1 -Message "describe_change"
.\scripts\alembic_upgrade_head.ps1
```
