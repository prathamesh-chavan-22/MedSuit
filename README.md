# Vitalis

Vitalis is a hospital IPD workflow platform with secure role-based APIs, consent-aware clinical flows, session-aware auth, and asynchronous processing.

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
Vitalis/
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
DATABASE_URL=sqlite:///./vitalis.db
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
SMTP_FROM_NAME=Vitalis Hospital
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

## Feature Guide

### Patient Management

1. **Browse Patients**: Navigate to "Patients" page to view all patients in the system
2. **View Patient Details**: Click on a patient to open their detail page with tabs for Overview, Clinical Notes, Labs, and Timeline
3. **Patient Info**: Each patient profile includes name, age, gender, admission date, and unique UHID (Universal Health ID)

### Consent Management

The consent workflow ensures patient privacy and compliance:

1. **Check Consent Status**: On the patient detail page, look at the "Recording Consent" badge:
   - **Green "active"**: Patient has active consent; recording is allowed
   - **Yellow "pending"**: Consent request sent, awaiting response
   - **Red "missing"**: No consent yet; recording is blocked

2. **Grant Consent** (Admin/Doctor/Nurse):
   - Click "Grant Consent" to immediately activate recording consent
   - The consent status will update in real-time
   - Error messages auto-clear after 5 seconds

3. **Revoke Consent** (Admin/Doctor):
   - Click "Revoke Consent" to disable recording and audio uploads
   - Use this when patient withdraws consent
   - The Record button will automatically disable

4. **Send Consent Email Action**:
   - Fill out the "Send Consent Email Action" form with patient contact details
   - Patient receives an email with yes/no action links
   - Once clicked, consent status updates automatically
   - Supports pending and active consent states

### Audio Recording & Clinical Notes

1. **Start Recording** (requires active consent):
   - Click the "Record" button in the "Doctor Audio Notes" section
   - The button is **disabled** if consent is not active
   - Message "Active consent required" appears when recording is blocked
   - Browser will request microphone access on first use

2. **Stop Recording**:
   - Click "Stop" button to end recording
   - Audio is automatically uploaded to the server
   - Transcription begins asynchronously (visible in Flower dashboard)

3. **Audio Playback**:
   - Recorded audio files appear in the "Recorded Checks" section
   - Click a timestamp to play the audio file

4. **Create Clinical Note from Audio**:
   - Click "Create Draft from Latest Audio" to auto-generate a note
   - The system transcribes audio and creates a SOAP note template
   - Edit the transcription or SOAP fields as needed

5. **Manual Note Entry**:
   - Use the "Or enter text directly" section to type a note
   - Select note type: General, SOAP, or Progress Note
   - Create from text and edit inline

### Error Handling & Feedback

- **Recording without active consent**: Record button is disabled with explanatory text
- **Microphone access denied**: Error message appears; grant permission in browser settings
- **Audio upload failed**: Error displayed below the Record button (e.g., consent revoked mid-upload)
- **Consent actions fail**: Error message shows with auto-clear after 5 seconds
- **Stale feedback**: All feedback messages automatically clear after 5 seconds to keep UI clean

### Clinical Notes

1. **View Notes**: All notes appear in the "Clinical Notes" tab with creation date
2. **Edit Notes**:
   - Click "Edit" on a draft note
   - Modify transcription and SOAP fields (S/O/A/P sections)
   - Click "Save" to persist changes
3. **Finalize Notes** (Admin/Doctor only):
   - Click "Finalize" to mark a note as complete and immutable
   - Finalized notes cannot be edited (archival compliance)

### Labs & Vitals

- **Add Lab Values**: Use the lab form to log test results with date and values
- **Mock Vitals**: Click "Mock Vitals" to generate sample vital signs for testing
- **Labs Summary**: View aggregated lab history by test type

### Timeline View

- **Event History**: Timeline tab shows all patient events (admissions, notes, vitals, etc.)
- **Color-coded**: Different event types have distinct colors
- **Chronological**: Events are ordered by creation time with most recent first

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
