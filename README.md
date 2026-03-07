# MedSuite

MedSuite is a hospital IPD workflow platform with secure role-based APIs, consent-aware clinical flows, session-aware auth, and asynchronous processing.

## Implemented Capabilities

- Username login with JWT access tokens and server-side sessions
- Refresh-token rotation and session revocation endpoints
- Expanded patient intake schema for edge-case hospital scenarios
- Consent email workflow with yes/no actions
- Audio upload with consent checks and asynchronous transcription queue
- Rounding priorities, clinical notes, labs summary, and patient timeline
- Celery worker, Celery Beat, and Flower monitoring support

## Architecture

- Frontend: React + Vite + React Query + Axios
- Backend: FastAPI + SQLAlchemy + Pydantic
- Queue/Parallel: Celery + Redis
- Queue observability: Flower
- Persistence: SQLite (default), PostgreSQL ready

## Repo Layout

```text
MedSuit/
|- backend/
|  |- app/
|  |  |- auth.py
|  |  |- database.py
|  |  |- models.py
|  |  |- schemas.py
|  |  |- celery_app.py
|  |  |- services/transcription.py
|  |  |- tasks/audio_tasks.py
|  |  |- tasks/maintenance_tasks.py
|  |  |- routers/
|  |- scripts/start_celery_worker.ps1
|  |- scripts/start_celery_beat.ps1
|  |- scripts/start_flower.ps1
|  |- README.md
|- frontend/
|  |- src/
|  |  |- api.js
|  |  |- context/AuthContext.jsx
|  |  |- pages/Patients.jsx
|  |  |- pages/PatientDetail.jsx
|  |- README.md
|- docs/implementation.md
|- README.md
```

## Environment Variables

Backend (`backend/.env`):

```env
DATABASE_URL=sqlite:///./medsuite.db
SECRET_KEY=change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_MINUTES=43200
ALLOW_PUBLIC_REGISTER=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=MedSuite Hospital
CONSENT_ACTION_BASE_URL=http://localhost:8000
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

Frontend (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

## Session Flow

- `POST /auth/login`: returns access token, refresh token, session id.
- `POST /auth/refresh`: rotates refresh token and issues a new access token.
- `POST /auth/logout`: revokes current session id.
- `GET /auth/sessions`: lists user sessions.

Frontend behavior:

- attach access token on every request
- one-time refresh retry on `401`
- clear storage and redirect to `/login` when refresh fails

## Queue and Parallel Processing

Queues:

- `audio`
- `maintenance`
- `default`

Background jobs:

- audio transcription
- expired session cleanup
- consent expiry updates

## Local Run

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

UIs:

- frontend: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`
- Flower: `http://localhost:5555`

## Validation

```powershell
cd backend
.\myenv\Scripts\python.exe -m pytest -q

cd ..\frontend
npm run build
```

## Alembic Migration Commands

Generate migration from current SQLAlchemy model diffs:

```powershell
cd backend
.\myenv\Scripts\python.exe -m alembic revision --autogenerate -m "describe_change"
```

Apply migrations:

```powershell
cd backend
.\myenv\Scripts\python.exe -m alembic upgrade head
```
